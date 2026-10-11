import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Sparkles, AlertCircle } from 'lucide-react';
import { QueueBottomAd } from './QueueBottomAd';
import { ClinicSearchSelect, ClinicItem } from './ClinicSearchSelect';

interface TVViewerProps {
  clinicSlug?: string;
  selectedClinicId?: string;
  clinics?: ClinicItem[];
  onSelectClinicId?: (id: string) => void;
  currentUser?: any;
  token?: string | null;
}

export const TVViewerKiosk: React.FC<TVViewerProps> = ({ 
  clinicSlug = '',
  selectedClinicId = '',
  clinics = [],
  onSelectClinicId,
  currentUser,
  token,
}) => {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [clinicName, setClinicName] = useState('');

  // TV Snapshot State
  const [currentServing, setCurrentServing] = useState<{
    tokenNumber: string;
    patientName: string;
    roomNumber: string;
    doctorName: string;
  } | null>(null);

  const [nextWaiting, setNextWaiting] = useState<Array<{
    tokenNumber: string;
    patientName: string;
    estimatedWaitMinutes: number;
  }>>([]);

  const prevTokenRef = useRef<string>('');
  const [voiceLanguage, setVoiceLanguage] = useState<'en' | 'hi'>('en');
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  const audioEnabledRef = useRef(audioEnabled);
  audioEnabledRef.current = audioEnabled;

  const voiceLanguageRef = useRef(voiceLanguage);
  voiceLanguageRef.current = voiceLanguage;

  // Auto-bind clinic for logged-in staff/receptionist profile
  const isReceptionistProfile = currentUser && (currentUser.role === 'RECEPTIONIST' || currentUser.role === 'CLINIC_ADMIN');
  const effectiveClinicId = (isReceptionistProfile && currentUser?.clinicId) ? currentUser.clinicId : selectedClinicId;

  // Preload speech synthesis voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        window.speechSynthesis.getVoices();
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Web Audio Synthetic Chime (Dual Frequency: 880Hz -> 1320Hz)
  const playChime = (): Promise<void> => {
    return new Promise((resolve) => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
        const now = audioCtx.currentTime;

        // Note 1 (880Hz - A5)
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.frequency.setValueAtTime(880, now);
        gain1.gain.setValueAtTime(0.35, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.start(now);
        osc1.stop(now + 0.45);

        // Note 2 (1320Hz - E6)
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.frequency.setValueAtTime(1320, now + 0.22);
        gain2.gain.setValueAtTime(0.35, now + 0.22);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.72);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start(now + 0.22);
        osc2.stop(now + 0.72);

        setTimeout(() => {
          resolve();
        }, 800);
      } catch (e) {
        console.warn('AudioContext failed:', e);
        resolve();
      }
    });
  };

  // Full Live Announcement: Chime -> Spoken Token & Patient Name -> Room & Doctor
  const announceToken = async (serving: {
    tokenNumber: string;
    patientName: string;
    roomNumber: string;
    doctorName: string;
  }) => {
    if (!audioEnabledRef.current) return;

    // 1. Play dual-note chime first
    await playChime();

    // 2. Synthesize spoken announcement
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel(); // Stop any pending utterance

        const lang = voiceLanguageRef.current;
        const rawName = serving.patientName?.trim();
        const isGenericName = !rawName || rawName === 'Walk-in Patient' || rawName === 'Patient';
        const patientName = isGenericName ? '' : rawName;

        let text = '';
        if (lang === 'hi') {
          // Natural Hindi announcement
          text = patientName
            ? `टोकन नंबर ${serving.tokenNumber}। ${patientName}। कृपया ${serving.roomNumber}, ${serving.doctorName} के पास जाएँ।`
            : `टोकन नंबर ${serving.tokenNumber}। कृपया ${serving.roomNumber}, ${serving.doctorName} के पास जाएँ।`;
        } else {
          // Clear English announcement (Default)
          text = patientName
            ? `Token number ${serving.tokenNumber}. ${patientName}. Please proceed to ${serving.roomNumber}, ${serving.doctorName}.`
            : `Token number ${serving.tokenNumber}. Please proceed to ${serving.roomNumber}, ${serving.doctorName}.`;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.88; // comfortable, clear hospital announcement pace
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        const voices = window.speechSynthesis.getVoices();
        if (lang === 'hi') {
          const hiVoice = voices.find(
            (v) => v.lang.toLowerCase().includes('hi') || v.name.toLowerCase().includes('hindi')
          );
          if (hiVoice) utterance.voice = hiVoice;
          utterance.lang = 'hi-IN';
        } else {
          const inVoice = voices.find(
            (v) => v.lang === 'en-IN' || v.lang.startsWith('en-IN') || v.name.toLowerCase().includes('india')
          );
          const enVoice = inVoice || voices.find((v) => v.lang.startsWith('en'));
          if (enVoice) utterance.voice = enVoice;
          utterance.lang = 'en-IN';
        }

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Voice announcement error:', err);
      }
    }
  };

  const handleTestVoice = async () => {
    setIsTestingVoice(true);
    await announceToken(
      currentServing || {
        tokenNumber: 'OPD-101',
        patientName: 'Ramesh Patel',
        roomNumber: 'Room 101',
        doctorName: 'Dr. Sharma',
      }
    );
    setTimeout(() => setIsTestingVoice(false), 2000);
  };

  const handleToggleAudio = () => {
    const nextState = !audioEnabled;
    setAudioEnabled(nextState);
    audioEnabledRef.current = nextState;
    if (nextState) {
      handleTestVoice();
    } else {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
  };

  // Poll live queue data when clinic is selected or auto-bound
  useEffect(() => {
    if (!effectiveClinicId) {
      setClinicName('');
      setCurrentServing(null);
      setNextWaiting([]);
      return;
    }

    const pollTV = () => {
      fetch(`/api/clinics/${effectiveClinicId}/queues`)
        .then((r) => r.json())
        .then((qRes) => {
          if (!qRes.success || !qRes.data || qRes.data.length === 0) {
            setCurrentServing(null);
            setNextWaiting([]);
            return;
          }
          const q = qRes.data[0];

          const headers: Record<string, string> = {};
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          fetch(`/api/clinics/${effectiveClinicId}/queues/${q.id}`, { headers })
            .then((d) => d.json())
            .then((detRes) => {
              if (!detRes.success || !detRes.data) return;
              const data = detRes.data;

              if (data.currentServing) {
                const newServing = {
                  tokenNumber: data.currentServing.tokenNumber,
                  patientName: data.currentServing.patientName || data.currentServing.user?.name || '',
                  roomNumber: data.queue.doctor?.roomNumber || 'Room 101',
                  doctorName: data.queue.doctor?.name || 'General OPD',
                };

                if (prevTokenRef.current && prevTokenRef.current !== newServing.tokenNumber) {
                  if (audioEnabledRef.current) {
                    announceToken(newServing);
                  }
                }
                prevTokenRef.current = newServing.tokenNumber;
                setCurrentServing(newServing);
              } else {
                setCurrentServing(null);
              }

              if (data.waiting) {
                setNextWaiting(
                  data.waiting.slice(0, 5).map((w: any, idx: number) => ({
                    tokenNumber: w.tokenNumber,
                    patientName: w.patientName || w.user?.name || 'Patient',
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
    const foundClinic = clinics.find((c) => c.id === effectiveClinicId);
    if (foundClinic) {
      setClinicName(foundClinic.name);
    } else if (currentUser?.clinicName) {
      setClinicName(currentUser.clinicName);
    }

    pollTV();
    const interval = setInterval(pollTV, 3000);
    return () => clearInterval(interval);
  }, [audioEnabled, effectiveClinicId, clinics, currentUser]);

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

              {/* Only show clinic selector if NOT already mapped to a receptionist profile */}
              {!isReceptionistProfile && onSelectClinicId && (
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

              {isReceptionistProfile && (
                <span className="bg-[#E0F2FE] text-[#0284C7] text-xs font-bold px-2.5 py-0.5 rounded-full border border-[#0284C7]/20">
                  Auto-synced with Clinic Profile
                </span>
              )}
            </div>
            <p className="text-xs text-[#64748B] font-medium mt-0.5">
              Live Token Waiting Hall Screen &bull; Chamber Routing
            </p>
          </div>
        </div>

        {/* Live Audio & Voice Announcements Control */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Language Selector: English / Hindi */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setVoiceLanguage('en')}
              className={`px-2.5 py-1 rounded-lg transition ${
                voiceLanguage === 'en'
                  ? 'bg-white text-[#0284C7] shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setVoiceLanguage('hi')}
              className={`px-2.5 py-1 rounded-lg transition ${
                voiceLanguage === 'hi'
                  ? 'bg-white text-[#0284C7] shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              हिंदी
            </button>
          </div>

          {/* Test Voice Button */}
          {audioEnabled && (
            <button
              onClick={handleTestVoice}
              disabled={isTestingVoice}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-sky-50 text-[#0284C7] border border-sky-200 hover:bg-sky-100 transition active:scale-95 shadow-xs"
              title="Test audio chime and voice announcement"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isTestingVoice ? 'Announcing...' : 'Test Voice'}</span>
            </button>
          )}

          {/* Enable / Disable Live Sound */}
          <button
            onClick={handleToggleAudio}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm active:scale-95 ${
              audioEnabled
                ? 'bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/30'
                : 'bg-[#D97706]/10 text-[#D97706] border border-[#D97706]/30'
            }`}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{audioEnabled ? 'Voice Active' : 'Enable Live Voice'}</span>
          </button>
        </div>
      </div>

      {/* Main Kiosk Content Area */}
      {!effectiveClinicId ? (
        /* Empty Clinic Selected Prompt */
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-auto">
          <div className="w-20 h-20 rounded-3xl bg-[#E0F2FE] border border-[#0284C7]/20 flex items-center justify-center text-4xl mb-4 shadow-sm">
            🔍
          </div>
          <h2 className="text-2xl font-black text-[#1E293B] mb-2">No Clinic Selected</h2>
          <p className="text-sm text-[#64748B] max-w-md mb-6">
            Please search and select a clinic from the search bar above to launch live token broadcasting for that facility.
          </p>
          {!isReceptionistProfile && onSelectClinicId && (
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

              <div className="my-auto py-8">
                {currentServing ? (
                  <>
                    <div className="text-7xl sm:text-8xl md:text-9xl lg:text-[10rem] font-black font-mono tracking-tight text-[#1E293B] leading-none">
                      {currentServing.tokenNumber}
                    </div>

                    {/* Distinct Prominent Patient Identification Badge */}
                    <div className="mt-5 mb-5 inline-flex items-center space-x-3 bg-emerald-50 border-2 border-emerald-400/80 px-6 py-2.5 rounded-2xl shadow-sm max-w-full">
                      <span className="bg-emerald-600 text-white font-black text-xs uppercase tracking-wider px-2.5 py-1 rounded-lg shrink-0">
                        PATIENT
                      </span>
                      <span className="text-2xl sm:text-3xl md:text-4xl font-black text-emerald-950 truncate">
                        {currentServing.patientName}
                      </span>
                    </div>

                    {/* Unambiguous Routing Details: Room vs Doctor */}
                    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-2">
                      {/* Room Badge */}
                      <div className="bg-sky-50 border-2 border-sky-300 text-sky-900 px-5 py-2.5 rounded-2xl flex items-center space-x-2.5 shadow-xs">
                        <span className="text-xs uppercase font-black tracking-wider text-sky-700 bg-white border border-sky-200 px-2.5 py-0.5 rounded-md">
                          ROOM / CHAMBER
                        </span>
                        <span className="text-xl sm:text-2xl font-black font-mono">{currentServing.roomNumber}</span>
                      </div>

                      {/* Doctor Badge */}
                      <div className="bg-slate-100 border-2 border-slate-300 text-slate-800 px-5 py-2.5 rounded-2xl flex items-center space-x-2.5 shadow-xs">
                        <span className="text-xs uppercase font-black tracking-wider text-slate-600 bg-white border border-slate-200 px-2.5 py-0.5 rounded-md">
                          DOCTOR
                        </span>
                        <span className="text-xl sm:text-2xl font-black">{currentServing.doctorName}</span>
                      </div>
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
                        className="bg-[#F8FAFC] border border-slate-200/80 p-3.5 rounded-2xl flex items-center justify-between transition hover:border-[#0284C7]/40"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <span className="text-xs font-mono text-[#94A3B8] font-bold shrink-0">#{idx + 1}</span>
                          <div className="min-w-0">
                            <div className="text-2xl font-black font-mono text-[#1E293B]">{item.tokenNumber}</div>
                            <div className="flex items-center space-x-1.5 mt-0.5 truncate">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 shrink-0">
                                Patient
                              </span>
                              <span className="text-xs font-bold text-[#1E293B] truncate">{item.patientName}</span>
                            </div>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-[#0284C7] bg-[#E0F2FE] px-2.5 py-1 rounded-xl border border-[#0284C7]/20 whitespace-nowrap shrink-0 ml-2">
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
        clinicId={effectiveClinicId}
        refreshIntervalSeconds={45}
        showFallbackOnNoFill={true}
      />
    </div>
  );
};
