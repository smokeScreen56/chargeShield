# ChargeShield — Implementation Progress Tracker

**Project:** Real-Time Cybersecurity Gateway for EV Charging Infrastructure (OCPP 1.6J)  
**Tech Stack:** Node.js/Express, React + Tailwind CSS, Socket.IO, WebSocket (ws), MongoDB/In-Memory

---

## Phases & Status

- [x] **Baseline & Verification Setup**
  - Baseline execution of `backend/src/test_pipeline.js` passed (Tests 1–5).
  - Rules and constants structure established.
  - Initial `PROGRESS.md` created.

- [x] **Phase 1: Complete Detection Pipeline (Stages 5 & 6, Risk Engine, Decision Policy)**
  - **Risk Decision Policy (Part A)**: Decision policy in `config/constants.js` (LOW -> ALLOW, MEDIUM -> ALERT, HIGH/CRITICAL -> BLOCK). Added support for stage forced actions (e.g. forced ALERT on CRITICAL grid overload). Highest severity wins; risk scores aggregate. Attacks 1–3 still BLOCK.
  - **Stage 5 Command Flooding (Part B)**: Sliding-window rate limiter in `backend/src/detection/commandCheck.js` (10s window, max 50 general, max 10 Resets, 15s cooldown). Drops flood traffic during cooldown, logging ONE aggregated event. Isolated per charger with old timestamp cleanup.
  - **Stage 6 Grid Load Monitoring (Part C)**: Aggregate power monitoring across chargers in `backend/src/detection/gridCheck.js` against 35.0 kW capacity and 80% (28.0 kW) warning threshold. Triggers MEDIUM ALERT on warning, and CRITICAL ALERT on overload. Automatically drops power on StopTransaction or disconnect.
  - **PipelineViewer Updated**: 6 stages reflected in the frontend pipeline visualizer.
  - **Automated Tests**: Unit tests 1–8 in `backend/src/test_pipeline.js` covering every risk band, forced action, flooding scenarios, and grid load conditions.

- [x] **Phase 2: Finish Simulator Scenarios & Backend Infrastructure**
  - **Part A: Attacks 4 & 5 Simulator Scenarios & Cleanup**:
    - Implemented `runAttack4CommandFlooding` (200 Reset commands rate limited/blocked) and `runAttack5GridLoad` (multi-charger aggregate overload reaching CRITICAL ALERT).
    - Standardized all scenarios (`normal_flow`, `attack1-5`) to return structured JSON (`scenarioName`, `steps`, `eventsProduced`, `expectedVerdict`, `actualVerdict`, `passed`).
    - Added environment cleanup (`resetEnvironment()` resetting rate limiter, physics history, session state, and grid readings) so repeated back-to-back runs give identical results.
    - Hooked `attack_command_flooding` and `attack_grid_load` into `POST /api/simulator/run`.
  - **Part B: Upstream CSMS Proxy**:
    - Configured optional `CSMS_URL` env variable in `ocppGateway.js`.
    - Per-charger upstream WebSocket connection opened dynamically.
    - Conditional forwarding: `ALLOWED` and `ALERTED` frames are forwarded to upstream CSMS; `BLOCKED` frames are never forwarded and replied to with OCPP `CALLERROR`.
    - Upstream responses relayed back to downstream chargers; upstream sockets cleaned up on charger disconnect.
    - Built standalone `backend/scripts/mockCsms.js` recording all received frames and replying with standard OCPP CallResult frames.
  - **Part C: MongoDB Persistence & In-Memory Fallback**:
    - Created `.env.example` at repo root and `backend/.env.example`.
    - Clear startup logging of database mode (`MONGODB` vs `IN-MEMORY FALLBACK`).
    - Enhanced `SecurityEvent` schema and model to include `stage`, `severity`, `action`, `riskScore`, and `aggregatedCount`.
    - Added query filtering (`severity`, `action`, `chargerId`) and pagination (`page`, `limit`, `totalPages`, `total`) to `GET /api/events`.
    - Added `POST /api/events/clear` endpoint for demo resets.
  - **Test Suite (Tests 9–11)**:
    - Test 9: Runs all scenarios back-to-back twice, asserting identical verdicts.
    - Test 10: Validates Mock CSMS forwarding (allowed traffic arrives, attack traffic blocked with 0 frames reaching CSMS, upstream socket disconnect cleanup).
    - Test 11: Validates fallback mode pagination/filters/clear, and verifies MongoDB persistence where events survive a simulated backend restart.

- [ ] **Phase 3: Frontend Simulation Control Panel & Live UI Polish**
  - Interactive Attack Simulation panel component in the React dashboard.
  - Buttons and status indicators for:
    - Normal Flow (Full lifecycle)
    - Attack 1: Charger Impersonation
    - Attack 2: Fake Meter Reading
    - Attack 3: Invalid Session
    - Attack 4: Command Flooding
    - Attack 5: Grid Overload Attack
  - Pipeline viewer alignment with all stages (including Command Behavior and Grid Load).
  - Live execution feedback, attack status toasts/badges, and event highlighting.

- [ ] **Phase 5: Upstream CSMS Proxying & Full End-to-End Validation**
  - Upstream forwarding proxy support for ALLOWED messages to target OCPP Central System / CSMS.
  - End-to-end integration verification (Backend + Sockets + Frontend + Simulator).
  - Documentation completion in `README.md`.
