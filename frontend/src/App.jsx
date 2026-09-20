import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import OverviewCards from './components/OverviewCards';
import ChargerGrid from './components/ChargerGrid';
import PipelineViewer from './components/PipelineViewer';
import SimulatorControls from './components/SimulatorControls';
import SecurityEventsTable from './components/SecurityEventsTable';
import FutureScopePanel from './components/FutureScopePanel';
import { fetchStats, fetchChargers, fetchEvents } from './services/api';
import { socket } from './services/socket';

export default function App() {
  const [stats, setStats] = useState({
    totalChargers: 3,
    activeChargers: 0,
    activeSessions: 0,
    messagesProcessed: 0,
    threatsDetected: 0,
    blockedMessages: 0,
    isMongoConnected: false
  });

  const [chargers, setChargers] = useState([]);
  const [events, setEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(socket.connected);

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
        if (data.success) setStats(data);
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        isConnected={isConnected}
        isMongoConnected={stats.isMongoConnected}
        stats={stats}
      />

      {/* Main Dashboard Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Metric Summary Counters */}
        <OverviewCards stats={stats} />

        {/* Interactive Charger & Attack Simulator */}
        <SimulatorControls onActionComplete={loadAllData} />

        {/* 6-Stage Detection Pipeline Inspector */}
        <PipelineViewer />

        {/* Monitored EV Chargers Grid */}
        <ChargerGrid chargers={chargers} />

        {/* Live Security Audit Log */}
        <SecurityEventsTable events={events} />

        {/* Documented 40-50% Roadmap Scope */}
        <FutureScopePanel />

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div>
            <span>ChargeShield — Real-Time Cybersecurity Gateway for EV Charging Infrastructure</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Author: <strong className="text-slate-400">smokeScreen56</strong></span>
            <span>OCPP 1.6J Security Architecture</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
