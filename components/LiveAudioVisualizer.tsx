import React, { useEffect, useRef } from 'react';
import { Activity, Clock, Radio, Wifi } from 'lucide-react';
import type { LiveTelemetry } from '../hooks/useLiveTransmission';
import type { SpectrumSnapshot } from '../hooks/useAudioAnalyzer';

interface LiveAudioVisualizerProps {
  getSpectrumSnapshot?: (outFreq?: Uint8Array, outTime?: Uint8Array) => SpectrumSnapshot;
  telemetry: LiveTelemetry;
  activeTrackTitle?: string | null;
  audioMode?: string;
  compact?: boolean;
}

export const LiveAudioVisualizer: React.FC<LiveAudioVisualizerProps> = ({
  getSpectrumSnapshot,
  telemetry,
  activeTrackTitle,
  audioMode = 'queue',
  compact = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dbRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !getSpectrumSnapshot) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const freqBuf = new Uint8Array(256);
    const timeBuf = new Uint8Array(256);
    let rafId = 0;
    let lastDraw = 0;
    let disposed = false;

    const draw = (now: number) => {
      if (disposed) return;
      rafId = requestAnimationFrame(draw);
      if (document.hidden || now - lastDraw < 32) return;
      lastDraw = now;

      const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.5 : 2);
      const cssW = canvas.clientWidth || (compact ? 160 : 320);
      const cssH = canvas.clientHeight || (compact ? 28 : 92);
      if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, cssW, cssH);

      const snap = getSpectrumSnapshot(freqBuf, timeBuf);
      if (dbRef.current) {
        dbRef.current.textContent = snap.active ? `${snap.peakDb} dB` : 'Silencio';
      }

      const barCount = compact ? 24 : 48;
      const gap = 2;
      const barW = Math.max(2, (cssW - gap * (barCount - 1)) / barCount);

      for (let i = 0; i < barCount; i++) {
        const binIdx = Math.floor((i / barCount) * 140);
        const norm = snap.active ? freqBuf[binIdx] / 255 : 0.04 + 0.03 * Math.sin(now * 0.004 + i * 0.35);
        const h = Math.max(2, norm * (cssH * (compact ? 0.85 : 0.68)));
        const hue = (i / barCount) * 260 + 180;
        ctx.fillStyle = snap.active ? `hsla(${hue}, 90%, 62%, 0.9)` : `hsla(${hue}, 40%, 45%, 0.35)`;
        const x = i * (barW + gap);
        const y = cssH - h;
        ctx.fillRect(x, y, barW, h);
      }

      if (!compact) {
        ctx.beginPath();
        const midY = cssH * 0.32;
        const amp = snap.active ? cssH * 0.22 : 3;
        for (let i = 0; i < timeBuf.length; i += 2) {
          const x = (i / (timeBuf.length - 1)) * cssW;
          const v = (timeBuf[i] - 128) / 128;
          const y = midY + v * amp;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = snap.active ? 'rgba(103, 232, 249, 0.92)' : 'rgba(148, 163, 184, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.restore();
    };

    rafId = requestAnimationFrame(draw);
    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
    };
  }, [getSpectrumSnapshot, compact]);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <canvas ref={canvasRef} className="w-24 sm:w-32 h-7 rounded bg-black/40 border border-white/10" />
        <span className="text-[10px] font-mono text-cyan-200 whitespace-nowrap">
          {telemetry.clockPrecisionMs !== null ? `±${telemetry.clockPrecisionMs}ms` : telemetry.rttMs !== null ? `${telemetry.rttMs}ms` : 'P2P'}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/15 bg-black/50 p-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <Activity size={15} className="text-cyan-400 shrink-0" />
          <span className="font-bold text-white truncate">
            {activeTrackTitle || (audioMode === 'neuron_stream' ? 'Audio Directo de Neurona' : audioMode === 'omnifrecuencias' ? 'Osciladores Omnifrecuencias' : 'Monitor de Audio En Vivo')}
          </span>
        </div>
        <span ref={dbRef} className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-cyan-200">
          -- dB
        </span>
      </div>

      <canvas
        ref={canvasRef}
        className="w-full h-[88px] rounded-xl bg-black/60 border border-white/10 block"
      />

      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-200">
          <Clock size={11} />
          Reloj: {telemetry.clockMode === 'referencia' ? 'Referencia (Host)' : telemetry.clockPrecisionMs !== null ? `±${telemetry.clockPrecisionMs} ms` : 'Sincronizando'}
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-200">
          <Wifi size={11} />
          RTT: {telemetry.rttMs !== null ? `${telemetry.rttMs} ms` : 'Local'}
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-400/30 text-purple-200">
          <Radio size={11} />
          Deriva Audio: {telemetry.audioDriftMs !== null ? `${telemetry.audioDriftMs >= 0 ? '+' : ''}${telemetry.audioDriftMs} ms` : '0 ms'}
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-200">
          Mesh: {telemetry.meshNodesCount} nodo(s)
        </span>
      </div>
    </div>
  );
};

export default LiveAudioVisualizer;
