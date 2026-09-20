import React from 'react';
import { Compass, Flame, Cpu, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';

export default function FutureScopePanel() {
  const futureItems = [
    {
      title: 'Attack 4 — Command Flooding Detection',
      status: 'Planned for Phase 2',
      desc: 'Detects denial-of-service command bursts (e.g. 200 Reset commands in 10 seconds) using sliding window rate-limiting and token bucket algorithms.',
      icon: Flame,
      color: 'text-amber-400',
      border: 'border-amber-500/20',
      bg: 'bg-amber-500/10'
    },
    {
      title: 'Attack 5 — Grid Load Cyber Attack',
      status: 'Planned for Phase 2',
      desc: 'Detects synchronized rapid ramp-up attacks designed to trip localized distribution grid transformers by aggregating real-time substation capacity limits.',
      icon: Cpu,
      color: 'text-purple-400',
      border: 'border-purple-500/20',
      bg: 'bg-purple-500/10'
    },
    {
      title: 'Full OCPP 1.6J / 2.0.1 Schema Compliance',
      status: 'Planned for Phase 2',
      desc: 'Extends lightweight basic validation to complete JSON Schema verification for all 30+ OCPP 1.6J messages and OCPP 2.0.1 smart charging profiles.',
      icon: ShieldAlert,
      color: 'text-sky-400',
      border: 'border-sky-500/20',
      bg: 'bg-sky-500/10'
    },
    {
      title: 'Dynamic Anomaly Baseline Profiling',
      status: 'Planned for Phase 2',
      desc: 'Statistical learning models to profile historical EV charging curves and flag gradual degradation or firmware tampering.',
      icon: Sparkles,
      color: 'text-pink-400',
      border: 'border-pink-500/20',
      bg: 'bg-pink-500/10'
    }
  ];

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-indigo-400" />
          <div>
            <h2 className="text-base font-semibold text-white">Future Development Roadmap (Remaining 40–50%)</h2>
            <p className="text-xs text-slate-400">Documented planned features for subsequent project iterations</p>
          </div>
        </div>
        <span className="text-xs font-mono font-medium px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
          Course Scope Phase 2
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {futureItems.map((item, idx) => {
          const IconComp = item.icon;
          return (
            <div
              key={idx}
              className={`p-3.5 rounded-lg bg-slate-950/70 border ${item.border} flex items-start gap-3`}
            >
              <div className={`p-2 rounded-lg ${item.bg} ${item.color} shrink-0 mt-0.5`}>
                <IconComp className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-xs font-bold text-slate-200">{item.title}</h4>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                    {item.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
