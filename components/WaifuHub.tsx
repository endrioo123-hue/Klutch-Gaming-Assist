
import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, Waifu, ShopItem } from '../types';
import { generateGameAsset, streamStrategyChat } from '../services/geminiService';

interface WaifuHubProps {
  profile: UserProfile;
  updateProfile: (p: Partial<UserProfile>) => void;
}

// --- CONFIG ---
const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2500, 5000, 9999];

const SHOP_ITEMS: ShopItem[] = [
  { id: 'gift_flower', name: 'Digital Rose', cost: 150, effect: 25, icon: '🌹', description: '+25 Intimacy' },
  { id: 'gift_chocolate', name: 'Bit-Chocolate', cost: 300, effect: 60, icon: '🍫', description: '+60 Intimacy' },
  { id: 'gift_jewelry', name: 'Neon Necklace', cost: 1000, effect: 250, icon: '💎', description: '+250 Intimacy' },
  { id: 'summon_ticket', name: 'Neural Summon', cost: 2000, effect: 0, icon: '🎫', description: 'Generate Random Waifu' },
];

const PRESETS_ARCHETYPES = [
  { name: 'Aiko', style: 'Cyberpunk Schoolgirl', trait: 'Tsundere' },
  { name: 'Unit-734', style: 'Android Combat', trait: 'Kuudere' },
  { name: 'Vex', style: 'Goth Hacker', trait: 'Sarcastic' },
  { name: 'Seraphine', style: 'Holographic Idol', trait: 'Genki' },
  { name: 'Nyx', style: 'Assassin', trait: 'Mysterious' },
  { name: 'Kael', style: 'Rogue Operative', trait: 'Stoic' },
  { name: 'Nova', style: 'Space Marine', trait: 'Bold' },
];

