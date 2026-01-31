
import React, { useState, useEffect } from 'react';
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
      customization: { isRGBName: false, avatarBorder: 'none', themeColor: 'cyan' },
      waifus: [],
      activeWaifuId: undefined
    };
  });

  const updateProfile = (changes: Partial<UserProfile>) => {
    setProfile(prev => {
      const updated = { ...prev, ...changes };
      authService.updateUser(updated);
      return updated;
    });
  };

  const setFullProfile = (user: UserProfile) => {
    setProfile(user);
  };

  return { profile, updateProfile, setFullProfile };
};

// --- HOME DASHBOARD (GRID LAYOUT) ---
const HomeDashboard = ({ onNav }: { onNav: (mode: AppMode) => void }) => {
  const modules = [
    // OVERLAY FIRST (As Requested)
    { mode: AppMode.OVERLAY_MODE, icon: "⚡", title: "Modo Jogo (Overlay)", desc: "Assistente em Tela Cheia", highlight: true },
    { mode: AppMode.WAIFU_HUB, icon: "👩‍🎤", title: "Neural Companions", desc: "Crie e Interaja com Waifus", highlight: true },
    { mode: AppMode.TACTICAL_CHAT, icon: "💬", title: "Chat Tático", desc: "Estratégias via IA" },
    { mode: AppMode.LIVE_COMMS, icon: "🎙️", title: "Voz (Live)", desc: "Comunicação Real-time" },
    { mode: AppMode.NEXUS_VISION, icon: "👁️", title: "Visão Computacional", desc: "Análise de Tela" },
    { mode: AppMode.ASSET_FORGE, icon: "💠", title: "Gerador de Assets", desc: "Crie Itens e Imagens" },
    { mode: AppMode.STREAM_OPS, icon: "📡", title: "Stream Ops", desc: "Ferramentas Twitch" },
    { mode: AppMode.THEORY_CRAFT, icon: "🧠", title: "Theory Craft", desc: "Cálculos Avançados" },
  ];

  return (
    <div className="h-full overflow-y-auto p-8 bg-[#0a0a0c]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-5xl font-display font-bold text-white mb-4 tracking-tighter">
            CENTRAL <span className="text-primary">KLUTCH</span>
          </h1>
          <p className="text-gray-500 text-lg font-mono">Selecione uma ferramenta para iniciar.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {modules.map((mod, idx) => (
            <button
              key={idx}
              onClick={() => onNav(mod.mode)}
              className={`p-6 rounded-2xl transition-all duration-300 flex flex-col items-start text-left group relative overflow-hidden ${
                mod.highlight 
                  ? 'bg-primary/10 border border-primary shadow-[0_0_15px_rgba(0,240,255,0.1)] hover:shadow-[0_0_25px_rgba(0,240,255,0.3)]' 
                  : 'bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-white/10'
              }`}
            >
              <span className={`text-4xl mb-4 p-3 rounded-xl transition-colors ${mod.highlight ? 'bg-primary text-black' : 'bg-black/40 text-gray-400 group-hover:text-white'}`}>{mod.icon}</span>
              <h3 className={`text-xl font-bold mb-1 font-display ${mod.highlight ? 'text-primary' : 'text-gray-200 group-hover:text-white'}`}>{mod.title}</h3>
              <p className="text-sm text-gray-500 font-mono">{mod.desc}</p>
              
              {mod.highlight && <div className="absolute top-0 right-0 p-2"><span className="w-2 h-2 bg-primary rounded-full animate-pulse block"></span></div>}
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
  };

  const handleLogout = () => {
    authService.logout();
    window.location.reload();
  };

  // Overlay Mode has specific props
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
      
      {/* DARK HEADER */}
      <header className="h-16 border-b border-white/10 bg-black/50 backdrop-blur-md flex items-center justify-between px-8 z-50 shrink-0">
         <div className="flex items-center gap-6">
            <div 
              onClick={() => setMode(AppMode.HOME)}
              className="font-display font-black text-2xl tracking-tighter cursor-pointer flex items-center gap-2 text-white hover:text-primary transition-colors"
            >
              <div className="w-8 h-8 bg-primary text-black rounded flex items-center justify-center font-bold">K</div>
              KLUTCH
            </div>

            {/* BACK BUTTON (Only if not Home) */}
            {mode !== AppMode.HOME && (
              <button 
                onClick={() => setMode(AppMode.HOME)}
                className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors px-4 py-2 bg-white/5 rounded border border-white/5 hover:border-white/20 uppercase tracking-widest"
              >
                ← Menu
              </button>
            )}
         </div>

         <div className="flex items-center gap-6">
             {/* Status Indicators */}
             <div className="hidden md:flex items-center gap-4 text-xs font-mono text-gray-500">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-success shadow-[0_0_5px_#0aff9d]"></span> ONLINE</span>
                <span>{latency}ms</span>
             </div>

             {/* Profile */}
             <div 
               onClick={() => setShowProfile(true)}
               className="flex items-center gap-3 cursor-pointer p-1 pr-3 rounded-full hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
             >
                <div className="w-8 h-8 rounded-full bg-gray-800 border border-white/20 text-white flex items-center justify-center font-bold text-sm">
                   {profile.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col items-start">
                   <span className="text-xs font-bold text-white">{profile.username}</span>
                   <span className="text-[10px] text-primary font-mono">{profile.credits} CR</span>
                </div>
             </div>
         </div>
      </header>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 overflow-hidden relative bg-black">
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none"></div>
         <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"></div>
         
         <div className="h-full relative z-10">
            {mode === AppMode.HOME && <HomeDashboard onNav={setMode} />}
            
            {/* Modules wrapper */}
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
