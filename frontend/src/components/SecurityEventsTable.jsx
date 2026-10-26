import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, ChevronDown, ChevronUp, Filter, Trash2 } from 'lucide-react';

export default function SecurityEventsTable({ events, onClearEvents }) {
  const [filterAction, setFilterAction] = useState('ALL');
  const [expandedRow, setExpandedRow] = useState(null);

  const filteredEvents = events.filter(evt => {
    if (filterAction === 'BLOCKED') return evt.action === 'BLOCK';
    if (filterAction === 'ALERT') return evt.action === 'ALERT';
    if (filterAction === 'ALLOWED') return evt.action === 'ALLOW';
    if (filterAction === 'THREATS') return evt.detectionType !== 'Normal';
    return true;
  });

  const getVerdictStamp = (action, isNew = false) => {
    if (action === 'BLOCK') {
      return (
        <div className={`inline-block border-2 border-status-red bg-[#FEF2F2] text-status-red px-2.5 py-0.5 text-xs font-mono font-black tracking-widest uppercase -rotate-2 ${isNew ? 'animate-stamp-thunk' : ''}`}>
          BLOCKED
        </div>
      );
    }
    if (action === 'ALERT') {
      return (
        <div className="inline-block border-2 border-signal-amber bg-[#FFFBEB] text-signal-amber px-2.5 py-0.5 text-xs font-mono font-black tracking-wider uppercase rotate-1">
          ALERT
        </div>
      );
    }
    return (
      <div className="inline-block border-2 border-status-green bg-[#F0FDF4] text-status-green px-2 py-0.5 text-xs font-mono font-bold tracking-wider uppercase rotate-1">
        PASSED
      </div>
    );
  };

  const getSeverityBadge = (severity, score) => {
    const sev = severity || (score >= 60 ? 'HIGH' : score >= 30 ? 'MEDIUM' : 'LOW');
    let badgeClass = 'border-ink-black/40 text-ink-muted bg-paper-card';

    if (sev === 'CRITICAL' || score >= 70) {
      badgeClass = 'border-status-red text-status-red bg-[#FEF2F2] font-black';
    } else if (sev === 'HIGH' || score >= 50) {
      badgeClass = 'border-signal-amber text-signal-amber bg-[#FFFBEB] font-bold';
    } else if (sev === 'MEDIUM' || score >= 20) {
      badgeClass = 'border-status-amber text-status-amber bg-[#FEF3C7] font-semibold';
    } else {
      badgeClass = 'border-status-green text-status-green bg-[#F0FDF4]';
    }

    return (
      <span className={`px-1.5 py-0.5 border text-[10px] font-mono ${badgeClass}`}>
        {sev} ({score ?? 0})
      </span>
    );
  };

  return (
    <section className="bg-paper-card border-2 border-ink-black shadow-hard p-4 sm:p-5" aria-label="Security Incident and Inspection Ledger">
      
      {/* Table Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b-2 border-ink-black gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-signal-amber border border-ink-black inline-block"></span>
            <h2 className="font-display text-base sm:text-lg font-bold text-ink-black tracking-tight">
              GATEWAY INTERCEPT & DISPATCH LOG
            </h2>
          </div>
          <p className="text-xs font-mono text-ink-muted">
            Chronological inspection records with per-station diagnostic telemetry
          </p>
        </div>

        {/* Filter Index Tabs & Clear Button */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex border-2 border-ink-black bg-paper-warm p-0.5 shadow-hard-sm">
            {['ALL', 'THREATS', 'BLOCKED', 'ALERT', 'ALLOWED'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterAction(tab)}
                className={`px-2.5 py-1 text-[11px] font-mono font-bold transition-all ${
                  filterAction === tab
                    ? 'bg-ink-black text-white shadow-sm'
                    : 'text-ink-muted hover:text-ink-black hover:bg-paper-card'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {onClearEvents && (
            <button
              onClick={onClearEvents}
              title="Clear logged events"
              className="p-1.5 border-2 border-ink-black bg-paper-card hover:bg-[#FEE2E2] hover:text-status-red text-ink-muted shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 transition-all text-xs font-mono"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Ticket-Stub Log Entries */}
      <div className="space-y-2.5">
        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-ink-black/40 bg-paper-warm/50 text-ink-muted font-mono text-xs">
            <p className="font-bold text-ink-black">No security events recorded in ledger.</p>
            <p className="mt-1">Execute a scenario from the Test Rig above to inject live OCPP frames.</p>
          </div>
        ) : (
          filteredEvents.map((evt, idx) => {
            const isExpanded = expandedRow === (evt._id || idx);
            const timeStr = evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : 'LIVE';
            const isBlocked = evt.action === 'BLOCK';
            const isAlert = evt.action === 'ALERT';

            return (
              <div
                key={evt._id || idx}
                className={`border-2 border-ink-black bg-paper-card transition-all ${
                  isBlocked
                    ? 'bg-[#FEF2F2]/40 border-status-red shadow-hard-red'
                    : isAlert
                    ? 'bg-[#FFFBEB]/50 border-signal-amber shadow-hard-amber'
                    : 'shadow-hard-sm hover:bg-paper-warm/60'
                }`}
              >
                {/* Main Ticket Stub Row */}
                <div
                  onClick={() => setExpandedRow(isExpanded ? null : (evt._id || idx))}
                  className="p-3 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-2.5"
                >
                  {/* Left: Timestamp + Charger + Action */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-xs font-bold text-ink-muted bg-paper-warm px-1.5 py-0.5 border border-ink-black/40">
                      {timeStr}
                    </span>

                    <span className={`font-mono text-xs font-black px-1.5 py-0.5 border-2 ${
                      evt.chargerId === 'CP999'
                        ? 'border-status-red bg-status-red text-white'
                        : 'border-ink-black bg-paper-card text-ink-black'
                    }`}>
                      {evt.chargerId}
                    </span>

                    <span className="font-mono text-xs font-bold text-ink-black">
                      [{evt.messageType || 'OCPP_MSG'}]
                    </span>

                    <span className="text-xs font-mono text-ink-muted hidden sm:inline">
                      → {evt.detectionType || 'Normal Inspection'}
                    </span>
                  </div>

                  {/* Right: Stage Tag + Severity + Rubber Stamp + Toggle */}
                  <div className="flex items-center gap-3 self-end md:self-auto">
                    {evt.stage && (
                      <span className="text-[10px] font-mono text-ink-muted bg-paper-recessed px-1.5 py-0.5 border border-ink-black/20 hidden lg:inline">
                        {evt.stage}
                      </span>
                    )}

                    {getSeverityBadge(evt.severity, evt.riskScore)}

                    {/* Rubber Stamp Verdict */}
                    <div>
                      {getVerdictStamp(evt.action, idx === 0)}
                    </div>

                    <div className="text-ink-muted hover:text-ink-black p-0.5">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Perforated Divider for Expanded Slip */}
                {isExpanded && (
                  <div className="border-t-2 border-dashed border-ink-black p-3.5 bg-paper-warm/80 font-mono text-xs space-y-2">
                    
                    {/* Reason Banner */}
                    <div>
                      <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">
                        DIAGNOSTIC VERDICT SUMMARY:
                      </span>
                      <p className="mt-1 p-2 bg-paper-card border-2 border-ink-black text-ink-black font-mono text-xs leading-relaxed">
                        {evt.reason || 'Frame cleared all 6 pipeline checkpoints without anomalies.'}
                      </p>
                    </div>

                    {/* Aggregated Traffic Dropped Counter if flooding */}
                    {evt.aggregatedCount > 1 && (
                      <div className="p-2 border-2 border-status-red bg-[#FEF2F2] text-status-red text-xs font-bold flex justify-between">
                        <span>⚠️ FLOOD GOVERNOR ACTIVE:</span>
                        <span>{evt.aggregatedCount} DUPLICATE FRAMES SUPPRESSED DURING COOL-DOWN</span>
                      </div>
                    )}

                    {/* Pipeline Breakdown Stations */}
                    {evt.pipelineSteps && evt.pipelineSteps.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">
                          STATION-BY-STATION INSPECTOR TRAIL:
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 mt-1">
                          {evt.pipelineSteps.map((step, sIdx) => (
                            <div
                              key={sIdx}
                              className={`p-1.5 border text-[10px] font-mono ${
                                step.passed
                                  ? 'bg-paper-card border-ink-black/30 text-ink-black'
                                  : 'bg-[#FEF2F2] border-status-red text-status-red font-bold'
                              }`}
                            >
                              <div className="flex justify-between">
                                <span className="truncate">{step.stage || `STN-${sIdx + 1}`}</span>
                                <span>{step.passed ? '✓' : '✗'}</span>
                              </div>
                              {!step.passed && step.reason && (
                                <div className="text-[9px] text-status-red mt-0.5 truncate" title={step.reason}>
                                  {step.reason}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </section>
  );
}
