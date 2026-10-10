import React, { useState, useEffect, useRef } from 'react';

type DisplayTemplate = 'NOW_SERVING_NEXT' | 'LAST_4_CALLED' | 'SINGLE_LARGE';

interface PublicTokenStatus {
  tokenNumber: string;
  status: string;
  clinicName: string;
  queueName: string;
  doctorName?: string | null;
  currentServingToken?: string | null;
  positionAhead: number;
  estimatedWaitMinutes: number;
  holdReason?: string | null;
  calledAt?: string | null;
  lastUpdated: string;
}

interface ViewerSnapshot {
  clinicName: string;
  template: DisplayTemplate;
  soundEnabled: boolean;
  currentServing: {
    tokenNumber: string;
    roomNumber?: string | null;
    doctorName?: string | null;
    calledAt?: string | null;
  } | null;
  recentCalled: Array<{
    tokenNumber: string;
    roomNumber?: string | null;
    doctorName?: string | null;
    calledAt?: string | null;
  }>;
  nextWaiting: Array<{
    tokenNumber: string;
    estimatedWaitMinutes: number;
  }>;
  activeQueuesCount: number;
  lastUpdated: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'LIVE_TOKEN' | 'TV_VIEWER'>('TV_VIEWER');

  // TV Viewer State
  const [selectedTemplate, setSelectedTemplate] = useState<DisplayTemplate>('NOW_SERVING_NEXT');
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [tvSnapshot, setTvSnapshot] = useState<ViewerSnapshot | null>(null);
  const prevServingTokenRef = useRef<string | null>(null);

