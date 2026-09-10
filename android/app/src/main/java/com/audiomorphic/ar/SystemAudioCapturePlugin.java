package com.audiomorphic.ar;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioPlaybackCaptureConfiguration;
import android.media.AudioRecord;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.util.Base64;

import androidx.activity.result.ActivityResult;
import androidx.annotation.RequiresApi;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "SystemAudioCapture",
    permissions = {
        @Permission(
            alias = "audio",
            strings = { Manifest.permission.RECORD_AUDIO }
        )
    }
)
public class SystemAudioCapturePlugin extends Plugin {

    private MediaProjectionManager projectionManager;
    private MediaProjection mediaProjection;
    private AudioRecord audioRecord;
    private boolean isCapturing = false;
    private Thread captureThread;

    private static final int SAMPLE_RATE = 44100;
    private static final int CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO;
    private static final int AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT;
    private static final int BUFFER_SIZE = 4096;

    @PluginMethod
    public void startCapture(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            call.reject("System audio capture requires Android 10+");
            return;
        }

        if (isCapturing) {
            call.resolve(new JSObject().put("status", "already_capturing"));
            return;
        }

        // Request media projection permission
        projectionManager = (MediaProjectionManager) getContext()
                .getSystemService(Context.MEDIA_PROJECTION_SERVICE);
        Intent intent = projectionManager.createScreenCaptureIntent();
        startActivityForResult(call, intent, "handleProjectionResult");
    }

    @ActivityCallback
    private void handleProjectionResult(PluginCall call, ActivityResult result) {
        if (call == null) return;

        if (result.getResultCode() != Activity.RESULT_OK) {
            call.reject("Permission denied for screen capture");
            return;
        }

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            call.reject("System audio capture requires Android 10+");
            return;
        }

        try {
            mediaProjection = projectionManager.getMediaProjection(
                    result.getResultCode(), result.getData());

            startAudioCapture();
            call.resolve(new JSObject().put("status", "capturing"));
        } catch (Exception e) {
            call.reject("Failed to start audio capture: " + e.getMessage());
        }
    }

    @RequiresApi(api = Build.VERSION_CODES.Q)
    private void startAudioCapture() {
        AudioPlaybackCaptureConfiguration config =
                new AudioPlaybackCaptureConfiguration.Builder(mediaProjection)
                        .addMatchingUsage(AudioAttributes.USAGE_MEDIA)
                        .addMatchingUsage(AudioAttributes.USAGE_GAME)
                        .addMatchingUsage(AudioAttributes.USAGE_UNKNOWN)
                        .build();

        int minBufferSize = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT);
        int bufferSize = Math.max(minBufferSize, BUFFER_SIZE);

        audioRecord = new AudioRecord.Builder()
                .setAudioFormat(new AudioFormat.Builder()
                        .setEncoding(AUDIO_FORMAT)
                        .setSampleRate(SAMPLE_RATE)
                        .setChannelMask(CHANNEL_CONFIG)
                        .build())
                .setBufferSizeInBytes(bufferSize * 2)
                .setAudioPlaybackCaptureConfig(config)
                .build();

        audioRecord.startRecording();
        isCapturing = true;

        // Start capture thread - sends frequency data to JS
        captureThread = new Thread(() -> {
            short[] buffer = new short[BUFFER_SIZE / 2];
            while (isCapturing && audioRecord != null) {
                int read = audioRecord.read(buffer, 0, buffer.length);
                if (read > 0) {
                    // Calculate RMS volume and dominant frequency
                    double rms = 0;
                    for (int i = 0; i < read; i++) {
                        rms += buffer[i] * buffer[i];
                    }
                    rms = Math.sqrt(rms / read) / 32768.0;

                    // Simple zero-crossing frequency estimation
                    int zeroCrossings = 0;
                    for (int i = 1; i < read; i++) {
                        if ((buffer[i - 1] >= 0 && buffer[i] < 0) ||
                            (buffer[i - 1] < 0 && buffer[i] >= 0)) {
                            zeroCrossings++;
                        }
                    }
                    double frequency = (double) zeroCrossings * SAMPLE_RATE / (2.0 * read);

                    // Send FFT-like frequency band data
                    double bass = 0, mid = 0, treble = 0;
                    int bassCount = 0, midCount = 0, trebleCount = 0;

                    // Simple band analysis using buffer energy
                    for (int i = 0; i < read; i++) {
                        double val = Math.abs(buffer[i]) / 32768.0;
                        // Approximate band splitting based on position in buffer
                        if (i < read / 4) {
                            bass += val;
                            bassCount++;
                        } else if (i < read * 3 / 4) {
                            mid += val;
                            midCount++;
                        } else {
                            treble += val;
                            trebleCount++;
                        }
                    }

                    JSObject data = new JSObject();
                    data.put("volume", Math.min(rms * 3.0, 1.0));
                    data.put("frequency", Math.min(frequency / 4000.0, 1.0));
                    data.put("bass", bassCount > 0 ? Math.min((bass / bassCount) * 4.0, 1.0) : 0);
                    data.put("mid", midCount > 0 ? Math.min((mid / midCount) * 4.0, 1.0) : 0);
                    data.put("treble", trebleCount > 0 ? Math.min((treble / trebleCount) * 4.0, 1.0) : 0);

                    notifyListeners("audioData", data);
                }

                try {
                    Thread.sleep(16); // ~60fps
                } catch (InterruptedException e) {
                    break;
                }
            }
        });
        captureThread.start();
    }

    @PluginMethod
    public void stopCapture(PluginCall call) {
        stopCaptureInternal();
        call.resolve(new JSObject().put("status", "stopped"));
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q);
        result.put("platform", "android");
        call.resolve(result);
    }

    private void stopCaptureInternal() {
        isCapturing = false;

        if (captureThread != null) {
            captureThread.interrupt();
            captureThread = null;
        }

        if (audioRecord != null) {
            try {
                audioRecord.stop();
                audioRecord.release();
            } catch (Exception e) {
                // Ignore
            }
            audioRecord = null;
        }

        if (mediaProjection != null) {
            mediaProjection.stop();
            mediaProjection = null;
        }
    }

    @Override
    protected void handleOnDestroy() {
        stopCaptureInternal();
        super.handleOnDestroy();
    }
}
