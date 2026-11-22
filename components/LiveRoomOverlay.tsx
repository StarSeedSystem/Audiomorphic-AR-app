import React, { useEffect, useRef } from 'react';
import { Monitor, Radio, Users, LogOut, Sliders, Glasses } from 'lucide-react';
import type { UseLiveTransmissionResult } from '../hooks/useLiveTransmission';
import LiveAudioVisualizer from './LiveAudioVisualizer';

interface LiveRoomOverlayProps {
  live: UseLiveTransmissionResult;
  getSpectrumSnapshot?: any;
  onOpenHub: (tab?: 'discover' | 'create' | 'audio' | 'room' | 'mesh') => void;
  onToggleVr?: () => void;
  vrActive?: boolean;
}

export const LiveRoomOverlay: React.FC<LiveRoomOverlayProps> = ({
  live,
  getSpectrumSnapshot,
  onOpenHub,
  onToggleVr,
  vrActive,
}) => {
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteScreenPeer = live.remoteMedia.find((m) => m.hasVideo && (m.isScreenShare || live.session?.format === 'screen_mirror'));
  const showLiteralScreen = Boolean(
    live.session &&
      !live.session.isHost &&
      remoteScreenPeer &&
      live.preferRemoteScreen &&
      (live.session.format === 'screen_mirror' || remoteScreenPeer.isScreenShare)
  );

  useEffect(() => {
    if (screenVideoRef.current && remoteScreenPeer?.stream && showLiteralScreen) {
      screenVideoRef.current.srcObject = remoteScreenPeer.stream;
    }
  }, [remoteScreenPeer, showLiteralScreen]);

  if (!live.session) return null;

  return (
    <>
      {/* Optional Remote Literal Screen Mirror Surface */}
      {showLiteralScreen && remoteScreenPeer && (
        <div className="fixed inset-0 z-[5] bg-black flex items-center justify-center pointer-events-none">
          <video
            ref={screenVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />
        </div>
      )}

      {/* Compact Non-Blocking Live Floating Bar */}
      <div
        className="fixed bottom-3 left-1/2 -translate-x-1/2 z-20 max-w-[calc(100vw-1rem)] pointer-events-auto"
        style={{ bottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full bg-black/80 border border-cyan-400/40 shadow-lg text-xs">
          <span className="inline-flex items-center gap-1.5 font-bold text-rose-300 shrink-0">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            {live.session.kind === 'station' ? 'ESTACIÓN' : 'CANAL'}
          </span>

          <span className="text-white font-semibold truncate max-w-[110px] sm:max-w-[180px]">
            {live.session.title}
          </span>

          <div className="hidden sm:block">
            <LiveAudioVisualizer
              getSpectrumSnapshot={getSpectrumSnapshot}
              telemetry={live.telemetry}
              compact
            />
          </div>

          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-300 px-1.5">
            <Users size={12} />
            {Math.max(1, live.participants.length)}
          </span>

          {remoteScreenPeer && !live.session.isHost && (
            <button
              type="button"
              onClick={() => live.setPreferRemoteScreen((v) => !v)}
              className="px-2 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[11px] font-semibold text-cyan-200 flex items-center gap-1 cursor-pointer"
              title="Alternar entre pantalla literal y render local"
            >
              <Monitor size={12} />
              <span className="hidden xs:inline">{live.preferRemoteScreen ? 'Literal' : 'Local'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenHub('audio')}
            className="px-2.5 py-1 rounded-full bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-200 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Radio size={12} />
            <span className="hidden sm:inline">Audio</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenHub('room')}
            className="px-2.5 py-1 rounded-full bg-purple-500/20 hover:bg-purple-500/35 text-purple-200 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Sliders size={12} />
            <span>Sala</span>
          </button>

          {onToggleVr && (live.session.isHost || live.session.permissions.canEnterXR) && (
            <button
              type="button"
              onClick={onToggleVr}
              className={`px-2 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                vrActive ? 'bg-emerald-500/30 text-emerald-200' : 'bg-white/10 text-slate-200 hover:bg-white/20'
              }`}
              title="Entrar / Salir Modo VR/AR de la Sala"
            >
              <Glasses size={12} />
            </button>
          )}

          <button
            type="button"
            onClick={() => void live.leaveSession(false)}
            className="p-1.5 rounded-full bg-red-500/20 hover:bg-red-500/35 text-red-300 cursor-pointer"
            title="Salir de la transmisión"
            aria-label="Salir de la transmisión"
          >
            <LogOut size={12} />
          </button>
        </div>
      </div>
    </>
  );
};

export default LiveRoomOverlay;
