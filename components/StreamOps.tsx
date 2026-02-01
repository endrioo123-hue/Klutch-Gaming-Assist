
import React, { useState } from 'react';
import { t } from '../services/localization';

export const StreamOps: React.FC = () => {
  const [channel, setChannel] = useState('');
  const [activeChannel, setActiveChannel] = useState('');

  const loadChannel = () => {
    if (channel) setActiveChannel(channel);
  };

  // Twitch requires explicit parent definition for embeds to work
  const getTwitchEmbedUrl = (channelName: string, type: 'player' | 'chat') => {
    const hostname = window.location.hostname;
    // Construct parent params for current host, localhost and 127.0.0.1 to cover dev environments
    let parents = `parent=${hostname}`;
    if (hostname !== 'localhost') parents += `&parent=localhost`;
    if (hostname !== '127.0.0.1') parents += `&parent=127.0.0.1`;

    if (type === 'player') {
      return `https://player.twitch.tv/?channel=${channelName}&${parents}&muted=false`;
    } else {
      return `https://www.twitch.tv/embed/${channelName}/chat?${parents}&darkpopout`;
    }
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
                src={getTwitchEmbedUrl(activeChannel, 'player')}
                className="flex-1 h-full w-full"
                allowFullScreen
                title="Twitch Player"
              ></iframe>
              <iframe
                src={getTwitchEmbedUrl(activeChannel, 'chat')}
                className="w-full md:w-80 h-full hidden md:block border-l border-white/10"
                title="Twitch Chat"
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
