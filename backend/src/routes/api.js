/**
 * ChargeShield REST API Routes
 * Endpoints for dashboard data, statistics, and simulator controls
 */

const express = require('express');
const router = express.Router();
const { REGISTERED_CHARGERS } = require('../config/constants');
const { getRecentEvents, getStats, clearEvents } = require('../models/SecurityEvent');
const sessionCheck = require('../detection/sessionCheck');
const ocppGateway = require('../gateway/ocppGateway');
const chargerSimulator = require('../simulator/chargerSimulator');

// System Health & Overview
router.get('/stats', async (req, res) => {
  try {
    const stats = await getStats();
    const connectedChargers = ocppGateway.getConnectedChargers();
    const sessionStates = sessionCheck.getAllSessionStates();

    const activeSessionsCount = Object.values(sessionStates).filter(s => s.state === 'CHARGING').length;

    res.json({
      success: true,
      totalChargers: Object.keys(REGISTERED_CHARGERS).length,
      activeChargers: connectedChargers.length,
      activeSessions: activeSessionsCount,
      messagesProcessed: stats.totalMessages,
      threatsDetected: stats.threatsCount,
      blockedMessages: stats.blockedCount,
      isMongoConnected: stats.isMongoConnected
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Charger Status Registry & Real-Time Connection
router.get('/chargers', (req, res) => {
  try {
    const connected = ocppGateway.getConnectedChargers();
    const connectedIds = new Set(connected.map(c => c.chargerId));
    const sessionStates = sessionCheck.getAllSessionStates();

    const chargersList = Object.values(REGISTERED_CHARGERS).map(charger => {
      const session = sessionStates[charger.id] || { state: 'IDLE' };
      const isOnline = connectedIds.has(charger.id);

      return {
        ...charger,
        isOnline,
        sessionState: session.state,
        activeTransactionId: session.activeTransactionId,
        idTag: session.idTag,
        startedAt: session.startedAt
      };
    });

    res.json({ success: true, chargers: chargersList });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get Security Events Log
router.get('/events', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const events = await getRecentEvents(limit);
    res.json({ success: true, count: events.length, events });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Clear Events
router.post('/events/clear', async (req, res) => {
  try {
    await clearEvents();
    res.json({ success: true, message: 'Security event logs cleared.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Trigger Charger Simulator Scenarios
router.post('/simulator/run', async (req, res) => {
  const { scenario, chargerId = 'CP001', payload = {} } = req.body;

  try {
    let result = null;

    switch (scenario) {
      case 'normal_flow':
        result = await chargerSimulator.runNormalFlow(chargerId);
        break;

      case 'attack_impersonation':
        result = await chargerSimulator.runAttack1Impersonation(chargerId);
        break;

      case 'attack_fake_meter':
        const reportedKw = payload.reportedPowerKw || 25.0;
        result = await chargerSimulator.runAttack2FakeMeter(chargerId, reportedKw);
        break;

      case 'attack_invalid_session':
        result = await chargerSimulator.runAttack3InvalidSession(chargerId);
        break;

      case 'attack_unauthorized':
        result = await chargerSimulator.runAttackUnauthorizedCharger('CP999');
        break;

      case 'single_message':
        result = await chargerSimulator.sendMessage(chargerId, payload.action || 'Heartbeat', payload.data || {});
        break;

      default:
        return res.status(400).json({ success: false, message: `Unknown scenario: ${scenario}` });
    }

    res.json({ success: true, scenario, result });
  } catch (err) {
    console.error('[API] Simulator execution error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
