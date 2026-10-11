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
  LogIn
} from 'lucide-react';

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
  onSelectClinicId: (id: string) => void;
  clinics: ClinicOption[];
}

export const ReceptionistConsole: React.FC<ReceptionistConsoleProps> = ({
  token,
  currentUser,
  onOpenLogin,
  selectedClinicId,
  onSelectClinicId,
  clinics,
}) => {
  const [queues, setQueues] = useState<QueueSummary[]>([]);
  const [selectedQueueId, setSelectedQueueId] = useState<string>('');
  
  // Active queue state
  const [currentServing, setCurrentServing] = useState<QueueItem | null>(null);
  const [waitingList, setWaitingList] = useState<QueueItem[]>([]);
  const [onHoldList, setOnHoldList] = useState<QueueItem[]>([]);
  const [completedList, setCompletedList] = useState<QueueItem[]>([]);
  
  // Registration Form Modal
  const [showWalkinModal, setShowWalkinModal] = useState(false);
  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('+91');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Hold reason modal state
  const [holdingTokenId, setHoldingTokenId] = useState<string | null>(null);
  const [holdReasonInput, setHoldReasonInput] = useState('Waiting for lab test results');

  // Load Queues for currently selected clinic
  useEffect(() => {
    if (!selectedClinicId) return;

    fetch(`/api/clinics/${selectedClinicId}/queues`)
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
  }, [selectedClinicId]);

  // Poll active queue details every 2.5s
  useEffect(() => {
    if (!selectedClinicId || !selectedQueueId) return;

    const fetchQueueDetails = () => {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      fetch(`/api/clinics/${selectedClinicId}/queues/${selectedQueueId}`, { headers })
        .then((res) => res.json())
        .then((res) => {
          if (res.success && res.data) {
            const data = res.data;
            setCurrentServing(data.currentServing || null);
            setWaitingList(data.waiting || []);
            setOnHoldList(data.onHold || []);
            setCompletedList(data.completed || []);
          }
        })
        .catch(() => {});
    };

    fetchQueueDetails();
    const interval = setInterval(fetchQueueDetails, 2500);
    return () => clearInterval(interval);
  }, [selectedClinicId, selectedQueueId, token]);

  // Receptionist Action: Call Next
  const handleCallNext = async () => {
    if (!token) {
      onOpenLogin();
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/clinics/${selectedClinicId}/queues/${selectedQueueId}/next`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', `Called Token ${data.data?.tokenNumber || 'Next'}`);
      } else {
        showToast('error', data.error?.message || 'Failed to call next token');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error executing action');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Transition Token Status (COMPLETED, ON_HOLD, NO_SHOW, CANCELLED)
  const handleTransition = async (entryId: string, toStatus: string, reason?: string) => {
    if (!token) {
      onOpenLogin();
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/clinics/${selectedClinicId}/queues/entries/${entryId}/transition`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ toStatus, reason }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', `Token marked as ${toStatus}`);
        setHoldingTokenId(null);
      } else {
        showToast('error', data.error?.message || `Failed to transition to ${toStatus}`);
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error transitioning token');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Walk-in Registration
  const handleRegisterWalkin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      onOpenLogin();
      return;
    }

    if (!walkinName.trim() || !walkinPhone.trim()) {
      showToast('error', 'Please enter valid patient name and phone number');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/clinics/${selectedClinicId}/receptionist/walkin`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          queueId: selectedQueueId,
          name: walkinName,
          phoneNumber: walkinPhone,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', `Walk-in token ${data.data.tokenNumber} issued successfully!`);
        setWalkinName('');
        setWalkinPhone('+91');
        setShowWalkinModal(false);
      } else {
        showToast('error', data.error?.message || 'Failed to register walk-in');
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

  const activeClinicObj = clinics.find((c) => c.id === selectedClinicId);
  const activeQueueObj = queues.find((q) => q.id === selectedQueueId);

  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-slate-100 p-4 md:p-6 overflow-y-auto">
      {/* Toast Notification */}
      {feedbackMsg && (
        <div
          className={`fixed top-16 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 text-sm font-semibold transition animate-bounce ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-600 text-white border border-emerald-400'
              : 'bg-rose-600 text-white border border-rose-400'
          }`}
        >
          {feedbackMsg.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 mb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-black text-white tracking-tight">
              {activeClinicObj?.name || 'Clinic Desk'}
            </h1>
            <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/30">
              Receptionist Desk
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Live Queue Management & Patient Counter Operations</p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          {/* Multi-Tenant Clinic Switcher Dropdown */}
          <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <select
              value={selectedClinicId}
              onChange={(e) => onSelectClinicId(e.target.value)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
            >
              {clinics.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              if (!token) onOpenLogin();
              else setShowWalkinModal(true);
            }}
            className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg transition active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>New Walk-in Patient</span>
          </button>
        </div>
      </div>

      {/* Auth Banner if not signed in */}
      {!token && (
        <div className="mb-6 bg-amber-950/40 border border-amber-800/60 p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Lock className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-amber-300">Staff Authentication Required</div>
              <div className="text-[11px] text-slate-400">
                You are currently viewing in read-only guest mode. Log in as a receptionist to call tokens and issue walk-ins.
              </div>
            </div>
          </div>
          <button
            onClick={onOpenLogin}
            className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shrink-0"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Staff Login (1-Click)</span>
          </button>
        </div>
      )}

      {/* Queue Selector Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
        {queues.length === 0 ? (
          <div className="text-xs text-slate-500">No queues configured in this clinic.</div>
        ) : (
          queues.map((q) => (
            <button
              key={q.id}
              onClick={() => setSelectedQueueId(q.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 shrink-0 border ${
                selectedQueueId === q.id
                  ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-950/40'
                  : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span>👨‍⚕️ {q.doctor?.name || q.name}</span>
              <span className="bg-slate-900/60 px-2 py-0.5 rounded text-[10px] font-mono">
                {q.doctor?.roomNumber || 'Room 1'}
              </span>
            </button>
          ))
        )}
      </div>

      {/* Grid Layout: Serving Counter + Waiting & On-Hold Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 items-start">
        
        {/* Left Col: Primary Serving Chamber Card */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 shadow-xl flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
              <span className="text-xs font-black tracking-wider uppercase text-emerald-400 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>ACTIVE CONSULTATION</span>
              </span>
              <span className="text-xs font-mono text-slate-400">
                {activeQueueObj?.doctor?.roomNumber || 'Room 101'}
              </span>
            </div>

            {/* Token Hero Section */}
            <div className="text-center py-8">
              {currentServing ? (
                <>
                  <div className="text-7xl font-black font-mono tracking-tight text-white drop-shadow-md">
                    {currentServing.tokenNumber}
                  </div>
                  <div className="mt-3 text-lg font-bold text-slate-200">
                    {currentServing.patientName || 'Walk-in Patient'}
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-1">
                    {currentServing.phoneNumber || 'Counter Token'}
                  </div>
                  <div className="mt-4 inline-flex items-center space-x-2 bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 px-3 py-1 rounded-full text-xs font-semibold">
                    <Activity className="w-3.5 h-3.5 animate-spin" />
                    <span>In Chamber Consultation</span>
                  </div>
                </>
              ) : (
                <div className="py-8">
                  <div className="text-slate-600 text-5xl mb-3">🛋️</div>
                  <div className="text-sm font-bold text-slate-400">Doctor Chamber Idle</div>
                  <p className="text-xs text-slate-500 mt-1">Press "Call Next Patient" to summon next in line</p>
                </div>
              )}
            </div>
          </div>

          {/* Action Control Buttons */}
          <div className="space-y-3 pt-4 border-t border-slate-700/60">
            {currentServing ? (
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => handleTransition(currentServing.id, 'COMPLETED')}
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition active:scale-95 shadow-lg shadow-emerald-950/30"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Complete</span>
                </button>
                <button
                  onClick={() => setHoldingTokenId(currentServing.id)}
                  disabled={isSubmitting}
                  className="bg-amber-600 hover:bg-amber-500 text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition active:scale-95 shadow-lg shadow-amber-950/30"
                >
                  <PauseCircle className="w-4 h-4" />
                  <span>Put On Hold</span>
                </button>
                <button
                  onClick={() => handleTransition(currentServing.id, 'NO_SHOW')}
                  disabled={isSubmitting}
                  className="bg-rose-600/80 hover:bg-rose-600 text-white py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center space-x-1.5 transition active:scale-95 col-span-2"
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>Mark No-Show / Absent</span>
                </button>
              </div>
            ) : null}

            <button
              onClick={handleCallNext}
              disabled={isSubmitting || waitingList.length === 0}
              className={`w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center space-x-2 transition active:scale-95 shadow-xl ${
                waitingList.length > 0
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-950/40 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed'
              }`}
            >
              <PhoneCall className="w-4 h-4" />
              <span>CALL NEXT PATIENT ({waitingList.length})</span>
            </button>
          </div>
        </div>

        {/* Center Col: Next Waiting Queue */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-3xl p-6 shadow-xl flex flex-col h-full">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700/60 mb-4">
            <span className="text-xs font-black tracking-wider uppercase text-slate-300 flex items-center space-x-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Waiting List ({waitingList.length})</span>
            </span>
            <span className="text-[11px] text-slate-400">FIFO Sequence</span>
          </div>

          <div className="space-y-2.5 overflow-y-auto flex-1 max-h-[460px] pr-1">
            {waitingList.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No patients currently waiting in this queue.
              </div>
            ) : (
              waitingList.map((token, idx) => (
                <div
                  key={token.id}
                  className="bg-slate-900/80 border border-slate-700/50 hover:border-slate-600 p-3 rounded-2xl flex items-center justify-between transition"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-mono font-bold text-slate-500 w-5">#{idx + 1}</span>
                    <div>
                      <div className="text-lg font-black font-mono text-white leading-tight">
                        {token.tokenNumber}
                      </div>
                      <div className="text-xs text-slate-300">{token.patientName || 'Walk-in'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/40">
                      ~{(idx + 1) * 12} min
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">{token.phoneNumber}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Col: On-Hold Queue (ADR-006) */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-3xl p-6 shadow-xl flex flex-col h-full">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700/60 mb-4">
            <span className="text-xs font-black tracking-wider uppercase text-amber-400 flex items-center space-x-2">
              <PauseCircle className="w-4 h-4" />
              <span>On-Hold Queue ({onHoldList.length})</span>
            </span>
            <span className="text-[11px] text-slate-400">Recall Capable</span>
          </div>

          <div className="space-y-2.5 overflow-y-auto flex-1 max-h-[460px] pr-1">
            {onHoldList.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No patients currently on hold.
              </div>
            ) : (
              onHoldList.map((token) => (
                <div
                  key={token.id}
                  className="bg-amber-950/20 border border-amber-900/40 p-3.5 rounded-2xl flex items-center justify-between transition"
                >
                  <div>
                    <div className="text-lg font-black font-mono text-amber-300">
                      {token.tokenNumber}
                    </div>
                    <div className="text-xs text-slate-200 font-medium">
                      {token.patientName || 'Patient'}
                    </div>
                    <div className="text-[11px] text-amber-400/80 mt-1 italic">
                      💬 {token.holdReason || 'Awaiting doctor / lab'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleTransition(token.id, 'WAITING')}
                    disabled={isSubmitting}
                    className="bg-amber-500/20 hover:bg-amber-500/40 border border-amber-500/40 text-amber-300 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Recall</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: Walk-In Registration Modal */}
      {showWalkinModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-700">
              <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                <span>Register Walk-In Patient</span>
              </h3>
              <button
                onClick={() => setShowWalkinModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterWalkin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Clinic & Doctor</label>
                <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-xs font-bold text-emerald-400">
                  {activeClinicObj?.name} &bull; {activeQueueObj?.doctor?.name || 'General OPD'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Patient Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={walkinName}
                  onChange={(e) => setWalkinName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number (WhatsApp)</label>
                <input
                  type="text"
                  required
                  placeholder="+919876543210"
                  value={walkinPhone}
                  onChange={(e) => setWalkinPhone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowWalkinModal(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 py-2.5 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-950/40"
                >
                  {isSubmitting ? 'Issuing...' : 'Issue Token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Put On Hold Reason Modal */}
      {holdingTokenId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-extrabold text-white mb-2 flex items-center space-x-2">
              <PauseCircle className="w-5 h-5 text-amber-400" />
              <span>Put Patient On Hold</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter the reason why this token is being paused:
            </p>

            <input
              type="text"
              value={holdReasonInput}
              onChange={(e) => setHoldReasonInput(e.target.value)}
              placeholder="e.g. Awaiting blood test report"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white mb-4 focus:outline-none focus:border-amber-500"
            />

            <div className="flex space-x-2">
              <button
                onClick={() => setHoldingTokenId(null)}
                className="flex-1 bg-slate-700 text-slate-300 py-2 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleTransition(holdingTokenId, 'ON_HOLD', holdReasonInput)}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white py-2 rounded-xl text-xs font-bold"
              >
                Confirm Hold
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
