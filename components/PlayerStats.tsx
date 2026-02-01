
import React from 'react';
import { UserStats } from '../types';
import { t } from '../services/localization';

interface PlayerStatsProps {
  stats: UserStats;
}

const CircularProgress = ({ value, label, colorId, size = 120, displayValue }: { value: number; label: string; colorId: string; size?: number; displayValue?: string }) => {
  const radius = (size - 10) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;

  // Gradient definitions based on colorId
  const getGradient = () => {
    switch (colorId) {
      case 'red': return <linearGradient id="grad-red" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#ff003c" /><stop offset="100%" stopColor="#ff5f1f" /></linearGradient>;
      case 'green': return <linearGradient id="grad-green" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#0aff9d" /><stop offset="100%" stopColor="#00f0ff" /></linearGradient>;
      case 'cyan': return <linearGradient id="grad-cyan" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#00f0ff" /><stop offset="100%" stopColor="#7000ff" /></linearGradient>;
      default: return <linearGradient id="grad-def" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fff" /><stop offset="100%" stopColor="#ccc" /></linearGradient>;
    }
  };

  const getStrokeUrl = () => {
    switch (colorId) {
      case 'red': return "url(#grad-red)";
      case 'green': return "url(#grad-green)";
      case 'cyan': return "url(#grad-cyan)";
      default: return "#fff";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center group">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90 w-full h-full drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]">
          <defs>
            {getGradient()}
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="8"
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={getStrokeUrl()}
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
           <span className="text-2xl font-mono font-black text-white drop-shadow-md">
             {displayValue || `${value}%`}
           </span>
        </div>
      </div>
      <span className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 group-hover:text-white transition-colors">{label}</span>
    </div>
  );
};

export const PlayerStats: React.FC<PlayerStatsProps> = ({ stats }) => {
  // Safe calculation for KD
  const kdDisplay = stats.deaths > 0 
    ? (stats.kills / stats.deaths).toFixed(2) 
    : stats.kills.toFixed(2);
  
  // KD Progress: Cap at 5.0 for the circle visual (0-100% mapped to 0-5.0 KD)
  const kdProgress = Math.min(100, (parseFloat(kdDisplay) / 5) * 100);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full animate-in fade-in zoom-in duration-500">
      {/* K/D Ratio */}
      <div className="bg-[#111] p-6 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-cyan-500/50 transition-all flex flex-col items-center justify-center shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="absolute top-4 right-4 text-cyan-500/20 text-4xl">☠️</div>
        <CircularProgress value={kdProgress} label={t('stats.kd')} colorId="cyan" displayValue={kdDisplay} />
        <div className="mt-4 text-[10px] font-mono text-cyan-400 bg-cyan-900/20 px-3 py-1 rounded border border-cyan-500/20">
          {stats.kills} K / {stats.deaths || 0} D
        </div>
      </div>

      {/* Headshot Percentage */}
      <div className="bg-[#111] p-6 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-red-500/50 transition-all flex items-center justify-center shadow-lg">
         <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
         <div className="absolute top-4 right-4 text-red-500/20 text-4xl">🎯</div>
         <CircularProgress value={stats.headshotPct} label={t('stats.hs')} colorId="red" />
      </div>

      {/* Accuracy */}
      <div className="bg-[#111] p-6 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-green-500/50 transition-all flex items-center justify-center shadow-lg">
         <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
         <div className="absolute top-4 right-4 text-green-500/20 text-4xl">📐</div>
         <CircularProgress value={stats.accuracy} label={t('stats.acc')} colorId="green" />
      </div>
    </div>
  );
};
