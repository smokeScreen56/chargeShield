import React, { useState } from 'react';
import { Play, RotateCcw, AlertTriangle, ShieldAlert, ShieldCheck, CheckCircle2, Zap } from 'lucide-react';

export default function SimulatorPanel({
  onRunScenario,
  onResetDemo,
  isRunning,
  runningScenario,
  lastRunResult,
  runError
}) {
  const scenarios = [
    {
      key: 'normal_flow',
      title: 'Normal Flow',
      subtitle: 'Complete Charging Cycle',
      desc: 'BootNotification → Auth → StartTx → MeterValues (11kW) → StopTx.',
      expectedVerdict: 'ALLOW',
      expectedNote: 'All 6 stages clear',
      chargerId: 'CP001',
      stageTarget: 6,
      badgeColor: 'border-status-green bg-[#F0FDF4] text-status-green'
    },
    {
      key: 'attack_impersonation',
      title: 'Attack 1: Impersonation',
      subtitle: 'Duplicate Socket Hijack',
      desc: 'Rogue client connects with duplicate socket credentials for registered CP001.',
      expectedVerdict: 'BLOCK',
      expectedNote: 'Stage 1 Identity',
      chargerId: 'CP001',
      stageTarget: 1,
      badgeColor: 'border-status-red bg-[#FEF2F2] text-status-red'
    },
    {
      key: 'attack_fake_meter',
      title: 'Attack 2: Fake Meter',
      subtitle: 'Impossible Power Jump',
      desc: 'Charger reports 45.0 kW active power jump, exceeding 22.0 kW rated hardware limit.',
      expectedVerdict: 'BLOCK',
      expectedNote: 'Stage 4 Physics',
      chargerId: 'CP002',
      stageTarget: 4,
      payload: { reportedPowerKw: 45.0 },
      badgeColor: 'border-status-red bg-[#FEF2F2] text-status-red'
    },
    {
      key: 'attack_invalid_session',
      title: 'Attack 3: Invalid Session',
      subtitle: 'State Machine Bypass',
      desc: 'Attempts MeterValues telemetry without prior Authorize or StartTransaction.',
      expectedVerdict: 'BLOCK',
      expectedNote: 'Stage 3 State Machine',
      chargerId: 'CP002',
      stageTarget: 3,
      badgeColor: 'border-status-red bg-[#FEF2F2] text-status-red'
    },
    {
      key: 'attack_command_flooding',
      title: 'Attack 4: Command Flood',
      subtitle: 'Sliding-Window DoS Flooding',
      desc: 'Rapid blast of Reset commands triggering sliding rate-limit and 15s cool-down.',
      expectedVerdict: 'BLOCK',
      expectedNote: 'Stage 5 Flood Governor',
      chargerId: 'CP001',
      stageTarget: 5,
      payload: { count: 40 },
      badgeColor: 'border-status-red bg-[#FEF2F2] text-status-red'
    },
    {
      key: 'attack_grid_load',
      title: 'Attack 5: Grid Overload',
      subtitle: 'Substation Feeder Overload',
      desc: 'Simultaneous ramp-up of all 3 chargers to 38.5 kW, exceeding 35.0 kW substation capacity.',
      expectedVerdict: 'ALERT',
      expectedNote: 'Stage 6 Grid Check (CRITICAL)',
      chargerId: 'CP001',
      stageTarget: 6,
      badgeColor: 'border-signal-amber bg-[#FFFBEB] text-signal-amber'
    }
  ];

  return (
    <section className="bg-paper-card border-2 border-ink-black shadow-hard p-4 sm:p-5" aria-label="Scenario Injection Panel">
      
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b-2 border-ink-black gap-2">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-signal-amber border border-ink-black inline-block"></span>
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold text-ink-black tracking-tight">
              SCENARIO INJECTION TEST RIG
            </h2>
            <p className="text-xs font-mono text-ink-muted">
              Trigger real-time OCPP attacks and lifecycle simulations against ChargeShield gateway
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {onResetDemo && (
            <button
              onClick={onResetDemo}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-ink-black bg-paper-warm hover:bg-paper-card text-ink-black font-mono font-bold text-xs shadow-hard-sm hover:shadow-hard-hover active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5 text-signal-amber" />
              <span>RESET RIG & CLEAR LOGS</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Message Notice if any */}
      {runError && (
        <div className="mb-4 p-3 border-2 border-status-red bg-[#FEF2F2] shadow-hard-sm flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-status-red shrink-0 mt-0.5" />
          <div className="font-mono text-xs">
            <span className="font-bold text-status-red uppercase">EXECUTION ERROR: </span>
            <span className="text-ink-black">{runError}</span>
          </div>
        </div>
      )}

      {/* Active Running State Banner */}
      {isRunning && (
        <div className="mb-4 p-3 border-2 border-ink-black bg-paper-warm shadow-hard flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-signal-amber animate-ping border border-ink-black" />
            <div className="font-mono text-xs">
              <span className="font-bold text-ink-black uppercase">EXECUTING SCENARIO: </span>
              <span className="text-signal-amber font-bold">
                {scenarios.find(s => s.key === runningScenario)?.title || runningScenario}
              </span>
              <span className="text-ink-muted ml-2">Transmitting simulated OCPP frames...</span>
            </div>
          </div>
          <span className="label-tape text-[9px] bg-ink-black text-white px-2 py-0.5 animate-pulse">
            BUSY
          </span>
        </div>
      )}

      {/* Last Run Verdict Banner */}
      {lastRunResult && !isRunning && (
        <div
          className={`mb-4 p-3.5 border-2 border-ink-black shadow-hard flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            lastRunResult.passed
              ? 'bg-[#F0FDF4] border-status-green shadow-hard-green'
              : 'bg-[#FEF2F2] border-status-red shadow-hard-red'
          }`}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-sm text-ink-black">
                TEST OUTCOME: {lastRunResult.scenarioName || 'Simulation Completed'}
              </span>
              <span
                className={`font-mono text-[10px] font-bold px-1.5 py-0.5 border ${
                  lastRunResult.passed
                    ? 'border-status-green bg-white text-status-green'
                    : 'border-status-red bg-white text-status-red'
                }`}
              >
                {lastRunResult.passed ? 'VERIFIED MATCH' : 'VERDICT MISMATCH'}
              </span>
            </div>
            <div className="font-mono text-xs text-ink-muted mt-1">
              Expected: <strong className="text-ink-black">{lastRunResult.expectedVerdict}</strong> | Actual Gateway Verdict:{' '}
              <strong className={lastRunResult.actualVerdict === 'BLOCK' ? 'text-status-red' : lastRunResult.actualVerdict === 'ALERT' ? 'text-signal-amber' : 'text-status-green'}>
                {lastRunResult.actualVerdict}
              </strong>
            </div>
          </div>

          {/* Stamp Graphic */}
          <div className="self-end sm:self-auto">
            <div
              className={`border-2 px-3 py-1 font-mono text-xs font-black uppercase tracking-widest -rotate-2 animate-stamp-thunk ${
                lastRunResult.passed
                  ? 'border-status-green bg-white text-status-green'
                  : 'border-status-red bg-white text-status-red'
              }`}
            >
              {lastRunResult.passed ? 'TEST PASSED' : 'CHECK LOG'}
            </div>
          </div>
        </div>
      )}

      {/* 6 Scenario Push-Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {scenarios.map((scen, idx) => {
          const isThisRunning = isRunning && runningScenario === scen.key;

          return (
            <button
              key={scen.key}
              onClick={() => onRunScenario(scen.key, scen.chargerId, scen.payload || {}, scen.stageTarget)}
              disabled={isRunning}
              className={`text-left p-3.5 border-2 border-ink-black bg-paper-card shadow-hard hover:shadow-hard-hover active:translate-x-0.5 active:translate-y-0.5 transition-all flex flex-col justify-between group disabled:opacity-60 disabled:cursor-not-allowed ${
                isThisRunning ? 'bg-paper-warm border-signal-amber' : ''
              }`}
            >
              {/* Button Top: Index & Expected Badge */}
              <div className="flex items-start justify-between gap-2 border-b border-ink-faint/30 pb-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] font-bold text-ink-muted bg-paper-recessed px-1 border border-ink-black/20">
                    0{idx + 1}
                  </span>
                  <span className="font-display font-bold text-xs sm:text-sm text-ink-black group-hover:text-signal-amber transition-colors">
                    {scen.title}
                  </span>
                </div>

                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 border shrink-0 ${scen.badgeColor}`}>
                  {scen.expectedVerdict}
                </span>
              </div>

              {/* Description */}
              <p className="text-[11px] font-mono text-ink-muted leading-relaxed mb-3">
                {scen.desc}
              </p>

              {/* Bottom: Expected Stage & Action trigger */}
              <div className="pt-2 border-t border-dashed border-ink-black/20 flex items-center justify-between text-[10px] font-mono">
                <span className="text-ink-muted">
                  EXPECTED: <strong className="text-ink-black">{scen.expectedNote}</strong>
                </span>

                <span className="flex items-center gap-1 font-bold text-ink-black group-hover:text-signal-amber">
                  <Play className="w-3 h-3 fill-current" />
                  INJECT
                </span>
              </div>
            </button>
          );
        })}
      </div>

    </section>
  );
}
