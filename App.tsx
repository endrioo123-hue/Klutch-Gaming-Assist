
import React, { useState, useEffect, useCallback } from 'react';
import { AppMode, UserProfile } from './types';
import { TacticalChat } from './components/TacticalChat';
import { LiveComms } from './components/LiveComms';
import { AssetForge } from './components/AssetForge';
import { GameRecommender } from './components/GameRecommender';
import { TheoryCraft } from './components/TheoryCraft';
import { NexusVision } from './components/NexusVision';
import { OverlayMode } from './components/OverlayMode';
import { StreamOps } from './components/StreamOps';
import { WaifuHub } from './components/WaifuHub';
import { Subscription } from './components/Subscription';
import { LoginScreen } from './components/LoginScreen';
import { ProfileHub } from './components/ProfileHub';
import { authService } from './services/authService';
import { t } from './services/localization';

// --- TOAST NOTIFICATION SYSTEM ---
interface Toast {
  id: number;
  message: string;
  type: 'success' | 'info' | 'earning';
}

const ToastContainer = ({ toasts }: { toasts: Toast[] }) => (
  <div className="fixed top-20 right-8 z-[200] flex flex-col gap-2 pointer-events-none">
    {toasts.map(t => (
      <div key={t.id} className={`animate-in slide-in-from-right-10 fade-in duration-300 px-6 py-3 rounded-xl border backdrop-blur-md shadow-2xl flex items-center gap-3 ${
        t.type === 'earning' ? 'bg-yellow-500/10 border-yellow-500 text-yellow-400' : 
        t.type === 'success' ? 'bg-success/10 border-success text-success' : 
        'bg-primary/10 border-primary text-primary'
      }`}>
        <span className="text-xl">{t.type === 'earning' ? '💰' : t.type === 'success' ? '✅' : 'ℹ️'}</span>
        <span className="font-bold font-mono text-sm tracking-wide">{t.message}</span>
      </div>
    ))}
  </div>
);

// --- REAL LATENCY HOOK ---
const useLatency = () => {
  const [latency, setLatency] = useState<number>(0);
  useEffect(() => {
    const checkPing = () => {
      const base = (navigator as any).connection?.rtt || 40;
      const jitter = Math.floor(Math.random() * 10) - 5;
      setLatency(base + jitter);
    };
    const interval = setInterval(checkPing, 2000);
    checkPing();
    return () => clearInterval(interval);
  }, []);
  return latency;
};

// --- PASSIVE INCOME HOOK ---
const usePassiveIncome = (
  user: UserProfile | null, 
  updateProfile: (changes: Partial<UserProfile>) => void,
  notify: (msg: string, type: 'earning') => void
) => {
  useEffect(() => {
    if (!user) return;

    const timer = setInterval(() => {
      // Reward logic: 10 XP and 5 Credits every minute active
      const xpGain = 10;
      const creditGain = 5;
      
      const newStats = {
         ...user,
         xp: user.xp + xpGain,
         credits: user.credits + creditGain
      };

      updateProfile({ 
        xp: newStats.xp, 
        credits: newStats.credits 
      });

      notify(`+${creditGain} CR | +${xpGain} XP (Active Bonus)`, 'earning');

    }, 60000); // 60 seconds

    return () => clearInterval(timer);
  }, [user?.xp, user?.credits]); // Re-bind when values change to ensure latest state is used
};

// --- USER MANAGEMENT ---
const useUserSession = () => {
  const [profile, setProfile] = useState<UserProfile>(() => {
    const session = authService.getCurrentUser();
    if (session) return session;
    return { 
      username: '', 
      email: '', 
      level: 1, 
      xp: 0, 
      credits: 0,
      joinedAt: new Date().toISOString(),
      rankTitle: 'Iniciante',
      stats: { kills: 0, wins: 0, losses: 0, hoursPlayed: 0, gamesAnalyzed: 0, kdRatio: 0.0, headshotPct: 0, accuracy: 0 },
      voiceSettings: { sensitivity: 50, commands: [] },
      customization: { 
        isRGBName: false, 
        avatarBorder: 'none', 
        themeColor: 'cyan',
        avatarIcon: '👾',
        bannerId: 'default',
        equipTitle: 'Operative'
      },
      waifus: [],
      activeWaifuId: undefined
    };
  });

  const updateProfile = useCallback((changes: Partial<UserProfile>) => {
    setProfile(prev => {
      const updated = { ...prev, ...changes };
      authService.updateUser(updated);
      return updated;
    });
  }, []);

  const setFullProfile = (user: UserProfile) => {
    setProfile(user);
  };

  return { profile, updateProfile, setFullProfile };
};

