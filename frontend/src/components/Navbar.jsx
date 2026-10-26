import React from 'react';
import { ShieldAlert, ShieldCheck, Database, Radio, Activity, RefreshCw } from 'lucide-react';

export default function Navbar({ isConnected, isMongoConnected, stats, onResetDemo, isResetting }) {
  const threatsCount = stats?.threatsDetected || 0;
  const blockedCount = stats?.blockedMessages || 0;

  return (
    <header className="border-b-2 border-ink-black bg-paper-card shadow-hard-sm static sm:sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Substation Header & Identification */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border-2 border-ink-black bg-paper-warm flex items-center justify-center shadow-hard-sm">
              <span className="font-display font-black text-lg text-ink-black">CS</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-ink-black">
                  ChargeShield
                </h1>
                <span className="label-tape text-[10px] px-1.5 py-0.5">
                  OCPP 1.6J
                </span>
                <span className="text-[11px] font-mono text-ink-muted border border-ink-black px-1.5 bg-paper-warm hidden sm:inline-block">
                  SUBSTATION #4 LOG
                </span>
              </div>
              <p className="text-xs text-ink-muted font-mono">
                Field Engineer Gateway & Automated Intercept Logbook
              </p>
            </div>
          </div>

          {/* Industrial Status Lamps & Controls */}
          <div className="flex items-center gap-2.5 flex-wrap">
            
            {/* Gateway Intercept Status Lamp */}
            <div className="flex items-center gap-2 px-2.5 py-1 bg-paper-warm border-2 border-ink-black shadow-hard-sm text-xs font-mono">
              <span
                className={`w-2.5 h-2.5 rounded-full border border-ink-black ${
                  isConnected ? 'bg-status-green' : 'bg-status-red animate-pulse'
                }`}
              />
              <span className="text-ink-muted text-[11px] uppercase">GATEWAY:</span>
              <span className="font-bold text-ink-black">
                {isConnected ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>

            {/* Persistence Mode */}
            <div className="flex items-center gap-2 px-2.5 py-1 bg-paper-warm border-2 border-ink-black shadow-hard-sm text-xs font-mono">
              <Database className="w-3.5 h-3.5 text-ink-muted" />
              <span className="text-ink-muted text-[11px] uppercase">STORAGE:</span>
              <span className="font-bold text-ink-black">
                {isMongoConnected ? 'MONGO' : 'IN-MEMORY'}
              </span>
            </div>

            {/* Threats / Intercepts Tally Badge */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1 border-2 border-ink-black text-xs font-mono font-bold shadow-hard-sm ${
                threatsCount > 0
                  ? 'bg-[#FEE2E2] text-status-red'
                  : 'bg-paper-warm text-ink-black'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-status-red" />
              <span>INTERCEPTS: {threatsCount}</span>
            </div>

            {/* Reset Demo Button */}
            {onResetDemo && (
              <button
                onClick={onResetDemo}
                disabled={isResetting}
                title="Clear logs and reset substation simulator state"
                className="flex items-center gap-1.5 px-2.5 py-1 bg-paper-card border-2 border-ink-black shadow-hard-sm hover:shadow-hard-hover active:translate-x-0.5 active:translate-y-0.5 text-xs font-mono font-bold text-ink-black hover:bg-paper-warm transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">RESET DEMO</span>
              </button>
            )}

          </div>

        </div>
      </div>
    </header>
  );
}
