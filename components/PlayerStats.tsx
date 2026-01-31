
import React from 'react';
import { UserStats } from '../types';
import { t } from '../services/localization';

interface PlayerStatsProps {
  stats: UserStats;
}

const CircularProgress = ({ value, label, color, size = 120 }: { value: number; label: string; color: string; size?: number }) => {
  const radius = (size - 10) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90 w-full h-full">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="6"
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth="6"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <span className="absolute text-xl font-mono font-bold text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
          {value}%
        </span>
      </div>
      <span className="mt-2 text-xs font-bold uppercase tracking-widest text-gray-500">{label}</span>
    </div>
  );
};

export const PlayerStats: React.FC<PlayerStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full animate-in fade-in zoom-in duration-500">
      {/* K/D Ratio - Big Box */}
      <div className="bg-white/5 p-6 rounded-2xl border border-white/10 relative overflow-hidden group hover:border-primary/50 transition-all flex flex-col items-center justify-center">
        <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors"></div>
        <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">☠️</div>
        
        <h4 className="text-xs text-gray-400 uppercase tracking-[0.2em] mb-2 relative z-10">{t('stats.kd')}</h4>
        <div className="text-6xl font-display font-black text-white drop-shadow-[0_0_15px_rgba(0,240,255,0.5)] relative z-10">
          {stats.kdRatio.toFixed(2)}
        </div>
        <div className="mt-4 text-[10px] font-mono text-primary bg-primary/10 px-3 py-1 rounded border border-primary/20">
          {stats.kills} KILLS / {stats.losses * 5} DEATHS (EST)
        </div>
      </div>

      {/* Headshot Percentage */}
      <div className="bg-white/5 p-6 rounded-2xl border border-white/10 relative overflow-hidden group hover:border-red-500/50 transition-all flex items-center justify-center">
         <div className="absolute inset-0 bg-red-500/5 group-hover:bg-red-500/10 transition-colors"></div>
         <CircularProgress value={stats.headshotPct} label={t('stats.hs')} color="#ff003c" />
      </div>

      {/* Accuracy */}
      <div className="bg-white/5 p-6 rounded-2xl border border-white/10 relative overflow-hidden group hover:border-green-500/50 transition-all flex items-center justify-center">
         <div className="absolute inset-0 bg-green-500/5 group-hover:bg-green-500/10 transition-colors"></div>
         <CircularProgress value={stats.accuracy} label={t('stats.acc')} color="#0aff9d" />
      </div>
    </div>
  );
};
