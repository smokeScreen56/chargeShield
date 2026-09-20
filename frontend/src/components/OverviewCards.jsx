import React from 'react';
import { Zap, Activity, AlertTriangle, ShieldX, CheckCircle, Radio } from 'lucide-react';

export default function OverviewCards({ stats }) {
  const cards = [
    {
      title: 'Total Chargers',
      value: stats.totalChargers || 3,
      subtitle: 'Registered in registry',
      icon: Zap,
      color: 'text-sky-400',
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/20'
    },
    {
      title: 'Active Connections',
      value: stats.activeChargers || 0,
      subtitle: 'WebSocket clients online',
      icon: Radio,
      color: 'text-teal-400',
      bg: 'bg-teal-500/10',
      border: 'border-teal-500/20'
    },
    {
      title: 'Active Sessions',
      value: stats.activeSessions || 0,
      subtitle: 'Currently charging',
      icon: Activity,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20'
    },
    {
      title: 'Messages Processed',
      value: stats.messagesProcessed || 0,
      subtitle: 'OCPP frames evaluated',
      icon: CheckCircle,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20'
    },
    {
      title: 'Threats Detected',
      value: stats.threatsDetected || 0,
      subtitle: 'Security violations',
      icon: AlertTriangle,
      color: (stats.threatsDetected || 0) > 0 ? 'text-amber-400' : 'text-slate-400',
      bg: (stats.threatsDetected || 0) > 0 ? 'bg-amber-500/10' : 'bg-slate-800/40',
      border: (stats.threatsDetected || 0) > 0 ? 'border-amber-500/30' : 'border-slate-800'
    },
    {
      title: 'Blocked Messages',
      value: stats.blockedMessages || 0,
      subtitle: 'CallError rejected',
      icon: ShieldX,
      color: (stats.blockedMessages || 0) > 0 ? 'text-rose-400' : 'text-slate-400',
      bg: (stats.blockedMessages || 0) > 0 ? 'bg-rose-500/10' : 'bg-slate-800/40',
      border: (stats.blockedMessages || 0) > 0 ? 'border-rose-500/30' : 'border-slate-800'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
      {cards.map((card, idx) => {
        const IconComponent = card.icon;
        return (
          <div
            key={idx}
            className={`p-4 rounded-xl bg-slate-900/60 border ${card.border} backdrop-blur-sm flex flex-col justify-between transition-all hover:bg-slate-900/90`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">{card.title}</span>
              <div className={`p-1.5 rounded-lg ${card.bg} ${card.color}`}>
                <IconComponent className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white tracking-tight">{card.value}</div>
              <div className="text-[11px] text-slate-500 truncate mt-0.5">{card.subtitle}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
