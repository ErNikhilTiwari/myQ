import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  PhoneCall, 
  PauseCircle, 
  PlayCircle, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  RotateCcw,
  Sparkles,
  ChevronRight,
  Search,
  Activity,
  Building2,
  Lock,
  LogIn,
  ShieldAlert,
  BarChart3,
  Stethoscope,
  Layers,
  LayoutDashboard,
  DollarSign,
  Monitor,
  Volume2,
  UserCheck
} from 'lucide-react';
import { ClinicAnalytics } from './ClinicAnalytics';
import { DoctorManagement } from './DoctorManagement';
import { ServiceQueueManagement } from './ServiceQueueManagement';
import { ClinicPricingConfig } from './ClinicPricingConfig';
import { VoiceAnnouncementConfig } from './VoiceAnnouncementConfig';
import { ReceptionistManagement } from './ReceptionistManagement';
import { VoiceAnnouncementMode } from '@queueapp/shared';

interface QueueItem {
  id: string;
  tokenNumber: string;
  sequenceNumber: number;
  status: 'WAITING' | 'CALLED' | 'IN_SERVICE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  patientName: string;
  phoneNumber: string;
  estimatedWaitMinutes: number;
  holdReason?: string;
  calledAt?: string;
  createdAt: string;
}

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  roomNumber: string;
  isActive: boolean;
}

interface QueueSummary {
  id: string;
  name: string;
  currentSeq: number;
  isPaused: boolean;
  doctor: Doctor;
  waitingCount: number;
  completedCount: number;
}

interface ClinicOption {
  id: string;
  name: string;
  slug: string;
}

interface ReceptionistConsoleProps {
  token: string | null;
  currentUser: any;
  onOpenLogin: () => void;
  selectedClinicId: string;
  clinics: ClinicOption[];
  isClinicAdminMode?: boolean;
  onOpenTVView?: () => void;
}

