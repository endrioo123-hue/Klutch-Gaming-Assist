
import React, { useState } from 'react';
import { t } from '../services/localization';

export const StreamOps: React.FC = () => {
  const [channel, setChannel] = useState('');
  const [activeChannel, setActiveChannel] = useState('');

  const loadChannel = () => {
    if (channel) setActiveChannel(channel);
  };

  return (
    <div className="h-full flex flex-col p-8 bg-black overflow-hidden">
       <div className="text-center mb-6">
         <h2 className="text-3xl font-display font-bold text-white mb-2">{t('modules.stream.title')}</h2>
         <p className="text-gray-400 font-mono text-sm">{t('modules.stream.desc')}</p>
       </div>

       <div className="flex gap-4 max-w-xl mx-auto w-full mb-6">
         <input 
           type="text" 
           value={channel}
           onChange={(e) => setChannel(e.target.value)}
           placeholder="Enter Twitch Channel (e.g. shroud)"
           className="flex-1 bg-white/5 border border-white/10 rounded px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
         />
         <button 
           onClick={loadChannel}
           className="bg-purple-600 text-white px-6 py-2 rounded font-bold uppercase hover:bg-purple-500 transition-colors"
         >
           Load Stream
         </button>
       </div>

       <div className="flex-1 bg-black rounded-2xl overflow-hidden border border-white/10 relative">
          {activeChannel ? (
            <div className="w-full h-full flex flex-col md:flex-row">
              <iframe
                src={`https://player.twitch.tv/?channel=${activeChannel}&parent=${window.location.hostname}&parent=localhost`}
                className="flex-1 h-full w-full"
                allowFullScreen
              ></iframe>
              <iframe
                src={`https://www.twitch.tv/embed/${activeChannel}/chat?parent=${window.location.hostname}&parent=localhost&darkpopout`}
                className="w-full md:w-80 h-full hidden md:block border-l border-white/10"
              ></iframe>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-50">
              <span className="text-6xl mb-4">📺</span>
              <p className="uppercase tracking-widest font-bold">Waiting for Signal</p>
            </div>
          )}
       </div>
    </div>
  );
};
