import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Sparkles, AlertCircle } from 'lucide-react';
import { QueueBottomAd } from './QueueBottomAd';
import { ClinicSearchSelect, ClinicItem } from './ClinicSearchSelect';

interface TVViewerProps {
  clinicSlug?: string;
  selectedClinicId?: string;
  clinics?: ClinicItem[];
  onSelectClinicId?: (id: string) => void;
}

export const TVViewerKiosk: React.FC<TVViewerProps> = ({ 
  clinicSlug = 'abc-health',
  selectedClinicId = '',
  clinics = [],
  onSelectClinicId
}) => {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [clinicName, setClinicName] = useState('');

  // TV Snapshot State
  const [currentServing, setCurrentServing] = useState<{
    tokenNumber: string;
    roomNumber: string;
    doctorName: string;
  } | null>(null);

  const [nextWaiting, setNextWaiting] = useState<Array<{
    tokenNumber: string;
    estimatedWaitMinutes: number;
  }>>([]);

  const prevTokenRef = useRef<string>('');

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

  // Poll live queue data when clinic is selected
  useEffect(() => {
    if (!selectedClinicId) {
      setClinicName('');
      setCurrentServing(null);
      setNextWaiting([]);
      return;
    }

    const pollTV = () => {
      fetch(`/api/clinics/${selectedClinicId}/queues`)
        .then((r) => r.json())
        .then((qRes) => {
          if (!qRes.success || !qRes.data || qRes.data.length === 0) {
            setCurrentServing(null);
            setNextWaiting([]);
            return;
          }
          const q = qRes.data[0];

          fetch(`/api/clinics/${selectedClinicId}/queues/${q.id}`)
            .then((d) => d.json())
            .then((detRes) => {
              if (!detRes.success || !detRes.data) return;
              const data = detRes.data;

              if (data.currentServing) {
                const newServing = {
                  tokenNumber: data.currentServing.tokenNumber,
                  roomNumber: data.queue.doctor?.roomNumber || 'Room 101',
                  doctorName: data.queue.doctor?.name || 'General OPD',
                };

                if (prevTokenRef.current && prevTokenRef.current !== newServing.tokenNumber) {
                  if (audioEnabled) playChime();
                }
                prevTokenRef.current = newServing.tokenNumber;
                setCurrentServing(newServing);
              } else {
                setCurrentServing(null);
              }

              if (data.waiting) {
                setNextWaiting(
                  data.waiting.slice(0, 4).map((w: any, idx: number) => ({
                    tokenNumber: w.tokenNumber,
                    estimatedWaitMinutes: (idx + 1) * 12,
                  }))
                );
              } else {
                setNextWaiting([]);
              }
            });
        })
        .catch(() => {});
    };

    // Update clinic name
    const foundClinic = clinics.find((c) => c.id === selectedClinicId);
    if (foundClinic) {
      setClinicName(foundClinic.name);
    }

    pollTV();
    const interval = setInterval(pollTV, 3000);
    return () => clearInterval(interval);
  }, [audioEnabled, selectedClinicId, clinics]);

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC] text-[#334155] p-4 sm:p-6 md:p-8 select-none justify-between min-h-[calc(100vh-50px)]">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white border border-slate-200/80 rounded-2xl p-4 sm:px-6 shadow-sm mb-6 gap-4">
        <div className="flex items-center space-x-4 w-full sm:w-auto">
          <div className="w-12 h-12 rounded-2xl bg-[#E0F2FE] border border-[#0284C7]/20 flex items-center justify-center text-2xl shrink-0">
            🏥
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-[#1E293B]">
                {clinicName || 'TV Viewer Kiosk'}
              </h1>
              {onSelectClinicId && (
                <div className="w-64">
                  <ClinicSearchSelect
                    clinics={clinics}
                    selectedClinicId={selectedClinicId}
                    onSelectClinicId={onSelectClinicId}
                    placeholder="Search & choose clinic..."
                    variant="card"
                  />
                </div>
              )}
            </div>
            <p className="text-xs text-[#64748B] font-medium mt-0.5">
              Live Token Waiting Hall Screen &bull; Chamber Routing
            </p>
          </div>
        </div>

        {/* Chime Sound Control */}
        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => {
              setAudioEnabled(!audioEnabled);
              if (!audioEnabled) playChime();
            }}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
              audioEnabled
                ? 'bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/30'
                : 'bg-[#D97706]/10 text-[#D97706] border border-[#D97706]/30'
            }`}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{audioEnabled ? 'Sound Active' : 'Enable Chime'}</span>
          </button>
        </div>
      </div>

      {/* Main Kiosk Content Area */}
      {!selectedClinicId ? (
        /* Empty Clinic Selected Prompt */
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-auto">
          <div className="w-20 h-20 rounded-3xl bg-[#E0F2FE] border border-[#0284C7]/20 flex items-center justify-center text-4xl mb-4 shadow-sm">
            🔍
          </div>
          <h2 className="text-2xl font-black text-[#1E293B] mb-2">No Clinic Selected</h2>
          <p className="text-sm text-[#64748B] max-w-md mb-6">
            Please search and select a clinic tenant from the search bar above to launch live token broadcasting for that facility.
          </p>
          {onSelectClinicId && (
            <div className="w-80">
              <ClinicSearchSelect
                clinics={clinics}
                selectedClinicId={selectedClinicId}
                onSelectClinicId={onSelectClinicId}
                placeholder="Type clinic name or code..."
              />
            </div>
          )}
        </div>
      ) : (
        /* Active Single Unified Kiosk Layout */
        <div className="flex-1 flex flex-col justify-center my-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            
            {/* Left Hero Box (2/3): NOW SERVING Counter */}
            <div className="lg:col-span-2 bg-white border-2 border-[#0284C7]/40 rounded-3xl p-8 md:p-12 shadow-lg flex flex-col justify-between text-center relative overflow-hidden">
              <div className="flex justify-between items-center">
                <span className="bg-[#16A34A] text-white font-black uppercase tracking-widest text-xs px-4 py-1.5 rounded-full shadow-sm">
                  🔔 NOW SERVING
                </span>
                <span className="text-[#0284C7] font-mono text-xs font-bold flex items-center space-x-1.5 bg-[#E0F2FE] px-3 py-1 rounded-full border border-[#0284C7]/20">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] animate-ping" />
                  <span>LIVE CHAMBER ROUTING</span>
                </span>
              </div>

              <div className="my-auto py-10">
                {currentServing ? (
                  <>
                    <div className="text-8xl sm:text-9xl md:text-[11rem] font-black font-mono tracking-tight text-[#1E293B]">
                      {currentServing.tokenNumber}
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-[#0284C7] mt-4 flex items-center justify-center space-x-3">
                      <span className="bg-[#E0F2FE] text-[#0284C7] px-4 py-1.5 rounded-2xl font-bold">
                        📍 {currentServing.roomNumber}
                      </span>
                      <span className="text-slate-300">&bull;</span>
                      <span className="text-[#334155]">{currentServing.doctorName}</span>
                    </div>
                  </>
                ) : (
                  <div className="py-6">
                    <div className="text-slate-300 text-6xl mb-4">🛋️</div>
                    <div className="text-2xl font-black text-[#1E293B]">Counter Standing By</div>
                    <p className="text-sm text-[#64748B] mt-2">Next patient will be called shortly</p>
                  </div>
                )}
              </div>

              <div className="text-xs uppercase tracking-widest text-[#64748B] font-bold border-t border-slate-100 pt-4">
                Please proceed directly to the doctor consultation chamber
              </div>
            </div>

            {/* Right Box (1/3): NEXT IN LINE */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 flex flex-col justify-between shadow-md">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-[#1E293B] border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
                  <span>⏳ NEXT IN LINE</span>
                  <span className="text-[#0284C7] font-mono font-bold text-[11px] bg-[#E0F2FE] px-2 py-0.5 rounded">
                    ESTIMATED WAIT
                  </span>
                </h3>

                <div className="space-y-3">
                  {nextWaiting.length === 0 ? (
                    <div className="text-center py-12 text-[#94A3B8] text-xs">
                      No patients currently waiting in line
                    </div>
                  ) : (
                    nextWaiting.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-[#F8FAFC] border border-slate-200/80 p-4 rounded-2xl flex items-center justify-between transition hover:border-[#0284C7]/40"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-xs font-mono text-[#94A3B8] font-bold">#{idx + 1}</span>
                          <span className="text-3xl font-black font-mono text-[#1E293B]">{item.tokenNumber}</span>
                        </div>
                        <span className="text-xs font-bold text-[#0284C7] bg-[#E0F2FE] px-3 py-1 rounded-xl border border-[#0284C7]/20">
                          ~{item.estimatedWaitMinutes} min
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="text-center text-[11px] text-[#64748B] font-medium border-t border-slate-100 pt-3 mt-4">
                Heartbeat Sync Active &bull; Real-time Token Refresh
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Optimized Minimal TV Banner Ad Space */}
      <QueueBottomAd
        clinicId={selectedClinicId}
        refreshIntervalSeconds={45}
        showFallbackOnNoFill={true}
      />
    </div>
  );
};
