import React from 'react';
import { Zap, Wifi, WifiOff, CheckCircle, Clock } from 'lucide-react';

export default function ChargerGrid({ chargers }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-white">Registered EV Chargers</h2>
          <p className="text-xs text-slate-400">Physical charging stations monitored by ChargeShield</p>
        </div>
        <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700">
          {chargers.length} Registered
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {chargers.map((cp) => {
          const isCharging = cp.sessionState === 'CHARGING';
          const isAuthorized = cp.sessionState === 'AUTHORIZED';

          return (
            <div
              key={cp.id}
              className="p-4 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 font-bold text-xs">
                    {cp.id.replace('CP', '')}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{cp.id}</h3>
                    <p className="text-[11px] text-slate-400">{cp.name}</p>
                  </div>
                </div>

                {/* Online / Offline badge */}
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/40 border border-emerald-800 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Registered</span>
                </div>
              </div>

              {/* Physical specifications & state */}
              <div className="space-y-2 pt-2 border-t border-slate-800/60 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Rated Power:</span>
                  <span className="font-semibold text-amber-300 font-mono">{cp.ratedPowerKw} kW</span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>Connector:</span>
                  <span className="text-slate-200">{cp.connectorType}</span>
                </div>

                <div className="flex justify-between items-center text-slate-400">
                  <span>Session State:</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase font-mono ${
                      isCharging
                        ? 'bg-indigo-950/60 text-indigo-300 border border-indigo-700 animate-pulse'
                        : isAuthorized
                        ? 'bg-amber-950/60 text-amber-300 border border-amber-700'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {cp.sessionState || 'IDLE'}
                  </span>
                </div>

                {isCharging && (
                  <div className="flex justify-between text-slate-400 text-[11px] bg-slate-900/80 p-1.5 rounded border border-indigo-900/40">
                    <span>Active Tx ID:</span>
                    <span className="font-mono text-indigo-300 font-semibold">#{cp.activeTransactionId}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
