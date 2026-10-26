import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import OverviewCards from './components/OverviewCards';
import SimulatorPanel from './components/SimulatorPanel';
import PipelineViewer from './components/PipelineViewer';
import ChargerGrid from './components/ChargerGrid';
import SecurityEventsTable from './components/SecurityEventsTable';
import { fetchStats, fetchChargers, fetchEvents, clearEventsApi, runSimulatorScenario } from './services/api';
import { socket } from './services/socket';

export default function App() {
  const [stats, setStats] = useState({
    totalChargers: 3,
    activeChargers: 0,
    activeSessions: 0,
    messagesProcessed: 0,
    threatsDetected: 0,
    blockedMessages: 0,
    isMongoConnected: false,
    currentGridLoadKw: 0,
    gridCapacityKw: 35.0,
    gridWarningThresholdKw: 28.0,
    gridUtilizationPercent: 0,
    gridStatus: 'NORMAL'
  });

  const [chargers, setChargers] = useState([]);
  const [events, setEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(socket.connected);

  // Simulator & Inspection UI state
  const [isRunningScenario, setIsRunningScenario] = useState(false);
  const [runningScenarioKey, setRunningScenarioKey] = useState(null);
  const [lastRunResult, setLastRunResult] = useState(null);
  const [runError, setRunError] = useState(null);
  const [activeHighlightStage, setActiveHighlightStage] = useState(null);
  const [isResetting, setIsResetting] = useState(false);

  const loadAllData = async () => {
    try {
      const [statsData, chargersData, eventsData] = await Promise.all([
        fetchStats().catch(() => ({})),
        fetchChargers().catch(() => ({ chargers: [] })),
        fetchEvents(100).catch(() => ({ events: [] }))
      ]);

      if (statsData.success) {
        setStats(prev => ({ ...prev, ...statsData }));
      }
      if (chargersData.success && chargersData.chargers) {
        setChargers(chargersData.chargers);
      }
      if (eventsData.success && eventsData.events) {
        setEvents(eventsData.events);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  useEffect(() => {
    loadAllData();

    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onSecurityEvent(newEvent) {
      setEvents(prev => [newEvent, ...prev.slice(0, 99)]);
      // Refresh chargers & stats
      fetchChargers().then(data => {
        if (data.success) setChargers(data.chargers);
      }).catch(() => {});
      fetchStats().then(data => {
        if (data.success) setStats(prev => ({ ...prev, ...data }));
      }).catch(() => {});
    }

    function onStatsUpdate(newStats) {
      setStats(prev => ({ ...prev, ...newStats }));
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('security_event', onSecurityEvent);
    socket.on('stats_update', onStatsUpdate);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('security_event', onSecurityEvent);
      socket.off('stats_update', onStatsUpdate);
    };
  }, []);

  // Execute scenario via POST /api/simulator/run
  const handleRunScenario = async (scenarioKey, chargerId, payload, stageTarget) => {
    setIsRunningScenario(true);
    setRunningScenarioKey(scenarioKey);
    setRunError(null);
    setActiveHighlightStage(stageTarget);

    try {
      const resp = await runSimulatorScenario(scenarioKey, chargerId, payload);
      if (resp.success && resp.result) {
        setLastRunResult(resp.result);
      } else {
        setRunError(resp.message || 'Scenario run reported failure');
      }
      // Re-fetch chargers and metrics
      await loadAllData();
    } catch (err) {
      setRunError(err.message || 'Network error executing scenario');
    } finally {
      setIsRunningScenario(false);
      setRunningScenarioKey(null);
    }
  };

  // Reset demo: clear events & reset simulator environment
  const handleResetDemo = async () => {
    setIsResetting(true);
    try {
      await clearEventsApi();
      setEvents([]);
      setLastRunResult(null);
      setRunError(null);
      setActiveHighlightStage(null);
      await loadAllData();
    } catch (err) {
      console.error('Reset demo failed:', err);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper-bg text-ink-black flex flex-col font-sans selection:bg-signal-amber selection:text-white">
      {/* Top Industrial Navigation */}
      <Navbar
        isConnected={isConnected}
        isMongoConnected={stats.isMongoConnected}
        stats={stats}
        onResetDemo={handleResetDemo}
        isResetting={isResetting}
      />

      {/* Main Substation Security Logbook Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-5 sm:space-y-6">
        
        {/* Metric Summary Counters (Asymmetric Ledger) */}
        <OverviewCards stats={stats} />

        {/* Substation Test Rig & Attack Simulator Panel */}
        <SimulatorPanel
          onRunScenario={handleRunScenario}
          onResetDemo={handleResetDemo}
          isRunning={isRunningScenario}
          runningScenario={runningScenarioKey}
          lastRunResult={lastRunResult}
          runError={runError}
        />

        {/* 6-Stage Detection Pipeline Conveyor Railway */}
        <PipelineViewer
          lastEvent={events[0]}
          activeHighlightStage={activeHighlightStage}
        />

        {/* Monitored EV Terminals + Real Analogue Substation Dial Gauge */}
        <ChargerGrid
          chargers={chargers}
          stats={stats}
        />

        {/* Chronological Incident & Dispatch Log (Ticket Stubs & Rubber Stamps) */}
        <SecurityEventsTable
          events={events}
          onClearEvents={handleResetDemo}
        />

      </main>

      {/* Industrial Identification Plate / Footer */}
      <footer className="border-t-2 border-ink-black bg-paper-card py-4 mt-8 shadow-hard-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-ink-muted gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-signal-amber border border-ink-black inline-block" />
            <span className="font-bold text-ink-black">ChargeShield</span>
            <span>— Substation Feeder #4 Security Gateway</span>
          </div>
          <div className="flex items-center gap-4">
            <span>OCPP 1.6-J JSON Protocol</span>
            <span className="border-l border-ink-faint pl-4">
              Author: <strong className="text-ink-black">smokeScreen56</strong>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
