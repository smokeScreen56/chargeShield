import React from 'react';
import { ShieldCheck, ShieldAlert, Wifi, Database, Radio } from 'lucide-react';

export default function Navbar({ isConnected, isMongoConnected, stats }) {
  return (
    <header className="bg-slate-900/80 backdrop-blur border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">

        {/* Brand & Project Identity */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-500/10 border border-sky-500/30 rounded-xl text-sky-400 shadow-inner">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">ChargeShield</h1>
            </div>
            <p className="text-xs text-slate-400">
              Real-Time Cybersecurity Gateway for EV Charging Infrastructure • OCPP 1.6J
            </p>
          </div>
        </div>

        {/* System Status Indicators */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Gateway WebSocket Stream Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
            <Radio className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-400 animate-pulse' : 'text-rose-400'}`} />
            <span className="text-slate-300">Gateway:</span>
            <span className={isConnected ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
              {isConnected ? 'ONLINE' : 'DISCONNECTED'}
            </span>
          </div>

          {/* MongoDB Persistence Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
            <Database className={`w-3.5 h-3.5 ${isMongoConnected ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span className="text-slate-300">DB:</span>
            <span className={isMongoConnected ? 'text-emerald-400 font-medium' : 'text-amber-400 font-medium'}>
              {isMongoConnected ? 'MongoDB' : 'In-Memory Mode'}
            </span>
          </div>

          {/* Active Threats Counter */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${(stats?.threatsDetected || 0) > 0
            ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
            : 'bg-slate-800/80 border-slate-700/60 text-slate-400'
            }`}>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Threats: {stats?.threatsDetected || 0}</span>
          </div>
        </div>

      </div>
    </header>
  );
}
