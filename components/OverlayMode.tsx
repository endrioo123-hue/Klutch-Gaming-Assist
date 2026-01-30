
import React, { useState, useEffect, useRef } from 'react';
import { getLiveClient } from '../services/geminiService';
import { Modality, LiveServerMessage } from '@google/genai';

// --- SUB-COMPONENT: BRAIN VISUALIZER ---
const BrainVisualizer: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  return (
    <div className="flex items-center gap-1 h-8">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className={`w-1 bg-primary rounded-full transition-all duration-75 ${
            isActive ? 'animate-pulse' : 'h-1 opacity-20'
          }`}
          style={{ 
            height: isActive ? `${Math.random() * 24 + 4}px` : '4px',
            animationDelay: `${i * 0.1}s`
          }}
        />
      ))}
    </div>
  );
};

export const OverlayMode: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  // UI State
  const [status, setStatus] = useState<'IDLE' | 'INITIALIZING' | 'ACTIVE' | 'ERROR'>('IDLE');
  const [hudMessage, setHudMessage] = useState("SYSTEM STANDBY");
  const [fps, setFps] = useState(0);
  const [crosshair, setCrosshair] = useState<'dot' | 'cross' | 'none'>('cross');
  const [isMuted, setIsMuted] = useState(false);
  const [captions, setCaptions] = useState(""); 
  const [isAiSpeaking, setIsAiSpeaking] = useState(false); // New State for Visualizer

  // Refs for Media & Processing
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<any>(null);
  const isSessionActiveRef = useRef(false); 
  
  // Audio Refs
  const inputCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioQueueRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // --- AUDIO UTILS (PCM) ---
  const float32ToB64 = (data: Float32Array) => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = Math.max(-1, Math.min(1, data[i])) * 0x7FFF;
    }
    const bytes = new Uint8Array(int16.buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
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

  // --- MAIN INITIALIZATION ---
  const startOverlaySession = async () => {
    try {
      setStatus('INITIALIZING');
      setHudMessage("INITIATING BRAIN LINK...");

      // 1. GET SCREEN SHARE (Video Only)
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true, 
        audio: false // We capture mic separately
      });

      // 2. GET MICROPHONE
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      // 3. SETUP HIDDEN VIDEO ELEMENT
      if (videoRef.current) {
        videoRef.current.srcObject = screenStream;
        await videoRef.current.play();
      }

      // 4. SETUP AUDIO CONTEXTS
      inputCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      // CRITICAL: Resume audio context if suspended (Browser Policy)
      if (outputCtxRef.current.state === 'suspended') {
        await outputCtxRef.current.resume();
      }

      // 5. CONNECT TO GEMINI
      setHudMessage("CONNECTING NEURAL NET...");
      const client = getLiveClient();
      
      const sessionPromise = client.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO], 
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          },
          // BRAIN CHAT SYSTEM INSTRUCTION
          systemInstruction: `
            You are 'Klutch Brain', an advanced tactical AI Copilot.
            
            ROLE:
            - You are watching the user's gameplay via video stream.
            - You are listening to the user's voice via audio stream.
            - You are a highly intelligent, strategic companion (Brain Chat).

            BEHAVIOR:
            1. ANALYZE VISUALS: Call out enemies, low health, loot, or important map details immediately.
            2. CONVERSATIONAL STRATEGY: If the user talks to you, reply naturally. Discuss tactics, loadouts, or just hype them up.
            3. STYLE: Use a cool, tactical, slightly robotic but friendly tone. Be concise during action, but detailed during downtime.
            4. LANGUAGE: Detect the user's language (Portuguese or English) and MATCH IT perfectly.
            
            IMPORTANT: Do not act like a generic assistant. You are a GAMING AI integrated into their HUD.
          `
        },
        callbacks: {
          onopen: () => {
            setStatus('ACTIVE');
            isSessionActiveRef.current = true;
            setHudMessage("BRAIN CHAT ONLINE");
            startStreaming(micStream, sessionPromise);
          },
          onmessage: async (msg: LiveServerMessage) => {
            // Handle Audio Output
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && outputCtxRef.current) {
               // Update Visual State
               setIsAiSpeaking(true);
               setHudMessage("BRAIN SPEAKING...");

               const ctx = outputCtxRef.current;
               const buffer = await b64ToAudioBuffer(audioData, ctx);
               
               // Scheduling
               const startTime = Math.max(ctx.currentTime, nextStartTimeRef.current);
               const source = ctx.createBufferSource();
               source.buffer = buffer;
               source.connect(ctx.destination);
               source.start(startTime);
               
               nextStartTimeRef.current = startTime + buffer.duration;
               audioQueueRef.current.add(source);
               
               source.onended = () => {
                 audioQueueRef.current.delete(source);
                 // Only turn off visualizer if queue is empty
                 if (audioQueueRef.current.size === 0) {
                    setIsAiSpeaking(false);
                    setHudMessage("BRAIN LISTENING...");
                 }
               };
            }
          },
          onclose: () => {
             setStatus('IDLE');
             isSessionActiveRef.current = false;
             setHudMessage("LINK SEVERED");
          },
          onerror: (err) => {
             console.error(err);
             setStatus('ERROR');
             isSessionActiveRef.current = false;
             setHudMessage("CRITICAL ERROR");
          }
        }
      });

      sessionRef.current = sessionPromise;

    } catch (e: any) {
      console.error("Overlay Start Error:", e);
      setStatus('ERROR');
      isSessionActiveRef.current = false;
      
      let msg = "ERROR";
      if (e.name === 'NotAllowedError') msg = "PERMISSION DENIED";
      else if (e.name === 'NotFoundError') msg = "DEVICE NOT FOUND";
      else msg = "CONNECTION FAILED";
      
      setHudMessage(msg);
    }
  };

  // --- STREAMING LOOPS ---
  const startStreaming = (micStream: MediaStream, sessionPromise: Promise<any>) => {
    if (!inputCtxRef.current) return;

    // 1. AUDIO LOOP (Microphone)
    const source = inputCtxRef.current.createMediaStreamSource(micStream);
    const processor = inputCtxRef.current.createScriptProcessor(4096, 1, 1);
    
    processor.onaudioprocess = (e) => {
      if (isMuted) return; // Mute logic
      if (!isSessionActiveRef.current) return;
      
      const inputData = e.inputBuffer.getChannelData(0);
      const b64PCM = float32ToB64(inputData);
      
      sessionPromise.then(session => {
        session.sendRealtimeInput({
          media: {
            mimeType: 'audio/pcm;rate=16000',
            data: b64PCM
          }
        });
      });
    };
    
    source.connect(processor);
    processor.connect(inputCtxRef.current.destination);

    // 2. VIDEO LOOP (Screen Capture)
    const videoInterval = setInterval(() => {
       if (videoRef.current && canvasRef.current && isSessionActiveRef.current) {
          const vid = videoRef.current;
          const cvs = canvasRef.current;
          const ctx = cvs.getContext('2d');
          
          if (vid.readyState === vid.HAVE_ENOUGH_DATA && ctx) {
             cvs.width = vid.videoWidth / 2; // Downscale for speed
             cvs.height = vid.videoHeight / 2;
             ctx.drawImage(vid, 0, 0, cvs.width, cvs.height);
             
             // Get Base64 JPEG
             const base64Img = cvs.toDataURL('image/jpeg', 0.6).split(',')[1];
             
             sessionPromise.then(session => {
                session.sendRealtimeInput({
                  media: {
                    mimeType: 'image/jpeg',
                    data: base64Img
                  }
                });
             });
             
             // Update Fake FPS
             setFps(Math.floor(60 + Math.random() * 5));
          }
       }
    }, 1000); // 1 FPS Vision

    return () => clearInterval(videoInterval);
  };

  const cleanup = () => {
    isSessionActiveRef.current = false;
    if (sessionRef.current) sessionRef.current.then((s: any) => s.close());
    if (inputCtxRef.current) inputCtxRef.current.close();
    if (outputCtxRef.current) outputCtxRef.current.close();
    if (videoRef.current && videoRef.current.srcObject) {
       const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
       tracks.forEach(t => t.stop());
    }
  };

  useEffect(() => {
    return () => cleanup();
  }, []);

  // --- RENDER ---
  
  if (status === 'IDLE' || status === 'ERROR') {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-8">
        <h1 className="text-6xl font-display font-black text-white mb-4 tracking-tighter">TACTICAL <span className="text-primary">OVERLAY</span></h1>
        <p className="text-gray-400 max-w-md text-center mb-8 font-mono text-sm">
          To activate <strong>BRAIN CHAT</strong>, we need to capture your screen (Vision) and microphone (Comms).
          Please select your <strong>GAME WINDOW</strong>.
        </p>
        
        {status === 'ERROR' && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded mb-6 animate-pulse text-center">
            <p className="font-bold">{hudMessage}</p>
            <p className="text-xs mt-1 text-red-300">Check permissions and try again.</p>
          </div>
        )}

        <div className="flex gap-4">
          <button 
            onClick={startOverlaySession}
            className="px-8 py-4 bg-primary text-black font-black text-xl uppercase tracking-widest rounded hover:bg-white hover:scale-105 transition-all shadow-[0_0_20px_#00f0ff]"
          >
            INITIALIZE BRAIN
          </button>
          <button 
            onClick={onExit}
            className="px-8 py-4 border border-white/20 text-white font-bold text-xl uppercase tracking-widest rounded hover:bg-white/10 transition-all"
          >
            ABORT
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
      
      <video ref={videoRef} className="hidden" muted playsInline />
      <canvas ref={canvasRef} className="hidden" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]"></div>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
      
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] pointer-events-none opacity-20"></div>

      {/* --- TOP BAR (Status & Brain Visualizer) --- */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-4 pointer-events-auto">
         <div className="bg-black/70 backdrop-blur-md border border-primary/30 px-6 py-2 rounded-full flex items-center gap-3 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
            <div className={`w-2 h-2 rounded-full ${status === 'ACTIVE' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
            
            {/* BRAIN CHAT VISUALIZER */}
            <div className="flex items-center gap-2 border-r border-white/10 pr-3 mr-1">
               <span className="text-xs font-bold text-white">BRAIN</span>
               <BrainVisualizer isActive={isAiSpeaking} />
            </div>

            <span className="font-mono text-xs font-bold text-primary tracking-widest uppercase">{hudMessage}</span>
            <div className="h-4 w-px bg-white/10 mx-1"></div>
            <span className="font-mono text-xs text-gray-400">FPS: {fps}</span>
         </div>
         
         <button 
           onClick={() => setIsMuted(!isMuted)}
           className={`p-2 rounded-full border transition-all ${isMuted ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-black/50 border-white/20 text-white'}`}
         >
           {isMuted ? '🔇' : '🎙️'}
         </button>

         <button 
           onClick={onExit}
           className="px-4 py-2 bg-red-900/80 border border-red-500/50 text-red-200 text-xs font-bold rounded hover:bg-red-600 transition-colors"
         >
           EXIT
         </button>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-60">
        {crosshair === 'cross' && (
          <div className="relative">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary/80"></div>
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-0.5 bg-primary/80"></div>
          </div>
        )}
      </div>

      <div className="absolute bottom-8 right-8 pointer-events-auto flex flex-col gap-2 items-end">
         <div className="bg-black/60 p-2 rounded border border-white/10 backdrop-blur-md">
            <p className="text-[8px] text-gray-500 font-bold uppercase mb-1 text-right">Reticle</p>
            <div className="flex gap-1">
               <button onClick={() => setCrosshair('dot')} className="w-6 h-6 border border-white/20 rounded bg-white/5 text-[8px] text-white flex items-center justify-center">•</button>
               <button onClick={() => setCrosshair('cross')} className="w-6 h-6 border border-white/20 rounded bg-white/5 text-[8px] text-white flex items-center justify-center">+</button>
               <button onClick={() => setCrosshair('none')} className="w-6 h-6 border border-white/20 rounded bg-white/5 text-[8px] text-white flex items-center justify-center">Ø</button>
            </div>
         </div>
         <div className="text-[10px] font-mono text-primary animate-pulse">
            AI VISION CORE: ACTIVE
         </div>
      </div>

    </div>
  );
};
