/**
 * ChargeShield Security Event Model & In-Memory Store
 * Persists security events to MongoDB with automatic fallback in-memory cache.
 */

const mongoose = require('mongoose');

// Mongoose Schema Definition
const SecurityEventSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  chargerId: {
    type: String,
    required: true,
    index: true
  },
  messageType: {
    type: String,
    required: true
  },
  detectionType: {
    type: String,
    required: true,
    index: true
  },
  riskScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    required: true
  },
  action: {
    type: String,
    enum: ['ALLOW', 'BLOCK', 'ALERT'],
    required: true
  },
  reason: {
    type: String,
    default: ''
  },
  payload: {
    type: Object,
    default: {}
  },
  pipelineSteps: {
    type: Array,
    default: []
  }
});

let SecurityEventModel = null;
try {
  SecurityEventModel = mongoose.model('SecurityEvent', SecurityEventSchema);
} catch (e) {
  SecurityEventModel = mongoose.models.SecurityEvent;
}

// In-Memory Backup Storage (ensures flawless viva execution even without MongoDB service running)
const inMemoryEvents = [];
let isMongoConnected = false;

async function initDatabase(mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chargeshield') {
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 2000
    });
    isMongoConnected = true;
    console.log(`[Database] Connected to MongoDB at ${mongoUri}`);
  } catch (err) {
    isMongoConnected = false;
    console.warn(`[Database] MongoDB not reachable at ${mongoUri}. Operating in in-memory mode.`);
  }
}

async function saveEvent(eventData) {
  const event = {
    _id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    ...eventData,
    timestamp: eventData.timestamp || new Date()
  };

  // Add to in-memory store
  inMemoryEvents.unshift(event);
  if (inMemoryEvents.length > 500) {
    inMemoryEvents.pop();
  }

  // Save to MongoDB if connected
  if (isMongoConnected && SecurityEventModel) {
    try {
      const doc = new SecurityEventModel(eventData);
      await doc.save();
    } catch (err) {
      console.error('[Database] Failed to save event to MongoDB:', err.message);
    }
  }

  return event;
}

async function getRecentEvents(limit = 100) {
  if (isMongoConnected && SecurityEventModel) {
    try {
      return await SecurityEventModel.find().sort({ timestamp: -1 }).limit(limit).lean();
    } catch (err) {
      console.error('[Database] Error reading from MongoDB, returning in-memory:', err.message);
    }
  }
  return inMemoryEvents.slice(0, limit);
}

async function getStats() {
  const events = await getRecentEvents(500);
  const totalMessages = events.length;
  const blockedCount = events.filter(e => e.action === 'BLOCK').length;
  const threatsCount = events.filter(e => e.detectionType !== 'Normal').length;

  return {
    totalMessages,
    blockedCount,
    threatsCount,
    allowedCount: totalMessages - blockedCount,
    isMongoConnected
  };
}

async function clearEvents() {
  inMemoryEvents.length = 0;
  if (isMongoConnected && SecurityEventModel) {
    try {
      await SecurityEventModel.deleteMany({});
    } catch (e) {}
  }
}

module.exports = {
  SecurityEventModel,
  initDatabase,
  saveEvent,
  getRecentEvents,
  getStats,
  clearEvents
};
