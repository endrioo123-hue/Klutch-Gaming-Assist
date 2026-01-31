
import React, { useState, useEffect } from 'react';
import { UserProfile, UserCustomization, VoiceCommand, GlobalRankUser } from '../types';
import { t } from '../services/localization';
import { PlayerStats } from './PlayerStats';
import { authService } from '../services/authService';

interface ProfileHubProps {
  profile: UserProfile;
  updateProfile: (p: Partial<UserProfile>) => void;
  onLogout: () => void;
  onClose: () => void;
}

export const ProfileHub: React.FC<ProfileHubProps> = ({ profile, updateProfile, onLogout, onClose }) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'rank' | 'customize' | 'voice' | 'settings'>('stats');
  const [sessionKills, setSessionKills] = useState(0);
  
  // Username Editing State
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(profile.username);

  // Global Rank Data
  const [leaderboard, setLeaderboard] = useState<GlobalRankUser[]>([]);

  useEffect(() => {
    if (activeTab === 'rank') {
      const data = authService.getLeaderboard();
      setLeaderboard(data);
    }
  }, [activeTab]);

  const getRankColor = (rank: string) => {
    if (rank.includes('Neophyte')) return 'text-gray-400 font-medium';
    if (rank.includes('Operative')) return 'text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 font-bold drop-shadow-sm';
    if (rank.includes('Cyber-Knight')) return 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 font-bold drop-shadow-md';
    if (rank.includes('Titan')) return 'text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 font-extrabold drop-shadow-lg';
    if (rank.includes('Omniscient')) return 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-gold to-orange-500 font-black drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]';
    return 'text-white';
  };

  const toggleRGB = () => {
    updateProfile({
      customization: { ...profile.customization, isRGBName: !profile.customization.isRGBName }
    });
  };

  const setBorder = (style: UserCustomization['avatarBorder']) => {
    updateProfile({
      customization: { ...profile.customization, avatarBorder: style }
    });
  };

  const saveUsername = () => {
    if (tempName.trim()) {
      updateProfile({ username: tempName });
      setIsEditingName(false);
    }
  };

  const handleAddKillsOnly = () => {
    if (sessionKills <= 0) return;
    const xpPerKill = 10; 
    const xpGain = sessionKills * xpPerKill;
    const creditGain = sessionKills * 2; // Credits per kill

    const newKills = profile.stats.kills + sessionKills;
    const newKd = parseFloat(((newKills) / (Math.max(1, profile.stats.losses))).toFixed(2));

    updateProfile({
      xp: profile.xp + xpGain,
      credits: profile.credits + creditGain,
      stats: {
        ...profile.stats,
        kills: newKills,
        kdRatio: newKd
      }
    });
    setSessionKills(0);
  };

  const logMatch = (result: 'win' | 'loss') => {
    const xpGain = result === 'win' ? 500 : 100;
    const creditGain = result === 'win' ? 100 : 25;
    const killsToAdd = sessionKills;
    const newWins = result === 'win' ? profile.stats.wins + 1 : profile.stats.wins;
    const newLosses = result === 'loss' ? profile.stats.losses + 1 : profile.stats.losses;
    const newKills = profile.stats.kills + killsToAdd;
    
    const newKd = parseFloat((newKills / Math.max(1, newLosses * 5)).toFixed(2));
    const newAcc = Math.min(100, Math.max(10, profile.stats.accuracy + (Math.random() * 2 - 1)));
    const newHs = Math.min(100, Math.max(0, profile.stats.headshotPct + (Math.random() * 2 - 1)));

    const newStats = {
      ...profile.stats,
      wins: newWins,
      losses: newLosses,
      kills: newKills,
      gamesAnalyzed: profile.stats.gamesAnalyzed + 1,
      kdRatio: newKd,
      accuracy: parseInt(newAcc.toFixed(0)),
      headshotPct: parseInt(newHs.toFixed(0))
    };
    
    updateProfile({
      xp: profile.xp + xpGain + (killsToAdd * 10),
      credits: profile.credits + creditGain,
      stats: newStats
    });
    setSessionKills(0);
  };

  const handleVoiceConfigChange = (cmdId: string, field: keyof VoiceCommand, value: any) => {
    const newCommands = profile.voiceSettings.commands.map(cmd => 
      cmd.id === cmdId ? { ...cmd, [field]: value } : cmd
    );
    updateProfile({
      voiceSettings: { ...profile.voiceSettings, commands: newCommands }
    });
  };

  const handleSensitivityChange = (val: number) => {
    updateProfile({
      voiceSettings: { ...profile.voiceSettings, sensitivity: val }
    });
  };

  const handleResetData = () => {
    if (confirm(t('settings.reset_confirm'))) {
      localStorage.removeItem('klutch_user_v2');
      localStorage.removeItem('klutch_db_users_v1'); // Also clear DB for full reset
      window.location.reload();
    }
  };

  const nextRankXP = profile.xp < 1000 ? 1000 : profile.xp < 5000 ? 5000 : profile.xp < 15000 ? 15000 : 50000;
  const prevRankXP = profile.xp < 1000 ? 0 : profile.xp < 5000 ? 1000 : profile.xp < 15000 ? 5000 : 15000;
  const progressPercent = Math.min(100, Math.max(0, ((profile.xp - prevRankXP) / (nextRankXP - prevRankXP)) * 100));

  const getAvatarClasses = () => {
    const base = "w-24 h-24 mx-auto rounded-full bg-gray-800 mb-4 flex items-center justify-center text-3xl overflow-hidden relative transition-all duration-300 ";
    switch (profile.customization.avatarBorder) {
      case 'neon-blue': return base + "border-2 border-primary shadow-neon-blue";
      case 'neon-purple': return base + "border-2 border-secondary shadow-neon-purple";
      case 'gold': return base + "border-2 border-gold shadow-neon-gold animate-pulse-fast";
      case 'glitch': return base + "border-glitch"; 
      default: return base + "border border-white/10";
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-[#0f0f11] border border-white/10 w-full max-w-5xl h-[85vh] rounded-3xl flex overflow-hidden shadow-2xl relative">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-white/5 rounded-full hover:bg-red-500 hover:text-white transition-colors"
        >
          ✕
        </button>

        {/* Sidebar */}
        <div className="w-64 bg-black/40 border-r border-white/5 p-6 flex flex-col shrink-0">
           <div className="mb-8 text-center">
              <div className={getAvatarClasses()}>
                 <span>👾</span>
                 {profile.customization.avatarBorder === 'glitch' && (
                    <div className="absolute inset-0 bg-red-500/20 animate-ping opacity-20"></div>
                 )}
              </div>
              
              {isEditingName ? (
                <div className="flex flex-col gap-2 mb-2">
                  <input 
                    type="text" 
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="bg-white/10 border border-white/20 rounded px-2 py-1 text-center text-white text-sm focus:outline-none focus:border-primary font-bold"
                    autoFocus
                  />
                  <div className="flex gap-1 justify-center">
                    <button onClick={saveUsername} className="text-[10px] bg-green-500/20 text-green-400 px-2 py-1 rounded hover:bg-green-500/40">SAVE</button>
                    <button onClick={() => { setIsEditingName(false); setTempName(profile.username); }} className="text-[10px] bg-red-500/20 text-red-400 px-2 py-1 rounded hover:bg-red-500/40">CANCEL</button>
                  </div>
                </div>
              ) : (
                <div className="group relative inline-block">
                  <h2 className={`text-xl font-display font-bold truncate cursor-pointer ${
                    profile.customization.isRGBName ? 'text-rgb-animate' : 'text-white'
                  }`} onClick={() => setIsEditingName(true)}>
                    {profile.username}
                  </h2>
                  <button 
                    onClick={() => setIsEditingName(true)}
                    className="absolute -right-6 top-1/2 -translate-y-1/2 text-gray-500 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                  </button>
                </div>
              )}

              <p className={`text-xs font-mono uppercase tracking-wider mt-1 ${getRankColor(profile.rankTitle)}`}>
                {profile.rankTitle}
              </p>
           </div>

           <nav className="space-y-2">
             <button onClick={() => setActiveTab('stats')} className={`w-full text-left p-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'stats' ? 'bg-primary text-black shadow-neon-blue' : 'text-gray-500 hover:text-white'}`}>
               {t('profile.stats')}
             </button>
             <button onClick={() => setActiveTab('rank')} className={`w-full text-left p-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'rank' ? 'bg-primary text-black shadow-neon-blue' : 'text-gray-500 hover:text-white'}`}>
               Global Rank
             </button>
             <button onClick={() => setActiveTab('voice')} className={`w-full text-left p-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'voice' ? 'bg-primary text-black shadow-neon-blue' : 'text-gray-500 hover:text-white'}`}>
               {t('profile.voice')}
             </button>
             <button onClick={() => setActiveTab('customize')} className={`w-full text-left p-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'customize' ? 'bg-primary text-black shadow-neon-blue' : 'text-gray-500 hover:text-white'}`}>
               Customize
             </button>
             <button onClick={() => setActiveTab('settings')} className={`w-full text-left p-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'settings' ? 'bg-primary text-black shadow-neon-blue' : 'text-gray-500 hover:text-white'}`}>
               Settings
             </button>
           </nav>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 overflow-y-auto bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-opacity-5">
           {/* EXISTING STATS TAB CODE ... */}
           {activeTab === 'stats' && (
             <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
               <div className="flex justify-between items-center">
                  <h3 className="text-3xl font-display font-bold text-white">{t('profile.stats')}</h3>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-500 uppercase">Total XP</p>
                    <p className="font-mono text-xl text-primary">{profile.xp}</p>
                  </div>
               </div>
               <PlayerStats stats={profile.stats} />
               {/* Progress Bar & Match Logger Code from before... */}
               <div className="bg-white/5 p-6 rounded-2xl border border-white/5 shadow-lg">
                  <div className="flex justify-between items-center mb-4">
                     <span className="text-gray-400 text-sm font-bold">{t('profile.rank')}: <span className={getRankColor(profile.rankTitle)}>{profile.rankTitle}</span></span>
                     <span className="text-white font-mono text-xs opacity-70">{profile.xp} / {nextRankXP} XP</span>
                  </div>
                  <div className="w-full h-6 bg-black rounded-full overflow-hidden border border-white/10 relative">
                     <div className="absolute inset-0 bg-grid-white/[0.1] opacity-20"></div>
                     <div className="h-full bg-gradient-to-r from-primary via-purple-500 to-pink-500 shadow-[0_0_20px_rgba(112,0,255,0.6)] transition-all duration-1000 ease-out relative" style={{ width: `${progressPercent}%` }}>
                        <div className="absolute top-0 left-0 w-full h-full bg-white/20 animate-pulse"></div>
                     </div>
                  </div>
               </div>
               <div className="bg-black/40 p-6 rounded-2xl border border-white/10">
                  <h4 className="text-sm font-bold text-gray-400 uppercase mb-4 tracking-wider border-b border-white/10 pb-2">{t('stats.match_logger')} (Manual Input)</h4>
                  <div className="flex gap-4 items-end mb-4">
                     <div className="flex-1">
                        <label className="text-[10px] text-gray-500 block mb-1">{t('stats.add_kills')}</label>
                        <input type="number" value={sessionKills} onChange={(e) => setSessionKills(Math.max(0, parseInt(e.target.value) || 0))} className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white font-mono focus:border-primary focus:outline-none" />
                     </div>
                     <button onClick={handleAddKillsOnly} disabled={sessionKills <= 0} className="flex-1 bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 py-2 rounded hover:bg-yellow-500 hover:text-black font-bold transition-all text-xs uppercase shadow-lg hover:shadow-yellow-500/20 disabled:opacity-30 disabled:cursor-not-allowed">ADD TO STATS (+XP / +CREDITS)</button>
                  </div>
                  <div className="flex gap-4">
                     <button onClick={() => logMatch('win')} className="flex-1 bg-green-500/20 border border-green-500/50 text-green-400 py-3 rounded hover:bg-green-500 hover:text-black font-bold transition-all text-xs uppercase shadow-lg hover:shadow-green-500/20">{t('stats.log_win')}</button>
                     <button onClick={() => logMatch('loss')} className="flex-1 bg-red-500/20 border border-red-500/50 text-red-400 py-3 rounded hover:bg-red-500 hover:text-black font-bold transition-all text-xs uppercase shadow-lg hover:shadow-red-500/20">{t('stats.log_loss')}</button>
                  </div>
               </div>
             </div>
           )}

           {/* REAL RANK TAB */}
           {activeTab === 'rank' && (
             <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                <h3 className="text-3xl font-display font-bold text-white mb-2">GLOBAL LEADERBOARD</h3>
                <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden">
                   <table className="w-full text-left">
                     <thead className="bg-white/5 text-gray-400 text-xs uppercase font-bold tracking-wider">
                       <tr>
                         <th className="p-4">Rank</th>
                         <th className="p-4">Operative</th>
                         <th className="p-4">XP</th>
                         <th className="p-4">Partner</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-white/5">
                        {leaderboard.map((row) => (
                          <tr key={row.rank} className={`hover:bg-white/5 transition-colors ${row.username === profile.username ? 'bg-primary/10 border-l-2 border-primary' : ''}`}>
                            <td className="p-4 font-mono text-white">#{row.rank}</td>
                            <td className="p-4 font-bold text-white">{row.username} {row.username === profile.username && <span className="text-[10px] bg-primary text-black px-1 rounded ml-2">YOU</span>}</td>
                            <td className="p-4 font-mono text-gray-300">{row.xp.toLocaleString()}</td>
                            <td className="p-4 text-sm text-pink-400">{row.waifuName}</td>
                          </tr>
                        ))}
                     </tbody>
                   </table>
                </div>
             </div>
           )}

           {/* Voice, Customize, Settings... (Same as before) */}
           {activeTab === 'voice' && (
             <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
               <div><h3 className="text-3xl font-display font-bold text-white mb-2">{t('profile.voice')}</h3></div>
               <div className="bg-white/5 p-6 rounded-2xl border border-white/10"><div className="flex justify-between mb-4"><label className="text-sm font-bold text-primary uppercase">{t('voice.sensitivity')}</label><span className="font-mono text-white">{profile.voiceSettings?.sensitivity || 50}%</span></div><input type="range" min="0" max="100" value={profile.voiceSettings?.sensitivity || 50} onChange={(e) => handleSensitivityChange(parseInt(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"/></div>
               <div className="bg-black/40 p-6 rounded-2xl border border-white/10"><div className="flex justify-between items-center mb-6 border-b border-white/10 pb-2"><h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">{t('voice.commands')}</h4><span className="text-[10px] text-green-400 font-mono bg-green-900/20 px-2 py-1 rounded border border-green-500/30">ACTIVE</span></div><div className="space-y-4"><div className="grid grid-cols-12 gap-4 text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2 px-2"><div className="col-span-2">Status</div><div className="col-span-6">{t('voice.phrase')}</div><div className="col-span-4">{t('voice.action')}</div></div>{profile.voiceSettings?.commands.map((cmd) => (<div key={cmd.id} className="grid grid-cols-12 gap-4 items-center bg-white/5 p-3 rounded-lg border border-white/5 hover:border-primary/30 transition-colors"><div className="col-span-2 flex justify-center"><input type="checkbox" checked={cmd.enabled} onChange={(e) => handleVoiceConfigChange(cmd.id, 'enabled', e.target.checked)} className="w-4 h-4 accent-primary cursor-pointer"/></div><div className="col-span-6"><input type="text" value={cmd.phrase} onChange={(e) => handleVoiceConfigChange(cmd.id, 'phrase', e.target.value)} className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-white text-sm font-mono focus:border-primary focus:outline-none placeholder-gray-600"/></div><div className="col-span-4"><div className="text-xs font-bold text-gray-300 bg-white/10 px-2 py-2 rounded text-center">{cmd.action}</div></div></div>))}</div></div>
             </div>
           )}
           {activeTab === 'customize' && (
             <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
               <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5 hover:border-primary/30 transition-colors"><div><h4 className="font-bold text-white text-lg">RGB Gamertag</h4><p className="text-xs text-gray-500">Enable animated chroma cycle (God Mode).</p></div><button onClick={toggleRGB} className={`w-14 h-7 rounded-full transition-all relative shadow-inner ${profile.customization.isRGBName ? 'bg-gradient-to-r from-green-400 to-green-600' : 'bg-gray-700'}`}><div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-md ${profile.customization.isRGBName ? 'left-8' : 'left-1'}`}></div></button></div>
               <div><h4 className="font-bold text-white mb-4 text-lg">Avatar Border FX</h4><div className="flex gap-6 flex-wrap">{[{id: 'none', label: 'None', color: 'gray'},{id: 'neon-blue', label: 'Cyan', color: '#00f0ff'},{id: 'neon-purple', label: 'Void', color: '#7000ff'},{id: 'gold', label: 'Gold', color: '#ffd700'},{id: 'glitch', label: 'Glitch', color: 'white'}].map((opt) => (<div key={opt.id} className="flex flex-col items-center gap-2"><button onClick={() => setBorder(opt.id as any)} className={`w-16 h-16 rounded-full bg-gray-800 transition-all duration-300 relative group overflow-hidden ${profile.customization.avatarBorder === opt.id ? 'scale-110' : 'opacity-60 hover:opacity-100 hover:scale-105'}`} style={{border: opt.id === 'glitch' ? '2px solid white' : `2px solid ${opt.color}`,boxShadow: profile.customization.avatarBorder === opt.id && opt.id !== 'none' ? `0 0 15px ${opt.color}` : 'none'}}>{opt.id === 'glitch' && <div className="absolute inset-0 animate-pulse bg-red-500/20"></div>}</button><span className="text-[10px] uppercase font-bold text-gray-500">{opt.label}</span></div>))}</div></div>
             </div>
           )}
           {activeTab === 'settings' && (
             <div className="text-center text-gray-500 py-12 animate-in slide-in-from-bottom-4 duration-500">
               <p className="uppercase tracking-widest font-bold mb-4">Global System Settings</p>
               <div className="bg-black/40 p-6 rounded-xl border border-white/5 inline-block text-left space-y-2 min-w-[300px]"><p className="text-xs flex justify-between"><span>Region:</span> <span className="text-white">Auto (Global)</span></p><p className="text-xs flex justify-between"><span>Language:</span> <span className="text-white">{navigator.language}</span></p><p className="text-xs flex justify-between"><span>Build:</span> <span className="text-primary font-bold">V1.3.0 (Insane Edition)</span></p></div>
               <div className="mt-12 flex flex-col gap-4 items-center"><button onClick={onLogout} className="px-8 py-3 w-64 border border-white/20 text-white rounded hover:bg-white hover:text-black transition-all uppercase text-xs font-bold tracking-widest shadow-lg">{t('settings.logout')}</button><button onClick={handleResetData} className="px-8 py-3 w-64 border border-red-500/30 text-red-500 rounded hover:bg-red-500 hover:text-black transition-all uppercase text-xs font-bold tracking-widest shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:shadow-[0_0_25px_rgba(239,68,68,0.6)]">{t('settings.reset')}</button></div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};
