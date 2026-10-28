# ChargeShield 🛡️⚡
**Real-Time Cybersecurity Gateway for EV Charging Infrastructure (OCPP 1.6-J)**

ChargeShield is an inline security gateway positioned between Electric Vehicle Supply Equipment (EVSE / charging stations) and the Central System (CSMS). It intercepts OCPP 1.6-J WebSocket frames in real time, inspecting every message not only for standard protocol compliance, but for **behavioral legitimacy and physical plausibility**.

> **Core Philosophy:** A message can be 100% compliant with the OCPP specification and yet be maliciously cloned, behaviorally disruptive, or physically impossible. Protocol compliance alone does not guarantee infrastructure safety.

---

## Architecture Overview

```
                      +---------------------------------------+
                      |       PHYSICAL CHARGERS / SIMULATOR    |
                      |  [CP001: 22kW]  [CP002: 22kW]  [CP003] |
                      +-------------------+-------------------+
                                          |
                                          | ws://localhost:5000/ocpp/:chargerId
                                          v
                      +---------------------------------------+
                      |       CHARGESHIELD SECURITY GATEWAY   |
                      |        (Node.js / Express / ws)       |
                      +-------------------+-------------------+
                                          |
        +---------------------------------+---------------------------------+
        |                                                                   |
        v                                                                   v
+-------------------------------+                       +-------------------------------+
|    6-STAGE DETECTION ENGINE   |                       |    UPSTREAM CSMS PROXY RELAY  |
|                               |                       |                               |
| 1. Identity & Impersonation   |                       | If CSMS_URL configured:       |
| 2. OCPP 1.6-J Protocol Schema |                       | - ALLOWED / ALERTED  --> CSMS |
| 3. Session State Machine (FSM)|                       | - Upstream replies  --> CP    |
| 4. Physics & Telemetry Bounds |                       | - BLOCKED frames never reach  |
| 5. Command Flooding Governor  |                       |   upstream (OCPP CALLERROR)   |
| 6. Feeder Grid Overload (35kW)|                       +-------------------------------+
+---------------+---------------+
                |
                v
+-------------------------------+
|     AGGREGATE RISK ENGINE     |
|   LOW     -> ALLOW  (0-30)    |
|   MEDIUM  -> ALERT  (31-60)   |
|   HIGH    -> BLOCK  (61-80)   |
|   CRITICAL-> BLOCK  (81-100)  |
|   (Forced Alert Support)      |
+---------------+---------------+
                |
        +-------+-------+
        |               |
        v               v
+---------------+ +---------------+
|  PERSISTENCE  | | DASHBOARD WS  |
| MongoDB Mode  | | Socket.IO     |
|   or Fallback | | Live Events & |
| In-Memory DB  | | Feeder Stats  |
+---------------+ +---------------+
        |
        v
+-------------------------------------------------------+
|        FRONTEND SUBSTATION CONTROL-ROOM LOGBOOK       |
|        (React 19 + Tailwind CSS + Fraunces / Mono)     |
| - Asymmetric Metrics Ledger                           |
| - 6-Station Conveyor Railway with Animated Packet     |
| - Real Analogue SVG Substation Needle Gauge           |
| - 6-Scenario Injection Test Rig with Live Verdicts    |
| - Ticket-Stub Audit Log with Rubber Stamp Slammers    |
+-------------------------------------------------------+
```

---

## The 6-Stage Inspection Pipeline

Every incoming OCPP 1.6-J JSON frame is piped through six sequential verification stations before reaching the backend or upstream CSMS:

| Stage | Name | Verification Scope | Action on Breach |
|---|---|---|---|
| **STN-01** | **Identity Check** | Verifies charger ID is pre-registered in hardware registry (`CP001`, `CP002`, `CP003`) and detects duplicate active WebSocket connections attempting socket takeover / cloning. | `BLOCK` (Risk: +40, High/Critical) |
| **STN-02** | **OCPP Validation** | Validates 1.6-J frame structure `[MessageTypeId, UniqueId, Action, Payload]`, verifies JSON formation, and validates mandatory action schemas. | `BLOCK` (Risk: +20 to +50, High) |
| **STN-03** | **Session Check** | Enforces the charging session finite state machine: `Idle → Authorized → StartTransaction → MeterValues → StopTransaction`. Traps transactions on idle chargers or mismatched session IDs. | `BLOCK` (Risk: +40, High) |
| **STN-04** | **Physics Check** | Validates active power against nameplate hardware limits (e.g. 22.0 kW ceiling), prevents meter value rollbacks, and enforces maximum ramp rates per second. | `BLOCK` (Risk: +30 to +50, High/Critical) |
| **STN-05** | **Command Governor** | Sliding-window rate limiter per charger (10s window: max 50 generic calls, max 10 `Reset` commands). Flooding chargers enter a 15s cool-down isolation period. Dropped frames are aggregated into a single record. | `BLOCK` (Risk: +30, High, Aggregated Count) |
| **STN-06** | **Grid Load Check** | Monitors aggregate power demand across all chargers against the 35.0 kW substation capacity. Soft warning at 80% (28.0 kW) triggers `MEDIUM ALERT`; aggregate demand > 35.0 kW trips `CRITICAL ALERT` (forced action, as gateway cannot physically cut utility power). | `ALERT` (Risk: +20 to +40, Medium / Critical) |

