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

- [x] **Phase 3: Frontend Redesign & Attack Control Panel (Substation Control-Room Logbook)**
  - **Design System ("Substation Control-Room Logbook")**:
    - Complete ban on generic SaaS visuals (no blue/purple gradients, no glassmorphism, no Inter/system fonts, no uniform rounded cards).
    - Warm off-white paper canvas (`#F5F2EB`) with subtle engineering graph paper grid lines.
    - Character-driven typography: **Fraunces** display serif/slab paired with **Bricolage Grotesque** and **IBM Plex Mono / JetBrains Mono**.
    - Thick 2px ink borders, hard offset drop shadows (`shadow-hard` with 0 blur), label-maker tape badges, dashed ledger dividers, and ticket-stub styling.
    - Rubber stamp verdicts: `BLOCKED` (-2° stamp with thunk animation), `ALERT` (+1° hazard amber stamp), `PASSED` (+1° operational green stamp).
    - Conveyor Railway: Horizontal mechanical rail of 6 stations (`STN-01` to `STN-06`) with an animated `[PKT-1.6J]` token traveling across and lockout trap gates.
    - Substation Feeder Gauge: Real analogue SVG dial needle gauge with color-coded normal, warning (>80%), and critical overload arcs with rotational easing.
  - **Interactive Scenario Injection Test Rig (`SimulatorPanel.jsx`)**:
    - 6 physical push-buttons with one-line descriptions and expected ChargeShield responses:
      1. Normal Flow (`ALLOW`)
      2. Attack 1: Charger Impersonation (`BLOCK`)
      3. Attack 2: Fake Meter Reading (`BLOCK`)
      4. Attack 3: Invalid Session Sequence (`BLOCK`)
      5. Attack 4: Command Flooding DoS (`BLOCK`)
      6. Attack 5: Grid Overload Attack (`ALERT`)
    - Real-time execution handling: buttons disable while running with a "BUSY" indicator; live expected vs. actual verdict comparison banner with stamp animation.
    - Reset Demo button for demo resets and log clearing.
    - Full responsiveness verified down to mobile widths (375x812) with zero overflow.
  - **Browser Verification**:
    - Executed all 6 scenarios in forward order (01 → 06) and reverse order (06 → 01) via live Chrome DevTools browser session.
    - Confirmed each scenario returns exact expected vs. actual match (`VERIFIED MATCH / TEST PASSED`).
    - Verified real-time event streaming into dispatch log, stage trap gates, and analogue gauge needle movement.
    - Verified zero console errors.

- [x] **Phase 4: Full End-to-End Validation & Documentation Polish**
  - **Fresh-Start Verification**: Executed automated test suite (`src/test_pipeline.js`) with 11/11 tests passing.
  - **Live Scenario Exercising**: Completed manual testing of all 6 scenarios in forward and reverse orders on live Chrome DevTools session.
  - **Code Polish**: Removed dead code, duplicate imports, and verified zero stale "Planned for future" / TODO comments across the repository.
  - **Comprehensive README.md**: Published complete documentation featuring an ASCII architecture diagram, 6-stage pipeline verification table, run instructions (standalone, mock CSMS, MongoDB), 5 attack specifications, and a step-by-step presenter demo script.
  - **Status & Limitations**: Updated `PROGRESS.md` with complete phase checklist and honest disclosure of known limitations.

---

## Known Limitations & Architectural Boundaries

While ChargeShield delivers robust, real-time protection against protocol, behavioral, and physical anomalies, the following limitations should be noted:

1. **Protocol Scope (OCPP 1.6-J JSON Only)**
   - ChargeShield is purpose-built for **OCPP 1.6-J (JSON over WebSockets)**, the most widely deployed commercial standard today.
   - It does not currently implement **OCPP 2.0.1** (which introduces ISO 15118 vehicle certificates and device management) or legacy **OCPP-S (SOAP/XML)**.

2. **In-Memory Gateway State vs. Distributed Clustering**
   - Active session states, sliding-window rate limiters, and aggregate grid power metrics are managed in-memory on the active gateway instance.
   - For multi-instance, horizontally scaled gateway deployments behind a layer-4 load balancer, a distributed cache layer (such as Redis with atomic token buckets) would be needed to maintain synchronized state across nodes.

3. **Telemetry-Dependent Grid Calculations**
   - Stage 6 (Feeder Grid Monitoring) computes aggregate load from active power readings reported by chargers (`Power.Active.Import` in `MeterValues`).
   - If a compromised or faulty charger suppresses its telemetry or reports zero wattage while drawing current, the software gateway cannot detect the discrepancy without external utility hardware/substation CT clamp meters.

4. **Upstream Proxy Single-Hop Forwarding**
   - The upstream CSMS proxy maintains a 1-to-1 WebSocket pairing per active charger. In enterprise production environments, TLS termination (WSS) and mutual TLS (mTLS) client certificates are assumed to be handled by an ingress controller (e.g., NGINX, Cloudflare, or Traefik) upstream of the gateway.

5. **Simulated vs. Physical EVSE Hardware**
   - The integrated attack test rig simulates standard OCPP 1.6-J client frames. Real-world EVSE units may occasionally emit vendor-specific proprietary extensions (DataTransfer actions) which pass through as generic payloads if not strictly registered.
