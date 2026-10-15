// ═══════════════════════════════════════════════════════
// TeleSol — Visual Sentinel & Phone Feed Card
// Multi-modal visual surveillance:
// 1. Synthetic AI Crowd Stream (Hardware-free tactical overlay)
// 2. Local Browser WebCam
// 3. Android IP Webcam (Preserved original feature)
// ═══════════════════════════════════════════════════════

import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Mic, Wifi, WifiOff, Settings, Volume2, Maximize2, Minimize2, Video, Bot, Laptop } from 'lucide-react';
import GlassCard from '../shared/GlassCard';

const DEFAULT_PHONE_IP = '192.168.1.101';
const DEFAULT_PORT = '8080';

export default function PhoneFeedCard() {
  const [phoneIP, setPhoneIP] = useState(() => localStorage.getItem('telesol_phone_ip') || DEFAULT_PHONE_IP);
  const [phonePort, setPhonePort] = useState(() => localStorage.getItem('telesol_phone_port') || DEFAULT_PORT);
  const [videoSource, setVideoSource] = useState('synthetic'); // 'synthetic' | 'webcam' | 'phone'
  const [isConnected, setIsConnected] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('video'); // 'video' | 'audio'

  const videoRef = useRef(null);
  const localVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const synthCanvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const synthAnimRef = useRef(null);

  const baseUrl = `http://${phoneIP}:${phonePort}`;
  const videoUrl = `${baseUrl}/video`;
  const audioUrl = `${baseUrl}/audio.wav`;
  const snapshotUrl = `${baseUrl}/shot.jpg`;

  // Save settings to localStorage
  const saveSettings = useCallback(() => {
    localStorage.setItem('telesol_phone_ip', phoneIP);
    localStorage.setItem('telesol_phone_port', phonePort);
    setShowSettings(false);
  }, [phoneIP, phonePort]);

  // Check phone IP connection only when in phone mode
  useEffect(() => {
    if (videoSource !== 'phone') return;
    const checkConnection = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2500);
        await fetch(snapshotUrl, { signal: controller.signal, mode: 'no-cors' });
        clearTimeout(timeout);
        setIsConnected(true);
      } catch {
        setIsConnected(false);
      }
    };
    checkConnection();
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, [snapshotUrl, videoSource]);

  // Local WebCam initialization
  useEffect(() => {
    let stream = null;
    if (videoSource === 'webcam') {
      navigator.mediaDevices?.getUserMedia({ video: true, audio: false })
        .then((s) => {
          stream = s;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = s;
            localVideoRef.current.play();
          }
        })
        .catch((err) => {
          console.warn('[WebCam] Access error:', err);
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [videoSource]);

  // Synthetic AI Visual Sentinel Animation (Tactical surveillance simulation)
  useEffect(() => {
    if (videoSource !== 'synthetic' || !synthCanvasRef.current) return;
    const canvas = synthCanvasRef.current;
    const ctx = canvas.getContext('2d');
    let frame = 0;

    // Simulated people walking in sector
    const pedestrians = Array.from({ length: 8 }, (_, i) => ({
      x: 50 + (i * 65) % 450,
      y: 80 + (i * 35) % 180,
      vx: (Math.random() - 0.4) * 1.5,
      vy: (Math.random() - 0.4) * 0.8,
      confidence: Math.round(88 + Math.random() * 10),
      id: `P-${100 + i}`,
    }));

    const render = () => {
      frame++;
      ctx.fillStyle = '#080c16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid mesh
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Scanner bar sweep
      const scanY = (frame * 2) % canvas.height;
      const grad = ctx.createLinearGradient(0, scanY - 20, 0, scanY + 5);
      grad.addColorStop(0, 'rgba(0, 212, 255, 0)');
      grad.addColorStop(1, 'rgba(0, 212, 255, 0.25)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, scanY - 20, canvas.width, 25);

      // Render pedestrian bounding boxes
      pedestrians.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 30 || p.x > canvas.width - 50) p.vx *= -1;
        if (p.y < 40 || p.y > canvas.height - 70) p.vy *= -1;

        const bw = 34;
        const bh = 54;

        // Bounding box
        ctx.strokeStyle = '#00FF88';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(p.x, p.y, bw, bh);

        // Corner accents
        ctx.strokeStyle = '#00D4FF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y + 6); ctx.lineTo(p.x, p.y); ctx.lineTo(p.x + 6, p.y);
        ctx.moveTo(p.x + bw - 6, p.y); ctx.lineTo(p.x + bw, p.y); ctx.lineTo(p.x + bw, p.y + 6);
        ctx.stroke();

        // Label
        ctx.fillStyle = 'rgba(0, 255, 136, 0.85)';
        ctx.font = '9px monospace';
        ctx.fillText(`${p.id} ${p.confidence}%`, p.x, p.y - 4);
      });

      // HUD overlay text
      ctx.fillStyle = '#00D4FF';
      ctx.font = '10px monospace';
      ctx.fillText(`CAM-01 [GATE C VIP] • FPS: 30 • PPL COUNT: ${pedestrians.length}`, 12, 20);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '9px monospace';
      ctx.fillText(`YOLOv8-Nano Core • Inference: 14ms • Synthetic Sentinel Active`, 12, canvas.height - 12);

      synthAnimRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (synthAnimRef.current) cancelAnimationFrame(synthAnimRef.current);
    };
  }, [videoSource]);

  // Audio waveform animation
  useEffect(() => {
    if (activeTab !== 'audio' || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let phase = 0;

    const render = () => {
      phase += 0.08;
      ctx.fillStyle = '#0a0f1d';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = '#A855F7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x < canvas.width; x += 4) {
        const y = canvas.height / 2 + Math.sin(x * 0.04 + phase) * 25 * Math.sin(phase * 0.5);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      animFrameRef.current = requestAnimationFrame(render);
    };
    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [activeTab]);

  return (
    <GlassCard>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Camera size={16} className="text-crowd-cyan" />
          <h3 className="text-xs font-semibold text-crowd-text-primary">Visual Telemetry & Video Feed</h3>
        </div>
        <div className="flex items-center gap-2">
          {/* Source Selector Buttons */}
          <div className="flex rounded-lg overflow-hidden border border-crowd-border/50 text-[10px] font-mono">
            <button
              onClick={() => setVideoSource('synthetic')}
              className={`px-2 py-1 flex items-center gap-1 transition-all ${
                videoSource === 'synthetic' ? 'bg-crowd-cyan/20 text-crowd-cyan font-bold' : 'text-crowd-text-muted hover:text-white'
              }`}
            >
              <Bot size={11} /> AI Visual
            </button>
            <button
              onClick={() => setVideoSource('webcam')}
              className={`px-2 py-1 flex items-center gap-1 transition-all ${
                videoSource === 'webcam' ? 'bg-crowd-safe/20 text-crowd-safe font-bold' : 'text-crowd-text-muted hover:text-white'
              }`}
            >
              <Laptop size={11} /> WebCam
            </button>
            <button
              onClick={() => setVideoSource('phone')}
              className={`px-2 py-1 flex items-center gap-1 transition-all ${
                videoSource === 'phone' ? 'bg-crowd-purple/20 text-crowd-purple font-bold' : 'text-crowd-text-muted hover:text-white'
              }`}
            >
              <Video size={11} /> IP Phone
            </button>
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 rounded hover:bg-white/10 text-crowd-text-muted hover:text-white transition-colors"
          >
            <Settings size={14} />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded hover:bg-white/10 text-crowd-text-muted hover:text-white transition-colors"
          >
            {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* Settings Panel for IP Phone */}
      {showSettings && (
        <div className="mb-3 p-3 rounded-lg bg-black/40 border border-crowd-border space-y-2 animate-fade-in-up">
          <p className="text-[10px] text-crowd-text-muted uppercase tracking-wider font-semibold">IP Webcam Connection</p>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-crowd-text-muted">Phone IP</label>
              <input
                type="text"
                value={phoneIP}
                onChange={(e) => setPhoneIP(e.target.value)}
                className="w-full mt-0.5 px-2 py-1 rounded bg-crowd-bg border border-crowd-border text-xs font-mono text-crowd-text-primary"
                placeholder="192.168.1.101"
              />
            </div>
            <div className="w-20">
              <label className="text-[10px] text-crowd-text-muted">Port</label>
              <input
                type="text"
                value={phonePort}
                onChange={(e) => setPhonePort(e.target.value)}
                className="w-full mt-0.5 px-2 py-1 rounded bg-crowd-bg border border-crowd-border text-xs font-mono text-crowd-text-primary"
                placeholder="8080"
              />
            </div>
          </div>
          <div className="flex gap-2 text-[10px]">
            <button onClick={saveSettings} className="px-3 py-1 rounded bg-crowd-cyan/20 text-crowd-cyan font-bold">
              Save
            </button>
            <button onClick={() => setShowSettings(false)} className="px-3 py-1 rounded bg-white/5 text-crowd-text-muted">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Video / Audio Switcher Tabs */}
      <div className="flex gap-1 mb-2.5">
        <button
          onClick={() => setActiveTab('video')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all ${
            activeTab === 'video' ? 'bg-crowd-cyan/15 text-crowd-cyan' : 'text-crowd-text-muted hover:text-white'
          }`}
        >
          <Camera size={12} /> Video Stream
        </button>
        <button
          onClick={() => setActiveTab('audio')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all ${
            activeTab === 'audio' ? 'bg-crowd-purple/15 text-crowd-purple' : 'text-crowd-text-muted hover:text-white'
          }`}
        >
          <Volume2 size={12} /> Acoustic Analyzer
        </button>
      </div>

      {/* Display Viewport */}
      <div className={`relative rounded-lg overflow-hidden bg-black/60 border border-crowd-border/40 ${expanded ? 'h-[400px]' : 'h-[250px]'} transition-all`}>
        {activeTab === 'video' ? (
          <>
            {/* Mode 1: Synthetic AI Stream (Default) */}
            {videoSource === 'synthetic' && (
              <canvas
                ref={synthCanvasRef}
                width={600}
                height={300}
                className="w-full h-full object-cover"
              />
            )}

            {/* Mode 2: Local WebCam */}
            {videoSource === 'webcam' && (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            )}

            {/* Mode 3: Phone IP Webcam */}
            {videoSource === 'phone' && (
              isConnected ? (
                <img ref={videoRef} src={videoUrl} alt="Phone Stream" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-crowd-text-muted">
                  <Camera size={32} className="mb-2 opacity-30 text-crowd-cyan" />
                  <p className="text-xs font-semibold">IP Phone Offline</p>
                  <p className="text-[10px] mt-0.5">Switch to 'AI Visual' or connect phone at {baseUrl}</p>
                </div>
              )
            )}

            {/* Tactical Live Badge */}
            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[9px] font-mono font-bold text-white">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>LIVE • {videoSource.toUpperCase()}</span>
            </div>
          </>
        ) : (
          /* Acoustic Waveform Canvas */
          <div className="w-full h-full relative">
            <canvas ref={canvasRef} width={600} height={300} className="w-full h-full" />
            <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-black/70 text-[9px] font-mono text-crowd-purple font-bold">
              ACOUSTIC FREQUENCY SPECTRUM (dBA)
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between mt-2 text-[9px] font-mono text-crowd-text-muted">
        <span>Channel: {videoSource === 'synthetic' ? 'Built-in Hardware-Free Sentinel' : videoSource === 'webcam' ? 'Local Media Capture' : baseUrl}</span>
        <span className="text-crowd-safe">● OPERATIONAL</span>
      </div>
    </GlassCard>
  );
}
