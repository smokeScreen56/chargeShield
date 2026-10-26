import React from 'react';
import { Zap, Activity, Clock, ShieldCheck, AlertTriangle } from 'lucide-react';

export default function ChargerGrid({ chargers, stats }) {
  // Grid load stats
  const currentLoadKw = stats?.currentGridLoadKw ?? 0;
  const capacityKw = stats?.gridCapacityKw ?? 35.0;
  const warningKw = stats?.gridWarningThresholdKw ?? 28.0;
  const utilization = stats?.gridUtilizationPercent ?? (capacityKw > 0 ? ((currentLoadKw / capacityKw) * 100).toFixed(1) : 0);
  const gridStatus = stats?.gridStatus || (currentLoadKw > capacityKw ? 'CRITICAL_OVERLOAD' : currentLoadKw >= warningKw ? 'WARNING' : 'NORMAL');

  // Needle angle for SVG gauge: -90deg (0 kW) to +90deg (40 kW)
  const maxDialKw = 40.0;
  const clampedLoad = Math.min(maxDialKw, Math.max(0, currentLoadKw));
  const needleAngle = -90 + (clampedLoad / maxDialKw) * 180;

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-3.5" aria-label="Monitored Terminals and Grid Telemetry">
      
      {/* Registered Chargers (8 Cols) */}
      <div className="lg:col-span-8 bg-paper-card border-2 border-ink-black shadow-hard p-4 sm:p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-ink-black">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-signal-amber border border-ink-black inline-block"></span>
              <h2 className="font-display text-base sm:text-lg font-bold text-ink-black">
                MONITORED EV CHARGING TERMINALS
              </h2>
            </div>
            <p className="text-xs font-mono text-ink-muted">
              Physical Charging Pedestals Under ChargeShield Gateway Protection
            </p>
          </div>
          <span className="label-tape text-[10px] px-2 py-0.5">
            {chargers.length || 3} UNITS
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(chargers.length > 0 ? chargers : [
            { id: 'CP001', name: 'Bay 1 - Express', ratedPowerKw: 22.0, connectorType: 'Type 2 Mennekes', sessionState: 'IDLE' },
            { id: 'CP002', name: 'Bay 2 - Fast', ratedPowerKw: 22.0, connectorType: 'Type 2 Mennekes', sessionState: 'IDLE' },
            { id: 'CP003', name: 'Bay 3 - Fleet', ratedPowerKw: 22.0, connectorType: 'Type 2 Mennekes', sessionState: 'IDLE' }
          ]).map((cp) => {
            const isCharging = cp.sessionState === 'CHARGING';
            const isAuthorized = cp.sessionState === 'AUTHORIZED';

            return (
              <div
                key={cp.id}
                className="bg-paper-warm border-2 border-ink-black p-3 shadow-hard-sm flex flex-col justify-between relative"
              >
                {/* Pedestal Header */}
                <div className="flex items-center justify-between border-b border-ink-black/20 pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-black text-sm text-ink-black">
                      {cp.id}
                    </span>
                    <span className="text-[10px] font-mono text-ink-muted truncate max-w-[90px]">
                      {cp.name?.replace('Bay ', '')}
                    </span>
                  </div>
                  
                  {/* Status Indicator */}
                  <span
                    className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 border border-ink-black ${
                      isCharging
                        ? 'bg-status-green text-white animate-pulse'
                        : isAuthorized
                        ? 'bg-signal-amber text-white'
                        : 'bg-paper-card text-ink-muted'
                    }`}
                  >
                    {cp.sessionState || 'IDLE'}
                  </span>
                </div>

                {/* Technical Specifications */}
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-ink-muted">
                    <span>HARDWARE:</span>
                    <span className="font-bold text-ink-black">{cp.ratedPowerKw || 22.0} kW RATED</span>
                  </div>

                  <div className="flex justify-between text-ink-muted">
                    <span>INTERFACE:</span>
                    <span className="text-ink-body">{cp.connectorType || 'Type 2'}</span>
                  </div>

                  <div className="flex justify-between text-ink-muted">
                    <span>GATEWAY:</span>
                    <span className="font-bold text-status-green">ONLINE</span>
                  </div>

                  {/* Active Transaction Slip */}
                  {isCharging && (
                    <div className="mt-2 pt-1.5 border-t border-dashed border-ink-black/30 flex justify-between text-[11px] bg-paper-card p-1 border border-ink-black/20">
                      <span className="text-ink-muted">TX:</span>
                      <span className="font-bold text-signal-amber">#{cp.activeTransactionId}</span>
                    </div>
                  )}
                </div>

                <div className="mt-2.5 pt-1.5 border-t border-ink-black/10 text-[9px] font-mono text-ink-faint flex justify-between">
                  <span>OCC ID: {cp.id}-REG</span>
                  <span>FEEDER #4</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Substation Grid Load: Real Analogue SVG Gauge (4 Cols) */}
      <div className="lg:col-span-4 bg-paper-card border-2 border-ink-black shadow-hard p-4 sm:p-5 flex flex-col justify-between">
        
        <div className="flex items-center justify-between pb-2 mb-2 border-b-2 border-ink-black">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-signal-amber border border-ink-black inline-block"></span>
              <h3 className="font-display text-sm font-bold text-ink-black uppercase">
                SUBSTATION FEEDER #4
              </h3>
            </div>
            <p className="text-[11px] font-mono text-ink-muted">
              Aggregate Grid Demand vs 35kW Capacity
            </p>
          </div>
          <span className="text-[10px] font-mono text-ink-muted">STAGE 6</span>
        </div>

        {/* Analogue Needle Dial (SVG) */}
        <div className="flex flex-col items-center justify-center my-1">
          <svg viewBox="0 0 240 140" className="w-56 h-32 overflow-visible">
            {/* Background Dial Arc (0 to 40 kW) */}
            <path
              d="M 30 120 A 90 90 0 0 1 210 120"
              fill="none"
              stroke="#E5DFD3"
              strokeWidth="16"
              strokeLinecap="round"
            />
            {/* Safe Zone (0 to 28 kW = 0 to 70% of 40kW arc) */}
            <path
              d="M 30 120 A 90 90 0 0 1 174 52"
              fill="none"
              stroke="#86EFAC"
              strokeWidth="14"
            />
            {/* Warning Zone (28 to 35 kW = 70% to 87.5% of 40kW arc) */}
            <path
              d="M 174 52 A 90 90 0 0 1 202 85"
              fill="none"
              stroke="#FDBA74"
              strokeWidth="14"
            />
            {/* Danger Overload Zone (35 to 40 kW) */}
            <path
              d="M 202 85 A 90 90 0 0 1 210 120"
              fill="none"
              stroke="#FCA5A5"
              strokeWidth="14"
              strokeLinecap="round"
            />

            {/* Dial Tick Marks & Labels */}
            <text x="24" y="136" fontSize="9" fontFamily="IBM Plex Mono" fontWeight="bold" fill="#525252">0</text>
            <text x="46" y="70" fontSize="9" fontFamily="IBM Plex Mono" fontWeight="bold" fill="#525252">10</text>
            <text x="115" y="32" fontSize="9" fontFamily="IBM Plex Mono" fontWeight="bold" fill="#525252">20</text>
            <text x="175" y="44" fontSize="9" fontFamily="IBM Plex Mono" fontWeight="bold" fill="#C2410C">28</text>
            <text x="210" y="85" fontSize="9" fontFamily="IBM Plex Mono" fontWeight="bold" fill="#B91C1C">35</text>
            <text x="216" y="136" fontSize="9" fontFamily="IBM Plex Mono" fontWeight="bold" fill="#121314">40</text>

            {/* Dial Center Rating Tag */}
            <text x="120" y="85" textAnchor="middle" fontSize="10" fontFamily="IBM Plex Mono" fill="#8C877D" fontWeight="bold">
              KILOWATTS (kW)
            </text>

            {/* Analogue Needle */}
            <g
              style={{
                transformOrigin: '120px 120px',
                transform: `rotate(${needleAngle}deg)`,
                transition: 'transform 0.65s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}
            >
              {/* Needle Body */}
              <polygon
                points="117,120 120,30 123,120"
                fill="#121314"
                stroke="#121314"
                strokeWidth="1"
              />
              {/* Safety Orange Accent Tip */}
              <polygon
                points="118.5,45 120,28 121.5,45"
                fill="#C2410C"
              />
              {/* Pivot Hub */}
              <circle cx="120" cy="120" r="8" fill="#121314" />
              <circle cx="120" cy="120" r="4" fill="#FCFAF6" />
            </g>
          </svg>

          {/* Numerical Dial Readout */}
          <div className="text-center font-mono mt-1">
            <div className="font-display text-2xl font-black text-ink-black tracking-tight">
              {Number(currentLoadKw).toFixed(1)} <span className="text-sm font-mono text-ink-muted">/ 35.0 kW</span>
            </div>
            <div className="text-[11px] font-mono text-ink-muted">
              Substation Capacity Utilization: <strong className="text-ink-black">{utilization}%</strong>
            </div>
          </div>
        </div>

        {/* Grid Status Lamp Plate */}
        <div className="mt-2 pt-2 border-t-2 border-dashed border-ink-black flex items-center justify-between text-xs font-mono">
          <span className="text-ink-muted uppercase">FEEDER STATUS:</span>
          {gridStatus === 'CRITICAL_OVERLOAD' || currentLoadKw > capacityKw ? (
            <span className="px-2 py-0.5 border-2 border-status-red bg-[#FEE2E2] text-status-red font-black text-[11px] -rotate-1 animate-stamp-thunk">
              CRITICAL OVERLOAD
            </span>
          ) : gridStatus === 'WARNING' || currentLoadKw >= warningKw ? (
            <span className="px-2 py-0.5 border border-signal-amber bg-[#FEF3C7] text-signal-amber font-bold text-[11px]">
              CAPACITY WARNING (&gt;80%)
            </span>
          ) : (
            <span className="px-2 py-0.5 border border-status-green bg-[#DCFCE7] text-status-green font-bold text-[11px]">
              BALANCED LOAD
            </span>
          )}
        </div>

      </div>

    </section>
  );
}
