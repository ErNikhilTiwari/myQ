import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Radio, Sparkles, AlertTriangle, Monitor } from 'lucide-react';

type DisplayTemplate = 'NOW_SERVING_NEXT' | 'LAST_4_CALLED' | 'SINGLE_LARGE';

interface ActiveAd {
  id: string;
  title: string;
  imageUrl: string;
  targetUrl?: string | null;
  placement: string;
}

interface TVViewerProps {
  clinicSlug?: string;
}

export const TVViewerKiosk: React.FC<TVViewerProps> = ({ clinicSlug = 'abc-health' }) => {
  const [template, setTemplate] = useState<DisplayTemplate>('NOW_SERVING_NEXT');
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [clinicName, setClinicName] = useState('ABC Health Clinic');
  const [activeAd, setActiveAd] = useState<ActiveAd | null>(null);

  // TV Snapshot State
  const [currentServing, setCurrentServing] = useState<{
    tokenNumber: string;
    roomNumber: string;
    doctorName: string;
  }>({
    tokenNumber: 'A-01',
    roomNumber: 'Room 101',
    doctorName: 'Dr. Ramesh Sharma',
  });

  const [recentCalled, setRecentCalled] = useState<Array<{
    tokenNumber: string;
    roomNumber: string;
    doctorName: string;
  }>>([
    { tokenNumber: 'A-01', roomNumber: 'Room 101', doctorName: 'Dr. Ramesh Sharma' },
    { tokenNumber: 'A-02', roomNumber: 'Room 102', doctorName: 'Dr. Ananya Singh' },
    { tokenNumber: 'W-01', roomNumber: 'Room 101', doctorName: 'Dr. Ramesh Sharma' },
    { tokenNumber: 'W-02', roomNumber: 'Room 103', doctorName: 'Dr. Rajesh Gupta' },
  ]);

  const [nextWaiting, setNextWaiting] = useState<Array<{
    tokenNumber: string;
    estimatedWaitMinutes: number;
  }>>([
    { tokenNumber: 'A-03', estimatedWaitMinutes: 12 },
    { tokenNumber: 'A-04', estimatedWaitMinutes: 24 },
    { tokenNumber: 'W-03', estimatedWaitMinutes: 36 },
  ]);

  const prevTokenRef = useRef<string>('A-01');

  // Web Audio Synthetic Chime (Dual Frequency: 880Hz -> 1320Hz)
  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioCtx.currentTime;

      // Note 1 (880Hz - A5)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.5);

      // Note 2 (1320Hz - E6)
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.frequency.setValueAtTime(1320, now + 0.2);
      gain2.gain.setValueAtTime(0.3, now + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(now + 0.2);
      osc2.stop(now + 0.7);
    } catch (e) {
      console.warn('AudioContext failed:', e);
    }
  };

  // Poll live queue & active TV advertisements
  useEffect(() => {
    const pollTV = () => {
      // 1. Fetch Clinic Details
      fetch('/api/clinics')
        .then((res) => res.json())
        .then((res) => {
          if (!res.success || res.data.length === 0) return;
          const clinic = res.data[0];
          setClinicName(clinic.name);

          // 2. Fetch Queues
          fetch(`/api/clinics/${clinic.id}/queues`)
            .then((r) => r.json())
            .then((qRes) => {
              if (!qRes.success || qRes.data.length === 0) return;
              const q = qRes.data[0];

              // 3. Fetch Queue Snapshot
              fetch(`/api/clinics/${clinic.id}/queues/${q.id}`)
                .then((d) => d.json())
                .then((detRes) => {
                  if (!detRes.success) return;
                  const data = detRes.data;

                  if (data.currentServing) {
                    const newServing = {
                      tokenNumber: data.currentServing.tokenNumber,
                      roomNumber: data.queue.doctor?.roomNumber || 'Room 101',
                      doctorName: data.queue.doctor?.name || 'General OPD',
                    };

                    // Chime if new token called
                    if (prevTokenRef.current !== newServing.tokenNumber) {
                      if (audioEnabled) playChime();
                      prevTokenRef.current = newServing.tokenNumber;
                    }
                    setCurrentServing(newServing);
                  }

                  if (data.waiting) {
                    setNextWaiting(
                      data.waiting.slice(0, 4).map((w: any, idx: number) => ({
                        tokenNumber: w.tokenNumber,
                        estimatedWaitMinutes: (idx + 1) * 12,
                      }))
                    );
                  }
                });
            });

          // 4. Fetch Active TV Banner Ad
          fetch(`/api/ads/TV_VIEWER_BOTTOM?clinicId=${clinic.id}`)
            .then((r) => r.json())
            .then((adRes) => {
              if (adRes.success && adRes.data) {
                setActiveAd(adRes.data);
              }
            })
            .catch(() => {});
        })
        .catch(() => {});
    };

    pollTV();
    const interval = setInterval(pollTV, 3000);
    return () => clearInterval(interval);
  }, [audioEnabled]);

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-white p-4 sm:p-6 md:p-8 select-none overflow-hidden justify-between">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
        <div className="flex items-center space-x-3">
          <span className="text-3xl">🏥</span>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">{clinicName}</h1>
            <p className="text-xs text-slate-400">Waiting Hall Live Token Kiosk Screen</p>
          </div>
        </div>

        {/* Controls Bar: Sound Toggle + Template Selector */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
            <button
              onClick={() => setTemplate('NOW_SERVING_NEXT')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                template === 'NOW_SERVING_NEXT' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Template 1: Now Serving + Next
            </button>
            <button
              onClick={() => setTemplate('LAST_4_CALLED')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                template === 'LAST_4_CALLED' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Template 2: Last 4
            </button>
            <button
              onClick={() => setTemplate('SINGLE_LARGE')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                template === 'SINGLE_LARGE' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Template 3: Large Token
            </button>
          </div>

          <button
            onClick={() => {
              setAudioEnabled(!audioEnabled);
              if (!audioEnabled) playChime();
            }}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              audioEnabled
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
            }`}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{audioEnabled ? 'Sound Active' : 'Enable Chime'}</span>
          </button>
        </div>
      </div>

      {/* Main Kiosk Content Area */}
      <div className="flex-1 flex flex-col justify-center my-auto">
        {/* TEMPLATE 1: NOW SERVING + NEXT LIST */}
        {template === 'NOW_SERVING_NEXT' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {/* Left Big Serving Box (2/3) */}
            <div className="md:col-span-2 bg-gradient-to-b from-slate-900 to-slate-900/90 border-4 border-emerald-500/50 rounded-3xl p-8 md:p-12 shadow-2xl flex flex-col justify-between text-center relative overflow-hidden">
              <div className="flex justify-between items-center">
                <span className="bg-emerald-500 text-slate-950 font-black uppercase tracking-widest text-xs px-4 py-1.5 rounded-full">
                  🔔 NOW SERVING
                </span>
                <span className="text-emerald-400 font-mono text-sm font-bold flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>LIVE</span>
                </span>
              </div>

              <div className="my-auto py-10">
                <div className="text-8xl sm:text-9xl md:text-[11rem] font-black font-mono tracking-tight text-white drop-shadow-2xl">
                  {currentServing.tokenNumber}
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-4 flex items-center justify-center space-x-3">
                  <span>📍 {currentServing.roomNumber}</span>
                  <span className="text-slate-600">&bull;</span>
                  <span className="text-slate-200">{currentServing.doctorName}</span>
                </div>
              </div>

              <div className="text-xs uppercase tracking-widest text-slate-400 font-bold border-t border-slate-800 pt-3">
                Please proceed directly inside when called
              </div>
            </div>

            {/* Right Next Waiting Box (1/3) */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-xl">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-3 mb-4 flex items-center justify-between">
                  <span>⏳ NEXT IN LINE</span>
                  <span className="text-emerald-400 font-mono">ESTIMATED</span>
                </h3>

                <div className="space-y-3">
                  {nextWaiting.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-xs font-mono text-slate-500 font-bold">#{idx + 1}</span>
                        <span className="text-3xl font-black font-mono text-white">{item.tokenNumber}</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-900/40">
                        ~{item.estimatedWaitMinutes} min
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-center text-[11px] text-slate-500 border-t border-slate-800 pt-3 mt-4">
                Smart Display Sync &bull; Auto 3s Heartbeat
              </div>
            </div>
          </div>
        )}

        {/* TEMPLATE 2: LAST 4 CALLED TOKENS (2x2 GRID) */}
        {template === 'LAST_4_CALLED' && (
          <div className="grid grid-cols-2 gap-6 items-stretch">
            {recentCalled.slice(0, 4).map((entry, idx) => (
              <div
                key={idx}
                className={`rounded-3xl p-8 flex flex-col justify-between border-4 shadow-2xl ${
                  idx === 0
                    ? 'bg-slate-900 border-emerald-500 shadow-emerald-950/40'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span
                    className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                      idx === 0 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {idx === 0 ? 'CURRENT' : `CALLED #${idx + 1}`}
                  </span>
                  <span className="text-sm font-bold text-slate-400 font-mono">{entry.roomNumber}</span>
                </div>

                <div className="text-center py-6">
                  <div className="text-8xl font-black font-mono text-white tracking-tight">
                    {entry.tokenNumber}
                  </div>
                  <div className="text-xl font-bold text-slate-200 mt-2">{entry.doctorName}</div>
                </div>

                <div className="text-center text-xs text-slate-500 uppercase tracking-widest font-semibold">
                  {idx === 0 ? 'Proceed inside' : 'Previously called'}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TEMPLATE 3: SINGLE LARGE TOKEN */}
        {template === 'SINGLE_LARGE' && (
          <div className="bg-slate-900/90 border-4 border-emerald-500/70 rounded-3xl p-12 flex flex-col justify-between items-center text-center shadow-2xl min-h-[440px]">
            <span className="bg-emerald-500 text-slate-950 font-black uppercase tracking-widest text-base px-6 py-2 rounded-full">
              🔔 NOW SERVING
            </span>

            <div className="my-auto py-8">
              <div className="text-[13rem] sm:text-[15rem] leading-none font-black font-mono text-white tracking-tighter drop-shadow-2xl">
                {currentServing.tokenNumber}
              </div>
              <div className="text-4xl font-extrabold text-emerald-400 mt-6">
                {currentServing.roomNumber} &bull; <span className="text-slate-200">{currentServing.doctorName}</span>
              </div>
            </div>

            <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">
              Please enter doctor consultation chamber
            </div>
          </div>
        )}
      </div>

      {/* Bottom TV Ad Slot / Network Banner (M11 & Phase 3 Dynamic Targeting) */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        {activeAd ? (
          <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase px-2 py-0.5 rounded">
                SPONSORED
              </span>
              <span className="font-semibold text-slate-200">{activeAd.title}</span>
            </div>
            <span className="text-[11px] text-slate-500">QueueApp Display Network</span>
          </div>
        ) : (
          <div className="w-full flex justify-between items-center text-slate-500 text-[11px]">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Smart TV Kiosk Active &bull; Refresh Rate 3s &bull; Anti-Burn In Safe</span>
            </div>
            <div>Powered by QueueApp SaaS</div>
          </div>
        )}
      </div>
    </div>
  );
};