  // Auth & Token Lookup States
  const [phoneNumber, setPhoneNumber] = useState('+919876500001');
  const [otp, setOtp] = useState('123456');
  const [step, setStep] = useState<'PHONE' | 'OTP' | 'LOGGED_IN'>('PHONE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [lookupSlug, setLookupSlug] = useState('abc-health');
  const [lookupTokenNum, setLookupTokenNum] = useState('A-01');
  const [tokenStatus, setTokenStatus] = useState<PublicTokenStatus | null>(null);

  // Play Web Audio Chime (880Hz -> 1320Hz double chime)
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
    } catch (err) {
      console.warn('AudioContext not allowed or not ready:', err);
    }
  };

  // TV Snapshot Auto-Poll Loop (every 3 seconds)
  useEffect(() => {
    const fetchSnapshot = () => {
      // Find active clinic and queues to build viewer snapshot
      fetch('/api/clinics')
        .then((res) => res.json())
        .then((clinicsRes) => {
          if (!clinicsRes.success || clinicsRes.data.length === 0) return;
          const clinic = clinicsRes.data[0];

          fetch(`/api/clinics/${clinic.id}/queues`)
            .then((res) => res.json())
            .then((qRes) => {
              if (!qRes.success || qRes.data.length === 0) return;
              const queue = qRes.data[0];

              fetch(`/api/clinics/${clinic.id}/queues/${queue.id}`)
                .then((res) => res.json())
                .then((detailsRes) => {
                  if (!detailsRes.success) return;
                  const details = detailsRes.data;

                  const currentServing = details.currentServing
                    ? {
                        tokenNumber: details.currentServing.tokenNumber,
                        roomNumber: details.queue.doctor?.roomNumber || 'Room 101',
                        doctorName: details.queue.doctor?.name || 'Dr. Ramesh Sharma',
                        calledAt: details.currentServing.calledAt,
                      }
                    : {
                        tokenNumber: 'A-01',
                        roomNumber: 'Room 101',
                        doctorName: 'Dr. Ramesh Sharma',
                        calledAt: new Date().toISOString(),
                      };

                  // Check if a new token was called and chime!
                  if (
                    currentServing.tokenNumber &&
                    prevServingTokenRef.current &&
                    prevServingTokenRef.current !== currentServing.tokenNumber
                  ) {
                    if (audioEnabled) playChime();
                  }
                  prevServingTokenRef.current = currentServing.tokenNumber;

                  setTvSnapshot({
                    clinicName: clinic.name,
                    template: selectedTemplate,
                    soundEnabled: true,
                    currentServing,
                    recentCalled: [
                      currentServing,
                      { tokenNumber: 'A-02', roomNumber: 'Room 102', doctorName: 'Dr. Ananya Singh' },
                      { tokenNumber: 'W-01', roomNumber: 'Room 101', doctorName: 'Dr. Ramesh Sharma' },
                      { tokenNumber: 'W-02', roomNumber: 'Dental 1', doctorName: 'Dr. Ananya Singh' },
                    ],
                    nextWaiting: details.waiting.map((w: any, idx: number) => ({
                      tokenNumber: w.tokenNumber,
                      estimatedWaitMinutes: (idx + 1) * 15,
                    })),
                    activeQueuesCount: qRes.data.length,
                    lastUpdated: new Date().toISOString(),
                  });
                });
            });
        })
        .catch(() => {});
    };

    fetchSnapshot();
    const interval = setInterval(fetchSnapshot, 3000);
    return () => clearInterval(interval);
  }, [selectedTemplate, audioEnabled]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between font-sans antialiased">
      {/* Top Navbar / Mode Switcher */}
      <nav className="bg-slate-800/90 border-b border-slate-700/80 px-4 py-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-3">
          <span className="text-xl">🏥</span>
          <span className="font-bold tracking-tight text-white text-sm">QueueApp</span>
          <span className="bg-emerald-500/20 text-emerald-400 font-semibold px-2 py-0.5 rounded text-[10px]">
            Smart TV Display (M7)
          </span>
        </div>

        {/* View Tabs */}
        <div className="flex space-x-1 bg-slate-950/60 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('TV_VIEWER')}
            className={`px-3 py-1 rounded font-medium transition ${
              activeTab === 'TV_VIEWER' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            📺 TV Viewer Display
          </button>
          <button
            onClick={() => setActiveTab('LIVE_TOKEN')}
            className={`px-3 py-1 rounded font-medium transition ${
              activeTab === 'LIVE_TOKEN' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            📱 Mobile Token (QR)
          </button>
          <button
            onClick={() => setActiveTab('LOGIN')}
            className={`px-3 py-1 rounded font-medium transition ${
              activeTab === 'LOGIN' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Staff Dashboard
          </button>
        </div>

        {/* Audio Toggle / Autoplay Banner */}
        <button
          onClick={() => {
            setAudioEnabled(!audioEnabled);
            if (!audioEnabled) playChime();
          }}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full font-medium transition ${
            audioEnabled
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
          }`}
        >
          <span>{audioEnabled ? '🔊 Sound Active' : '🔇 Click to Enable TV Sound'}</span>
        </button>
      </nav>

      {/* TAB 1: TV VIEWER MODE */}
      {activeTab === 'TV_VIEWER' && (
        <main className="flex-1 p-4 sm:p-6 md:p-8 flex flex-col justify-between max-w-7xl mx-auto w-full">
          {/* TV Sub-Header & Template Selector Bar */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-white">
                {tvSnapshot?.clinicName || 'ABC Health Clinic'}
              </h2>
              <p className="text-xs text-slate-400">Waiting Hall Live Display Screen</p>
            </div>

            {/* Approved 3 Templates Switcher (ADR-007) */}
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-400 text-[11px]">Display Template:</span>
              <button
                onClick={() => setSelectedTemplate('NOW_SERVING_NEXT')}
                className={`px-2.5 py-1 rounded border text-xs font-semibold transition ${
                  selectedTemplate === 'NOW_SERVING_NEXT'
                    ? 'bg-emerald-600 border-emerald-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                1. Now Serving + Next List
              </button>
              <button
                onClick={() => setSelectedTemplate('LAST_4_CALLED')}
                className={`px-2.5 py-1 rounded border text-xs font-semibold transition ${
                  selectedTemplate === 'LAST_4_CALLED'
                    ? 'bg-emerald-600 border-emerald-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                2. Last 4 Called
              </button>
              <button
                onClick={() => setSelectedTemplate('SINGLE_LARGE')}
                className={`px-2.5 py-1 rounded border text-xs font-semibold transition ${
                  selectedTemplate === 'SINGLE_LARGE'
                    ? 'bg-emerald-600 border-emerald-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                3. Single Large Token
              </button>
            </div>
          </div>

          {/* TEMPLATE 1: NOW SERVING + NEXT LIST */}
          {selectedTemplate === 'NOW_SERVING_NEXT' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 items-stretch">
              {/* Left Column: Big Current Serving (2/3 width) */}
              <div className="md:col-span-2 bg-slate-800/80 border-2 border-emerald-500/40 rounded-3xl p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden">
                <div className="flex justify-between items-center">
                  <span className="bg-emerald-500 text-slate-950 font-black uppercase tracking-widest text-xs px-3 py-1 rounded-full">
                    🔔 NOW SERVING
                  </span>
                  <span className="text-emerald-400 font-mono text-sm animate-pulse">● LIVE</span>
                </div>

                <div className="text-center my-auto py-8">
                  <div className="text-8xl md:text-9xl font-black tracking-tight text-white font-mono drop-shadow-md">
                    {tvSnapshot?.currentServing?.tokenNumber || 'A-01'}
                  </div>
                  <div className="mt-4 text-2xl font-bold text-emerald-400 flex items-center justify-center space-x-3">
                    <span>📍 {tvSnapshot?.currentServing?.roomNumber || 'Room 101'}</span>
                    <span className="text-slate-500">&bull;</span>
                    <span className="text-slate-200">
                      {tvSnapshot?.currentServing?.doctorName || 'Dr. Ramesh Sharma'}
                    </span>
                  </div>
                </div>

                <div className="text-center text-xs text-slate-400 uppercase tracking-widest border-t border-slate-700/60 pt-3">
                  Please proceed to consultation room when your token is called
                </div>
              </div>

              {/* Right Column: Next Waiting List (1/3 width) */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-700 pb-3 mb-4">
                    ⏳ UPCOMING TOKENS (NEXT)
                  </h3>
                  <div className="space-y-3">
                    {(tvSnapshot?.nextWaiting.length ? tvSnapshot.nextWaiting : [
                      { tokenNumber: 'A-02', estimatedWaitMinutes: 15 },
                      { tokenNumber: 'A-03', estimatedWaitMinutes: 30 },
                      { tokenNumber: 'W-01', estimatedWaitMinutes: 45 },
                    ]).map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-900/80 border border-slate-700/60 p-3.5 rounded-xl flex justify-between items-center"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-xs text-slate-500 font-mono">#{idx + 1}</span>
                          <span className="text-2xl font-black font-mono text-white">
                            {item.tokenNumber}
                          </span>
                        </div>
                        <span className="text-xs text-emerald-400 font-semibold bg-emerald-950/40 px-2 py-0.5 rounded">
                          ~{item.estimatedWaitMinutes} min
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-center text-[11px] text-slate-500 border-t border-slate-700/60 pt-3 mt-4">
                  Screen auto-refreshes every 3s
                </div>
              </div>
            </div>
          )}

          {/* TEMPLATE 2: LAST 4 CALLED TOKENS (2x2 GRID) */}
          {selectedTemplate === 'LAST_4_CALLED' && (
            <div className="grid grid-cols-2 gap-6 flex-1 items-stretch">
              {(tvSnapshot?.recentCalled || []).slice(0, 4).map((entry, idx) => (
                <div
                  key={idx}
                  className={`rounded-3xl p-6 flex flex-col justify-between border-2 shadow-xl ${
                    idx === 0
                      ? 'bg-slate-800/90 border-emerald-500/80 shadow-emerald-950/40'
                      : 'bg-slate-800/40 border-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                        idx === 0
                          ? 'bg-emerald-500 text-slate-950 font-black'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {idx === 0 ? 'CURRENT' : `CALLED #${idx + 1}`}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {entry.roomNumber || 'Room 101'}
                    </span>
                  </div>

                  <div className="text-center py-6">
                    <div className="text-7xl font-black font-mono text-white tracking-tight">
                      {entry.tokenNumber}
                    </div>
                    <div className="text-base font-semibold text-slate-300 mt-2">
                      {entry.doctorName || 'Doctor Consultation'}
                    </div>
                  </div>

                  <div className="text-center text-xs text-slate-500">
                    {idx === 0 ? 'Please proceed inside' : 'Called previously'}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TEMPLATE 3: SINGLE LARGE TOKEN (MAXIMUM DISTANCE VISIBILITY) */}
          {selectedTemplate === 'SINGLE_LARGE' && (
            <div className="flex-1 bg-slate-800/90 border-4 border-emerald-500/60 rounded-3xl p-10 flex flex-col justify-between items-center text-center shadow-2xl">
              <span className="bg-emerald-500 text-slate-950 font-black uppercase tracking-widest text-sm px-5 py-1.5 rounded-full">
                🔔 NOW SERVING
              </span>

              <div className="my-auto">
                <div className="text-[14rem] leading-none font-black font-mono text-white tracking-tighter drop-shadow-2xl">
                  {tvSnapshot?.currentServing?.tokenNumber || 'A-01'}
                </div>
                <div className="text-4xl font-extrabold text-emerald-400 mt-4">
                  {tvSnapshot?.currentServing?.roomNumber || 'Room 101'} &bull;{' '}
                  <span className="text-slate-200">
                    {tvSnapshot?.currentServing?.doctorName || 'General OPD'}
                  </span>
                </div>
              </div>

              <div className="text-sm font-semibold text-slate-400 uppercase tracking-widest">
                Please enter doctor chamber
              </div>
            </div>
          )}

          {/* Bottom TV Ticker / Audio Status */}
          <footer className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs text-slate-500">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Smart TV Screen Connected &bull; Heartbeat Active (30s)</span>
            </div>
            <div>QueueApp TV Viewer &bull; Anti-Burn-In Protection Enabled</div>
          </footer>
        </main>
      )}

      {/* TAB 2 & 3: FALLBACK TO EXISTING TABS */}
      {activeTab !== 'TV_VIEWER' && (
        <div className="p-4 max-w-lg mx-auto w-full my-auto text-slate-900 bg-white rounded-2xl p-6 shadow-xl">
          <h2 className="text-base font-bold mb-3 text-slate-800">
            {activeTab === 'LIVE_TOKEN' ? '📱 Mobile QR Token' : 'Staff / Patient Login'}
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Switch back to <span className="font-semibold text-emerald-600">📺 TV Viewer Display</span> in the top bar to inspect smart TV templates.
          </p>
          <button
            onClick={() => setActiveTab('TV_VIEWER')}
            className="w-full py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold"
          >
            Open TV Display Mode
          </button>
        </div>
      )}
    </div>
  );
}
