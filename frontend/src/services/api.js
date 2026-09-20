/**
 * ChargeShield Frontend API Client
 */

const API_BASE = 'http://localhost:5000/api';

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/stats`);
  return res.json();
}

export async function fetchChargers() {
  const res = await fetch(`${API_BASE}/chargers`);
  return res.json();
}

export async function fetchEvents(limit = 100) {
  const res = await fetch(`${API_BASE}/events?limit=${limit}`);
  return res.json();
}

export async function clearEventsApi() {
  const res = await fetch(`${API_BASE}/events/clear`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return res.json();
}

export async function runSimulatorScenario(scenario, chargerId = 'CP001', payload = {}) {
  const res = await fetch(`${API_BASE}/simulator/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario, chargerId, payload })
  });
  return res.json();
}