export const WaifuHub: React.FC<WaifuHubProps> = ({ profile, updateProfile }) => {
  const [activeTab, setActiveTab] = useState<'roster' | 'chat' | 'summon' | 'shop'>('roster');
  
  // Interaction State
  const [chatInput, setChatInput] = useState('');
  const [chatLog, setChatLog] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Summon State
  const [isSummoning, setIsSummoning] = useState(false);
  const [summonResult, setSummonResult] = useState<Waifu | null>(null);

  // Active Data
  const activeWaifu = profile.waifus.find(w => w.id === profile.activeWaifuId);
  const isFirstSummon = profile.waifus.length === 0;

  // --- HELPERS ---
  const calculateLevel = (intimacy: number) => {
    let level = 1;
    for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
      if (intimacy >= LEVEL_THRESHOLDS[i]) level = i + 1;
    }
    return level;
  };

  const getNextLevelReq = (currentIntimacy: number) => {
    for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
      if (LEVEL_THRESHOLDS[i] > currentIntimacy) return LEVEL_THRESHOLDS[i];
    }
    return 99999;
  };

  const getFallbackImage = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

  // --- ACTIONS ---

  const handleEquip = (id: string) => {
    updateProfile({ activeWaifuId: id });
    setChatLog([]); // Clear chat on switch
  };

  const handleBuyItem = async (item: ShopItem) => {
    // Determine actual cost (Free if first summon)
    const isSummon = item.id === 'summon_ticket';
    const actualCost = (isSummon && isFirstSummon) ? 0 : item.cost;

    if (profile.credits < actualCost) {
      alert("❌ Insufficient Credits");
      return;
    }

    // GACHA LOGIC
    if (isSummon) {
      // Direct action if it's the free summon (no confirm dialog to reduce friction)
      if (!isFirstSummon) {
         const message = `Spend ${actualCost} CR to summon a new companion?`;
         const confirmed = window.confirm(message);
         if (!confirmed) return;
      }

      // Deduct credits optimistically
      const preDeductionCredits = profile.credits;
      const newCredits = profile.credits - actualCost;
      updateProfile({ credits: newCredits });
      
      const success = await handleSummon();
      
      // If summon failed hard, refund
      if (!success) {
        updateProfile({ credits: preDeductionCredits });
        alert("⚠ Transaction Refunded due to network failure.");
      }
      return;
    }

    // GIFT LOGIC
    if (!profile.activeWaifuId) {
      alert("⚠ Equip a Waifu from your list first!");
      setActiveTab('roster');
      return;
    }

    const newCredits = profile.credits - item.cost;
    let leveledUp = false;
    let newLvl = 0;

    const updatedWaifus = profile.waifus.map(w => {
      if (w.id === profile.activeWaifuId) {
        const newIntimacy = w.intimacy + item.effect;
        const oldLevel = w.level;
        const newLevel = calculateLevel(newIntimacy);
        
        if (newLevel > oldLevel) {
          leveledUp = true;
          newLvl = newLevel;
        }

        return { ...w, intimacy: newIntimacy, level: newLevel };
      }
      return w;
    });

    updateProfile({ credits: newCredits, waifus: updatedWaifus });
    
    if (leveledUp) {
      alert(`🎉 LEVEL UP! Waifu reached Level ${newLvl}!`);
    } else {
      console.log(`🎁 Gift sent! +${item.effect} Intimacy`);
    }
  };

  const handleSummon = async (): Promise<boolean> => {
    setActiveTab('summon');
    setIsSummoning(true);
    setSummonResult(null);

    try {
      // Pick random archetype
      const archetype = PRESETS_ARCHETYPES[Math.floor(Math.random() * PRESETS_ARCHETYPES.length)];
      const seed = Math.random().toString(36).substring(7);
      let imgUrl = '';

      // Try Generating with AI
      try {
        const prompt = `Anime character portrait, masterpiece, 8k. ${archetype.style}, detailed face, looking at viewer. Name: ${archetype.name}. Vibe: ${archetype.trait}. Seed: ${seed}`;
        imgUrl = await generateGameAsset(prompt, "1:1", "1K"); 
      } catch (genError) {
        console.warn("AI Generation failed, falling back to DiceBear", genError);
        imgUrl = getFallbackImage(`${archetype.name}-${seed}`);
      }

      const newWaifu: Waifu = {
        id: `w_${Date.now()}`,
        name: `${archetype.name} ${seed.substring(0,2).toUpperCase()}`,
        personality: `Archetype: ${archetype.trait}. Generated via Neural Link. Likes the user.`,
        voiceId: 'Kore',
        avatarUrl: imgUrl,
        level: 1,
        intimacy: 0,
        traits: [archetype.style, archetype.trait]
      };
      
      updateProfile({ waifus: [...profile.waifus, newWaifu] });
      setSummonResult(newWaifu);
      return true;

    } catch (e) {
      console.error("Summon Fatal Error", e);
      return false;
    } finally {
      setIsSummoning(false);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim() || !activeWaifu || isChatting) return;

    const userMsg = { role: 'user' as const, text: chatInput };
    setChatLog(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatting(true);

    try {
      const history = chatLog.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
      const systemPrompt = `
        You are ${activeWaifu.name}.
        Personality: ${activeWaifu.personality}.
        User Intimacy Level: ${activeWaifu.level}.
        
        Reply briefly (max 2 sentences). Be engaging and immersive.
        If intimacy is low (1-2), be distant/professional.
        If intimacy is high (5+), be affectionate/loyal.
      `;

      let fullResponse = "";
      await streamStrategyChat(history, userMsg.text, false, false, systemPrompt, (chunk) => {
        fullResponse += chunk;
      });
      
      setChatLog(prev => [...prev, { role: 'model', text: fullResponse }]);
      
      // Small Intimacy Boost for chatting
      const updatedWaifus = profile.waifus.map(w => {
         if (w.id === activeWaifu.id) {
           return { ...w, intimacy: w.intimacy + 1 }; 
         }
         return w;
      });
      updateProfile({ waifus: updatedWaifus });

    } catch (e) {
      setChatLog(prev => [...prev, { role: 'model', text: "*Connection interrupted...*" }]);
    } finally {
      setIsChatting(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  return (
    <div className="h-full flex flex-col bg-[#050505] relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none"></div>

      {/* --- HEADER --- */}
      <div className="flex shrink-0 justify-between items-center p-8 border-b border-white/5 bg-black/50 backdrop-blur-md z-10">
        <div>
          <h2 className="text-4xl font-display font-black text-white flex items-center gap-3 tracking-tight">
            <span className="text-pink-500 drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]">♥</span> 
            WAIFU<span className="text-primary">.OS</span>
          </h2>
          <p className="text-gray-500 font-mono text-xs tracking-widest uppercase">
            Neural Companion Management System
          </p>
        </div>
        
        <div className="flex items-center gap-6">
           <div className="text-right">
              <div className="text-[10px] text-gray-500 font-bold uppercase">System Credits</div>
              <div className="text-2xl font-mono text-yellow-400 font-bold drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]">
                {profile.credits.toLocaleString()} CR
              </div>
           </div>
           
           {activeWaifu && (
              <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                 <img src={activeWaifu.avatarUrl} className="w-10 h-10 rounded-full border border-pink-500" />
                 <div>
                    <div className="text-white font-bold text-sm">{activeWaifu.name}</div>
                    <div className="text-[10px] text-pink-400 font-mono">LVL {activeWaifu.level}</div>
                 </div>
              </div>
           )}
        </div>
      </div>

      {/* --- NAVIGATION --- */}
      <div className="flex gap-1 p-4 px-8 border-b border-white/5 bg-black/30 z-10 overflow-x-auto">
        {[
          { id: 'roster', label: 'Waifus', icon: '👥' },
          { id: 'chat', label: 'Direct Link', icon: '💬' },
          { id: 'shop', label: 'Item Shop', icon: '🛍️' },
          { id: 'summon', label: 'Summon', icon: '✨' },
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold uppercase text-xs tracking-wider transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-pink-600 text-white shadow-[0_0_15px_rgba(219,39,119,0.4)]' 
                : 'bg-transparent text-gray-500 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none"></div>

        {/* --- ROSTER (WAIFUS) --- */}
        {activeTab === 'roster' && (
          <div className="h-full overflow-y-auto p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {profile.waifus.length === 0 && (
                 <div className="col-span-full flex flex-col items-center justify-center h-96 text-gray-600 border-2 border-dashed border-gray-800 rounded-3xl bg-black/20">
                    <span className="text-4xl mb-4">🕸️</span>
                    <p className="font-mono uppercase tracking-widest mb-4">No Waifus Found</p>
                    <button 
                      onClick={() => setActiveTab('summon')} 
                      className="px-6 py-2 bg-pink-600 text-white rounded-full font-bold hover:bg-pink-500 transition-colors"
                    >
                      Go to Summon (FREE)
                    </button>
                 </div>
              )}

              {profile.waifus.map((waifu) => {
                 const req = getNextLevelReq(waifu.intimacy);
                 const progress = Math.min(100, (waifu.intimacy / req) * 100);
                 
                 return (
                  <div key={waifu.id} className={`relative bg-[#0f0f11] rounded-2xl overflow-hidden border transition-all duration-300 group hover:-translate-y-2 ${
                    waifu.id === profile.activeWaifuId ? 'border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.2)]' : 'border-white/10 hover:border-pink-500/50'
                  }`}>
                    <div className="h-64 overflow-hidden relative">
                       <img src={waifu.avatarUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                       <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f11] to-transparent"></div>
                       {waifu.id === profile.activeWaifuId && (
                         <div className="absolute top-3 right-3 bg-pink-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg animate-pulse">
                           ACTIVE LINK
                         </div>
                       )}
                    </div>
                    <div className="p-5 relative z-10 -mt-10">
                       <h3 className="text-2xl font-display font-black text-white mb-1 truncate">{waifu.name}</h3>
                       <p className="text-xs text-gray-400 line-clamp-1 mb-4">"{waifu.personality.split('.')[0]}"</p>
                       <div className="space-y-3">
                          <div className="flex justify-between text-[10px] font-bold uppercase text-gray-500">
                             <span>Level {waifu.level}</span>
                             <span>{waifu.intimacy} / {req} XP</span>
                          </div>
                          <div className="h-2 bg-black rounded-full overflow-hidden border border-white/10">
                             <div className="h-full bg-gradient-to-r from-pink-600 to-purple-600" style={{width: `${progress}%`}}></div>
                          </div>
                       </div>
                       <div className="mt-6 flex gap-2">
                          {waifu.id !== profile.activeWaifuId && (
                            <button 
                              onClick={() => handleEquip(waifu.id)}
                              className="flex-1 py-2 bg-white/10 hover:bg-white hover:text-black text-white font-bold rounded uppercase text-xs transition-colors"
                            >
                              Equip
                            </button>
                          )}
                          <button 
                             onClick={() => { handleEquip(waifu.id); setActiveTab('chat'); }}
                             className="flex-1 py-2 bg-pink-600/20 text-pink-500 border border-pink-600/50 hover:bg-pink-600 hover:text-white font-bold rounded uppercase text-xs transition-colors"
                          >
                            Interact
                          </button>
                       </div>
                    </div>
                  </div>
                 );
              })}
            </div>
          </div>
        )}

        {/* --- CHAT --- */}
        {activeTab === 'chat' && (
          <div className="h-full flex flex-col max-w-4xl mx-auto">
             {!activeWaifu ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 space-y-4">
                   <div className="text-6xl grayscale opacity-50">💔</div>
                   <p className="font-mono uppercase">Select a Companion from Roster first.</p>
                   <button onClick={() => setActiveTab('roster')} className="text-primary hover:underline font-bold">Back to Waifus</button>
                </div>
             ) : (
                <>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                     <div className="flex flex-col items-center mb-8 opacity-50">
                        <img src={activeWaifu.avatarUrl} className="w-24 h-24 rounded-full border-4 border-white/5 mb-2 grayscale group-hover:grayscale-0 transition-all" />
                        <p className="text-xs font-mono uppercase">Secure Link Established with {activeWaifu.name}</p>
                     </div>
                     {chatLog.map((msg, i) => (
                       <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                            msg.role === 'user' 
                              ? 'bg-primary/10 border border-primary/30 text-white rounded-br-sm' 
                              : 'bg-white/5 border border-white/10 text-gray-200 rounded-bl-sm'
                          }`}>
                             {msg.text}
                          </div>
                       </div>
                     ))}
                     <div ref={chatEndRef}></div>
                  </div>
                  <div className="p-6 bg-black/20 border-t border-white/5">
                     <div className="relative">
                        <input 
                           type="text" 
                           value={chatInput}
                           onChange={(e) => setChatInput(e.target.value)}
                           onKeyDown={(e) => e.key === 'Enter' && handleChat()}
                           placeholder={`Message ${activeWaifu.name}...`}
                           disabled={isChatting}
                           className="w-full bg-[#111] border border-white/20 rounded-xl p-4 pr-12 text-white focus:border-pink-500 focus:outline-none transition-colors"
                        />
                        <button 
                          onClick={handleChat}
                          disabled={!chatInput.trim() || isChatting}
                          className="absolute right-2 top-2 p-2 bg-pink-600 rounded-lg text-white hover:bg-pink-500 disabled:opacity-50 transition-colors"
                        >
                          ➤
                        </button>
                     </div>
                  </div>
                </>
             )}
          </div>
        )}

        {/* --- SHOP --- */}
        {activeTab === 'shop' && (
           <div className="h-full overflow-y-auto p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 {/* Banner for Summon */}
                 <div className="col-span-full bg-gradient-to-r from-purple-900/40 to-pink-900/40 border border-white/10 rounded-3xl p-8 flex items-center justify-between relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
                    <div className="relative z-10">
                       <h3 className="text-3xl font-display font-black text-white mb-2">NEURAL SUMMON</h3>
                       <p className="text-gray-300 max-w-md mb-6">
                         Generate a completely unique AI companion with random traits, appearance, and personality matrix.
                       </p>
                       <button 
                         onClick={() => setActiveTab('summon')}
                         className="px-8 py-3 bg-white text-black font-black uppercase rounded-full hover:scale-105 transition-transform"
                       >
                         {isFirstSummon ? 'FREE SUMMON' : 'Go to Summon'}
                       </button>
                    </div>
                    <div className="text-9xl opacity-20 group-hover:opacity-40 transition-opacity absolute right-10 rotate-12">
                       ✨
                    </div>
                 </div>

                 <h3 className="col-span-full text-xl font-bold text-white mt-8 mb-4 border-b border-white/10 pb-2">GIFT SHOP</h3>

                 {SHOP_ITEMS.filter(i => i.id !== 'summon_ticket').map(item => (
                    <div key={item.id} className="bg-[#111] border border-white/10 p-6 rounded-2xl flex flex-col items-center hover:border-pink-500 transition-colors group relative overflow-hidden">
                       <div className="absolute inset-0 bg-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                       <div className="text-5xl mb-4 group-hover:scale-110 transition-transform relative z-10">{item.icon}</div>
                       <h4 className="font-bold text-white relative z-10">{item.name}</h4>
                       <p className="text-xs text-pink-400 mb-6 font-mono relative z-10">{item.description}</p>
                       <button 
                         onClick={() => handleBuyItem(item)}
                         className="w-full py-3 bg-white/10 text-white font-bold rounded-lg uppercase text-xs hover:bg-pink-600 hover:text-white transition-all relative z-10 flex items-center justify-center gap-2"
                       >
                         <span>{item.cost} CR</span>
                         <span className="opacity-50">| BUY</span>
                       </button>
                    </div>
                 ))}
              </div>
           </div>
        )}

        {/* --- SUMMON (GACHA) --- */}
        {activeTab === 'summon' && (
           <div className="h-full flex flex-col items-center justify-center p-8 relative">
              {!isSummoning && !summonResult && (
                 <div className="text-center max-w-lg animate-in fade-in zoom-in">
                    <div className="w-32 h-32 mx-auto bg-white/5 rounded-full flex items-center justify-center text-6xl mb-6 border border-white/10 shadow-[0_0_50px_rgba(168,85,247,0.2)]">
                       ✨
                    </div>
                    <h2 className="text-4xl font-display font-black text-white mb-4">NEURAL LINK</h2>
                    <p className="text-gray-400 mb-8">
                       Connect to the network and download a new companion personality core.
                       <br/>
                       Cost: {isFirstSummon ? <span className="text-success font-bold text-xl ml-2 animate-pulse">FREE (First Time)</span> : <span className="text-yellow-400 font-bold">2000 CR</span>}
                    </p>
                    <button 
                      onClick={() => handleBuyItem(SHOP_ITEMS.find(i => i.id === 'summon_ticket')!)}
                      className={`px-12 py-5 font-black text-xl rounded-2xl hover:scale-105 transition-all uppercase tracking-widest ${isFirstSummon ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-[0_0_40px_rgba(34,197,94,0.5)]' : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-[0_0_40px_rgba(219,39,119,0.5)]'}`}
                    >
                      {isFirstSummon ? 'INITIATE FREE LINK' : 'SUMMON NOW'}
                    </button>
                 </div>
              )}

              {isSummoning && (
                 <div className="flex flex-col items-center">
                    <div className="w-64 h-64 border-4 border-t-purple-500 border-r-pink-500 border-b-primary border-l-white rounded-full animate-spin blur-sm mb-8"></div>
                    <h2 className="text-2xl font-bold text-white animate-pulse text-center">
                       SYNTHESIZING NEURAL PATHWAYS...<br/>
                       <span className="text-sm font-mono text-gray-500">Do not turn off the system.</span>
                    </h2>
                 </div>
              )}

              {summonResult && !isSummoning && (
                 <div className="bg-[#111] border border-pink-500 p-1 rounded-3xl shadow-[0_0_100px_rgba(236,72,153,0.3)] animate-in zoom-in duration-500 max-w-md w-full">
                    <div className="bg-black rounded-[20px] overflow-hidden p-6 text-center">
                       <h3 className="text-sm font-bold text-gray-500 uppercase tracking-[0.3em] mb-4">ACQUISITION SUCCESSFUL</h3>
                       <div className="w-48 h-48 mx-auto rounded-full border-4 border-white/20 mb-6 overflow-hidden relative group shadow-[0_0_30px_rgba(236,72,153,0.5)]">
                          <img src={summonResult.avatarUrl} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                       </div>
                       <h2 className="text-4xl font-display font-black text-white mb-2">{summonResult.name}</h2>
                       <p className="text-pink-400 font-mono text-sm mb-8">{summonResult.traits.join(' // ')}</p>
                       <div className="grid grid-cols-2 gap-4">
                          <button onClick={() => { setActiveTab('roster'); handleEquip(summonResult.id); }} className="py-3 bg-white text-black font-bold rounded-xl uppercase hover:bg-gray-200">
                             Equip Now
                          </button>
                          <button onClick={() => setSummonResult(null)} className="py-3 bg-white/10 text-white font-bold rounded-xl uppercase hover:bg-white/20">
                             Close
                          </button>
                       </div>
                    </div>
                 </div>
              )}
           </div>
        )}

      </div>
    </div>
  );
};
