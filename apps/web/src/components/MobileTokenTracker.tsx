import React, { useState, useEffect } from 'react';
import { 
  Search, 
  QrCode, 
  Clock, 
  Users, 
  CheckCircle, 
  Bell, 
  MapPin, 
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface PublicTokenStatus {
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

interface MobileTokenTrackerProps {
  clinics?: Array<{ id: string; name: string; slug: string }>;
  defaultClinicSlug?: string;
}

export const MobileTokenTracker: React.FC<MobileTokenTrackerProps> = ({
  clinics = [
    { id: '1', name: 'ABC Health Clinic', slug: 'abc-health' },
    { id: '2', name: 'City Dental Care', slug: 'city-dental' },
  ],
  defaultClinicSlug = 'abc-health',
}) => {
  const [clinicSlug, setClinicSlug] = useState(defaultClinicSlug);
  const [tokenInput, setTokenInput] = useState('A-01');
  const [tokenData, setTokenData] = useState<PublicTokenStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [notificationsAllowed, setNotificationsAllowed] = useState(false);

  // Auto lookup default token on mount
  useEffect(() => {
    handleLookup();
  }, []);

  // Poll for token status updates every 4 seconds if token is active
  useEffect(() => {
    if (!tokenData || tokenData.status === 'COMPLETED' || tokenData.status === 'CANCELLED') return;

    const interval = setInterval(() => {
      fetch(`/api/queue/lookup?clinicSlug=${clinicSlug}&tokenNumber=${tokenData.tokenNumber}`)
        .then((res) => res.json())
        .then((res) => {
          if (res.success && res.data) {
            setTokenData(res.data);
          }
        })
        .catch(() => {});
    }, 4000);

    return () => clearInterval(interval);
  }, [clinicSlug, tokenData?.tokenNumber, tokenData?.status]);

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!tokenInput.trim()) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(
        `/api/queue/lookup?clinicSlug=${clinicSlug}&tokenNumber=${tokenInput.trim().toUpperCase()}`
      );
      const data = await res.json();
      if (data.success && data.data) {
        setTokenData(data.data);
      } else {
        setErrorMsg(data.error?.message || 'Token not found. Please check token number.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error looking up token');
    } finally {
      setLoading(false);
    }
  };

  const handleEnablePush = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then((perm) => {
        if (perm === 'granted') {
          setNotificationsAllowed(true);
        }
      });
    } else {
      setNotificationsAllowed(true);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CALLED':
        return { label: '🔔 NOW CALLING', bg: 'bg-emerald-500 text-slate-950 font-black animate-pulse' };
      case 'IN_SERVICE':
        return { label: '🩺 IN CONSULTATION', bg: 'bg-teal-500 text-slate-950 font-bold' };
      case 'ON_HOLD':
        return { label: '⏸️ ON HOLD', bg: 'bg-amber-500 text-slate-950 font-bold' };
      case 'COMPLETED':
        return { label: '✅ COMPLETED', bg: 'bg-slate-700 text-slate-300 font-bold' };
      default:
        return { label: '⏳ IN QUEUE', bg: 'bg-indigo-500 text-white font-bold' };
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-start bg-slate-950 text-slate-100 p-4 min-h-screen">
      {/* Mobile Wrapper (Max 420px for 360px-420px standard smartphones) */}
      <div className="w-full max-w-md flex flex-col space-y-4">
        
        {/* Top Header Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5">
              <span className="text-2xl">📱</span>
              <div>
                <h1 className="text-base font-black text-white">Live Token Tracker</h1>
                <p className="text-[11px] text-slate-400">Zero-Login QR Token Status</p>
              </div>
            </div>
            <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
              Live Sync
            </span>
          </div>

          {/* Clinic Switcher & Quick Lookup Form */}
          <div className="space-y-2.5">
            <div className="flex items-center space-x-2">
              <label className="text-[11px] text-slate-400 font-medium">Clinic:</label>
              <select
                value={clinicSlug}
                onChange={(e) => {
                  setClinicSlug(e.target.value);
                  setTokenData(null);
                }}
                className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {clinics.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <form onSubmit={handleLookup} className="flex space-x-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Token (e.g. A-01)"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-2.5 text-xs text-white font-mono uppercase tracking-wider placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center space-x-1"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{loading ? '...' : 'Track'}</span>
              </button>
            </form>
          </div>

          {errorMsg && (
            <div className="mt-3 p-2.5 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Live Token Details Card */}
        {tokenData ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col space-y-6">
            
            {/* Clinic Info Header */}
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-black text-white tracking-tight">{tokenData.clinicName}</h2>
                <div className="text-xs text-emerald-400 font-semibold mt-0.5 flex items-center space-x-1">
                  <span>👨‍⚕️ {tokenData.doctorName || 'Doctor Consultation'}</span>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full ${getStatusBadge(tokenData.status).bg}`}>
                  {getStatusBadge(tokenData.status).label}
                </span>
              </div>
            </div>

            {/* Big Token Number Display */}
            <div className="text-center py-4">
              <div className="text-xs uppercase font-bold tracking-widest text-slate-400 mb-1">
                Your Token Number
              </div>
              <div className="text-7xl font-black font-mono tracking-tight text-white drop-shadow-lg">
                {tokenData.tokenNumber}
              </div>
              {tokenData.status === 'CALLED' && (
                <div className="mt-3 bg-emerald-500 text-slate-950 font-black text-xs py-2 px-4 rounded-xl animate-bounce">
                  🔔 Please proceed to doctor chamber now!
                </div>
              )}
            </div>

            {/* Position Ahead & Estimated Waiting Time Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl text-center">
                <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-center space-x-1">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  <span>People Ahead</span>
                </div>
                <div className="text-2xl font-black font-mono text-white mt-1">
                  {tokenData.positionAhead}
                </div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl text-center">
                <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Estimated Wait</span>
                </div>
                <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
                  ~{tokenData.estimatedWaitMinutes} <span className="text-xs font-normal text-slate-400">min</span>
                </div>
              </div>
            </div>

            {/* Serving Comparison Bar */}
            <div className="bg-slate-950 border border-slate-800/80 p-3.5 rounded-2xl flex items-center justify-between text-xs">
              <span className="text-slate-400">Currently in Chamber:</span>
              <span className="font-mono font-bold text-white bg-slate-800 px-2.5 py-0.5 rounded">
                {tokenData.currentServingToken || 'None'}
              </span>
            </div>

            {/* Web Push Notification Call-to-action */}
            {!notificationsAllowed ? (
              <button
                onClick={handleEnablePush}
                className="w-full bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 py-3 rounded-2xl text-xs font-bold transition flex items-center justify-center space-x-2"
              >
                <Bell className="w-4 h-4 text-indigo-400" />
                <span>Notify me on WhatsApp / Browser when called</span>
              </button>
            ) : (
              <div className="p-3 bg-emerald-950/30 border border-emerald-800/50 rounded-2xl text-emerald-300 text-xs font-semibold flex items-center justify-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Push notifications active on this device</span>
              </div>
            )}

            {/* Footer sync info */}
            <div className="text-center text-[10px] text-slate-500 pt-2 border-t border-slate-800">
              Auto-updating every 4s &bull; Safe to close and revisit via QR code
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 text-center text-slate-400">
            <QrCode className="w-12 h-12 mx-auto text-slate-600 mb-3" />
            <div className="text-sm font-bold text-white">Enter a Token Number Above</div>
            <p className="text-xs text-slate-500 mt-1">
              Example tokens: <span className="text-emerald-400 font-mono font-bold">A-01</span>, <span className="text-emerald-400 font-mono font-bold">A-02</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
