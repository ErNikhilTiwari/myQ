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
  AlertCircle 
} from 'lucide-react';
import { ClinicSearchSelect, ClinicItem } from './ClinicSearchSelect';

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
  clinics?: ClinicItem[];
  selectedClinicId?: string;
  onSelectClinicId?: (id: string) => void;
  defaultClinicSlug?: string;
}

export const MobileTokenTracker: React.FC<MobileTokenTrackerProps> = ({
  clinics = [],
  selectedClinicId = '',
  onSelectClinicId,
  defaultClinicSlug = '',
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [tokenData, setTokenData] = useState<PublicTokenStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [notificationsAllowed, setNotificationsAllowed] = useState(false);

  const selectedClinic = clinics.find((c) => c.id === selectedClinicId);
  const clinicSlug = selectedClinic?.slug || defaultClinicSlug;

  // Poll for token status updates every 4 seconds if token is active
  useEffect(() => {
    if (!tokenData || !clinicSlug || tokenData.status === 'COMPLETED' || tokenData.status === 'CANCELLED') return;

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
    if (!clinicSlug) {
      setErrorMsg('Please select a clinic first.');
      return;
    }
    if (!tokenInput.trim()) {
      setErrorMsg('Please enter a token number (e.g. A-01).');
      return;
    }

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
    <div className="flex-1 flex flex-col items-center justify-start bg-[#F8FAFC] text-[#334155] p-4 min-h-screen">
      {/* Mobile Wrapper (Max 420px for smartphones) */}
      <div className="w-full max-w-md flex flex-col space-y-4">
        
        {/* Top Header Card */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5">
              <span className="text-2xl">📱</span>
              <div>
                <h1 className="text-base font-black text-[#1E293B]">Live Token Tracker</h1>
                <p className="text-[11px] text-[#64748B]">Zero-Login QR Token Status</p>
              </div>
            </div>
            <span className="bg-[#E0F2FE] text-[#0284C7] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#0284C7]/20">
              Live Sync
            </span>
          </div>

          {/* Clinic Search & Select */}
          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-[#64748B] font-bold block mb-1">Clinic Facility:</label>
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

            <form onSubmit={handleLookup} className="flex space-x-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Token (e.g. A-01)"
                  className="w-full bg-[#F8FAFC] border border-slate-300 rounded-2xl px-4 py-2.5 text-xs text-[#1E293B] font-mono uppercase tracking-wider placeholder-slate-400 focus:outline-none focus:border-[#0284C7] focus:bg-white"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !selectedClinicId}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center space-x-1 shadow-sm ${
                  selectedClinicId
                    ? 'bg-[#0284C7] hover:bg-[#0369A1] text-white'
                    : 'bg-slate-100 text-[#94A3B8] cursor-not-allowed border border-slate-200'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>{loading ? '...' : 'Track'}</span>
              </button>
            </form>
          </div>

          {errorMsg && (
            <div className="mt-3 p-2.5 bg-[#FEF2F2] border border-[#DC2626]/20 rounded-xl text-[#DC2626] text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Live Token Details Card */}
        {tokenData ? (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-md relative overflow-hidden flex flex-col space-y-6">
            
            {/* Clinic Info Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-black text-[#1E293B] tracking-tight">{tokenData.clinicName}</h2>
                <div className="text-xs text-[#0284C7] font-semibold mt-0.5 flex items-center space-x-1">
                  <span>👨‍⚕️ {tokenData.doctorName || 'Doctor Consultation'}</span>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-wider ${getStatusBadge(tokenData.status).bg}`}>
                {getStatusBadge(tokenData.status).label}
              </span>
            </div>

            {/* Token Hero Number */}
            <div className="text-center py-4 bg-[#F8FAFC] rounded-2xl border border-slate-200/80">
              <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest block mb-1">
                Your Token Number
              </span>
              <div className="text-6xl font-black font-mono tracking-tight text-[#1E293B]">
                {tokenData.tokenNumber}
              </div>
              <div className="text-xs text-[#64748B] font-medium mt-1">
                Queue: <span className="text-[#1E293B] font-bold">{tokenData.queueName}</span>
              </div>
            </div>

            {/* Status Live Metrics: Positions Ahead & Estimated Wait Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F8FAFC] border border-slate-200 p-4 rounded-2xl text-center">
                <div className="text-2xl font-black font-mono text-[#0284C7]">
                  {tokenData.positionAhead}
                </div>
                <div className="text-[11px] font-bold text-[#64748B] mt-0.5 flex items-center justify-center space-x-1">
                  <Users className="w-3 h-3 text-[#0284C7]" />
                  <span>People Ahead</span>
                </div>
              </div>

              <div className="bg-[#F8FAFC] border border-slate-200 p-4 rounded-2xl text-center">
                <div className="text-2xl font-black font-mono text-[#16A34A]">
                  ~{tokenData.estimatedWaitMinutes}m
                </div>
                <div className="text-[11px] font-bold text-[#64748B] mt-0.5 flex items-center justify-center space-x-1">
                  <Clock className="w-3 h-3 text-[#16A34A]" />
                  <span>Est. Wait Time</span>
                </div>
              </div>
            </div>

            {/* Now Serving Counter */}
            {tokenData.currentServingToken && (
              <div className="bg-[#E0F2FE]/50 border border-[#0284C7]/20 p-3.5 rounded-2xl flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
                  <span className="text-xs font-semibold text-[#1E293B]">Currently inside doctor chamber:</span>
                </div>
                <span className="font-mono font-black text-sm text-[#0284C7]">
                  {tokenData.currentServingToken}
                </span>
              </div>
            )}

            {/* Browser Push Notification Permission Prompt */}
            {!notificationsAllowed ? (
              <button
                onClick={handleEnablePush}
                className="w-full bg-[#0284C7] hover:bg-[#0369A1] text-white py-3 rounded-2xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-sm"
              >
                <Bell className="w-4 h-4" />
                <span>Notify me when my turn arrives</span>
              </button>
            ) : (
              <div className="bg-[#DCFCE7] border border-[#16A34A]/30 p-2.5 rounded-xl text-center text-[11px] font-bold text-[#16A34A] flex items-center justify-center space-x-1.5">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Alerts active: We'll ping your phone when called!</span>
              </div>
            )}

            {/* Footer sync indicator */}
            <div className="text-center text-[10px] text-[#94A3B8] font-mono">
              Auto-syncs every 4 seconds &bull; Last updated {new Date(tokenData.lastUpdated).toLocaleTimeString()}
            </div>
          </div>
        ) : !selectedClinicId ? (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-8 text-center text-[#64748B] text-xs">
            <div className="text-3xl mb-2">🔍</div>
            <div className="font-bold text-[#1E293B] text-sm mb-1">Select your clinic to track</div>
            <p>Search and select your clinic in the box above to track live token progress.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
};
