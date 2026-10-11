import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Clock, 
  Users, 
  CheckCircle, 
  Bell, 
  MapPin, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle,
  LogIn,
  User,
  Calendar,
  Sparkles,
  Stethoscope,
  Building2,
  Lock,
  ChevronRight,
  RefreshCw,
  QrCode,
  Globe
} from 'lucide-react';
import { ClinicSearchSelect, ClinicItem } from './ClinicSearchSelect';

export interface PublicTokenStatus {
  tokenNumber: string;
  status: 'WAITING' | 'CALLED' | 'IN_SERVICE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
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

export interface PatientAppointmentItem {
  id: string;
  clinicId: string;
  clinicName?: string;
  clinicSlug?: string;
  clinicAddress?: string;
  doctorName?: string;
  serviceName?: string;
  slotTime: string;
  status: string;
  bookingFee: number;
  paymentStatus: string;
  tokenNumber?: string | null;
  createdAt: string;
}

interface PatientPortalViewProps {
  clinics?: ClinicItem[];
  selectedClinicId?: string;
  onSelectClinicId?: (id: string) => void;
  defaultClinicSlug?: string;
  currentUser?: any;
  token?: string | null;
  onOpenPatientLogin?: () => void;
  onOpenBooking?: (type?: 'REMOTE' | 'IN_CLINIC', qrToken?: string) => void;
  onLogout?: () => void;
  activeTrackingToken?: string;
}

export const PatientPortalView: React.FC<PatientPortalViewProps> = ({
  clinics = [],
  selectedClinicId = '',
  onSelectClinicId,
  defaultClinicSlug = '',
  currentUser,
  token,
  onOpenPatientLogin,
  onOpenBooking,
  onLogout,
  activeTrackingToken,
}) => {
  // Navigation for logged in patients
  const [activeTab, setActiveTab] = useState<'TRACKER' | 'MY_APPOINTMENTS'>('TRACKER');

  // Token Tracker State
  const [tokenInput, setTokenInput] = useState('');
  const [tokenData, setTokenData] = useState<PublicTokenStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Push notifications state
  const [notificationsAllowed, setNotificationsAllowed] = useState(false);
  const [isPushSupported, setIsPushSupported] = useState(true);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [previousStatus, setPreviousStatus] = useState<string | null>(null);

  // Logged-in appointments history state
  const [myAppointments, setMyAppointments] = useState<PatientAppointmentItem[]>([]);
  const [isLoadingMyAppts, setIsLoadingMyAppts] = useState(false);

  const selectedClinic = clinics.find((c) => c.id === selectedClinicId);
  const clinicSlug = selectedClinic?.slug || defaultClinicSlug;

  const isPatientLoggedIn = Boolean(token && currentUser && currentUser.role === 'PATIENT');

  // 1. Register Service Worker on mount for Interactive Push
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'Notification' in window) {
      setIsPushSupported(true);
      if (Notification.permission === 'granted') {
        setNotificationsAllowed(true);
      }

      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => setSwRegistration(reg))
        .catch(() => {});
    } else {
      setIsPushSupported(false);
    }
  }, []);

  // 2. Fetch logged in patient appointments
  const fetchMyAppointments = () => {
    if (!token || !isPatientLoggedIn) return;
    setIsLoadingMyAppts(true);
    fetch('/api/appointments/my', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setMyAppointments(data.data);
          // If patient has an active appointment with token, auto-track if not tracking
          if (!tokenData && data.data.length > 0) {
            const active = data.data.find((a: any) => a.tokenNumber && a.status !== 'COMPLETED' && a.status !== 'CANCELLED');
            if (active && active.tokenNumber) {
              setTokenInput(active.tokenNumber);
              if (active.clinicSlug) {
                lookupTokenBySlug(active.clinicSlug, active.tokenNumber);
              }
            }
          }
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingMyAppts(false));
  };

  useEffect(() => {
    if (isPatientLoggedIn) {
      fetchMyAppointments();
    }
  }, [isPatientLoggedIn, token]);

  // 3. Sync active tracking token prop
  useEffect(() => {
    if (activeTrackingToken && clinicSlug) {
      setTokenInput(activeTrackingToken);
      lookupTokenBySlug(clinicSlug, activeTrackingToken);
    }
  }, [activeTrackingToken, clinicSlug]);

  const lookupTokenBySlug = (slug: string, tokenNum: string) => {
    fetch(`/api/queue/lookup?clinicSlug=${slug}&tokenNumber=${tokenNum.trim().toUpperCase()}`, {
      headers: { 'Bypass-Tunnel-Reminder': 'true' },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setTokenData(res.data);
          setPreviousStatus(res.data.status);
        }
      })
      .catch(() => {});
  };

  // 4. Dispatch interactive push notification with sound/vibration
  const dispatchInteractiveNotification = (title: string, body: string, isUrgent = false) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const options = {
      body,
      icon: '/vite.svg',
      badge: '/vite.svg',
      tag: 'token-status-alert',
      vibrate: isUrgent ? [300, 100, 300, 100, 400] : [200, 100, 200],
      requireInteraction: isUrgent,
      data: { url: window.location.href },
    };

    if (swRegistration && swRegistration.showNotification) {
      swRegistration.showNotification(title, options);
    } else {
      new Notification(title, options);
    }

    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(isUrgent ? 987.77 : 659.25, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch {}
  };

  // 5. Poll for token status updates every 4 seconds
  useEffect(() => {
    if (!tokenData || !clinicSlug || tokenData.status === 'COMPLETED' || tokenData.status === 'CANCELLED') return;

    const interval = setInterval(() => {
      fetch(`/api/queue/lookup?clinicSlug=${clinicSlug}&tokenNumber=${tokenData.tokenNumber}`, {
        headers: { 'Bypass-Tunnel-Reminder': 'true' },
      })
        .then((res) => res.json())
        .then((res) => {
          if (res.success && res.data) {
            const updated = res.data;
            if (previousStatus && previousStatus !== updated.status) {
              if (updated.status === 'CALLED') {
                dispatchInteractiveNotification(
                  `🔔 Token ${updated.tokenNumber} IS CALLED!`,
                  `Your turn has arrived! Please proceed to ${updated.doctorName || 'Doctor Chamber'} right away.`,
                  true
                );
              } else if (updated.status === 'IN_SERVICE') {
                dispatchInteractiveNotification(
                  `🩺 Token ${updated.tokenNumber} In Consultation`,
                  `Consultation with ${updated.doctorName || 'Doctor'} has started.`
                );
              } else if (updated.status === 'ON_HOLD') {
                dispatchInteractiveNotification(
                  `⏸️ Token ${updated.tokenNumber} Placed On Hold`,
                  `Reason: ${updated.holdReason || 'Pending clinical steps'}. Reception will recall shortly.`
                );
              }
            } else if (updated.positionAhead === 1 && tokenData.positionAhead > 1) {
              dispatchInteractiveNotification(
                `⚡ You are NEXT in line!`,
                `Only 1 patient ahead of Token ${updated.tokenNumber}. Please wait near the chamber.`,
                false
              );
            }

            setPreviousStatus(updated.status);
            setTokenData(updated);
          }
        })
        .catch(() => {});
    }, 4000);

    return () => clearInterval(interval);
  }, [clinicSlug, tokenData?.tokenNumber, tokenData?.status, previousStatus]);

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!clinicSlug) {
      setErrorMsg('Please select a clinic facility first.');
      return;
    }
    if (!tokenInput.trim()) {
      setErrorMsg('Please enter a token number (e.g. A01 or Q01).');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(
        `/api/queue/lookup?clinicSlug=${clinicSlug}&tokenNumber=${tokenInput.trim().toUpperCase()}`,
        { headers: { 'Bypass-Tunnel-Reminder': 'true' } }
      );
      const data = await res.json();
      if (data.success && data.data) {
        setTokenData(data.data);
        setPreviousStatus(data.data.status);
      } else {
        setErrorMsg(data.error?.message || 'Token not found. Please verify token number.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error looking up token');
    } finally {
      setLoading(false);
    }
  };

  const handleEnablePush = async () => {
    if ('Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          setNotificationsAllowed(true);
          dispatchInteractiveNotification(
            '🔔 Live Push Alerts Activated',
            'You will receive instant buzz notifications when your token is called.',
            false
          );
        } else {
          alert('Notification permission was blocked in browser settings. Please allow notifications for live token alerts.');
        }
      } catch (err) {
        console.error('Error requesting notification permission:', err);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CALLED':
        return { label: '🔔 NOW CALLING', bg: 'bg-[#16A34A] text-white font-black animate-pulse' };
      case 'IN_SERVICE':
        return { label: '🩺 IN CONSULTATION', bg: 'bg-[#0284C7] text-white font-bold' };
      case 'ON_HOLD':
        return { label: '⏸️ ON HOLD', bg: 'bg-[#D97706] text-white font-bold' };
      case 'COMPLETED':
        return { label: '✅ COMPLETED', bg: 'bg-[#1E293B] text-white font-bold' };
      default:
        return { label: '⏳ IN QUEUE', bg: 'bg-[#2563EB] text-white font-bold' };
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-start bg-[#F8FAFC] text-[#334155] p-3 sm:p-6 md:p-8 min-h-screen">
      <div className="w-full max-w-4xl space-y-6">

        {/* ========================================================================= */}
        {/* 1. TOP HEADER / PATIENT PROFILE BAR                                      */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0284C7] to-[#0369A1] text-white flex items-center justify-center text-2xl shadow-sm shrink-0">
              {isPatientLoggedIn ? '👤' : '🏥'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg sm:text-xl font-black text-[#1E293B] tracking-tight">
                  {isPatientLoggedIn ? currentUser?.name || 'Patient Portal' : 'Patient Care Portal'}
                </h1>
                {isPatientLoggedIn ? (
                  <span className="bg-[#DCFCE7] text-[#16A34A] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#16A34A]/30 flex items-center space-x-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>Verified Patient</span>
                  </span>
                ) : (
                  <span className="bg-[#E0F2FE] text-[#0284C7] text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[#0284C7]/30">
                    Public Zero-Login Tracking
                  </span>
                )}
              </div>
              <p className="text-xs text-[#64748B] mt-0.5 font-medium">
                {isPatientLoggedIn
                  ? `Mobile: ${currentUser?.phoneNumber || ''} • View active tokens & book consultations`
                  : 'Track live queue status without logging in • Log in to book doctor consultations'}
              </p>
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            {isPatientLoggedIn ? (
              <button
                onClick={() => onOpenBooking && onOpenBooking('REMOTE')}
                className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition active:scale-95"
              >
                <Calendar className="w-4 h-4" />
                <span>Book Consultation</span>
              </button>
            ) : (
              <button
                onClick={onOpenPatientLogin}
                className="flex items-center space-x-1.5 bg-[#0284C7] hover:bg-[#0369A1] text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition active:scale-95"
              >
                <LogIn className="w-4 h-4" />
                <span>Patient Login / Sign Up</span>
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. SUB-NAVIGATION FOR LOGGED IN PATIENTS                                 */}
        {/* ========================================================================= */}
        {isPatientLoggedIn && (
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
            <div className="flex space-x-2 bg-[#F1F5F9] p-1 rounded-2xl text-xs font-bold">
              <button
                onClick={() => setActiveTab('TRACKER')}
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl transition ${
                  activeTab === 'TRACKER' ? 'bg-white text-[#1E293B] shadow-sm' : 'text-[#64748B] hover:text-[#1E293B]'
                }`}
              >
                <Search className="w-3.5 h-3.5 text-[#0284C7]" />
                <span>Live Queue Tracker</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('MY_APPOINTMENTS');
                  fetchMyAppointments();
                }}
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl transition ${
                  activeTab === 'MY_APPOINTMENTS' ? 'bg-white text-[#1E293B] shadow-sm' : 'text-[#64748B] hover:text-[#1E293B]'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>My Appointments ({myAppointments.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. GUEST NOTICE BANNER (Only when not logged in)                          */}
        {/* ========================================================================= */}
        {!isPatientLoggedIn && (
          <div className="bg-sky-50 border border-sky-200/80 rounded-2xl p-4 flex items-start space-x-3 text-xs text-sky-950">
            <ShieldCheck className="w-5 h-5 text-[#0284C7] shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <b>Public Queue Tracker:</b> You can track your position and estimated wait time below by selecting your clinic and entering your token number without logging in.
              <span className="block mt-1 text-[#0284C7] font-semibold">
                To book a new appointment or redeem an in-clinic TV screen QR discount, please log in with your mobile number.
              </span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. LIVE QUEUE TRACKER SECTION                                            */}
        {/* ========================================================================= */}
        {(activeTab === 'TRACKER' || !isPatientLoggedIn) && (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-black text-[#1E293B]">Track Queue Token Live</h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Select your healthcare facility and enter your token number to monitor live position.
                </p>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-2xl text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Search Controls Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-[#1E293B] block mb-1.5">
                  Clinic Facility
                </label>
                <ClinicSearchSelect
                  clinics={clinics}
                  selectedClinicId={selectedClinicId}
                  onSelectClinicId={(id) => {
                    if (onSelectClinicId) onSelectClinicId(id);
                    setTokenData(null);
                  }}
                  placeholder="Search & choose clinic..."
                  variant="card"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#1E293B] block mb-1.5">
                  Token Number
                </label>
                <form onSubmit={handleLookup} className="flex space-x-2">
                  <input
                    type="text"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="e.g. A01 or Q02"
                    className="flex-1 bg-[#F8FAFC] border border-slate-300 rounded-2xl px-4 py-2.5 text-xs text-[#1E293B] font-mono uppercase tracking-wider placeholder-slate-400 focus:outline-none focus:border-[#0284C7] focus:bg-white font-bold"
                  />
                  <button
                    type="submit"
                    disabled={loading || !selectedClinicId}
                    className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm active:scale-95 ${
                      selectedClinicId
                        ? 'bg-[#0284C7] hover:bg-[#0369A1] text-white'
                        : 'bg-slate-100 text-[#94A3B8] cursor-not-allowed border border-slate-200'
                    }`}
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>{loading ? 'Tracking...' : 'Track'}</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Active Token Result Card */}
            {tokenData && (
              <div className="pt-4 border-t border-slate-100 space-y-5 animate-in fade-in duration-200">
                {/* Status Hero Card */}
                <div className="bg-[#F8FAFC] border-2 border-[#0284C7]/20 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="text-center md:text-left">
                    <span className={`inline-block text-[11px] uppercase tracking-wider px-3.5 py-1 rounded-full mb-2 ${getStatusBadge(tokenData.status).bg}`}>
                      {getStatusBadge(tokenData.status).label}
                    </span>
                    <div className="text-6xl sm:text-7xl font-black font-mono tracking-tight text-[#1E293B]">
                      {tokenData.tokenNumber}
                    </div>
                    <div className="text-xs font-bold text-[#64748B] mt-1 flex items-center justify-center md:justify-start space-x-1.5">
                      <span>Queue: <b className="text-[#1E293B]">{tokenData.queueName}</b></span>
                      {tokenData.doctorName && (
                        <span>&bull; Doctor: <b className="text-[#1E293B]">{tokenData.doctorName}</b></span>
                      )}
                    </div>
                  </div>

                  {/* Position Ahead & Est Wait Metrics */}
                  <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
                    <div className="bg-white border border-slate-200 p-4 rounded-2xl text-center min-w-[130px] shadow-xs">
                      <div className="text-3xl font-black font-mono text-[#0284C7]">
                        {tokenData.positionAhead}
                      </div>
                      <div className="text-[11px] font-bold text-[#64748B] mt-0.5 flex items-center justify-center space-x-1">
                        <Users className="w-3.5 h-3.5 text-[#0284C7]" />
                        <span>People Ahead</span>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 p-4 rounded-2xl text-center min-w-[130px] shadow-xs">
                      <div className="text-3xl font-black font-mono text-[#16A34A]">
                        ~{tokenData.estimatedWaitMinutes}m
                      </div>
                      <div className="text-[11px] font-bold text-[#64748B] mt-0.5 flex items-center justify-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-[#16A34A]" />
                        <span>Est. Wait Time</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Now Serving Inside Chamber */}
                {tokenData.currentServingToken && (
                  <div className="bg-[#E0F2FE]/50 border border-[#0284C7]/20 p-4 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] animate-pulse" />
                      <span className="text-xs font-bold text-[#1E293B]">
                        Currently inside doctor consultation chamber:
                      </span>
                    </div>
                    <span className="font-mono font-black text-base text-[#0284C7] bg-white px-3 py-1 rounded-xl border border-[#0284C7]/20">
                      {tokenData.currentServingToken}
                    </span>
                  </div>
                )}

                {/* Interactive Push Notifications Button */}
                <div className="pt-2">
                  {!notificationsAllowed ? (
                    <button
                      onClick={handleEnablePush}
                      className="w-full bg-[#0284C7] hover:bg-[#0369A1] text-white py-3.5 rounded-2xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-sm active:scale-95"
                    >
                      <Bell className="w-4 h-4 animate-bounce" />
                      <span>Enable Interactive Mobile Alerts (Buzz Phone When Called)</span>
                    </button>
                  ) : (
                    <div className="bg-[#DCFCE7] border border-[#16A34A]/30 p-3 rounded-2xl text-center text-xs font-bold text-[#16A34A] flex items-center justify-center space-x-2 shadow-xs">
                      <CheckCircle className="w-4 h-4" />
                      <span>Interactive Push Active: Your device will vibrate & alert when token is called!</span>
                    </div>
                  )}
                </div>

                <div className="text-center text-[10px] text-[#94A3B8] font-mono">
                  Live sync every 4 seconds &bull; Last updated {new Date(tokenData.lastUpdated).toLocaleTimeString()}
                </div>
              </div>
            )}

            {/* Non-Logged In Booking CTA (Locked behind login) */}
            {!isPatientLoggedIn && (
              <div className="mt-6 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-3 text-center sm:text-left">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-xl shrink-0">
                    🗓️
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-emerald-950">
                      Need to Schedule a Doctor Appointment?
                    </h3>
                    <p className="text-[11px] text-emerald-800/80 mt-0.5">
                      Log in with your phone to book verified doctor consultations and secure priority queue tokens.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onOpenPatientLogin}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-2xl font-bold text-xs shadow-md transition active:scale-95 shrink-0 flex items-center space-x-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Log in to Book</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. MY APPOINTMENTS & CONSULTATION HISTORY (LOGGED IN ONLY)               */}
        {/* ========================================================================= */}
        {isPatientLoggedIn && activeTab === 'MY_APPOINTMENTS' && (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-black text-[#1E293B]">My Booked Consultations</h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  View scheduled visits, assigned tokens, and status receipts.
                </p>
              </div>

              <button
                onClick={() => onOpenBooking && onOpenBooking('REMOTE')}
                className="bg-[#0284C7] hover:bg-[#0369A1] text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm active:scale-95"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Book Appointment</span>
              </button>
            </div>

            {isLoadingMyAppts ? (
              <div className="text-center py-12 text-slate-400 text-xs font-medium flex items-center justify-center space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#0284C7]" />
                <span>Loading your appointments...</span>
              </div>
            ) : myAppointments.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center text-3xl mx-auto">
                  📋
                </div>
                <div className="text-sm font-black text-[#1E293B]">No Appointments Yet</div>
                <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                  You have not scheduled any doctor consultations yet. Book an appointment from home or scan an in-clinic TV QR code to get started.
                </p>
                <button
                  onClick={() => onOpenBooking && onOpenBooking('REMOTE')}
                  className="bg-[#0284C7] hover:bg-[#0369A1] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm"
                >
                  Book Now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myAppointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="bg-[#F8FAFC] border border-slate-200/90 rounded-2xl p-4 flex flex-col justify-between hover:border-[#0284C7]/40 transition space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider bg-slate-200 text-slate-800 px-2.5 py-0.5 rounded">
                          {appt.status}
                        </span>

                        <span className="font-mono text-xs font-black text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded border border-[#16A34A]/20">
                          Paid ₹{appt.bookingFee}
                        </span>
                      </div>

                      <div className="text-sm font-black text-[#1E293B]">{appt.doctorName || 'General OPD'}</div>
                      <div className="text-xs text-[#64748B] mt-0.5 font-medium flex items-center space-x-1">
                        <Building2 className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{appt.clinicName}</span>
                      </div>

                      <div className="text-xs text-slate-600 mt-2 flex items-center space-x-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-[#0284C7]" />
                        <span>{new Date(appt.slotTime).toLocaleDateString()} at {new Date(appt.slotTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Token:</span>
                        <span className="font-mono font-black text-base text-[#0284C7]">
                          {appt.tokenNumber || 'Pending'}
                        </span>
                      </div>

                      {appt.tokenNumber && (
                        <button
                          type="button"
                          onClick={() => {
                            if (appt.clinicId && onSelectClinicId) {
                              onSelectClinicId(appt.clinicId);
                            }
                            setTokenInput(appt.tokenNumber!);
                            setActiveTab('TRACKER');
                            if (appt.clinicSlug) {
                              lookupTokenBySlug(appt.clinicSlug, appt.tokenNumber!);
                            }
                          }}
                          className="text-xs font-bold text-[#0284C7] bg-[#E0F2FE] hover:bg-[#BAE6FD] px-3 py-1 rounded-lg transition border border-[#0284C7]/20"
                        >
                          Track Status
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
