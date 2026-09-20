import React, { useState } from 'react';
import { Play, ShieldAlert, Zap, AlertTriangle, RefreshCw, Trash2, CheckCircle2 } from 'lucide-react';
import { runSimulatorScenario, clearEventsApi } from '../services/api';

export default function SimulatorControls({ onActionComplete }) {
  const [loadingScenario, setLoadingScenario] = useState(null);
  const [selectedCharger, setSelectedCharger] = useState('CP001');
  const [selectedAction, setSelectedAction] = useState('Heartbeat');
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const handleRunScenario = async (scenarioKey, title, chargerId = 'CP001', payload = {}) => {
    setLoadingScenario(scenarioKey);
    setFeedbackMsg(null);
    try {
      const res = await runSimulatorScenario(scenarioKey, chargerId, payload);
      setFeedbackMsg({
        type: res.success ? 'success' : 'error',
        text: `Executed: ${title}`
      });
      if (onActionComplete) onActionComplete();
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: `Failed: ${err.message}`
      });
    } finally {
      setLoadingScenario(null);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  const handleClear = async () => {
    try {
      await clearEventsApi();
      if (onActionComplete) onActionComplete();
      setFeedbackMsg({ type: 'success', text: 'Security logs cleared.' });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err) {
      // error
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-white">EV Charger & Attack Simulator</h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-medium">
              Live Testbench
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Inject realistic OCPP 1.6J traffic and demonstrate project security attack scenarios
          </p>
        </div>

        <button
          onClick={handleClear}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-rose-400 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors w-fit"
          title="Clear Event Log"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Logs</span>
        </button>
      </div>

      {feedbackMsg && (
        <div
          className={`mb-4 px-3.5 py-2 rounded-lg text-xs flex items-center gap-2 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/60'
              : 'bg-rose-950/40 text-rose-300 border border-rose-800/60'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Attack Scenario Triggers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        
        {/* Normal Flow */}
        <button
          disabled={loadingScenario !== null}
          onClick={() => handleRunScenario('normal_flow', 'Normal Charging Cycle', 'CP001')}
          className="p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-800/40 hover:border-emerald-700/80 text-left transition-all group disabled:opacity-50"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
              Normal Operation
            </span>
            <Zap className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <h4 className="text-xs font-bold text-white mb-1">Full Charging Flow</h4>
          <p className="text-[11px] text-slate-400 leading-tight">
            Boot → Auth → Start → Meter (6.8 kW) → Stop on CP001 (Rated 7.4 kW).
          </p>
          <div className="mt-2 text-[10px] font-mono text-emerald-400 font-semibold">
            {loadingScenario === 'normal_flow' ? 'Simulating...' : 'Expected: ALLOW (Risk 0)'}
          </div>
        </button>

        {/* Attack 1: Impersonation */}
        <button
          disabled={loadingScenario !== null}
          onClick={() => handleRunScenario('attack_impersonation', 'Attack 1: Charger Impersonation', 'CP001')}
          className="p-3.5 rounded-lg bg-rose-950/20 border border-rose-800/40 hover:border-rose-700/80 text-left transition-all group disabled:opacity-50"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider">
              Attack Scenario 1
            </span>
            <ShieldAlert className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
          </div>
          <h4 className="text-xs font-bold text-white mb-1">Charger Impersonation</h4>
          <p className="text-[11px] text-slate-400 leading-tight">
            2nd rogue socket claims identity of active charger CP001.
          </p>
          <div className="mt-2 text-[10px] font-mono text-rose-400 font-semibold">
            {loadingScenario === 'attack_impersonation' ? 'Simulating...' : 'Expected: BLOCK (Risk +40)'}
          </div>
        </button>

        {/* Attack 2: Fake Meter */}
        <button
          disabled={loadingScenario !== null}
          onClick={() => handleRunScenario('attack_fake_meter', 'Attack 2: Fake Meter Reading', 'CP001', { reportedPowerKw: 25.0 })}
          className="p-3.5 rounded-lg bg-amber-950/20 border border-amber-800/40 hover:border-amber-700/80 text-left transition-all group disabled:opacity-50"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
              Attack Scenario 2
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <h4 className="text-xs font-bold text-white mb-1">Fake Meter Reading</h4>
          <p className="text-[11px] text-slate-400 leading-tight">
            Reports 25.0 kW on CP001 (Physical capacity rated 7.4 kW).
          </p>
          <div className="mt-2 text-[10px] font-mono text-amber-400 font-semibold">
            {loadingScenario === 'attack_fake_meter' ? 'Simulating...' : 'Expected: BLOCK (Risk +30)'}
          </div>
        </button>

        {/* Attack 3: Invalid Session */}
        <button
          disabled={loadingScenario !== null}
          onClick={() => handleRunScenario('attack_invalid_session', 'Attack 3: Invalid Session', 'CP002')}
          className="p-3.5 rounded-lg bg-indigo-950/20 border border-indigo-800/40 hover:border-indigo-700/80 text-left transition-all group disabled:opacity-50"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">
              Attack Scenario 3
            </span>
            <AlertTriangle className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
          </div>
          <h4 className="text-xs font-bold text-white mb-1">Invalid Session Seq</h4>
          <p className="text-[11px] text-slate-400 leading-tight">
            Sends StopTransaction on idle CP002 without active transaction.
          </p>
          <div className="mt-2 text-[10px] font-mono text-indigo-400 font-semibold">
            {loadingScenario === 'attack_invalid_session' ? 'Simulating...' : 'Expected: BLOCK (Risk +30)'}
          </div>
        </button>

      </div>

      {/* Rogue Charger & Single Message Trigger Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 font-medium">Single Message:</span>
          
          <select
            value={selectedCharger}
            onChange={(e) => setSelectedCharger(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-sky-500"
          >
            <option value="CP001">CP001 (7.4 kW)</option>
            <option value="CP002">CP002 (22.0 kW)</option>
            <option value="CP003">CP003 (11.0 kW)</option>
          </select>

          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-sky-500"
          >
            <option value="Heartbeat">Heartbeat</option>
            <option value="BootNotification">BootNotification</option>
            <option value="Authorize">Authorize</option>
            <option value="Reset">Reset</option>
          </select>

          <button
            disabled={loadingScenario !== null}
            onClick={() => handleRunScenario('single_message', `${selectedAction} on ${selectedCharger}`, selectedCharger, { action: selectedAction })}
            className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium transition-colors disabled:opacity-50"
          >
            Send Frame
          </button>
        </div>

        {/* Rogue Charger Quick Attack */}
        <button
          disabled={loadingScenario !== null}
          onClick={() => handleRunScenario('attack_unauthorized', 'Unauthorized Charger CP999', 'CP999')}
          className="px-3 py-1 bg-rose-900/40 hover:bg-rose-900/70 border border-rose-700 text-rose-300 rounded font-medium transition-colors disabled:opacity-50"
        >
          Simulate Rogue Charger (CP999)
        </button>
      </div>
    </div>
  );
}
