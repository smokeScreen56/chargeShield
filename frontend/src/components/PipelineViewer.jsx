import React from 'react';
import { UserCheck, FileCheck, Layers, Gauge, Target, ShieldCheck, ArrowRight } from 'lucide-react';

export default function PipelineViewer() {
  const steps = [
    {
      step: '1',
      title: 'Identity Check',
      desc: 'Verify registered ID (CP001-003) & detect socket impersonation',
      icon: UserCheck,
      color: 'text-sky-400',
      border: 'border-sky-500/30'
    },
    {
      step: '2',
      title: 'OCPP Validation',
      desc: 'Verify 1.6J frame structure, schema, & mandatory fields',
      icon: FileCheck,
      color: 'text-teal-400',
      border: 'border-teal-500/30'
    },
    {
      step: '3',
      title: 'Session Check',
      desc: 'Enforce state machine: Idle → Auth → Start → Meter → Stop',
      icon: Layers,
      color: 'text-indigo-400',
      border: 'border-indigo-500/30'
    },
    {
      step: '4',
      title: 'Physics Check',
      desc: 'Verify kW against rated capacity & meter rollback',
      icon: Gauge,
      color: 'text-amber-400',
      border: 'border-amber-500/30'
    },
    {
      step: '5',
      title: 'Risk Engine',
      desc: 'Aggregate score (0-100) & assign risk severity band',
      icon: Target,
      color: 'text-orange-400',
      border: 'border-orange-500/30'
    },
    {
      step: '6',
      title: 'Decision Engine',
      desc: 'Output deterministic ALLOW, BLOCK (CallError), or ALERT',
      icon: ShieldCheck,
      color: 'text-emerald-400',
      border: 'border-emerald-500/30'
    }
  ];

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-white">ChargeShield Detection Pipeline</h2>
          <p className="text-xs text-slate-400">Sequential real-time inspection pipeline for every incoming OCPP frame</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
          6-Stage Analysis
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 relative">
        {steps.map((item, idx) => {
          const IconComp = item.icon;
          return (
            <div
              key={idx}
              className={`p-3.5 rounded-lg bg-slate-950/70 border ${item.border} flex flex-col justify-between relative group hover:bg-slate-900/90 transition-all`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  STAGE {item.step}
                </span>
                <IconComp className={`w-4 h-4 ${item.color}`} />
              </div>

              <div>
                <h4 className="text-xs font-semibold text-white mb-1">{item.title}</h4>
                <p className="text-[11px] text-slate-400 leading-snug">{item.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
