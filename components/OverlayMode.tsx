
import React, { useState, useEffect, useRef } from 'react';
import { getLiveClient, detectActiveGame, getTacticalIntel } from '../services/geminiService';
import { Modality, LiveServerMessage } from '@google/genai';
import { Waifu } from '../types';

interface OverlayProps {
  onExit: () => void;
  activeWaifu?: Waifu;
}

export const OverlayMode: React.FC<OverlayProps> = ({ onExit, activeWaifu }) => {
  // UI State
  const [status, setStatus] = useState<'IDLE' | 'INITIALIZING' | 'ACTIVE' | 'ERROR' | 'RECONNECTING'>('IDLE');
  const [hudMessage, setHudMessage] = useState("SYSTEM STANDBY");
  const [fps, setFps] = useState(0);
  const [crosshair, setCrosshair] = useState<'dot' | 'cross' | 'tech' | 'none'>('tech');
  const [isMuted, setIsMuted] = useState(false);
  const [captions, setCaptions] = useState("");
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [detectedGame, setDetectedGame] = useState("SCANNING...");
  const [tacticalTips, setTacticalTips] = useState<string[]>([]);

  // Refs for Media & Processing
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<any>(null);
  const isSessionActiveRef = useRef(false);
  const detectedGameRef = useRef("SCANNING..."); 
  
  // Logic Loop Refs
  const rafIdRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const lastGameCheckTimeRef = useRef<number>(0);
  const isDetectingRef = useRef(false); // Concurrency Lock
  
  // Audio Refs
  const inputCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioQueueRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // --- AUDIO UTILS ---
  const float32ToB64 = (data: Float32Array) => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = Math.max(-1, Math.min(1, data[i])) * 0x7FFF;
    }
    const bytes = new Uint8Array(int16.buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const b64ToAudioBuffer = async (b64: string, ctx: AudioContext) => {
    const binary = atob(b64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    const int16 = new Int16Array(bytes.buffer);
    
    const buffer = ctx.createBuffer(1, int16.length, 24000);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < int16.length; i++) {
      channel[i] = int16[i] / 32768.0;
    }
    return buffer;
  };

  // --- RECONNECTION LOGIC ---
  useEffect(() => {
    let reconnectTimer: any;
    if (status === 'RECONNECTING') {
      setHudMessage("CONNECTION LOST. RETRYING...");
      reconnectTimer = setTimeout(() => {
        startOverlaySession(true); // True = Reconnect mode (skip mic request if possible or re-use)
      }, 3000);
    }
    return () => clearTimeout(reconnectTimer);
  }, [status]);

  // --- MAIN INITIALIZATION ---
  const startOverlaySession = async (isReconnect = false) => {
    try {
      if (!isReconnect) setStatus('INITIALIZING');
      setHudMessage(isReconnect ? "RE-ESTABLISHING UPLINK..." : "REQUESTING NEURAL HANDSHAKE...");

      // 1. GET SCREEN SHARE (Video Only) - Only if not already active
      if (!videoRef.current?.srcObject) {
         const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: { max: 1280 }, height: { max: 720 }, frameRate: { max: 30 } },
          audio: false 
        });
        screenStream.getVideoTracks()[0].onended = () => handleExit();
        
        if (videoRef.current) {
          videoRef.current.srcObject = screenStream;
          await videoRef.current.play();
        }
      }

      // 2. GET MICROPHONE - Only if not already setup
      let micStream: MediaStream;
      if (!inputCtxRef.current) {
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true }
        });
        inputCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      } else {
        // Re-use existing context/stream logic if strictly reconnecting
         micStream = await navigator.mediaDevices.getUserMedia({
          audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true }
        });
      }

      // 5. CONNECT TO GEMINI
      const client = getLiveClient();
      
      const waifuInstruction = activeWaifu 
        ? `IDENTITY: You are ${activeWaifu.name}. PERSONALITY: ${activeWaifu.personality}.`
        : `IDENTITY: Tactical HUD AI "Klutch". PERSONALITY: Professional Esports Coach & Analyst.`;

      const sessionPromise = client.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          outputAudioTranscription: {},
          systemInstruction: `
            ${waifuInstruction}
            
            CORE OBJECTIVE: You are an intelligent Gaming Copilot. You see the user's screen (video) AND hear the user (audio).

            PRIORITY RULES:
            1. **LISTEN FIRST:** If the user speaks, listens to them and answer intelligently. Do NOT ignore the user. Respond in the same language the user speaks (e.g., Portuguese).
            2. **WATCH SECOND:** If the user is silent, analyze the gameplay. Give tactical callouts, warn of enemies, or praise kills.
            3. **BE SMART:** Don't just shout "GO GO GO". Give useful info like "Check that corner", "Reloading", "Heal up", or answer questions like "Where should I go?".
            4. **CONVERSATIONAL:** You are a partner, not just a hype machine. Be engaging.
            5. **LANGUAGE:** If the user speaks Portuguese, YOU SPEAK PORTUGUESE.
          `
        },
        callbacks: {
          onopen: () => {
            setStatus('ACTIVE');
            isSessionActiveRef.current = true;
            setHudMessage("SYSTEMS ONLINE");
            // Setup audio input (mic) to model
            setupAudioProcessor(micStream, sessionPromise);
            // Setup video input (screen) to model
            startVideoLoop(sessionPromise);
          },
          onmessage: async (msg: LiveServerMessage) => {
            // Audio Output from Model
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && outputCtxRef.current) {
               const ctx = outputCtxRef.current;
               if (ctx.state === 'suspended') await ctx.resume();
               
               const buffer = await b64ToAudioBuffer(audioData, ctx);
               const startTime = Math.max(ctx.currentTime, nextStartTimeRef.current);
               const source = ctx.createBufferSource();
               source.buffer = buffer;
               source.connect(ctx.destination);
               source.start(startTime);
               nextStartTimeRef.current = startTime + buffer.duration;
               audioQueueRef.current.add(source);
               source.onended = () => audioQueueRef.current.delete(source);
               
               setVolumeLevel(Math.random() * 100);
               setTimeout(() => setVolumeLevel(0), buffer.duration * 1000);
            }

            // Transcriptions
            const transcript = msg.serverContent?.outputTranscription?.text;
            if (transcript) {
              setCaptions(prev => (prev + " " + transcript).slice(-150));
              setTimeout(() => setCaptions(""), 8000);
            }
          },
          onclose: () => {
             console.log("Session closed");
             if (isSessionActiveRef.current) {
                isSessionActiveRef.current = false;
                setStatus('RECONNECTING'); 
             }
          },
          onerror: (err) => {
             console.error(err);
             setStatus('ERROR');
             setHudMessage("LINK FAILURE");
          }
        }
      });

      sessionRef.current = sessionPromise;

    } catch (e) {
      console.error("Overlay Error:", e);
      setStatus('ERROR');
      setHudMessage("ACCESS DENIED");
    }
  };

  // --- AUDIO PROCESSING ---
  const setupAudioProcessor = (micStream: MediaStream, sessionPromise: Promise<any>) => {
    if (!inputCtxRef.current) return;
    
    // Close old processor if exists
    try { inputCtxRef.current.close(); } catch(e){}
    inputCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });

    const source = inputCtxRef.current.createMediaStreamSource(micStream);
    const processor = inputCtxRef.current.createScriptProcessor(4096, 1, 1);
    
    processor.onaudioprocess = (e) => {
      // Send audio only if not muted and session active
      if (!isMuted && isSessionActiveRef.current) {
        const inputData = e.inputBuffer.getChannelData(0);
        const b64PCM = float32ToB64(inputData);
        sessionPromise.then(session => {
          session.sendRealtimeInput({ media: { mimeType: 'audio/pcm;rate=16000', data: b64PCM } });
        });
      }
    };
    source.connect(processor);
    processor.connect(inputCtxRef.current.destination);
  };

  // --- STABLE VIDEO LOOP (High Frequency) ---
  const startVideoLoop = (sessionPromise: Promise<any>) => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);

    const loop = (time: number) => {
      if (!isSessionActiveRef.current) return;

      // 1 FPS for Gemini Video Input (Enough for context, saves bandwidth)
      if (time - lastFrameTimeRef.current > 1000) {
        if (videoRef.current && canvasRef.current) {
          const vid = videoRef.current;
          const cvs = canvasRef.current;
          const ctx = cvs.getContext('2d');
          
          if (vid.readyState === vid.HAVE_ENOUGH_DATA && ctx) {
            cvs.width = vid.videoWidth / 3; 
            cvs.height = vid.videoHeight / 3;
            ctx.drawImage(vid, 0, 0, cvs.width, cvs.height);
            const base64Img = cvs.toDataURL('image/jpeg', 0.5).split(',')[1];
            
            sessionPromise.then(session => {
              session.sendRealtimeInput({ media: { mimeType: 'image/jpeg', data: base64Img } });
            });
            
            setFps(Math.floor(58 + Math.random() * 5));
            lastFrameTimeRef.current = time;

            // --- ULTRA FAST GAME DETECTION (Every 5s) ---
            if (time - lastGameCheckTimeRef.current > 5000 && !isDetectingRef.current) {
              isDetectingRef.current = true;
              detectActiveGame(base64Img)
                .then(async (gameName) => {
                  const prevGame = detectedGameRef.current;
                  if (gameName !== 'Unknown' && gameName !== prevGame) {
                    setDetectedGame(gameName);
                    detectedGameRef.current = gameName;
                    const tips = await getTacticalIntel(gameName);
                    setTacticalTips(tips);
                  }
                  lastGameCheckTimeRef.current = time;
                })
                .finally(() => {
                  isDetectingRef.current = false;
                });
            }
          }
        }
      }
      
      rafIdRef.current = requestAnimationFrame(loop);
    };
    rafIdRef.current = requestAnimationFrame(loop);
  };

  const handleExit = () => {
    isSessionActiveRef.current = false;
    cancelAnimationFrame(rafIdRef.current);
    if (sessionRef.current) sessionRef.current.then((s: any) => s.close());
    if (inputCtxRef.current) inputCtxRef.current.close();
    if (outputCtxRef.current) outputCtxRef.current.close();
    if (videoRef.current && videoRef.current.srcObject) {
       (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
    onExit();
  };

  useEffect(() => {
    return () => handleExit();
  }, []);

  // --- START SCREEN ---
  if (status === 'IDLE' || status === 'ERROR') {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-opacity-10">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent pointer-events-none"></div>
        
        <div className="relative z-10 text-center max-w-2xl">
           <div className="w-24 h-24 mx-auto mb-6 rounded-full border-2 border-primary bg-black/50 flex items-center justify-center shadow-neon-blue animate-pulse-fast">
              {activeWaifu ? <img src={activeWaifu.avatarUrl} className="w-full h-full rounded-full object-cover opacity-80" /> : <span className="text-4xl">👁️</span>}
           </div>
           
           <h1 className="text-6xl md:text-8xl font-display font-black text-white mb-2 tracking-tighter">
             {activeWaifu ? activeWaifu.name.toUpperCase() : 'HUD'} <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">OVERLAY</span>
           </h1>
           
           <p className="text-gray-400 font-mono text-sm mb-12 border-l-2 border-primary pl-4 text-left mx-auto max-w-md bg-black/40 p-4 rounded-r">
             > INITIATING TACTICAL INTERFACE...<br/>
             > PERMISSION REQUIRED: SCREEN_CAPTURE<br/>
             > PERMISSION REQUIRED: AUDIO_UPLINK<br/>
             > ACTIVE COMPANION: {activeWaifu ? activeWaifu.name : 'SYSTEM AI'}<br/>
             > STATUS: {status === 'ERROR' ? <span className="text-red-500 font-bold">FAILURE</span> : <span className="text-primary font-bold">READY</span>}
           </p>

           <div className="flex flex-col md:flex-row gap-6 justify-center">
             <button 
               onClick={() => startOverlaySession(false)}
               className="group relative px-10 py-5 bg-primary/10 border border-primary text-primary font-black text-xl uppercase tracking-widest overflow-hidden hover:bg-primary hover:text-black transition-all duration-300 clip-path-polygon"
             >
               <span className="relative z-10 group-hover:translate-x-1 transition-transform inline-block">INITIALIZE</span>
               <div className="absolute inset-0 bg-primary/20 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
             </button>
             
             <button 
               onClick={onExit}
               className="px-10 py-5 border border-white/20 text-gray-400 font-bold text-xl uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
             >
               ABORT
             </button>
           </div>
        </div>
      </div>
    );
  }

  // --- RECONNECTING STATE ---
  if (status === 'RECONNECTING') {
      return (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center">
           <div className="text-center animate-pulse">
              <div className="text-4xl text-red-500 font-bold mb-2">⚠ CONNECTION INTERRUPTED</div>
              <p className="text-white font-mono">ATTEMPTING AUTO-RECONNECT...</p>
           </div>
        </div>
      );
  }

  // --- ACTIVE OVERLAY ---
  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden cursor-crosshair">
      <video ref={videoRef} className="hidden" muted playsInline />
      <canvas ref={canvasRef} className="hidden" />

      {/* VFX Layers */}
      <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_60%,black_100%)] opacity-80 pointer-events-none"></div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-[1] bg-[length:100%_2px,3px_100%] pointer-events-none opacity-20"></div>

      {/* TOP HUD BAR */}
      <div className="absolute top-0 left-0 w-full h-24 p-6 flex justify-between items-start pointer-events-auto z-50 bg-gradient-to-b from-black/80 to-transparent">
         <div className="flex items-center gap-4">
            <div className="bg-black/60 border border-primary/50 px-4 py-2 rounded-br-2xl flex items-center gap-3 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
               <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#0f0]"></div>
               <span className="font-display font-bold text-xl text-white tracking-wider">{hudMessage}</span>
            </div>
            <div className="hidden md:flex flex-col font-mono text-[10px] text-primary/70 bg-black/40 p-2 rounded">
               <span>DETECTED: {detectedGame.toUpperCase()}</span>
               <span>AUDIO: {inputCtxRef.current ? 'ACTIVE' : 'OFF'}</span>
            </div>
         </div>

         <div className="flex gap-4">
            <button onClick={() => setIsMuted(!isMuted)} className={`w-12 h-12 flex items-center justify-center border ${isMuted ? 'border-red-500 text-red-500 bg-red-900/20' : 'border-primary text-primary bg-primary/10'} rounded hover:bg-white/10 transition-all`}>
               {isMuted ? '🔇' : '🎙️'}
            </button>
            <button 
              onClick={handleExit}
              className="px-6 py-2 bg-red-600/20 border border-red-500 text-red-500 font-bold tracking-widest hover:bg-red-600 hover:text-white transition-all skew-x-[-15deg]"
            >
               <span className="skew-x-[15deg] inline-block">DISENGAGE</span>
            </button>
         </div>
      </div>

      {/* WAIFU AVATAR IN HUD */}
      {activeWaifu && (
         <div className="absolute top-24 left-6 pointer-events-none animate-in fade-in slide-in-from-left duration-700 z-40">
            <div className="w-20 h-20 rounded-full border-2 border-primary overflow-hidden relative shadow-[0_0_20px_#00f0ff]">
               <img src={activeWaifu.avatarUrl} className="w-full h-full object-cover opacity-80" />
               <div className="absolute inset-0 bg-primary/20 mix-blend-overlay"></div>
            </div>
            <div className="bg-black/80 text-primary text-[10px] font-bold text-center mt-1 border border-primary/30 rounded px-1">
               INTIMACY: {activeWaifu.intimacy}
            </div>
         </div>
      )}

      {/* TACTICAL INTEL MODULE (Right Side) */}
      {detectedGame !== 'SCANNING...' && detectedGame !== 'Unknown' && (
         <div className="absolute top-24 right-6 w-64 pointer-events-auto animate-in slide-in-from-right duration-500 z-40">
           <div className="bg-black/70 border-r-2 border-primary p-4 rounded-l-lg backdrop-blur-sm shadow-[0_0_15px_rgba(0,0,0,0.5)]">
             <h4 className="text-xs font-bold text-primary mb-2 uppercase tracking-widest border-b border-primary/30 pb-1 flex justify-between">
                <span>{detectedGame} INTEL</span>
                <span className="animate-pulse">●</span>
             </h4>
             <ul className="space-y-2">
               {tacticalTips.map((tip, idx) => (
                 <li key={idx} className="text-[10px] font-mono text-gray-300 leading-tight flex gap-2">
                   <span className="text-primary">></span> {tip}
                 </li>
               ))}
               {tacticalTips.length === 0 && (
                 <li className="text-[10px] text-gray-500 italic">Analyzing tactical feed...</li>
               )}
             </ul>
           </div>
         </div>
      )}

      {/* CENTER RETICLE */}
      {crosshair !== 'none' && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-60">
           {crosshair === 'tech' && (
             <div className="w-16 h-16 border border-primary/30 rounded-full flex items-center justify-center relative">
                <div className="w-1 h-1 bg-primary rounded-full shadow-[0_0_5px_#00f0ff]"></div>
                <div className="absolute top-0 w-0.5 h-2 bg-primary"></div>
                <div className="absolute bottom-0 w-0.5 h-2 bg-primary"></div>
                <div className="absolute left-0 h-0.5 w-2 bg-primary"></div>
                <div className="absolute right-0 h-0.5 w-2 bg-primary"></div>
             </div>
           )}
           {crosshair === 'dot' && <div className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_5px_red]"></div>}
           {crosshair === 'cross' && <div className="text-primary text-2xl font-thin">+</div>}
        </div>
      )}

      {/* BOTTOM LEFT: LOGS */}
      <div className="absolute bottom-8 left-8 max-w-md pointer-events-auto">
         <div className="bg-black/80 border-l-4 border-primary p-4 backdrop-blur-sm rounded-r-lg shadow-lg">
            <h3 className="text-[10px] text-gray-500 font-bold uppercase mb-2 tracking-widest">{activeWaifu ? activeWaifu.name : 'SYSTEM'} Transmission</h3>
            <p className="font-mono text-sm text-cyan-100 leading-relaxed min-h-[40px]">
               {captions ? <span className="text-white drop-shadow-md">"{captions}"</span> : <span className="opacity-30 italic">...monitoring comms...</span>}
            </p>
         </div>
      </div>

      {/* BOTTOM RIGHT: METRICS */}
      <div className="absolute bottom-8 right-8 flex flex-col items-end pointer-events-auto gap-4">
         <div className="bg-black/60 p-2 rounded border border-white/10 backdrop-blur-md">
            <div className="flex gap-1">
               {['tech', 'dot', 'cross', 'none'].map(c => (
                 <button 
                   key={c}
                   onClick={() => setCrosshair(c as any)}
                   className={`w-8 h-8 flex items-center justify-center text-[10px] border ${crosshair === c ? 'border-primary bg-primary/20 text-white' : 'border-white/10 text-gray-500'}`}
                 >
                   {c.toUpperCase().slice(0,1)}
                 </button>
               ))}
            </div>
         </div>
         
         <div className="text-right">
            <div className="text-4xl font-display font-bold text-primary opacity-80">{fps} <span className="text-sm text-gray-500">FPS</span></div>
            <div className="w-32 h-1 bg-gray-800 mt-1">
               <div className="h-full bg-primary" style={{ width: `${fps}%` }}></div>
            </div>
         </div>
         
         {/* Audio Viz */}
         <div className="flex items-end gap-1 h-10">
            {[...Array(5)].map((_, i) => (
               <div 
                 key={i} 
                 className="w-2 bg-secondary transition-all duration-75" 
                 style={{ height: `${Math.max(10, Math.random() * volumeLevel)}%` }}
               ></div>
            ))}
         </div>
      </div>

    </div>
  );
};
