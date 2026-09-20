import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, AlertCircle, ChevronDown, ChevronUp, Filter } from 'lucide-react';

export default function SecurityEventsTable({ events }) {
  const [filterAction, setFilterAction] = useState('ALL');
  const [expandedRow, setExpandedRow] = useState(null);

  const filteredEvents = events.filter(evt => {
    if (filterAction === 'BLOCKED') return evt.action === 'BLOCK';
    if (filterAction === 'ALLOWED') return evt.action === 'ALLOW';
    if (filterAction === 'THREATS') return evt.detectionType !== 'Normal';
    return true;
  });

  const getSeverityBadge = (severity, score) => {
    let style = 'bg-slate-800 text-slate-300 border-slate-700';
    if (severity === 'CRITICAL' || score >= 81) {
      style = 'bg-red-950/60 text-red-300 border-red-800';
    } else if (severity === 'HIGH' || score >= 61) {
      style = 'bg-orange-950/60 text-orange-300 border-orange-800';
    } else if (severity === 'MEDIUM' || score >= 31) {
      style = 'bg-amber-950/60 text-amber-300 border-amber-800';
    } else {
      style = 'bg-emerald-950/60 text-emerald-300 border-emerald-800';
    }

    return (
      <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${style}`}>
        {severity || 'LOW'} ({score || 0})
      </span>
    );
  };

  const getActionBadge = (action) => {
    if (action === 'BLOCK') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-950/60 text-rose-300 border border-rose-800">
          <ShieldAlert className="w-3 h-3" />
          BLOCK
        </span>
      );
    }
    if (action === 'ALERT') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-950/60 text-amber-300 border border-amber-800">
          <AlertCircle className="w-3 h-3" />
          ALERT
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800">
        <ShieldCheck className="w-3 h-3" />
        ALLOW
      </span>
    );
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-white">Live Security Events & Audit Log</h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
              Real-Time Stream
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Real-time inspection decisions and risk scores for processed OCPP messages
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-xs">
          {['ALL', 'THREATS', 'BLOCKED', 'ALLOWED'].map((key) => (
            <button
              key={key}
              onClick={() => setFilterAction(key)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                filterAction === key
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      {/* Events Table */}
      <div className="overflow-x-auto border border-slate-800/80 rounded-lg">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/90 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider font-semibold">
            <tr>
              <th className="py-3 px-3">Time</th>
              <th className="py-3 px-3">Charger</th>
              <th className="py-3 px-3">Message Action</th>
              <th className="py-3 px-3">Detection Type</th>
              <th className="py-3 px-3">Risk & Severity</th>
              <th className="py-3 px-3 text-center">Decision</th>
              <th className="py-3 px-3 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-8 text-center text-slate-500">
                  No security events recorded yet. Trigger a scenario above to test the gateway!
                </td>
              </tr>
            ) : (
              filteredEvents.map((evt, idx) => {
                const isExpanded = expandedRow === (evt._id || idx);
                const timeStr = new Date(evt.timestamp).toLocaleTimeString();

                return (
                  <React.Fragment key={evt._id || idx}>
                    <tr
                      className={`hover:bg-slate-800/40 transition-colors ${
                        evt.action === 'BLOCK' ? 'bg-rose-950/10' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-slate-400 font-mono whitespace-nowrap">
                        {timeStr}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`font-mono font-semibold ${
                          evt.chargerId === 'CP999' ? 'text-rose-400' : 'text-slate-200'
                        }`}>
                          {evt.chargerId}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 font-mono font-medium text-sky-300 whitespace-nowrap">
                        {evt.messageType}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={evt.detectionType !== 'Normal' ? 'text-rose-300 font-semibold' : 'text-slate-400'}>
                          {evt.detectionType}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {getSeverityBadge(evt.severity, evt.riskScore)}
                      </td>

                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {getActionBadge(evt.action)}
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => setExpandedRow(isExpanded ? null : (evt._id || idx))}
                          className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>

                    {/* Expandable Diagnostic Panel */}
                    {isExpanded && (
                      <tr className="bg-slate-950/80">
                        <td colSpan="7" className="p-4 border-t border-slate-800/80">
                          <div className="space-y-2">
                            <div>
                              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                                Diagnostic Reason:
                              </span>
                              <p className="text-xs text-slate-200 font-mono mt-0.5 bg-slate-900 p-2 rounded border border-slate-800">
                                {evt.reason || 'No additional errors recorded.'}
                              </p>
                            </div>

                            {evt.pipelineSteps && evt.pipelineSteps.length > 0 && (
                              <div>
                                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                                  Pipeline Stage Breakdown:
                                </span>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                                  {evt.pipelineSteps.map((s, sIdx) => (
                                    <div
                                      key={sIdx}
                                      className={`p-2 rounded border text-[11px] font-mono ${
                                        s.passed
                                          ? 'bg-slate-900 border-slate-800 text-slate-300'
                                          : 'bg-rose-950/40 border-rose-800 text-rose-300 font-semibold'
                                      }`}
                                    >
                                      <div className="flex justify-between">
                                        <span>{s.stage}</span>
                                        <span>{s.passed ? '✓' : '✗'}</span>
                                      </div>
                                      {!s.passed && <div className="text-[10px] text-rose-400 mt-0.5 truncate">{s.reason}</div>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
