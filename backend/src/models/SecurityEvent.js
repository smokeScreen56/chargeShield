/**
 * ChargeShield Security Event Model & In-Memory Store
 * Persists security events to MongoDB with automatic fallback in-memory cache.
 */

const mongoose = require('mongoose');

// Mongoose Schema Definition
const SecurityEventSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => `evt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
  },
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
  stage: {
    type: String,
    default: 'Pipeline'
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
  aggregatedCount: {
    type: Number,
    default: 1
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

// In-Memory Backup Storage (ensures flawless execution even without MongoDB service running)
const inMemoryEvents = [];
let isMongoConnected = false;

async function initDatabase(mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chargeshield') {
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 2000
    });
    isMongoConnected = true;
    console.log(`[Database] 💾 Mode: MONGODB (Connected to ${mongoUri})`);
  } catch (err) {
    isMongoConnected = false;
    console.log(`[Database] 💾 Mode: IN-MEMORY FALLBACK (No MongoDB connection at ${mongoUri})`);
  }
}

async function saveEvent(eventData) {
  const event = {
    _id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    aggregatedCount: 1,
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
      const doc = new SecurityEventModel(event);
      await doc.save();
    } catch (err) {
      console.error('[Database] Failed to save event to MongoDB:', err.message);
    }
  }

  return event;
}

/**
 * Query security events with filtering and pagination
 */
async function getEvents(queryOptions = {}) {
  const page = Math.max(1, parseInt(queryOptions.page, 10) || 1);
  const limit = Math.max(1, Math.min(500, parseInt(queryOptions.limit, 10) || 50));
  const skip = (page - 1) * limit;

  const filter = {};
  if (queryOptions.severity) {
    filter.severity = queryOptions.severity.toUpperCase();
  }
  if (queryOptions.action) {
    filter.action = queryOptions.action.toUpperCase();
  }
  if (queryOptions.chargerId) {
    filter.chargerId = queryOptions.chargerId;
  }

  if (isMongoConnected && SecurityEventModel) {
    try {
      const [total, events] = await Promise.all([
        SecurityEventModel.countDocuments(filter),
        SecurityEventModel.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).lean()
      ]);
      return {
        events,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (err) {
      console.error('[Database] Mongo query failed, falling back to in-memory:', err.message);
    }
  }

  // In-memory query with filters
  let filtered = inMemoryEvents;
  if (filter.severity) {
    filtered = filtered.filter(e => e.severity === filter.severity);
  }
  if (filter.action) {
    filtered = filtered.filter(e => e.action === filter.action);
  }
  if (filter.chargerId) {
    filtered = filtered.filter(e => e.chargerId === filter.chargerId);
  }

  const total = filtered.length;
  const events = filtered.slice(skip, skip + limit);

  return {
    events,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
}

async function getRecentEvents(limit = 100) {
  const result = await getEvents({ limit });
  return result.events;
}

async function getStats() {
  const totalMessages = isMongoConnected && SecurityEventModel
    ? await SecurityEventModel.countDocuments({})
    : inMemoryEvents.length;

  const blockedCount = isMongoConnected && SecurityEventModel
    ? await SecurityEventModel.countDocuments({ action: 'BLOCK' })
    : inMemoryEvents.filter(e => e.action === 'BLOCK').length;

  const threatsCount = isMongoConnected && SecurityEventModel
    ? await SecurityEventModel.countDocuments({ detectionType: { $ne: 'Normal' } })
    : inMemoryEvents.filter(e => e.detectionType !== 'Normal').length;

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

async function disconnectDatabase() {
  try {
    await mongoose.disconnect();
  } catch (e) {}
  isMongoConnected = false;
}

function resetInMemoryStore() {
  inMemoryEvents.length = 0;
}

module.exports = {
  SecurityEventModel,
  initDatabase,
  disconnectDatabase,
  saveEvent,
  getEvents,
  getRecentEvents,
  getStats,
  clearEvents,
  resetInMemoryStore
};
