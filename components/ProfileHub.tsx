
import React, { useState, useEffect } from 'react';
import { UserProfile, UserCustomization, GlobalRankUser } from '../types';
import { t } from '../services/localization';
import { PlayerStats } from './PlayerStats';
import { authService } from '../services/authService';

interface ProfileHubProps {
  profile: UserProfile;
  updateProfile: (p: Partial<UserProfile>) => void;
  onLogout: () => void;
  onClose: () => void;
}

const AVAILABLE_ICONS = [
  '👾', '💀', '👽', '🤖', '🦊', '🐲', '👹', '👺', '👻', '🤡',
  '🕹️', '🎮', '🎲', '🎯', '🎳', '🎨', '🚀', '🛸', '⚔️', '🛡️',
  '💎', '🧿', '🧬', '☣️', '☢️', '⚡', '🔥', '❄️', '⭐', '👁️'
];

const AVAILABLE_BANNERS = [
  { id: 'default', css: 'bg-gradient-to-b from-primary/10 to-transparent' },
  { id: 'purple_haze', css: 'bg-gradient-to-r from-purple-900/50 via-black to-black' },
  { id: 'matrix', css: 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-900/40 via-black to-black' },
  { id: 'sunset', css: 'bg-gradient-to-br from-orange-500/20 via-red-900/20 to-black' },
  { id: 'deep_blue', css: 'bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-blue-900/50 via-black to-black' },
  { id: 'gold_rush', css: 'bg-gradient-to-b from-yellow-500/10 via-yellow-900/5 to-black' },
];

const AVAILABLE_TITLES = [
  'Operative', 'Rookie', 'Sniper', 'Tank', 'Support', 'IGL', 'Fragger',
  'Glitch Hunter', 'Cyber-Psycho', 'Netrunner', 'Solo', 'Mercenary', 
  'Legend', 'Immortal', 'Bot'
];

export const ProfileHub: React.FC<ProfileHubProps> = ({ profile, updateProfile, onLogout, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'rank' | 'customize' | 'settings'>('overview');
  
  // Stats Entry State
  const [newKills, setNewKills] = useState(0);
  const [newDeaths, setNewDeaths] = useState(0);
  const [newHS, setNewHS] = useState(profile.stats.headshotPct || 0);
  const [newAcc, setNewAcc] = useState(profile.stats.accuracy || 0);

  // Username Editing State
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(profile.username);

  // Global Rank Data
  const [leaderboard, setLeaderboard] = useState<GlobalRankUser[]>([]);

  // Simulate Real-Time Rank Updates
  useEffect(() => {
    if (activeTab === 'rank') {
      const fetchLeaderboard = () => {
        const data = authService.getLeaderboard();
        setLeaderboard(data);
      };
      
      fetchLeaderboard();
      // Simulate live movement in ranking
      const interval = setInterval(() => {
        authService.simulateBotActivity(); 
        fetchLeaderboard();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const getRankColor = (rank: string) => {
    if (rank.includes('Neophyte')) return 'text-gray-400';
    if (rank.includes('Operative')) return 'text-success';
    if (rank.includes('Knight')) return 'text-primary';
    if (rank.includes('Titan')) return 'text-purple-400';
    if (rank.includes('Omniscient')) return 'text-yellow-400';
    return 'text-white';
  };

  const saveUsername = () => {
    if (tempName.trim()) {
      updateProfile({ username: tempName });
      setIsEditingName(false);
    }
  };

  const handleUpdateStats = () => {
    if (newKills < 0 || newDeaths < 0) return;
    
    const xpPerKill = 15; 
    const xpGain = newKills * xpPerKill;
    const creditGain = newKills * 3; 

    const updatedKills = profile.stats.kills + newKills;
    const updatedDeaths = (profile.stats.deaths || 0) + newDeaths;
    
    // Recalc KD
    const finalDeaths = Math.max(1, updatedDeaths);
    const newKd = parseFloat((updatedKills / finalDeaths).toFixed(2));

    updateProfile({
      xp: profile.xp + xpGain,
      credits: profile.credits + creditGain,
      stats: {
        ...profile.stats,
        kills: updatedKills,
        deaths: updatedDeaths,
        kdRatio: newKd,
        headshotPct: newHS, // User manually updates current average
        accuracy: newAcc    // User manually updates current average
      }
    });
    
    // Reset increment fields only
    setNewKills(0);
    setNewDeaths(0);
    alert(`Combat Data Logged! +${xpGain} XP`);
  };

  const nextRankXP = profile.xp < 1000 ? 1000 : profile.xp < 5000 ? 5000 : profile.xp < 15000 ? 15000 : 50000;
  const prevRankXP = profile.xp < 1000 ? 0 : profile.xp < 5000 ? 1000 : profile.xp < 15000 ? 5000 : 15000;
  const progressPercent = Math.min(100, Math.max(0, ((profile.xp - prevRankXP) / (nextRankXP - prevRankXP)) * 100));

  const getAvatarClasses = () => {
    const base = "w-32 h-32 mx-auto rounded-full bg-gray-900 mb-6 flex items-center justify-center text-5xl overflow-hidden relative transition-all duration-300 shadow-2xl z-10 ";
    switch (profile.customization.avatarBorder) {
      case 'neon-blue': return base + "border-[3px] border-primary shadow-[0_0_30px_#00f0ff]";
      case 'neon-purple': return base + "border-[3px] border-secondary shadow-[0_0_30px_#7000ff]";
      case 'gold': return base + "border-[3px] border-yellow-400 shadow-[0_0_30px_#facc15] animate-pulse-slow";
      case 'glitch': return base + "border-[3px] border-white shadow-[0_0_30px_white]"; 
      default: return base + "border-[3px] border-white/10";
    }
  };

  const currentBanner = AVAILABLE_BANNERS.find(b => b.id === (profile.customization.bannerId || 'default'))?.css || AVAILABLE_BANNERS[0].css;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in zoom-in duration-300">
      <div className="bg-[#0a0a0c] w-full max-w-6xl h-[90vh] rounded-[2rem] flex overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] relative border border-white/5">
        
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 z-20 w-10 h-10 flex items-center justify-center bg-white/5 rounded-full hover:bg-red-500 hover:rotate-90 transition-all text-white border border-white/5"
        >
          ✕
        </button>

        {/* --- LEFT SIDEBAR (PROFILE CARD) --- */}
        <div className="w-80 bg-[#0f0f11] border-r border-white/5 p-8 flex flex-col shrink-0 relative overflow-hidden">
           {/* Dynamic Banner Background */}
           <div className={`absolute top-0 left-0 w-full h-80 pointer-events-none transition-all duration-500 ${currentBanner}`}></div>

           <div className="relative z-10 text-center mt-8">
              <div className={getAvatarClasses()}>
                 <span>{profile.customization.avatarIcon || '👾'}</span>
                 {profile.customization.avatarBorder === 'glitch' && (
                    <div className="absolute inset-0 bg-red-500/30 animate-ping opacity-30"></div>
                 )}
              </div>
              
              {isEditingName ? (
                <div className="flex flex-col gap-3 mb-4 animate-in fade-in">
                  <input 
                    type="text" 
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="bg-black border border-primary rounded-lg px-3 py-2 text-center text-white text-lg focus:outline-none font-bold"
                    autoFocus
                  />
                  <div className="flex gap-2 justify-center">
                    <button onClick={saveUsername} className="text-xs bg-green-500 text-black px-3 py-1 rounded font-bold hover:bg-green-400">SAVE</button>
                    <button onClick={() => { setIsEditingName(false); setTempName(profile.username); }} className="text-xs bg-red-500/20 text-red-400 px-3 py-1 rounded font-bold border border-red-500/50 hover:bg-red-500/40">CANCEL</button>
                  </div>
                </div>
              ) : (
                <div className="group relative inline-block mb-1">
                  <h2 className={`text-3xl font-display font-black tracking-tight cursor-pointer hover:scale-105 transition-transform ${
                    profile.customization.isRGBName ? 'text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-green-500 to-blue-500 animate-gradient-x' : 'text-white'
                  }`} onClick={() => setIsEditingName(true)}>
                    {profile.username}
                  </h2>
                </div>
              )}

              {/* Equipped Title */}
              <div className="mb-4">
                 <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-gray-300 font-bold uppercase tracking-widest border border-white/5">
                    {profile.customization.equipTitle || 'Operative'}
                 </span>
              </div>

              <p className={`text-sm font-mono uppercase tracking-[0.2em] font-bold ${getRankColor(profile.rankTitle)}`}>
                {profile.rankTitle}
              </p>
           </div>

           {/* Stats Mini Grid */}
           <div className="grid grid-cols-2 gap-3 mt-auto mb-8 relative z-10">
              <div className="bg-black/40 backdrop-blur-sm rounded-xl p-3 text-center border border-white/5">
                 <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Credits</div>
                 <div className="text-yellow-400 font-mono font-bold text-lg">{profile.credits.toLocaleString()}</div>
              </div>
              <div className="bg-black/40 backdrop-blur-sm rounded-xl p-3 text-center border border-white/5">
                 <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">XP Level</div>
                 <div className="text-purple-400 font-mono font-bold text-lg">{Math.floor(profile.xp / 1000) + 1}</div>
              </div>
           </div>

           {/* Navigation */}
           <nav className="space-y-2 relative z-10">
             <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'overview' ? 'bg-primary text-black shadow-neon-blue scale-105' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>
               <span>📊</span> Overview
             </button>
             <button onClick={() => setActiveTab('rank')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'rank' ? 'bg-primary text-black shadow-neon-blue scale-105' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>
               <span>🏆</span> Leaderboard
             </button>
             <button onClick={() => setActiveTab('customize')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'customize' ? 'bg-primary text-black shadow-neon-blue scale-105' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>
               <span>🎨</span> Customize
             </button>
             <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'settings' ? 'bg-primary text-black shadow-neon-blue scale-105' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>
               <span>⚙️</span> System
             </button>
           </nav>
        </div>

        {/* --- MAIN CONTENT AREA --- */}
        <div className="flex-1 p-10 overflow-y-auto bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-opacity-5 relative">
           
           {/* Tab: Overview */}
           {activeTab === 'overview' && (
             <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
               <div>
                 <h3 className="text-4xl font-display font-black text-white mb-2">BATTLE STATION</h3>
                 <p className="text-gray-500 font-mono">Real-time statistics and progression tracking.</p>
               </div>

               {/* XP Bar */}
               <div className="bg-[#111] p-8 rounded-3xl border border-white/10 shadow-lg relative overflow-hidden group">
                  <div className="flex justify-between items-end mb-4 relative z-10">
                     <div>
                       <span className="text-gray-400 text-xs font-bold uppercase tracking-widest block mb-1">Rank Progress</span>
                       <span className={`text-2xl font-black ${getRankColor(profile.rankTitle)}`}>{profile.rankTitle.toUpperCase()}</span>
                     </div>
                     <div className="text-right">
                       <span className="text-white font-mono text-xl font-bold">{profile.xp.toLocaleString()} <span className="text-gray-600">/ {nextRankXP.toLocaleString()} XP</span></span>
                     </div>
                  </div>
                  <div className="w-full h-8 bg-black rounded-full overflow-hidden border border-white/10 relative z-10">
                     <div className="h-full bg-gradient-to-r from-primary via-blue-500 to-purple-600 shadow-[0_0_30px_rgba(0,240,255,0.4)] transition-all duration-1000 ease-out relative" style={{ width: `${progressPercent}%` }}>
                        <div className="absolute top-0 left-0 w-full h-full bg-white/20 animate-pulse"></div>
                     </div>
                  </div>
               </div>

               {/* Detailed Stats */}
               <PlayerStats stats={profile.stats} />

               {/* Manual Logger (Quick Actions) */}
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <div className="bg-[#111] p-6 rounded-3xl border border-white/10">
                    <h4 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                       <span className="w-2 h-2 bg-yellow-400 rounded-full"></span> Combat Data Update
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                       <div>
                         <label className="text-[10px] text-gray-500 font-bold uppercase">Add Kills</label>
                         <input type="number" value={newKills} onChange={e => setNewKills(Number(e.target.value))} className="w-full bg-black border border-white/20 rounded-lg p-2 text-white font-mono" />
                       </div>
                       <div>
                         <label className="text-[10px] text-gray-500 font-bold uppercase">Add Deaths</label>
                         <input type="number" value={newDeaths} onChange={e => setNewDeaths(Number(e.target.value))} className="w-full bg-black border border-white/20 rounded-lg p-2 text-white font-mono" />
                       </div>
                       <div>
                         <label className="text-[10px] text-gray-500 font-bold uppercase">Headshot % (Avg)</label>
                         <input type="number" value={newHS} onChange={e => setNewHS(Number(e.target.value))} className="w-full bg-black border border-white/20 rounded-lg p-2 text-white font-mono" max={100} />
                       </div>
                       <div>
                         <label className="text-[10px] text-gray-500 font-bold uppercase">Accuracy % (Avg)</label>
                         <input type="number" value={newAcc} onChange={e => setNewAcc(Number(e.target.value))} className="w-full bg-black border border-white/20 rounded-lg p-2 text-white font-mono" max={100} />
                       </div>
                    </div>

                    <button onClick={handleUpdateStats} className="w-full bg-white/5 border border-white/10 text-white py-3 rounded-xl hover:bg-white hover:text-black font-bold transition-all text-xs uppercase tracking-widest">
                      Update Stats Log
                    </button>
                 </div>
                 
                 <div className="bg-gradient-to-br from-primary/10 to-purple-600/10 p-8 rounded-3xl border border-white/10 flex items-center justify-between">
                    <div>
                      <h4 className="text-xl font-bold text-white mb-2">Passive Earning Active</h4>
                      <p className="text-xs text-gray-400 max-w-[200px]">You are earning XP and Credits every minute this app is open.</p>
                    </div>
                    <div className="w-16 h-16 rounded-full border-4 border-white/10 border-t-primary animate-spin"></div>
                 </div>
               </div>
             </div>
           )}

           {/* Tab: Rank */}
           {activeTab === 'rank' && (
             <div className="space-y-6 animate-in slide-in-from-right-8 duration-500 h-full flex flex-col">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <h3 className="text-4xl font-display font-black text-white mb-2">GLOBAL LEADERBOARD</h3>
                    <p className="text-gray-500 font-mono text-sm">Real-time rankings from operative network.</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-green-400 bg-green-900/20 px-3 py-1 rounded border border-green-500/30">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> LIVE UPDATES
                  </div>
                </div>

                <div className="flex-1 bg-[#111] border border-white/10 rounded-3xl overflow-hidden relative custom-scrollbar overflow-y-auto">
                   <table className="w-full text-left border-collapse">
                     <thead className="bg-white/5 text-gray-500 text-[10px] uppercase font-bold tracking-widest sticky top-0 z-10 backdrop-blur-md">
                       <tr>
                         <th className="p-6">Rank</th>
                         <th className="p-6">Operative</th>
                         <th className="p-6 text-right">XP</th>
                         <th className="p-6 text-right">Partner</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-white/5">
                        {leaderboard.map((row, idx) => (
                          <tr key={idx} className={`group hover:bg-white/5 transition-colors ${row.username === profile.username ? 'bg-primary/5' : ''}`}>
                            <td className="p-6 font-mono text-white text-lg">
                              {row.rank === 1 && '🥇'}
                              {row.rank === 2 && '🥈'}
                              {row.rank === 3 && '🥉'}
                              {row.rank > 3 && `#${row.rank}`}
                            </td>
                            <td className="p-6">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${row.rank === 1 ? 'bg-yellow-400 text-black' : 'bg-gray-800 text-gray-400'}`}>
                                  {row.username.charAt(0)}
                                </div>
                                <span className={`font-bold ${row.username === profile.username ? 'text-primary' : 'text-white'}`}>
                                  {row.username}
                                  {row.username === profile.username && <span className="ml-2 text-[8px] bg-primary text-black px-1.5 py-0.5 rounded font-bold uppercase">YOU</span>}
                                </span>
                              </div>
                            </td>
                            <td className="p-6 text-right font-mono text-gray-300 group-hover:text-white transition-colors">{row.xp.toLocaleString()}</td>
                            <td className="p-6 text-right text-sm font-bold text-pink-500">{row.waifuName}</td>
                          </tr>
                        ))}
                     </tbody>
                   </table>
                </div>
             </div>
           )}

           {/* Tab: Customize */}
           {activeTab === 'customize' && (
             <div className="space-y-8 animate-in slide-in-from-right-8 duration-500 pb-20">
               <h3 className="text-4xl font-display font-black text-white mb-6">VISUAL IDENTITY</h3>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {/* Icon Selector */}
                 <div className="bg-[#111] p-8 rounded-3xl border border-white/10 md:col-span-2">
                    <h4 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                       <span className="text-primary">👾</span> Avatar Icon
                    </h4>
                    <div className="grid grid-cols-8 sm:grid-cols-10 gap-3">
                      {AVAILABLE_ICONS.map((icon, idx) => (
                        <button 
                          key={idx}
                          onClick={() => updateProfile({ customization: { ...profile.customization, avatarIcon: icon } })} 
                          className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all ${
                            (profile.customization.avatarIcon || '👾') === icon 
                              ? 'bg-primary text-black scale-110 shadow-neon-blue' 
                              : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-white hover:scale-105'
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                 </div>

                 {/* Banner Selector */}
                 <div className="bg-[#111] p-8 rounded-3xl border border-white/10">
                    <h4 className="text-xl font-bold text-white mb-6">Profile Banner</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {AVAILABLE_BANNERS.map((banner) => (
                        <button
                          key={banner.id}
                          onClick={() => updateProfile({ customization: { ...profile.customization, bannerId: banner.id } })}
                          className={`h-16 rounded-xl relative overflow-hidden transition-all ${
                            (profile.customization.bannerId || 'default') === banner.id 
                              ? 'ring-2 ring-primary ring-offset-2 ring-offset-black scale-105' 
                              : 'opacity-50 hover:opacity-100'
                          }`}
                        >
                          <div className={`absolute inset-0 ${banner.css}`}></div>
                        </button>
                      ))}
                    </div>
                 </div>

                 {/* Titles */}
                 <div className="bg-[#111] p-8 rounded-3xl border border-white/10">
                    <h4 className="text-xl font-bold text-white mb-6">Equip Title</h4>
                    <div className="flex flex-wrap gap-2">
                       {AVAILABLE_TITLES.map((title) => (
                         <button
                           key={title}
                           onClick={() => updateProfile({ customization: { ...profile.customization, equipTitle: title } })}
                           className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                             (profile.customization.equipTitle || 'Operative') === title
                               ? 'bg-white text-black'
                               : 'bg-black border border-white/20 text-gray-500 hover:border-white/50 hover:text-white'
                           }`}
                         >
                           {title}
                         </button>
                       ))}
                    </div>
                 </div>

                 {/* Special Effects */}
                 <div className="bg-[#111] p-8 rounded-3xl border border-white/10">
                    <h4 className="text-xl font-bold text-white mb-6">Special FX</h4>
                    
                    <div className="space-y-6">
                      <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5">
                         <div>
                           <div className="font-bold text-white mb-1">RGB Gamertag</div>
                           <div className="text-xs text-gray-500">Chroma cycle animation</div>
                         </div>
                         <button 
                            onClick={() => updateProfile({ customization: { ...profile.customization, isRGBName: !profile.customization.isRGBName } })} 
                            className={`w-12 h-6 rounded-full relative transition-colors ${profile.customization.isRGBName ? 'bg-gradient-to-r from-red-500 to-blue-500' : 'bg-gray-700'}`}
                         >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${profile.customization.isRGBName ? 'left-7' : 'left-1'}`}></div>
                         </button>
                      </div>

                      <div>
                         <label className="text-xs font-bold text-gray-500 uppercase block mb-3">Avatar Border</label>
                         <div className="flex gap-3 justify-center">
                            {[{id: 'none', color: 'gray'},{id: 'neon-blue', color: '#00f0ff'},{id: 'neon-purple', color: '#7000ff'},{id: 'gold', color: '#ffd700'},{id: 'glitch', color: 'white'}].map((opt) => (
                              <button 
                                key={opt.id}
                                onClick={() => updateProfile({ customization: { ...profile.customization, avatarBorder: opt.id as any } })} 
                                className={`w-10 h-10 rounded-full bg-black transition-all relative ${profile.customization.avatarBorder === opt.id ? 'scale-125' : 'opacity-50 hover:opacity-100'}`} 
                                style={{border: `2px solid ${opt.color}`}}
                              >
                                {opt.id === 'glitch' && <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full"></div>}
                              </button>
                            ))}
                          </div>
                      </div>
                    </div>
                 </div>
               </div>
             </div>
           )}

           {/* Tab: Settings */}
           {activeTab === 'settings' && (
             <div className="h-full flex flex-col items-center justify-center animate-in slide-in-from-right-8 duration-500">
               <div className="text-center mb-12">
                 <h3 className="text-3xl font-bold text-white mb-2">SYSTEM CONTROLS</h3>
                 <p className="text-gray-500">Manage account data and session.</p>
               </div>
               
               <div className="grid gap-6 w-full max-w-md">
                 <button onClick={onLogout} className="w-full py-4 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white hover:text-black transition-all uppercase text-sm font-bold tracking-widest">
                   {t('settings.logout')}
                 </button>
                 <button 
                   onClick={() => { if(confirm(t('settings.reset_confirm'))) { localStorage.clear(); window.location.reload(); } }} 
                   className="w-full py-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all uppercase text-sm font-bold tracking-widest"
                 >
                   {t('settings.reset')}
                 </button>
               </div>
               
               <div className="mt-12 text-xs font-mono text-gray-700">
                 KLUTCH OS v2.1 // BUILD 9001
               </div>
             </div>
           )}

        </div>
      </div>
    </div>
  );
};
