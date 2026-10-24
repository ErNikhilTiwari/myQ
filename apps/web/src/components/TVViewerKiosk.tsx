import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Sparkles, AlertCircle, QrCode, Users, Clock, ShieldCheck, RefreshCw } from 'lucide-react';
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
  const [totalWaitingCount, setTotalWaitingCount] = useState<number>(0);

  // Rotating Cryptographic In-Clinic QR Code State
  const [qrData, setQrData] = useState<{
    token: string;
    price: number;
    expiresAt: string;
    secondsRemaining: number;
  } | null>(null);
  const [isQrLoading, setIsQrLoading] = useState(false);
  const [qrNetworkError, setQrNetworkError] = useState(false);

  const prevTokenRef = useRef<string>('');
  const [voiceLanguage, setVoiceLanguage] = useState<'en' | 'hi'>('en');
  const [voiceMode, setVoiceMode] = useState<string>('TOKEN_PATIENT_DOCTOR_ROOM');
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  const audioEnabledRef = useRef(audioEnabled);
  audioEnabledRef.current = audioEnabled;

  const voiceLanguageRef = useRef(voiceLanguage);
  voiceLanguageRef.current = voiceLanguage;

  const voiceModeRef = useRef(voiceMode);
  voiceModeRef.current = voiceMode;

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
        const currentMode = voiceModeRef.current || 'TOKEN_PATIENT_DOCTOR_ROOM';
        const rawName = serving.patientName?.trim();
        const isGenericName = !rawName || rawName === 'Walk-in Patient' || rawName === 'Patient';
        const patientName = isGenericName ? '' : rawName;
        const doctorName = serving.doctorName?.trim() || '';
        const roomNumber = serving.roomNumber?.trim() || '';

        let text = '';
        if (lang === 'hi') {
          // Natural Hindi Announcements for the 4 modes:
          switch (currentMode) {
            case 'TOKEN_ONLY':
              text = `टोकन नंबर ${serving.tokenNumber}।`;
              break;

            case 'TOKEN_PATIENT':
              text = patientName
                ? `टोकन नंबर ${serving.tokenNumber}। ${patientName}।`
                : `टोकन नंबर ${serving.tokenNumber}।`;
              break;

            case 'TOKEN_PATIENT_DOCTOR':
              if (patientName && doctorName) {
                text = `टोकन नंबर ${serving.tokenNumber}। ${patientName}। कृपया ${doctorName} के पास जाएँ।`;
              } else if (doctorName) {
                text = `टोकन नंबर ${serving.tokenNumber}। कृपया ${doctorName} के पास जाएँ।`;
              } else if (patientName) {
                text = `टोकन नंबर ${serving.tokenNumber}। ${patientName}।`;
              } else {
                text = `टोकन नंबर ${serving.tokenNumber}।`;
              }
              break;

            case 'TOKEN_PATIENT_DOCTOR_ROOM':
            default:
              if (patientName && doctorName && roomNumber) {
                text = `टोकन नंबर ${serving.tokenNumber}। ${patientName}। कृपया कमरा ${roomNumber}, ${doctorName} के पास जाएँ।`;
              } else if (patientName && doctorName) {
                text = `टोकन नंबर ${serving.tokenNumber}। ${patientName}। कृपया ${doctorName} के पास जाएँ।`;
              } else if (doctorName && roomNumber) {
                text = `टोकन नंबर ${serving.tokenNumber}। कृपया कमरा ${roomNumber}, ${doctorName} के पास जाएँ।`;
              } else {
                text = `टोकन नंबर ${serving.tokenNumber}। कृपया परामर्श कक्ष में जाएँ।`;
              }
              break;
          }
        } else {
          // Clear English Announcements for the 4 modes:
          switch (currentMode) {
            case 'TOKEN_ONLY':
              text = `Token number ${serving.tokenNumber}.`;
              break;

            case 'TOKEN_PATIENT':
              text = patientName
                ? `Token number ${serving.tokenNumber}. ${patientName}.`
                : `Token number ${serving.tokenNumber}.`;
              break;

            case 'TOKEN_PATIENT_DOCTOR':
              if (patientName && doctorName) {
                text = `Token number ${serving.tokenNumber}. ${patientName}. Please proceed to ${doctorName}.`;
              } else if (doctorName) {
                text = `Token number ${serving.tokenNumber}. Please proceed to ${doctorName}.`;
              } else if (patientName) {
                text = `Token number ${serving.tokenNumber}. ${patientName}.`;
              } else {
                text = `Token number ${serving.tokenNumber}.`;
              }
              break;

            case 'TOKEN_PATIENT_DOCTOR_ROOM':
            default:
              if (patientName && doctorName && roomNumber) {
                text = `Token number ${serving.tokenNumber}. ${patientName}. Please proceed to ${roomNumber}, ${doctorName}.`;
              } else if (patientName && doctorName) {
                text = `Token number ${serving.tokenNumber}. ${patientName}. Please proceed to ${doctorName}.`;
              } else if (doctorName && roomNumber) {
                text = `Token number ${serving.tokenNumber}. Please proceed to ${roomNumber}, ${doctorName}.`;
              } else {
                text = `Token number ${serving.tokenNumber}. Please proceed to consultation room.`;
              }
              break;
          }
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
        tokenNumber: 'OPD101',
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
                setTotalWaitingCount(data.waiting.length);
                setNextWaiting(
                  data.waiting.slice(0, 5).map((w: any, idx: number) => ({
                    tokenNumber: w.tokenNumber,
                    patientName: w.patientName || w.user?.name || 'Patient',
                    estimatedWaitMinutes: (idx + 1) * 12,
                  }))
                );
              } else {
                setTotalWaitingCount(0);
                setNextWaiting([]);
              }
            });
        })
        .catch(() => {});
    };

    // Update clinic name and voice mode from clinics list or live clinic endpoint
    const foundClinic = clinics.find((c) => c.id === effectiveClinicId);
    if (foundClinic) {
      setClinicName(foundClinic.name);
      if (foundClinic.voiceAnnouncementMode) {
        setVoiceMode(foundClinic.voiceAnnouncementMode);
        voiceModeRef.current = foundClinic.voiceAnnouncementMode;
      }
    } else if (currentUser?.clinicName) {
      setClinicName(currentUser.clinicName);
    }

    // Also fetch fresh clinic metadata to ensure realtime voiceMode sync
    fetch(`/api/clinics/${effectiveClinicId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          if (res.data.name) setClinicName(res.data.name);
          if (res.data.voiceAnnouncementMode) {
            setVoiceMode(res.data.voiceAnnouncementMode);
            voiceModeRef.current = res.data.voiceAnnouncementMode;
          }
        }
      })
      .catch(() => {});

    pollTV();
    const interval = setInterval(pollTV, 3000);
    return () => clearInterval(interval);
  }, [audioEnabled, effectiveClinicId, clinics, currentUser]);

  // Fetch & Refresh Rotating In-Clinic Booking QR Code Every 30-40 Seconds
  useEffect(() => {
    if (!effectiveClinicId) {
      setQrData(null);
      return;
    }

    const fetchRotatingQr = () => {
      setIsQrLoading(true);
      fetch(`/api/clinics/${effectiveClinicId}/in-clinic-qr`)
        .then((r) => r.json())
        .then((res) => {
          if (res.success && res.data) {
            const exp = new Date(res.data.expiresAt).getTime();
            const sec = Math.max(Math.round((exp - Date.now()) / 1000), 1);
            setQrData({
              token: res.data.token,
              price: res.data.price,
              expiresAt: res.data.expiresAt,
              secondsRemaining: sec,
            });
            setQrNetworkError(false);
          } else {
            setQrNetworkError(true);
          }
        })
        .catch(() => {
          setQrNetworkError(true);
        })
        .finally(() => {
          setIsQrLoading(false);
        });
    };

    fetchRotatingQr();
    // Rotate cryptographic QR code every 30 seconds
    const qrInterval = setInterval(fetchRotatingQr, 30000);

    // 1-second local countdown ticker
    const timerInterval = setInterval(() => {
      setQrData((prev) => {
        if (!prev) return null;
        const newSec = Math.max(prev.secondsRemaining - 1, 0);
        return { ...prev, secondsRemaining: newSec };
      });
    }, 1000);

    return () => {
      clearInterval(qrInterval);
      clearInterval(timerInterval);
    };
  }, [effectiveClinicId]);

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC] text-[#334155] p-3 sm:p-4 md:p-5 select-none justify-between min-h-[calc(100vh-52px)] h-full">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white border border-slate-200/80 rounded-2xl p-3 sm:px-5 shadow-xs mb-3 gap-3 shrink-0">
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

          {/* Mode Indicator Pill */}
          <div className="hidden lg:flex items-center space-x-1.5 bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-slate-600" title="Configured in Clinic Admin > Voice Announcements">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0284C7]" />
            <span>
              {voiceMode === 'TOKEN_ONLY' && 'Mode: Token Only'}
              {voiceMode === 'TOKEN_PATIENT' && 'Mode: Token + Patient'}
              {voiceMode === 'TOKEN_PATIENT_DOCTOR' && 'Mode: Token + Patient + Doctor'}
              {voiceMode === 'TOKEN_PATIENT_DOCTOR_ROOM' && 'Mode: Token + Patient + Doctor + Room'}
            </span>
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
        /* Active Single Unified Kiosk Layout - Current Person, Live Queue Status & QR Code in Single View Followed by Ad in the Bottom */
        <div className="flex-1 flex flex-col justify-center min-h-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 lg:gap-5 items-stretch h-full min-h-0">
            
            {/* Column 1 (5/12): CURRENT PERSON / NOW SERVING Counter */}
            <div className="lg:col-span-5 bg-white border-2 border-[#0284C7]/40 rounded-3xl p-5 md:p-6 shadow-md flex flex-col justify-between text-center relative overflow-hidden h-full">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="bg-[#16A34A] text-white font-black uppercase tracking-widest text-[11px] px-3.5 py-1 rounded-full shadow-xs">
                  🔔 NOW SERVING
                </span>
                <span className="text-[#0284C7] font-mono text-[11px] font-bold flex items-center space-x-1.5 bg-[#E0F2FE] px-2.5 py-0.5 rounded-full border border-[#0284C7]/20">
                  <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-ping" />
                  <span>LIVE ROUTING</span>
                </span>
              </div>

              <div className="my-auto py-3">
                {currentServing ? (
                  <>
                    <div className="text-6xl sm:text-7xl lg:text-7xl xl:text-8xl 2xl:text-9xl font-black font-mono tracking-tight text-[#1E293B] leading-none">
                      {currentServing.tokenNumber}
                    </div>

                    {/* Distinct Prominent Patient Identification Badge */}
                    <div className="mt-3 mb-2 inline-flex items-center space-x-2.5 bg-emerald-50 border-2 border-emerald-400/80 px-4 py-1.5 rounded-2xl shadow-xs max-w-full">
                      <span className="bg-emerald-600 text-white font-black text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0">
                        PATIENT
                      </span>
                      <span className="text-xl sm:text-2xl md:text-3xl font-black text-emerald-950 truncate">
                        {currentServing.patientName}
                      </span>
                    </div>

                    {/* Unambiguous Routing Details: Room vs Doctor */}
                    <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                      {/* Room Badge */}
                      <div className="bg-sky-50 border-2 border-sky-300 text-sky-900 px-3 py-1 rounded-xl flex items-center space-x-1.5 shadow-2xs">
                        <span className="text-[10px] uppercase font-black tracking-wider text-sky-700 bg-white border border-sky-200 px-1.5 py-0.5 rounded">
                          ROOM
                        </span>
                        <span className="text-base sm:text-lg font-black font-mono">{currentServing.roomNumber}</span>
                      </div>

                      {/* Doctor Badge */}
                      <div className="bg-slate-100 border-2 border-slate-300 text-slate-800 px-3 py-1 rounded-xl flex items-center space-x-1.5 shadow-2xs">
                        <span className="text-[10px] uppercase font-black tracking-wider text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                          DOCTOR
                        </span>
                        <span className="text-base sm:text-lg font-black truncate max-w-[200px]">{currentServing.doctorName}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-6">
                    <div className="text-slate-300 text-5xl mb-3">🛋️</div>
                    <div className="text-xl sm:text-2xl font-black text-[#1E293B]">Counter Standing By</div>
                    <p className="text-xs text-[#64748B] mt-1">Next patient will be called shortly</p>
                  </div>
                )}
              </div>

              <div className="text-[11px] uppercase tracking-widest text-[#64748B] font-bold border-t border-slate-100 pt-2.5">
                Please proceed directly to the doctor consultation chamber
              </div>
            </div>

            {/* Column 2 (3/12): LIVE QUEUE STATUS / NEXT IN LINE */}
            <div className="lg:col-span-3 bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 flex flex-col justify-between shadow-md h-full">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-[#1E293B] border-b border-slate-100 pb-2 mb-2.5 flex items-center justify-between">
                  <span>⏳ NEXT IN LINE</span>
                  <span className="text-[#0284C7] font-mono font-bold text-[10px] bg-[#E0F2FE] px-2 py-0.5 rounded">
                    EST. WAIT
                  </span>
                </h3>

                <div className="space-y-2">
                  {nextWaiting.length === 0 ? (
                    <div className="text-center py-10 text-[#94A3B8] text-xs">
                      No patients currently waiting in line
                    </div>
                  ) : (
                    nextWaiting.slice(0, 4).map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-[#F8FAFC] border border-slate-200/80 p-2 rounded-2xl flex items-center justify-between transition hover:border-[#0284C7]/40"
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          <span className="text-xs font-mono text-[#94A3B8] font-bold shrink-0">#{idx + 1}</span>
                          <div className="min-w-0">
                            <div className="text-base font-black font-mono text-[#1E293B] leading-tight">{item.tokenNumber}</div>
                            <div className="text-[11px] font-bold text-[#1E293B] truncate">{item.patientName}</div>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-[#0284C7] bg-[#E0F2FE] px-2 py-0.5 rounded-lg border border-[#0284C7]/20 whitespace-nowrap shrink-0 font-mono">
                          ~{item.estimatedWaitMinutes}m
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Waiting metrics summary */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-[#64748B]">
                <span className="flex items-center space-x-1">
                  <Users className="w-3.5 h-3.5 text-[#0284C7]" />
                  <span>In Queue:</span>
                  <b className="text-[#1E293B] font-mono">{totalWaitingCount}</b>
                </span>
                <span className="flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-[#16A34A]" />
                  <span>Est:</span>
                  <b className="text-[#16A34A] font-mono">~{totalWaitingCount * 12}m</b>
                </span>
              </div>
            </div>

            {/* Column 3 (4/12): ROTATING SECURE IN-CLINIC QR CODE (ENLARGED & SPANNED TEXT) */}
            <div className="lg:col-span-4 bg-gradient-to-br from-slate-900 to-[#0F172A] text-white rounded-3xl p-5 md:p-6 flex flex-col justify-between shadow-xl border-2 border-emerald-500/40 relative overflow-hidden h-full">
              <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* Top Bar: Mode & Countdown */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="bg-emerald-500 text-slate-950 font-black text-[11px] tracking-wider uppercase px-2.5 py-1 rounded-md flex items-center space-x-1.5 shadow-xs">
                  <QrCode className="w-3.5 h-3.5" />
                  <span>IN-CLINIC BOOKING</span>
                </span>

                <span className="text-xs font-extrabold text-emerald-400 font-mono flex items-center space-x-1 bg-emerald-950/70 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                  <RefreshCw className={`w-3 h-3 ${isQrLoading ? 'animate-spin' : ''}`} />
                  <span>Rotates in {qrData?.secondsRemaining || 30}s</span>
                </span>
              </div>

              {/* Text Spanned Above QR Code */}
              <div className="text-center my-2">
                <div className="text-xs font-semibold text-slate-300">
                  Scan to Book Appointment &bull; Walk-in Discount
                </div>
                <div className="text-3xl sm:text-4xl font-black text-emerald-400 mt-0.5 flex items-center justify-center space-x-2">
                  <span>₹{qrData?.price || 200}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                    Fixed Fee
                  </span>
                </div>
              </div>

              {/* Enlarged QR Code Container (Crisp & Scannable from Distance) */}
              <div className="my-auto flex items-center justify-center py-1">
                <div className="bg-white p-3 sm:p-3.5 rounded-3xl shadow-2xl border-4 border-emerald-400 relative">
                  {qrData?.token ? (
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
                        `${window.location.origin}/?clinic=${effectiveClinicId}&qr=${qrData.token}&type=IN_CLINIC`
                      )}`}
                      alt="Scan QR for discounted in-clinic appointment"
                      className="w-44 h-44 sm:w-48 sm:h-48 md:w-52 md:h-52 xl:w-56 xl:h-56 2xl:w-60 2xl:h-60 object-contain"
                      loading="eager"
                    />
                  ) : (
                    <div className="w-44 h-44 sm:w-48 sm:h-48 md:w-52 md:h-52 xl:w-56 xl:h-56 flex items-center justify-center text-slate-400 text-xs">
                      {qrNetworkError ? 'Offline - showing last queue' : 'Loading QR...'}
                    </div>
                  )}
                </div>
              </div>

              {/* Text Spanned Below QR Code */}
              <div className="text-center my-2">
                <p className="text-xs text-slate-200 font-semibold tracking-wide">
                  Point camera at screen to book &bull; Instant live token assigned
                </p>
              </div>

              {/* Bottom Security Guarantee */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-center space-x-1.5 text-[11px] text-emerald-400 font-bold text-center">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Cryptographically verified &bull; Expired codes rejected</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Optimized Minimal TV Banner Ad Space - Full Width Followed at the Bottom */}
      <div className="shrink-0 mt-3">
        <QueueBottomAd
          clinicId={effectiveClinicId}
          refreshIntervalSeconds={45}
          showFallbackOnNoFill={true}
        />
      </div>
    </div>
  );
};
