import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, ArrowRight, Lock, Check } from 'lucide-react';

export default function PipelineViewer({ lastEvent, activeHighlightStage }) {
  // Determine active/highlighted stage from prop or recent event
  let currentStageIndex = -1;
  let isTrapped = false;
  let isAlert = false;

  if (activeHighlightStage) {
    currentStageIndex = activeHighlightStage - 1;
    isTrapped = true;
  } else if (lastEvent) {
    const stageStr = (lastEvent.stage || '').toLowerCase();
    const detStr = (lastEvent.detectionType || '').toLowerCase();

    if (stageStr.includes('stage 1') || stageStr.includes('identity') || detStr.includes('impersonation') || detStr.includes('unauthorized')) {
      currentStageIndex = 0;
    } else if (stageStr.includes('stage 2') || stageStr.includes('format') || detStr.includes('malformed') || detStr.includes('schema')) {
      currentStageIndex = 1;
    } else if (stageStr.includes('stage 3') || stageStr.includes('session') || detStr.includes('session') || detStr.includes('state machine')) {
      currentStageIndex = 2;
    } else if (stageStr.includes('stage 4') || stageStr.includes('physics') || detStr.includes('physics') || detStr.includes('meter')) {
      currentStageIndex = 3;
    } else if (stageStr.includes('stage 5') || stageStr.includes('command') || stageStr.includes('flood') || detStr.includes('flood')) {
      currentStageIndex = 4;
    } else if (stageStr.includes('stage 6') || stageStr.includes('grid') || detStr.includes('grid')) {
      currentStageIndex = 5;
    } else if (lastEvent.action === 'ALLOW') {
      currentStageIndex = 6; // Passed all 6 stations
    }

    if (lastEvent.action === 'BLOCK') isTrapped = true;
    if (lastEvent.action === 'ALERT') isAlert = true;
  }

  // Animation position for the traveling packet token (0% to 100%)
  const [packetPos, setPacketPos] = useState(100);

  useEffect(() => {
    if (currentStageIndex >= 0 && currentStageIndex <= 5) {
      // Station center percentages approximately
      const targetPercent = Math.min(100, Math.max(8, (currentStageIndex / 5) * 88 + 6));
      setPacketPos(targetPercent);
    } else if (currentStageIndex === 6) {
      setPacketPos(98);
    }
  }, [currentStageIndex, lastEvent]);

  const stations = [
    {
      id: 'STN-01',
      title: 'Identity Intercept',
      subtitle: 'Socket & ID Registry',
      desc: 'Rejects spoofed CP001 sockets & unregistered CP999',
      stageNum: 1
    },
    {
      id: 'STN-02',
      title: 'OCPP Framing',
      subtitle: '1.6-J Protocol Schema',
      desc: 'Validates JSON syntax, mandatory parameters & CALL format',
      stageNum: 2
    },
    {
      id: 'STN-03',
      title: 'Session FSM',
      subtitle: 'Sequence Lock',
      desc: 'Enforces Authorize → Start → Meter → Stop state transitions',
      stageNum: 3
    },
    {
      id: 'STN-04',
      title: 'Physics Governor',
      subtitle: 'Telemetry Boundaries',
      desc: 'Checks 22kW hardware ceiling & blocks meter rollbacks',
      stageNum: 4
    },
    {
      id: 'STN-05',
      title: 'Flood Barrier',
      subtitle: '10s Sliding Limiter',
      desc: 'Traps DoS resets (>10/10s) with 15s cool-down isolation',
      stageNum: 5
    },
    {
      id: 'STN-06',
      title: 'Substation Load',
      subtitle: 'Feeder Capacity (35kW)',
      desc: 'Alerts at 80% (28kW) & trips CRITICAL alert on aggregate overload',
      stageNum: 6
    }
  ];

  return (
    <section className="bg-paper-card border-2 border-ink-black shadow-hard p-4 sm:p-5" aria-label="Inspection Pipeline Rail">
      
      {/* Conveyor Rail Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b-2 border-ink-black gap-2">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-signal-amber border border-ink-black"></span>
          <h2 className="font-display text-base sm:text-lg font-bold text-ink-black tracking-tight">
            CONVEYOR RAILWAY // 6-STATION INSPECTION RIG
          </h2>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono text-ink-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-status-green border border-ink-black"></span>
            CLEARED
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-signal-amber border border-ink-black"></span>
            CHECKPOINT
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-status-red border border-ink-black"></span>
            LOCKOUT GATE
          </span>
        </div>
      </div>

      {/* The Physical Conveyor Track */}
      <div className="relative pt-6 pb-2">
        
        {/* Conveyor metallic rail guides (running horizontally behind stations) */}
        <div className="hidden lg:block absolute top-[52px] left-0 right-0 h-4 bg-paper-recessed border-y-2 border-ink-black z-0">
          <div className="w-full h-full opacity-30 bg-[repeating-linear-gradient(90deg,#121314,#121314_2px,transparent_2px,transparent_16px)]" />
        </div>

        {/* Moving Packet Token on Rail */}
        <div
          className="hidden lg:flex absolute top-[44px] z-20 items-center justify-center transition-all duration-500 ease-out"
          style={{ left: `${packetPos}%`, transform: 'translateX(-50%)' }}
        >
          <div
            className={`px-2 py-0.5 border-2 border-ink-black text-[10px] font-mono font-bold shadow-hard-sm whitespace-nowrap ${
              isTrapped
                ? 'bg-status-red text-white animate-stamp-thunk'
                : isAlert
                ? 'bg-signal-amber text-white'
                : 'bg-paper-warm text-ink-black'
            }`}
          >
            {isTrapped ? '⚠️ TRAPPED' : isAlert ? '⚡ ALERT' : '✉️ [PKT-1.6J]'}
          </div>
        </div>

        {/* 6 Stations along the rail */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 relative z-10">
          {stations.map((stn, idx) => {
            const isThisStationActive = currentStageIndex === idx;
            const isStationLocked = isThisStationActive && isTrapped;
            const isStationAlert = isThisStationActive && isAlert;
            const hasPassedThis = currentStageIndex > idx || currentStageIndex === 6;

            return (
              <div
                key={stn.id}
                className={`border-2 p-3 flex flex-col justify-between transition-all bg-paper-card relative ${
                  isStationLocked
                    ? 'border-status-red bg-[#FEF2F2] shadow-hard-red'
                    : isStationAlert
                    ? 'border-signal-amber bg-[#FFFBEB] shadow-hard-amber'
                    : isThisStationActive
                    ? 'border-ink-black bg-paper-warm shadow-hard'
                    : 'border-ink-black/80 hover:border-ink-black shadow-hard-sm'
                }`}
              >
                {/* Station Tag & Status Lamp */}
                <div className="flex items-center justify-between border-b border-ink-faint/30 pb-1.5 mb-2">
                  <span className="font-mono text-[10px] font-bold text-ink-muted">
                    {stn.id}
                  </span>
                  
                  {isStationLocked ? (
                    <span className="label-tape text-[8px] bg-status-red text-white px-1">
                      LOCKED
                    </span>
                  ) : isStationAlert ? (
                    <span className="label-tape text-[8px] bg-signal-amber text-white px-1">
                      WARN
                    </span>
                  ) : hasPassedThis ? (
                    <span className="text-[10px] text-status-green font-mono font-bold">
                      ✓ PASS
                    </span>
                  ) : (
                    <span className="w-2 h-2 rounded-full border border-ink-black bg-paper-recessed" />
                  )}
                </div>

                {/* Station Core Information */}
                <div>
                  <h3 className="font-display font-bold text-xs sm:text-sm text-ink-black leading-snug">
                    {stn.title}
                  </h3>
                  <div className="text-[10px] font-mono text-signal-amber font-semibold mt-0.5">
                    {stn.subtitle}
                  </div>
                  <p className="text-[11px] font-mono text-ink-muted mt-1 leading-relaxed">
                    {stn.desc}
                  </p>
                </div>

                {/* Lockout / Gate Stamp if tripped */}
                {isStationLocked && (
                  <div className="mt-2 pt-1 border-t-2 border-dashed border-status-red text-center">
                    <span className="inline-block border-2 border-status-red text-status-red font-mono text-[10px] font-black uppercase px-1.5 py-0.5 -rotate-2 animate-stamp-thunk">
                      TRAPPED HERE
                    </span>
                  </div>
                )}
                {isStationAlert && (
                  <div className="mt-2 pt-1 border-t-2 border-dashed border-signal-amber text-center">
                    <span className="inline-block border border-signal-amber text-signal-amber font-mono text-[10px] font-bold uppercase px-1 py-0.5">
                      OVERLOAD ALERT
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>

    </section>
  );
}