export const ReceptionistConsole: React.FC<ReceptionistConsoleProps> = ({
  token,
  currentUser,
  onOpenLogin,
  selectedClinicId,
  clinics,
  isClinicAdminMode,
  onOpenTVView,
}) => {
  const isOwnerOrAdmin = isClinicAdminMode !== undefined
    ? isClinicAdminMode
    : (currentUser?.role === 'CLINIC_ADMIN' || currentUser?.role === 'SUPER_ADMIN');

  const [queues, setQueues] = useState<QueueSummary[]>([]);
  const [selectedQueueId, setSelectedQueueId] = useState<string>('');
  
  // Navigation tabs within Clinic Console
  const [activeConsoleTab, setActiveConsoleTab] = useState<'QUEUE' | 'DOCTORS' | 'SERVICES' | 'RECEPTIONIST' | 'ANALYTICS' | 'PRICING' | 'VOICE'>('QUEUE');
  
  // Active queue state
  const [currentServing, setCurrentServing] = useState<QueueItem | null>(null);
  const [waitingList, setWaitingList] = useState<QueueItem[]>([]);
  const [onHoldList, setOnHoldList] = useState<QueueItem[]>([]);
  const [completedList, setCompletedList] = useState<QueueItem[]>([]);
  
  // Registration Form Modal
  const [showWalkinModal, setShowWalkinModal] = useState(false);
  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone10, setWalkinPhone10] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cancel Confirmation Modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [tokenToCancel, setTokenToCancel] = useState<QueueItem | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelReasonError, setCancelReasonError] = useState('');

  // Hold reason prompt
  const [holdingTokenId, setHoldingTokenId] = useState<string | null>(null);
  const [holdReason, setHoldReason] = useState('Laboratory Testing Required');

  // UI Toast message
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Effective clinic ID is the mapped receptionist clinic or selected facility
  const clinicId = currentUser?.role === 'SUPER_ADMIN'
    ? (selectedClinicId || currentUser?.clinicId || (clinics.length > 0 ? clinics[0].id : ''))
    : (currentUser?.clinicId || selectedClinicId || (clinics.length > 0 ? clinics[0].id : ''));
  const isReceptionistAuthenticated = Boolean(
    token && currentUser && (currentUser.role === 'RECEPTIONIST' || currentUser.role === 'CLINIC_ADMIN' || currentUser.role === 'SUPER_ADMIN')
  );

  // Fetch all queues for mapped clinic
  useEffect(() => {
    if (!isReceptionistAuthenticated || !clinicId) return;

    fetch(`/api/clinics/${clinicId}/queues`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          setQueues(res.data);
          if (res.data.length > 0) {
            setSelectedQueueId(res.data[0].id);
          } else {
            setSelectedQueueId('');
            setCurrentServing(null);
            setWaitingList([]);
            setOnHoldList([]);
          }
        }
      })
      .catch((err) => console.error('Error fetching queues:', err));
  }, [clinicId, isReceptionistAuthenticated, token]);

  const normalizeEntry = (e: any): QueueItem => ({
    id: e.id,
    tokenNumber: e.tokenNumber,
    sequenceNumber: e.sequenceNumber,
    status: e.status,
    patientName: e.patientName || e.user?.name || 'Walk-in Patient',
    phoneNumber: e.phoneNumber || e.user?.phoneNumber || '',
    estimatedWaitMinutes: e.estimatedWaitMinutes || e.estimatedWait || 0,
    holdReason: e.holdReason,
    calledAt: e.calledAt,
    createdAt: e.createdAt,
  });

  // Fetch active queue details with instant refresh support
  const fetchQueueDetails = React.useCallback(() => {
    if (!isReceptionistAuthenticated || !clinicId || !selectedQueueId) return;

    fetch(`/api/clinics/${clinicId}/queues/${selectedQueueId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          const data = res.data;
          setCurrentServing(data.currentServing ? normalizeEntry(data.currentServing) : null);
          setWaitingList((data.waiting || []).map(normalizeEntry));
          setOnHoldList((data.onHold || []).map(normalizeEntry));
          setCompletedList((data.completed || []).map(normalizeEntry));
        }
      })
      .catch(() => {});
  }, [clinicId, selectedQueueId, isReceptionistAuthenticated, token]);

  // Poll active queue details every 2.5s
  useEffect(() => {
    fetchQueueDetails();
    const interval = setInterval(fetchQueueDetails, 2500);
    return () => clearInterval(interval);
  }, [fetchQueueDetails]);

  // Call Next
  const handleCallNext = async () => {
    if (!token || !selectedQueueId) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/clinics/${clinicId}/queues/${selectedQueueId}/call-next`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        const calledToken = data.data?.calledEntry?.tokenNumber || data.data?.tokenNumber || 'Next';
        const calledName = data.data?.calledEntry?.patientName || data.data?.calledEntry?.user?.name || '';
        const prevDone = data.data?.previousEntryCompleted;
        
        let msg = calledName ? `Called Token ${calledToken} (${calledName})` : `Called Token ${calledToken}`;
        if (prevDone) {
          msg = `Previous patient completed ✅ & ${msg}`;
        }
        showToast('success', msg);
        fetchQueueDetails();
      } else {
        showToast('error', data.error?.message || data.message || 'Failed to call next token');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error executing action');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Transition Token Status
  const handleTransition = async (entryId: string, toStatus: string, reason?: string) => {
    if (!token || !selectedQueueId) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/clinics/${clinicId}/queues/entries/${entryId}/transition`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetStatus: toStatus,
          status: toStatus,
          holdReason: reason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        let msg = `Token updated to ${toStatus}`;
        if (toStatus === 'NO_SHOW') msg = 'Patient marked as No-Show';
        if (toStatus === 'CANCELLED') msg = reason ? `Appointment cancelled (${reason})` : 'Patient appointment cancelled';
        if (toStatus === 'COMPLETED') msg = 'Consultation completed';
        if (toStatus === 'ON_HOLD') msg = reason ? `Patient placed on hold (${reason})` : 'Patient placed on hold';
        showToast('success', msg);
        setHoldingTokenId(null);
        fetchQueueDetails();
      } else {
        showToast('error', data.error?.message || data.message || `Failed to transition to ${toStatus}`);
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error transitioning token');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Walk-in Registration (Create New Customer / Issue Token)
  const handleRegisterWalkin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!selectedQueueId) {
      showToast('error', 'Please select a queue to issue token in');
      return;
    }

    const clean10 = walkinPhone10.replace(/\D/g, '').slice(0, 10);
    if (!walkinName.trim()) {
      showToast('error', 'Please enter patient full name');
      return;
    }

    if (clean10.length !== 10) {
      showToast('error', 'Please enter a valid 10-digit mobile number');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/clinics/${clinicId}/receptionist/walk-in`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          queueId: selectedQueueId,
          name: walkinName.trim(),
          phoneNumber: `+91${clean10}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const issuedToken = data.data?.entry?.tokenNumber || data.data?.tokenNumber || 'Token';
        showToast('success', `Walk-in token ${issuedToken} issued successfully!`);
        setWalkinName('');
        setWalkinPhone10('');
        setShowWalkinModal(false);
        fetchQueueDetails();
      } else {
        showToast('error', data.error?.message || data.message || 'Failed to register walk-in');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error creating walk-in token');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showToast = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const activeClinicObj = clinics.find((c) => c.id === clinicId);
  const activeQueueObj = queues.find((q) => q.id === selectedQueueId);

  // STRICT RULE: No receptionist should see the dashboard without logging in!
  if (!isReceptionistAuthenticated) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-[#F8FAFC] min-h-[calc(100vh-60px)]">
        <div className="bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-12 max-w-lg w-full shadow-lg flex flex-col items-center text-center animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-2xl bg-[#E0F2FE] border border-[#0284C7]/20 flex items-center justify-center text-[#0284C7] mb-5 shadow-sm">
            <Lock className="w-8 h-8" />
          </div>

          <span className="bg-[#E0F2FE] text-[#0284C7] text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-3">
            Clinic Security Gate
          </span>

          <h2 className="text-2xl font-black text-[#1E293B] mb-2 tracking-tight">
            Clinic Login Required
          </h2>

          <p className="text-xs text-[#64748B] mb-6 leading-relaxed max-w-sm">
            Access to live queue management, doctor chambers, patient tokens, and walk-in issuance requires verified clinic login credentials.
          </p>

          <button
            onClick={onOpenLogin}
            className="w-full bg-[#0284C7] hover:bg-[#0369A1] text-white py-3.5 rounded-2xl font-bold text-xs transition shadow-md flex items-center justify-center space-x-2 active:scale-95"
          >
            <LogIn className="w-4 h-4" />
            <span>Clinic Login</span>
          </button>

          <p className="text-[11px] text-[#94A3B8] mt-4">
            Assigned clinic facility will load automatically upon verified staff authentication.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC] text-[#334155] p-4 md:p-6 overflow-y-auto">
      {/* Toast Notification - Guaranteed top-most z-[99999] so it is never behind modals or blurred */}
      {feedbackMsg && (
        <div
          className={`fixed top-5 right-5 z-[99999] px-5 py-3.5 rounded-2xl shadow-2xl flex items-center space-x-2.5 text-xs sm:text-sm font-bold transition-all duration-200 animate-in slide-in-from-top-4 border pointer-events-auto ${
            feedbackMsg.type === 'success'
              ? 'bg-[#16A34A] text-white border-green-400/30 ring-4 ring-green-600/20'
              : 'bg-[#DC2626] text-white border-red-400/30 ring-4 ring-red-600/20'
          }`}
        >
          {feedbackMsg.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Top Header Card - Clinic is automatically mapped, no selector needed */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl sm:text-2xl font-black text-[#1E293B] tracking-tight">
              {activeClinicObj?.name || currentUser?.clinicName || (isOwnerOrAdmin ? 'Clinic Management' : 'Receptionist Desk')}
            </h1>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
              isOwnerOrAdmin 
                ? 'bg-[#E0F2FE] text-[#0284C7] border-[#0284C7]/20'
                : 'bg-teal-50 text-teal-700 border-teal-200'
            }`}>
              {isOwnerOrAdmin ? 'Clinic Owner & Admin' : 'Receptionist Desk'} &bull; {currentUser?.name || 'Staff'}
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5 font-medium">
            {isOwnerOrAdmin 
              ? 'Complete Facility Management Suite • Queue, Doctors, Services, Pricing & Analytics'
              : 'Front Desk Operational Queue Counter • Call Next, Hold, Recall & Walk-in Registration'}
          </p>
        </div>

        {/* Action Controls & Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Subview Navigation Pills (Only in Clinic Admin / Owner mode!) */}
          {isOwnerOrAdmin ? (
            <div className="flex bg-[#F1F5F9] p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setActiveConsoleTab('QUEUE')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition ${
                  activeConsoleTab === 'QUEUE' ? 'bg-white text-[#1E293B] shadow-sm' : 'text-[#64748B] hover:text-[#1E293B]'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-[#0284C7]" />
                <span>Live Queue</span>
              </button>
              <button
                onClick={() => setActiveConsoleTab('DOCTORS')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition ${
                  activeConsoleTab === 'DOCTORS' ? 'bg-white text-[#1E293B] shadow-sm' : 'text-[#64748B] hover:text-[#1E293B]'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5 text-[#0284C7]" />
                <span>Doctors & Chambers</span>
              </button>
              <button
                onClick={() => setActiveConsoleTab('SERVICES')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition ${
                  activeConsoleTab === 'SERVICES' ? 'bg-white text-[#1E293B] shadow-sm' : 'text-[#64748B] hover:text-[#1E293B]'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-[#0284C7]" />
                <span>Services & Queues</span>
              </button>
              <button
                onClick={() => setActiveConsoleTab('RECEPTIONIST')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition ${
                  activeConsoleTab === 'RECEPTIONIST' ? 'bg-white text-[#1E293B] shadow-sm' : 'text-[#64748B] hover:text-[#1E293B]'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                <span>Receptionist Desk</span>
              </button>
              <button
                onClick={() => setActiveConsoleTab('ANALYTICS')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition ${
                  activeConsoleTab === 'ANALYTICS' ? 'bg-white text-[#1E293B] shadow-sm' : 'text-[#64748B] hover:text-[#1E293B]'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-[#0284C7]" />
                <span>Reports & Analytics</span>
              </button>
              <button
                onClick={() => setActiveConsoleTab('PRICING')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition ${
                  activeConsoleTab === 'PRICING' ? 'bg-white text-[#1E293B] shadow-sm' : 'text-[#64748B] hover:text-[#1E293B]'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>Pricing & TV QR</span>
              </button>
              <button
                onClick={() => setActiveConsoleTab('VOICE')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition ${
                  activeConsoleTab === 'VOICE' ? 'bg-white text-[#1E293B] shadow-sm' : 'text-[#64748B] hover:text-[#1E293B]'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5 text-sky-500" />
                <span>Voice Announcements</span>
              </button>
            </div>
          ) : (
            onOpenTVView && (
              <button
                onClick={onOpenTVView}
                className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl font-bold text-xs shadow-sm transition active:scale-95"
              >
                <Monitor className="w-3.5 h-3.5 text-sky-400" />
                <span>Open Waiting Room TV</span>
              </button>
            )
          )}

          {(activeConsoleTab === 'QUEUE' || !isOwnerOrAdmin) && (
            <button
              onClick={() => setShowWalkinModal(true)}
              className="flex items-center justify-center space-x-2 bg-[#0284C7] hover:bg-[#0369A1] text-white px-4 py-2 rounded-xl font-bold text-xs shadow-sm transition active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>New Walk-in Patient</span>
            </button>
          )}
        </div>
      </div>

      {/* Conditional Content by Active Tab */}
      {isOwnerOrAdmin && activeConsoleTab === 'VOICE' && (
        <VoiceAnnouncementConfig
          clinicId={clinicId}
          token={token}
          initialMode={((activeClinicObj as any)?.voiceAnnouncementMode as VoiceAnnouncementMode) || 'TOKEN_PATIENT_DOCTOR_ROOM'}
          onUpdated={(newMode) => {
            if (activeClinicObj) {
              (activeClinicObj as any).voiceAnnouncementMode = newMode;
            }
            setFeedbackMsg({ type: 'success', text: `Voice announcement mode updated to ${newMode}!` });
            setTimeout(() => setFeedbackMsg(null), 3000);
          }}
        />
      )}

      {isOwnerOrAdmin && activeConsoleTab === 'PRICING' && (
        <ClinicPricingConfig 
          clinicId={clinicId} 
          token={token} 
          initialInClinicPrice={(activeClinicObj as any)?.inClinicPrice || 200}
          initialRemotePrice={(activeClinicObj as any)?.remotePrice || 250}
          onUpdated={() => {
            setFeedbackMsg({ type: 'success', text: 'Clinic appointment pricing updated successfully!' });
            setTimeout(() => setFeedbackMsg(null), 3000);
          }}
        />
      )}

      {isOwnerOrAdmin && activeConsoleTab === 'DOCTORS' && (
        <DoctorManagement 
          clinicId={clinicId} 
          token={token} 
          onDoctorsUpdated={() => {
            fetch(`/api/clinics/${clinicId}/queues`, {
              headers: { 'Authorization': `Bearer ${token}` }
            })
              .then(r => r.json())
              .then(res => { if (res.success && res.data) setQueues(res.data); })
              .catch(console.error);
          }} 
        />
      )}

      {isOwnerOrAdmin && activeConsoleTab === 'SERVICES' && (
        <ServiceQueueManagement 
          clinicId={clinicId} 
          token={token} 
          onChanged={() => {
            fetch(`/api/clinics/${clinicId}/queues`, {
              headers: { 'Authorization': `Bearer ${token}` }
            })
              .then(r => r.json())
              .then(res => { if (res.success && res.data) setQueues(res.data); })
              .catch(console.error);
          }} 
        />
      )}

      {isOwnerOrAdmin && activeConsoleTab === 'RECEPTIONIST' && (
        <ReceptionistManagement 
          clinicId={clinicId} 
          clinicName={activeClinicObj?.name || currentUser?.clinicName || clinics.find(c => c.id === clinicId)?.name} 
          token={token} 
          currentUser={currentUser} 
        />
      )}

      {isOwnerOrAdmin && activeConsoleTab === 'ANALYTICS' && (
        <ClinicAnalytics 
          clinicId={clinicId} 
          token={token} 
          clinicName={activeClinicObj?.name || currentUser?.clinicName || clinics.find(c => c.id === clinicId)?.name} 
        />
      )}

      {(!isOwnerOrAdmin || activeConsoleTab === 'QUEUE') && (
        <>
          {/* Queue Selector Tabs */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
            {queues.length === 0 ? (
              <div className="text-xs text-[#64748B]">No active queues found in this clinic facility.</div>
            ) : (
              queues.map((q) => (
                <button
                  key={q.id}
                  onClick={() => setSelectedQueueId(q.id)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 shrink-0 border ${
                    selectedQueueId === q.id
                      ? 'bg-[#1E293B] border-[#1E293B] text-white shadow-sm'
                      : 'bg-white border-slate-200 text-[#334155] hover:bg-slate-50'
                  }`}
                >
                  <span>👨‍⚕️ {q.doctor?.name || q.name}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                    selectedQueueId === q.id ? 'bg-[#0F172A] text-slate-200' : 'bg-slate-100 text-[#64748B]'
                  }`}>
                    {q.doctor?.roomNumber || 'Room 1'}
                  </span>
                </button>
              ))
            )}
          </div>

          {/* Grid Layout: Serving Counter + Waiting & On-Hold Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 items-start">
            
            {/* Left Col: Primary Serving Chamber Card */}
            <div className="bg-white border-2 border-[#0284C7]/30 rounded-3xl p-6 shadow-md flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-xs font-black tracking-wider uppercase text-[#16A34A] flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
                    <span>ACTIVE CONSULTATION</span>
              </span>
              <span className="text-xs font-mono text-[#64748B] font-bold">
                {activeQueueObj?.doctor?.roomNumber || 'Room 101'}
              </span>
            </div>

            {/* Token Hero Section */}
            <div className="text-center py-6">
              {currentServing ? (
                <>
                  <div className="text-7xl font-black font-mono tracking-tight text-[#1E293B]">
                    {currentServing.tokenNumber}
                  </div>
                  <div className="mt-3.5 inline-flex items-center space-x-2 bg-emerald-50 border border-emerald-300/80 px-4 py-1.5 rounded-2xl shadow-xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-white border border-emerald-200 px-2 py-0.5 rounded-md">
                      Patient
                    </span>
                    <span className="text-lg font-black text-emerald-950">
                      {currentServing.patientName || 'Walk-in Patient'}
                    </span>
                  </div>
                  <div className="text-xs text-[#64748B] font-mono mt-1.5 font-semibold">
                    {currentServing.phoneNumber || 'Counter Token'}
                  </div>
                  <div className="mt-3.5 inline-flex items-center space-x-2 bg-[#E0F2FE] border border-[#0284C7]/20 text-[#0284C7] px-3.5 py-1 rounded-full text-xs font-bold">
                    <Activity className="w-3.5 h-3.5 animate-spin" />
                    <span>In Chamber Consultation</span>
                  </div>
                </>
              ) : (
                <div className="py-8">
                  <div className="text-slate-300 text-5xl mb-3">🛋️</div>
                  <div className="text-sm font-bold text-[#334155]">Doctor Chamber Idle</div>
                  <p className="text-xs text-[#64748B] mt-1">Press "Call Next Patient" to summon next in line</p>
                </div>
              )}
            </div>
          </div>

          {/* Action Control Buttons */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            {currentServing ? (
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => handleTransition(currentServing.id, 'COMPLETED')}
                  disabled={isSubmitting}
                  className="bg-[#16A34A] hover:bg-[#15803D] text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition active:scale-95 shadow-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Complete</span>
                </button>
                <button
                  onClick={() => setHoldingTokenId(currentServing.id)}
                  disabled={isSubmitting}
                  className="bg-[#D97706] hover:bg-[#B45309] text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition active:scale-95 shadow-sm"
                >
                  <PauseCircle className="w-4 h-4" />
                  <span>Put On Hold</span>
                </button>
                <button
                  onClick={() => handleTransition(currentServing.id, 'ON_HOLD', 'Not Present')}
                  disabled={isSubmitting}
                  className="bg-amber-50 hover:bg-amber-100 text-[#B45309] border border-amber-300 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-1 transition active:scale-95 shadow-sm"
                  title="Marks patient as not present and moves to On-Hold list"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>No-Show (Hold)</span>
                </button>
                <button
                  onClick={() => {
                    setTokenToCancel(currentServing);
                    setCancelReason('');
                    setCancelReasonError('');
                    setShowCancelModal(true);
                  }}
                  disabled={isSubmitting}
                  className="bg-rose-50 hover:bg-rose-100 text-[#DC2626] py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-1 transition border border-rose-200 active:scale-95 shadow-sm"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              </div>
            ) : null}

            <button
              onClick={handleCallNext}
              disabled={isSubmitting || waitingList.length === 0}
              className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center space-x-2 transition shadow-md active:scale-95 ${
                waitingList.length > 0
                  ? 'bg-[#0284C7] hover:bg-[#0369A1] text-white'
                  : 'bg-slate-100 text-[#94A3B8] cursor-not-allowed border border-slate-200'
              }`}
            >
              <PhoneCall className="w-5 h-5" />
              <span>
                {waitingList.length > 0 ? `Call Next Patient (${waitingList[0].tokenNumber})` : 'Queue Empty'}
              </span>
            </button>
          </div>
        </div>

        {/* Center Col: Waiting Queue List */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm flex flex-col justify-between h-full min-h-[480px]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-black tracking-wider uppercase text-[#1E293B] flex items-center space-x-2">
                <Users className="w-4 h-4 text-[#0284C7]" />
                <span>WAITING LIST ({waitingList.length})</span>
              </span>
              <span className="text-xs font-mono text-[#0284C7] bg-[#E0F2FE] px-2 py-0.5 rounded font-bold">
                Avg ~12m
              </span>
            </div>

            <div className="space-y-2.5 mt-4 max-h-[380px] overflow-y-auto pr-1">
              {waitingList.length === 0 ? (
                <div className="text-center py-12 text-[#94A3B8] text-xs">
                  No patients waiting in this queue.
                </div>
              ) : (
                waitingList.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 bg-[#F8FAFC] border border-slate-200/80 rounded-2xl flex items-center justify-between transition hover:border-[#0284C7]/40"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="w-7 h-7 rounded-xl bg-slate-200 text-[#334155] flex items-center justify-center font-bold text-xs font-mono">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-[#1E293B] text-sm font-mono">{item.tokenNumber}</span>
                          <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200">
                            Patient
                          </span>
                        </div>
                        <div className="text-xs text-[#1E293B] font-bold mt-0.5">{item.patientName || 'Walk-in Patient'}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-[#0284C7] flex items-center justify-end space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>~{(idx + 1) * 12}m</span>
                      </div>
                      <div className="text-[10px] text-[#94A3B8] font-mono">{item.phoneNumber}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="text-center text-[11px] text-[#94A3B8] pt-3 border-t border-slate-100 font-medium">
            Waiting times updated dynamically
          </div>
        </div>

        {/* Right Col: On-Hold & Completed Lists */}
        <div className="space-y-6">
          {/* On Hold Patients Card */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <span className="text-xs font-black tracking-wider uppercase text-[#D97706] flex items-center space-x-2">
                <PauseCircle className="w-4 h-4 text-[#D97706]" />
                <span>ON HOLD ({onHoldList.length})</span>
              </span>
            </div>

            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {onHoldList.length === 0 ? (
                <div className="text-center py-6 text-[#94A3B8] text-xs">No tokens on hold</div>
              ) : (
                onHoldList.map((h) => (
                  <div
                    key={h.id}
                    className="p-3 bg-[#FEF3C7]/40 border border-[#D97706]/30 rounded-2xl flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs font-mono text-[#1E293B]">{h.tokenNumber}</span>
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
                          Patient
                        </span>
                        <span className="text-xs font-bold text-[#1E293B]">{h.patientName || 'Walk-in Patient'}</span>
                      </div>
                      <div className="text-[11px] text-[#B45309] font-medium mt-0.5">
                        <span className="font-semibold">Reason:</span> {h.holdReason || 'Not Present'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleTransition(h.id, 'WAITING')}
                      className="bg-[#D97706] hover:bg-[#B45309] text-white px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 shadow-sm"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>Resume</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recently Completed Patients Card */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <span className="text-xs font-black tracking-wider uppercase text-[#16A34A] flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-[#16A34A]" />
                <span>RECENTLY SERVED ({completedList.length})</span>
              </span>
            </div>

            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {completedList.length === 0 ? (
                <div className="text-center py-6 text-[#94A3B8] text-xs">No consultations completed yet today</div>
              ) : (
                completedList.slice(0, 5).map((c) => (
                  <div
                    key={c.id}
                    className="p-2.5 bg-[#F8FAFC] border border-slate-200/80 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="font-bold font-mono text-[#1E293B]">{c.tokenNumber}</span>
                      <span className="text-slate-300">&bull;</span>
                      <span className="text-[#1E293B] font-semibold">{c.patientName || 'Walk-in Patient'}</span>
                    </div>
                    <span className="text-[10px] font-bold text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded-full">
                      COMPLETED
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
      </>
      )}

      {/* New Walk-in Patient Modal */}
      {showWalkinModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
            <h3 className="text-lg font-black text-[#1E293B] mb-1">Issue Walk-in Token</h3>
            <p className="text-xs text-[#64748B] mb-5">
              Instantly register counter walk-in into active queue.
            </p>

            <form onSubmit={handleRegisterWalkin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Target Department / Queue</label>
                <select
                  value={selectedQueueId}
                  onChange={(e) => setSelectedQueueId(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-[#1E293B] font-semibold focus:outline-none focus:border-[#0284C7] focus:bg-white"
                >
                  {queues.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.name} ({q.doctor?.name || 'Assigned Doctor'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Patient Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patel"
                  value={walkinName}
                  onChange={(e) => setWalkinName(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-[#1E293B] font-semibold focus:outline-none focus:border-[#0284C7] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Mobile Phone (10 Digits)</label>
                <div className="flex space-x-2">
                  <div className="bg-slate-100 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1E293B] select-none flex items-center justify-center shrink-0">
                    +91
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    required
                    maxLength={10}
                    placeholder="9876543210"
                    value={walkinPhone10}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setWalkinPhone10(digits);
                    }}
                    className="flex-1 bg-[#F8FAFC] border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-[#1E293B] font-mono font-semibold focus:outline-none focus:border-[#0284C7] focus:bg-white"
                  />
                </div>
                <p className="text-[10px] text-[#64748B] mt-1">10 digits only, no spaces or country code.</p>
              </div>

              <div className="pt-2 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowWalkinModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-[#334155] py-2.5 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-[#0284C7] hover:bg-[#0369A1] text-white py-2.5 rounded-xl text-xs font-bold transition shadow-sm"
                >
                  {isSubmitting ? 'Issuing...' : 'Generate Token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Put on Hold Reason Dialog */}
      {holdingTokenId && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-black text-[#1E293B] mb-1">Place Token On Hold</h3>
            <p className="text-xs text-[#64748B] mb-4">Select or type reason for holding patient:</p>

            <input
              type="text"
              value={holdReason}
              onChange={(e) => setHoldReason(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-slate-300 rounded-xl px-3 py-2 text-xs text-[#1E293B] font-semibold mb-4 focus:outline-none focus:border-[#0284C7]"
            />

            <div className="flex space-x-2">
              <button
                onClick={() => setHoldingTokenId(null)}
                className="flex-1 bg-slate-100 text-[#334155] py-2 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleTransition(holdingTokenId, 'ON_HOLD', holdReason)}
                className="flex-1 bg-[#D97706] hover:bg-[#B45309] text-white py-2 rounded-xl text-xs font-bold shadow-sm"
              >
                Confirm Hold
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Patient Warning Confirmation Modal */}
      {showCancelModal && tokenToCancel && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-rose-200 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-[#DC2626] flex items-center justify-center mx-auto mb-4 border border-rose-200">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-[#1E293B] mb-1.5">Cancel Patient Appointment?</h3>
            <p className="text-xs text-[#64748B] mb-5 leading-relaxed">
              Do you want to cancel this patient appointment?
            </p>
            <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-3.5 mb-4 text-xs text-left">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-[#1E293B] text-base font-mono">{tokenToCancel.tokenNumber}</span>
                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  Active Token
                </span>
              </div>
              <div className="text-[#334155] font-semibold mt-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase mr-1">Patient:</span>
                {tokenToCancel.patientName || 'Walk-in Patient'}
              </div>
              {tokenToCancel.phoneNumber && (
                <div className="text-[11px] text-[#64748B] font-mono mt-0.5">{tokenToCancel.phoneNumber}</div>
              )}
            </div>

            {/* Required Cancellation Reason Input Field */}
            <div className="text-left mb-5">
              <label className="block text-xs font-bold text-[#334155] mb-1">
                Cancellation Reason <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Left clinic / Patient requested / Emergency"
                value={cancelReason}
                onChange={(e) => {
                  setCancelReason(e.target.value);
                  if (cancelReasonError) setCancelReasonError('');
                }}
                className={`w-full bg-[#F8FAFC] border rounded-xl px-3.5 py-2.5 text-xs text-[#1E293B] font-semibold focus:outline-none focus:bg-white transition ${
                  cancelReasonError ? 'border-rose-500 focus:border-rose-600' : 'border-slate-300 focus:border-[#DC2626]'
                }`}
              />
              {cancelReasonError && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1.5 flex items-center space-x-1">
                  <span>⚠️</span>
                  <span>{cancelReasonError}</span>
                </p>
              )}
            </div>

            <div className="flex space-x-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowCancelModal(false);
                  setTokenToCancel(null);
                  setCancelReason('');
                  setCancelReasonError('');
                }}
                disabled={isSubmitting}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-[#334155] py-2.5 rounded-xl text-xs font-bold transition"
              >
                No, Keep Patient
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!cancelReason.trim()) {
                    setCancelReasonError('Cancellation reason is required.');
                    return;
                  }
                  await handleTransition(tokenToCancel.id, 'CANCELLED', cancelReason.trim());
                  setShowCancelModal(false);
                  setTokenToCancel(null);
                  setCancelReason('');
                  setCancelReasonError('');
                }}
                disabled={isSubmitting}
                className="flex-1 bg-[#DC2626] hover:bg-red-700 text-white py-2.5 rounded-xl text-xs font-bold transition shadow-sm"
              >
                {isSubmitting ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
