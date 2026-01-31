
import React, { useState } from 'react';
import { UserProfile, Waifu, ShopItem } from '../types';
import { generateGameAsset } from '../services/geminiService';

interface WaifuHubProps {
  profile: UserProfile;
  updateProfile: (p: Partial<UserProfile>) => void;
}

// Mock Shop Items
const SHOP_ITEMS: ShopItem[] = [
  { id: 'gift_1', name: 'Digital Flower', cost: 100, effect: 10, icon: '🌹', description: 'Small intimacy boost' },
  { id: 'gift_2', name: 'Neural Chip', cost: 500, effect: 55, icon: '💾', description: 'Medium intimacy boost' },
  { id: 'gift_3', name: 'Core Upgrade', cost: 1500, effect: 200, icon: '💎', description: 'Massive boost' },
];

export const WaifuHub: React.FC<WaifuHubProps> = ({ profile, updateProfile }) => {
  const [activeTab, setActiveTab] = useState<'roster' | 'create' | 'shop'>('roster');
  
  // Create State
  const [newName, setNewName] = useState('');
  const [newPersonality, setNewPersonality] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const activeWaifu = profile.waifus.find(w => w.id === profile.activeWaifuId);

  const handleCreate = async () => {
    if (!newName || !newPersonality || isGenerating) return;
    setIsGenerating(true);

    try {
      const prompt = `Anime style portrait of a futuristic sci-fi character named ${newName}. Personality: ${newPersonality}. High quality, detailed face, cyberpunk aesthetic.`;
      const avatarUrl = await generateGameAsset(prompt, "1:1", "1K");
      
      const newWaifu: Waifu = {
        id: Date.now().toString(),
        name: newName,
        personality: newPersonality,
        voiceId: 'Kore',
        avatarUrl,
        level: 1,
        intimacy: 0,
        traits: []
      };

      updateProfile({
        waifus: [...profile.waifus, newWaifu],
        activeWaifuId: newWaifu.id // Auto equip
      });
      setActiveTab('roster');
      setNewName('');
      setNewPersonality('');
    } catch (e) {
      alert("Creation Failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const equipWaifu = (id: string) => {
    updateProfile({ activeWaifuId: id });
  };

  const buyItem = (item: ShopItem) => {
    if (profile.credits >= item.cost && profile.activeWaifuId) {
      const updatedWaifus = profile.waifus.map(w => {
        if (w.id === profile.activeWaifuId) {
          return { ...w, intimacy: w.intimacy + item.effect };
        }
        return w;
      });
      
      updateProfile({
        credits: profile.credits - item.cost,
        waifus: updatedWaifus
      });
    } else {
      alert("Insufficient Credits or No Active Waifu");
    }
  };

  return (
    <div className="h-full flex flex-col p-8 bg-black">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-4xl font-display font-bold text-white flex items-center gap-3">
            <span className="text-pink-500">👩‍🎤</span> NEURAL COMPANIONS
          </h2>
          <p className="text-gray-500 font-mono text-sm">Create, Interact, and Bond with AI Operatives.</p>
        </div>
        <div className="bg-white/10 px-4 py-2 rounded-full border border-primary/50 text-primary font-bold font-mono">
          CREDITS: {profile.credits} CR
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <button onClick={() => setActiveTab('roster')} className={`px-6 py-2 rounded font-bold uppercase transition-all ${activeTab === 'roster' ? 'bg-primary text-black' : 'bg-white/5 text-gray-400'}`}>My Roster</button>
        <button onClick={() => setActiveTab('create')} className={`px-6 py-2 rounded font-bold uppercase transition-all ${activeTab === 'create' ? 'bg-primary text-black' : 'bg-white/5 text-gray-400'}`}>Create New</button>
        <button onClick={() => setActiveTab('shop')} className={`px-6 py-2 rounded font-bold uppercase transition-all ${activeTab === 'shop' ? 'bg-primary text-black' : 'bg-white/5 text-gray-400'}`}>Gift Shop</button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ROSTER TAB */}
        {activeTab === 'roster' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profile.waifus.length === 0 && (
              <div className="col-span-full text-center py-20 text-gray-600 border border-dashed border-gray-800 rounded-xl">
                NO COMPANIONS FOUND. CREATE ONE TO BEGIN.
              </div>
            )}
            
            {profile.waifus.map(waifu => (
              <div key={waifu.id} className={`bg-white/5 border rounded-2xl p-6 relative group overflow-hidden ${waifu.id === profile.activeWaifuId ? 'border-primary shadow-[0_0_20px_rgba(0,240,255,0.2)]' : 'border-white/10 hover:border-white/30'}`}>
                <div className="flex items-start gap-4 mb-4">
                   <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/20">
                     <img src={waifu.avatarUrl} alt={waifu.name} className="w-full h-full object-cover" />
                   </div>
                   <div>
                     <h3 className="text-xl font-bold text-white">{waifu.name}</h3>
                     <p className="text-xs text-gray-400 font-mono mb-1">Level {waifu.level}</p>
                     <div className="bg-black/40 px-2 py-1 rounded text-[10px] text-pink-400 border border-pink-500/30">
                       ♥ Intimacy: {waifu.intimacy}
                     </div>
                   </div>
                </div>
                <p className="text-sm text-gray-400 italic mb-4">"{waifu.personality}"</p>
                
                {waifu.id === profile.activeWaifuId ? (
                  <button disabled className="w-full py-2 bg-green-500/20 text-green-400 font-bold rounded uppercase text-xs border border-green-500/50">Active Link</button>
                ) : (
                  <button onClick={() => equipWaifu(waifu.id)} className="w-full py-2 bg-white/10 text-white font-bold rounded uppercase text-xs hover:bg-white hover:text-black transition-colors">Equip</button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* CREATE TAB */}
        {activeTab === 'create' && (
           <div className="max-w-2xl mx-auto bg-white/5 p-8 rounded-2xl border border-white/10">
              <h3 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">Initialize New Neural Link</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Designation (Name)</label>
                  <input 
                    type="text" 
                    value={newName} 
                    onChange={e => setNewName(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded p-3 text-white focus:border-primary focus:outline-none"
                    placeholder="E.g. Cortana, Yumi, Sarah..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Core Personality Protocol</label>
                  <textarea 
                    value={newPersonality} 
                    onChange={e => setNewPersonality(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded p-3 text-white focus:border-primary focus:outline-none h-32 resize-none"
                    placeholder="E.g. Sarcastic tactical advisor who loves explosions. Speaks formally but cracks jokes about user aim."
                  />
                </div>
                
                <button 
                  onClick={handleCreate}
                  disabled={isGenerating || !newName || !newPersonality}
                  className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold rounded-xl uppercase tracking-widest hover:shadow-[0_0_20px_rgba(219,39,119,0.5)] transition-all disabled:opacity-50"
                >
                  {isGenerating ? 'Synthesizing Avatar...' : 'Generate Companion'}
                </button>
              </div>
           </div>
        )}

        {/* SHOP TAB */}
        {activeTab === 'shop' && (
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {SHOP_ITEMS.map(item => (
               <div key={item.id} className="bg-black/40 border border-white/10 p-6 rounded-2xl flex flex-col items-center text-center hover:border-yellow-500/50 transition-colors group">
                 <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">{item.icon}</div>
                 <h4 className="text-lg font-bold text-white mb-1">{item.name}</h4>
                 <p className="text-xs text-gray-500 mb-4">{item.description}</p>
                 <div className="mt-auto w-full">
                    <p className="text-yellow-400 font-mono font-bold mb-2">{item.cost} CR</p>
                    <button 
                      onClick={() => buyItem(item)}
                      className="w-full py-2 bg-white/10 rounded text-white font-bold uppercase text-xs hover:bg-yellow-500 hover:text-black transition-all"
                    >
                      Purchase
                    </button>
                 </div>
               </div>
             ))}
           </div>
        )}
      </div>
    </div>
  );
};
