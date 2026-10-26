import React from 'react';
import { Activity, ShieldX, CheckCircle, Zap, ShieldAlert, Cpu } from 'lucide-react';

export default function OverviewCards({ stats }) {
  const messagesProcessed = stats?.messagesProcessed || 0;
  const threatsDetected = stats?.threatsDetected || 0;
  const blockedMessages = stats?.blockedMessages || 0;
  const activeChargers = stats?.activeChargers || 0;
  const activeSessions = stats?.activeSessions || 0;
  const totalChargers = stats?.totalChargers || 3;

  return (
    <section aria-label="Substation Metrics Ledger">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
        
        {/* Large Ledger Ticket 1: Processed Traffic (5 cols) */}
        <div className="md:col-span-5 bg-paper-card border-2 border-ink-black p-4 shadow-hard flex flex-col justify-between">
          <div className="flex items-center justify-between border-b-2 border-dashed border-ink-black pb-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-ink-black inline-block"></span>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink-black">
                LEDGER #01: OCPP TRAFFIC
              </span>
            </div>
            <span className="text-[10px] font-mono text-ink-muted">INSPECTION LOG</span>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <div className="font-display text-4xl sm:text-5xl font-black text-ink-black tracking-tight">
                {messagesProcessed}
              </div>
              <div className="text-xs font-mono text-ink-muted mt-0.5">
                Total Frames Evaluated
              </div>
            </div>

            {/* Sub-breakdown in ticket style */}
            <div className="text-right font-mono text-xs space-y-1">
              <div className="text-status-green font-bold">
                ✓ {Math.max(0, messagesProcessed - blockedMessages)} ALLOWED
              </div>
              <div className={blockedMessages > 0 ? 'text-status-red font-bold' : 'text-ink-muted'}>
                ✗ {blockedMessages} BLOCKED
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-ink-faint/30 text-[11px] font-mono text-ink-muted flex justify-between">
            <span>Protocol: OCPP 1.6-J JSON</span>
            <span>Gateway Filter: ACTIVE</span>
          </div>
        </div>

        {/* Medium Ledger Ticket 2: Security Interventions & Threat Status (4 cols) */}
        <div
          className={`md:col-span-4 border-2 border-ink-black p-4 shadow-hard flex flex-col justify-between transition-colors ${
            threatsDetected > 0
              ? 'bg-[#FEF2F2] border-status-red shadow-hard-red'
              : 'bg-paper-card'
          }`}
        >
          <div className="flex items-center justify-between border-b-2 border-dashed border-ink-black pb-2 mb-3">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 inline-block ${
                  threatsDetected > 0 ? 'bg-status-red animate-ping' : 'bg-status-green'
                }`}
              ></span>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink-black">
                LEDGER #02: THREAT AUDIT
              </span>
            </div>
            {threatsDetected > 0 ? (
              <span className="label-tape text-[9px] bg-status-red text-white px-1">ALERT</span>
            ) : (
              <span className="text-[10px] font-mono text-status-green font-bold">CLEAR</span>
            )}
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <div
                className={`font-display text-4xl sm:text-5xl font-black tracking-tight ${
                  threatsDetected > 0 ? 'text-status-red' : 'text-ink-black'
                }`}
              >
                {threatsDetected}
              </div>
              <div className="text-xs font-mono text-ink-muted mt-0.5">
                Anomalies Trapped
              </div>
            </div>

            {/* Stamp Badge */}
            <div>
              {threatsDetected > 0 ? (
                <div className="border-2 border-status-red px-2 py-0.5 text-status-red font-mono text-xs font-black uppercase tracking-widest -rotate-3 animate-stamp-thunk">
                  INTERCEPT
                </div>
              ) : (
                <div className="border border-status-green px-2 py-0.5 text-status-green font-mono text-[11px] font-bold uppercase rotate-1">
                  SECURE
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-ink-faint/30 text-[11px] font-mono text-ink-muted">
            {threatsDetected > 0 ? (
              <span className="text-status-red font-bold">⚠️ Rogue frames neutralized at gateway</span>
            ) : (
              <span>Nothing suspicious. Yet.</span>
            )}
          </div>
        </div>

        {/* Small Log Slips: Hardware & Session Status (3 cols, stacked into 2 cards) */}
        <div className="md:col-span-3 flex flex-col gap-3">
          
          {/* Slip A: Charger Bays */}
          <div className="bg-paper-warm border-2 border-ink-black p-3 shadow-hard flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-ink-muted">
                CHARGER TERMINALS
              </div>
              <div className="font-display text-2xl font-bold text-ink-black mt-0.5">
                {activeChargers} <span className="text-xs font-mono font-normal text-ink-muted">/ {totalChargers} ONLINE</span>
              </div>
            </div>
            <div className="w-8 h-8 border-2 border-ink-black bg-paper-card flex items-center justify-center font-mono font-bold text-xs shadow-hard-sm">
              <Zap className="w-4 h-4 text-signal-amber" />
            </div>
          </div>

          {/* Slip B: Active Charging Sessions */}
          <div className="bg-paper-warm border-2 border-ink-black p-3 shadow-hard flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-ink-muted">
                ACTIVE SESSIONS
              </div>
              <div className="font-display text-2xl font-bold text-ink-black mt-0.5">
                {activeSessions} <span className="text-xs font-mono font-normal text-ink-muted">ENERGIZED</span>
              </div>
            </div>
            <div className="w-8 h-8 border-2 border-ink-black bg-paper-card flex items-center justify-center font-mono font-bold text-xs shadow-hard-sm">
              <Activity className="w-4 h-4 text-ink-black" />
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