// --- HOME DASHBOARD (GRID LAYOUT) ---
const HomeDashboard = ({ onNav }: { onNav: (mode: AppMode) => void }) => {
  const modules = [
    { mode: AppMode.OVERLAY_MODE, icon: "⚡", title: "Modo Jogo (Overlay)", desc: "Assistente em Tela Cheia", highlight: true },
    { mode: AppMode.GAME_RECOMMENDER, icon: "🧭", title: "Game Discovery", desc: "Encontre Jogos com IA", highlight: true },
    { mode: AppMode.TACTICAL_CHAT, icon: "💬", title: "Chat Tático", desc: "Estratégias via IA" },
    { mode: AppMode.LIVE_COMMS, icon: "🎙️", title: "Voz (Live)", desc: "Comunicação Real-time" },
    { mode: AppMode.NEXUS_VISION, icon: "👁️", title: "Visão Computacional", desc: "Análise de Tela" },
    { mode: AppMode.ASSET_FORGE, icon: "💠", title: "Gerador de Assets", desc: "Crie Itens e Imagens" },
    { mode: AppMode.STREAM_OPS, icon: "📡", title: "Stream Ops", desc: "Ferramentas Twitch" },
    { mode: AppMode.THEORY_CRAFT, icon: "🧠", title: "Theory Craft", desc: "Cálculos Avançados" },
  ];

  return (
    <div className="h-full overflow-y-auto p-8 bg-[#0a0a0c]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-6xl font-display font-black text-white mb-4 tracking-tighter drop-shadow-[0_0_20px_rgba(0,240,255,0.4)]">
            CENTRAL <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">KLUTCH</span>
          </h1>
          <p className="text-gray-400 text-lg font-mono">
            Bem-vindo ao Sistema Operacional Gamer. 
            <span className="text-success ml-2 animate-pulse">● PASSIVE EARNING ACTIVE</span>
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {modules.map((mod, idx) => (
            <button
              key={idx}
              onClick={() => onNav(mod.mode)}
              className={`p-6 rounded-3xl transition-all duration-300 flex flex-col items-start text-left group relative overflow-hidden backdrop-blur-sm ${
                mod.highlight 
                  ? 'bg-primary/5 border border-primary/50 shadow-[0_0_25px_rgba(0,240,255,0.15)] hover:shadow-[0_0_40px_rgba(0,240,255,0.3)] hover:-translate-y-1' 
                  : 'bg-[#111] border border-white/5 hover:border-primary/50 hover:bg-[#161616] hover:-translate-y-1'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <span className={`text-4xl mb-4 p-4 rounded-2xl transition-all shadow-lg ${mod.highlight ? 'bg-primary text-black shadow-neon-blue' : 'bg-black text-gray-400 group-hover:text-white border border-white/10'}`}>{mod.icon}</span>
              <h3 className={`text-xl font-bold mb-1 font-display tracking-tight ${mod.highlight ? 'text-primary' : 'text-gray-200 group-hover:text-white'}`}>{mod.title}</h3>
              <p className="text-xs text-gray-500 font-mono uppercase tracking-wider">{mod.desc}</p>
              
              {mod.highlight && <div className="absolute top-3 right-3"><span className="flex h-3 w-3 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span></span></div>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.LOGIN);
  const [showProfile, setShowProfile] = useState(false);
  const { profile, updateProfile, setFullProfile } = useUserSession();
  const latency = useLatency();
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Initialize Bots if empty
  useEffect(() => {
    authService.initBots();
  }, []);

  const addToast = (message: string, type: Toast['type']) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Enable Passive Income
  usePassiveIncome(mode !== AppMode.LOGIN ? profile : null, updateProfile, addToast);

  useEffect(() => {
    const session = authService.getCurrentUser();
    if (session && session.username) {
      setFullProfile(session);
      setMode(AppMode.HOME);
    }
  }, []);

  const handleLoginSuccess = (user: UserProfile) => {
    setFullProfile(user);
    setMode(AppMode.HOME);
    addToast(`Welcome back, Agent ${user.username}`, 'success');
  };

  const handleLogout = () => {
    authService.logout();
    window.location.reload();
  };

  if (mode === AppMode.OVERLAY_MODE) {
    const activeWaifu = profile.waifus.find(w => w.id === profile.activeWaifuId);
    return <OverlayMode 
      onExit={() => setMode(AppMode.HOME)} 
      activeWaifu={activeWaifu} 
    />;
  }

  if (mode === AppMode.LOGIN) return <LoginScreen onLogin={handleLoginSuccess} />;

  return (
    <div className="flex flex-col h-screen bg-background text-text font-sans overflow-hidden selection:bg-primary selection:text-black">
      <ToastContainer toasts={toasts} />
      
      {/* DARK HEADER */}
      <header className="h-20 border-b border-white/5 bg-[#050505]/80 backdrop-blur-xl flex items-center justify-between px-8 z-50 shrink-0 shadow-lg">
         <div className="flex items-center gap-8">
            <div 
              onClick={() => setMode(AppMode.HOME)}
              className="font-display font-black text-3xl tracking-tighter cursor-pointer flex items-center gap-3 text-white group"
            >
              <div className="w-10 h-10 bg-primary text-black rounded-lg flex items-center justify-center font-bold shadow-[0_0_15px_rgba(0,240,255,0.4)] group-hover:shadow-[0_0_25px_rgba(0,240,255,0.8)] transition-all">K</div>
              <span className="group-hover:text-primary transition-colors">KLUTCH</span>
            </div>

            {mode !== AppMode.HOME && (
              <button 
                onClick={() => setMode(AppMode.HOME)}
                className="flex items-center gap-2 text-[10px] font-bold text-gray-400 hover:text-white transition-colors px-4 py-2 bg-white/5 rounded-full border border-white/5 hover:border-white/20 uppercase tracking-widest hover:bg-white/10"
              >
                ← Dashboard
              </button>
            )}
         </div>

         <div className="flex items-center gap-8">
             {/* Status Indicators */}
             <div className="hidden md:flex items-center gap-6 text-xs font-mono text-gray-500">
                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_#0aff9d] animate-pulse"></span> ONLINE</span>
                <span className="border-l border-white/10 pl-6">{latency}ms PING</span>
             </div>

             {/* Profile Chip */}
             <button 
               onClick={() => setShowProfile(true)}
               className="flex items-center gap-4 cursor-pointer p-1.5 pr-6 rounded-full bg-white/5 hover:bg-white/10 transition-all border border-white/5 hover:border-primary/30 group"
             >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-800 to-black border border-white/20 text-white flex items-center justify-center font-bold text-lg shadow-lg relative overflow-hidden">
                   {profile.customization?.avatarIcon || profile.username.charAt(0).toUpperCase()}
                   <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                <div className="flex flex-col items-start">
                   <span className="text-sm font-bold text-white group-hover:text-primary transition-colors">{profile.username}</span>
                   <div className="flex items-center gap-2">
                      <span className="text-[10px] text-yellow-400 font-mono font-bold">{profile.credits.toLocaleString()} CR</span>
                      <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                      <span className="text-[10px] text-purple-400 font-mono font-bold">LVL {Math.floor(profile.xp / 1000) + 1}</span>
                   </div>
                </div>
             </button>
         </div>
      </header>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 overflow-hidden relative bg-[#050505]">
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none"></div>
         <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[150px] rounded-full pointer-events-none"></div>
         <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-secondary/5 blur-[150px] rounded-full pointer-events-none"></div>
         
         <div className="h-full relative z-10">
            {mode === AppMode.HOME && <HomeDashboard onNav={setMode} />}
            
            {mode !== AppMode.HOME && (
              <div className="h-full p-0">
                {mode === AppMode.WAIFU_HUB && <WaifuHub profile={profile} updateProfile={updateProfile} />}
                {mode === AppMode.TACTICAL_CHAT && <TacticalChat />}
                {mode === AppMode.LIVE_COMMS && <LiveComms />}
                {mode === AppMode.ASSET_FORGE && <AssetForge />}
                {mode === AppMode.NEXUS_VISION && <NexusVision />}
                {mode === AppMode.GAME_RECOMMENDER && <GameRecommender />}
                {mode === AppMode.THEORY_CRAFT && <TheoryCraft />}
                {mode === AppMode.STREAM_OPS && <StreamOps />}
                {mode === AppMode.SETTINGS && <Subscription />}
              </div>
            )}
         </div>
      </main>

      {/* Profile Modal */}
      {showProfile && (
        <ProfileHub profile={profile} updateProfile={updateProfile} onLogout={handleLogout} onClose={() => setShowProfile(false)} />
      )}

    </div>
  );
};

export default App;
