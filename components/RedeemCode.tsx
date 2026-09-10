import React, { useState } from 'react';
import { Gift, Loader2, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const RedeemCode: React.FC = () => {
  const { redeemCode, user, setAuthModalOpen } = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { setAuthModalOpen(true); return; }
    setBusy(true); setMsg(null);
    const r = await redeemCode(code.trim());
    setMsg({ ok: r.ok, text: r.message });
    if (r.ok) setCode('');
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
      <div className="flex items-center gap-2 mb-2"><Gift size={16} className="text-amber-400" /><span className="text-sm font-bold text-amber-200">¿Tienes un código?</span></div>
      <p className="text-[11px] text-gray-400 mb-3">Canjea tu código para desbloquear funciones de Audiomorphic.</p>
      <div className="flex gap-2">
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Introduce tu código" className="flex-1 bg-black/50 border border-white/10 rounded-xl py-2 px-3 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors" />
        <button type="submit" disabled={busy || !code.trim()} className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-medium disabled:opacity-50 flex items-center gap-1">
          {busy ? <Loader2 size={16} className="animate-spin" /> : 'Canjear'}
        </button>
      </div>
      {msg && (<div className={`mt-3 flex items-center gap-2 text-xs ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg.ok ? <Check size={14} /> : <AlertCircle size={14} />}<span>{msg.text}</span></div>)}
    </form>
  );
};