### Decision Policy & Risk Engine
- **Risk Score:** Anomalies accumulate risk points (0–100).
- **Severity Bands:**
  - `0 – 30`: **LOW** $\rightarrow$ `ALLOW` (logged to audit trail)
  - `31 – 60`: **MEDIUM** $\rightarrow$ `ALERT` (forwarded, flagged with warning)
  - `61 – 80`: **HIGH** $\rightarrow$ `BLOCK` (intercepted, CallError returned)
  - `81 – 100`: **CRITICAL** $\rightarrow$ `BLOCK` (intercepted, CallError returned)
- **Forced Action Override:** Stages can request a forced action regardless of score (e.g. Stage 6 Grid Overload mandates `ALERT` with `CRITICAL` severity).

---

## The 5 Attack Scenarios Demonstrated

The built-in **Scenario Injection Test Rig** in the UI and REST API allows reproducing attacks on demand:

| Scenario | Attack Description | Injected OCPP Payload | Expected ChargeShield Response |
|---|---|---|---|
| **01 Normal Flow** | Standard complete charging cycle | `BootNotification` → `Authorize` → `StartTransaction` → `MeterValues` (11kW) → `StopTransaction` | `ALLOW` (All 6 stages clear, transaction completes normally) |
| **02 Attack 1** | **Charger Impersonation** | Rogue client connects with credentials of an already-connected charger (`CP001`) | `BLOCK` at **Stage 1 (Identity)** (`Charger Impersonation`, Risk: 40, Severity: HIGH) |
| **03 Attack 2** | **Fake Meter Reading** | Charger reports 45.0 kW active power jump, exceeding 22.0 kW rated hardware rating | `BLOCK` at **Stage 4 (Physics)** (`Meter Anomaly`, Risk: 70, Severity: CRITICAL) |
| **04 Attack 3** | **Invalid Session Sequence** | Telemetry `MeterValues` sent out of order without prior `Authorize` or `StartTransaction` | `BLOCK` at **Stage 3 (Session)** (`Invalid Session Sequence`, Risk: 40, Severity: HIGH) |
| **05 Attack 4** | **Command Flooding DoS** | Blast of 40 `Reset` commands in ~2s attempting to overwhelm the charging management system | `BLOCK` at **Stage 5 (Flood Governor)** (`Command Flooding`, Risk: 30, Severity: HIGH, 15s cool-down) |
| **06 Attack 5** | **Substation Grid Overload** | Simultaneous ramp-up of CP001, CP002, CP003 to 38.5 kW aggregate demand vs 35.0 kW capacity | `ALERT` at **Stage 6 (Grid Load)** (`Grid Load Attack`, Risk: 70, Severity: CRITICAL, Needle moves to 38.5kW) |

---

## How to Run

### Prerequisites
- **Node.js** v18+ (tested on Node v20 / v22)
- **npm** v9+
- *(Optional)* **MongoDB** (a local `mongod` instance or MongoDB Atlas; in-memory fallback is active by default)

### 1. Installation

Clone the repository and install dependencies for both backend and frontend:

```bash
git clone https://github.com/smokeScreen56/ChargeShield.git
cd ChargeShield

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
cd ..
```

### 2. Environment Configuration

Copy the example environment files:

```bash
# In repository root
cp .env.example .env

# In backend folder
cp backend/.env.example backend/.env
```

Default configuration variables:
```env
PORT=5000
# Optional MongoDB connection (if omitted or unreachable, automatic In-Memory Fallback is used)
MONGO_URI=mongodb://127.0.0.1:27017/chargeshield

# Optional Upstream CSMS WebSocket URL (if omitted, local mock responses are generated)
# CSMS_URL=ws://localhost:5500/ocpp
```

---

### 3. Execution Modes

#### Mode A: Standalone Zero-Dependency Demo (Default)
In this mode, ChargeShield uses its built-in in-memory event store and generates local mock OCPP responses. No database or external server required:

```bash
# Terminal 1: Start Backend (Port 5000)
cd backend
npm run dev

# Terminal 2: Start Frontend (Port 5173)
cd frontend
npm run dev
```
Open **`http://localhost:5173/`** in your browser.

#### Mode B: With Upstream CSMS Proxy
ChargeShield includes a standalone mock CSMS recorder (`scripts/mockCsms.js`) to demonstrate upstream forwarding of allowed frames and blocking of attack frames:

```bash
# Terminal 1: Start Mock CSMS (Port 5500)
cd backend
node scripts/mockCsms.js 5500

# Terminal 2: Start Backend with CSMS_URL configured
cd backend
# Set CSMS_URL=ws://localhost:5500/ocpp in backend/.env
npm run dev

# Terminal 3: Start Frontend
cd frontend
npm run dev
```

#### Mode C: With MongoDB Persistence
If a local or remote MongoDB instance is available, set `MONGO_URI`:
```bash
MONGO_URI=mongodb://127.0.0.1:27017/chargeshield npm run dev
```
ChargeShield logs `[Database] 💾 Mode: MONGODB (Connected to ...)` at startup. Security events and audit records will persist across server restarts.

---

### 4. Running Automated Tests

ChargeShield includes a test suite covering all 6 stages, risk compounding, back-to-back scenario repeatability, upstream proxy conditional forwarding, and MongoDB restart survival:

```bash
cd backend
npm test
# Or run directly:
node src/test_pipeline.js
```
All 11 unit & integration test suites will execute and verify with 0 regressions.

## License & Attribution

Developed by **smokeScreen56** as a real-time cybersecurity gateway for EV charging infrastructure (OCPP 1.6-J).
Distributed under the MIT License.
