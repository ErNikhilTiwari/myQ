import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Globe, 
  CheckCircle, 
  AlertCircle, 
  QrCode, 
  ShieldCheck, 
  Edit3, 
  X, 
  Save,
  Clock,
  Zap
} from 'lucide-react';

interface ClinicPricingConfigProps {
  clinicId: string;
  token: string | null;
  initialInClinicPrice?: number;
  initialRemotePrice?: number;
  initialEnableBookingTime?: boolean;
  onUpdated?: () => void;
}

export const ClinicPricingConfig: React.FC<ClinicPricingConfigProps> = ({
  clinicId,
  token,
  initialInClinicPrice = 200,
  initialRemotePrice = 250,
  initialEnableBookingTime = true,
  onUpdated,
}) => {
  const [inClinicPrice, setInClinicPrice] = useState<number>(initialInClinicPrice);
  const [remotePrice, setRemotePrice] = useState<number>(initialRemotePrice);
  const [enableBookingTime, setEnableBookingTime] = useState<boolean>(initialEnableBookingTime);
  const [isTogglingBookingTime, setIsTogglingBookingTime] = useState(false);

  // Target modal state: only 'IN_CLINIC' or 'REMOTE' at a time
  const [editingTarget, setEditingTarget] = useState<'IN_CLINIC' | 'REMOTE' | null>(null);
  const [tempPrice, setTempPrice] = useState<number>(200);

  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setInClinicPrice(initialInClinicPrice);
  }, [initialInClinicPrice]);

  useEffect(() => {
    setRemotePrice(initialRemotePrice);
  }, [initialRemotePrice]);

  useEffect(() => {
    setEnableBookingTime(initialEnableBookingTime);
  }, [initialEnableBookingTime]);

  const handleToggleBookingTime = async () => {
    if (!clinicId || !token) return;
    setIsTogglingBookingTime(true);
    const newSetting = !enableBookingTime;
    try {
      const res = await fetch(`/api/clinics/${clinicId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ enableBookingTime: newSetting }),
      });
      const json = await res.json();
      if (json.success) {
        setEnableBookingTime(newSetting);
        setMessage({
          type: 'success',
          text: newSetting 
            ? 'Booking time slots enabled! Patients can choose appointment time slots.' 
            : 'Booking time slots turned OFF! Patients will book for now (instant queue only).',
        });
        if (onUpdated) onUpdated();
        setTimeout(() => setMessage(null), 4000);
      } else {
        setMessage({ type: 'error', text: json.error?.message || 'Failed to update booking mode.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error updating booking mode.' });
    } finally {
      setIsTogglingBookingTime(false);
    }
  };

  const openModal = (target: 'IN_CLINIC' | 'REMOTE') => {
    setEditingTarget(target);
    setTempPrice(target === 'IN_CLINIC' ? inClinicPrice : remotePrice);
    setModalError(null);
  };

  const closeModal = () => {
    setEditingTarget(null);
    setModalError(null);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicId || !token || !editingTarget) return;

    if (!tempPrice || tempPrice <= 0) {
      setModalError('Price fee must be a positive amount greater than ₹0.');
      return;
    }

    setIsSaving(true);
    setModalError(null);

    const payload = editingTarget === 'IN_CLINIC'
      ? { inClinicPrice: Number(tempPrice) }
      : { remotePrice: Number(tempPrice) };

    try {
      const res = await fetch(`/api/clinics/${clinicId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        if (editingTarget === 'IN_CLINIC') {
          setInClinicPrice(Number(tempPrice));
          setMessage({ type: 'success', text: `In-clinic walk-in price updated to ₹${tempPrice}!` });
        } else {
          setRemotePrice(Number(tempPrice));
          setMessage({ type: 'success', text: `Remote booking price updated to ₹${tempPrice}!` });
        }
        closeModal();
        if (onUpdated) onUpdated();
        setTimeout(() => setMessage(null), 3500);
      } else {
        setModalError(json.error?.message || json.message || 'Failed to update price.');
      }
    } catch (err: any) {
      setModalError(err.message || 'Network communication error.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      {/* Compact Header (No extra button) */}
      <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
        <div className="w-8 h-8 rounded-xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shrink-0">
          <DollarSign className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-extrabold text-sm text-[#1E293B]">Appointment Pricing</h3>
          <p className="text-[11px] text-[#64748B]">
            Configure rates for walk-in TV QR code scans and remote home bookings.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`p-3 rounded-xl text-xs font-bold flex items-center space-x-2 ${
            message.type === 'success'
              ? 'bg-[#DCFCE7] text-[#16A34A] border border-[#16A34A]/30'
              : 'bg-red-50 text-red-600 border border-red-200'
          }`}
        >
          {message.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Pricing Cards Grid (Compact & Greyed Out with Individual Change Price Button) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tier 1: In-Clinic TV QR Price */}
        <div className="bg-[#F8FAFC] border border-emerald-500/20 rounded-xl p-4 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center space-x-1">
                <QrCode className="w-3 h-3" />
                <span>In-Clinic TV QR</span>
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-white border border-emerald-200 px-1.5 py-0.5 rounded-full">
                Walk-in
              </span>
            </div>

            <p className="text-[11px] text-[#64748B] leading-relaxed mb-3">
              Discounted rate when patients scan the rotating QR code on the clinic's TV screen.
            </p>

            <div>
              <label className="text-[11px] font-bold text-slate-500 block mb-1">
                Current Fee (₹)
              </label>
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="text"
                    value={inClinicPrice}
                    disabled
                    readOnly
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl pl-7 pr-3 py-1.5 text-sm font-black font-mono text-slate-400 cursor-not-allowed select-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => openModal('IN_CLINIC')}
                  className="flex items-center space-x-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition active:scale-95 shrink-0"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Change Price</span>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/60 text-[10px] text-emerald-700 flex items-center space-x-1 font-medium">
            <ShieldCheck className="w-3 h-3 shrink-0" />
            <span>Validates cryptographic timestamp on TV screen</span>
          </div>
        </div>

        {/* Tier 2: Remote Booking Price */}
        <div className="bg-[#F8FAFC] border border-[#0284C7]/20 rounded-xl p-4 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#0284C7] bg-[#E0F2FE] px-2 py-0.5 rounded-md flex items-center space-x-1">
                <Globe className="w-3 h-3" />
                <span>Remote Online</span>
              </span>
              <span className="text-[10px] font-bold text-[#0284C7] bg-white border border-[#0284C7]/30 px-1.5 py-0.5 rounded-full">
                Online / Home
              </span>
            </div>

            <p className="text-[11px] text-[#64748B] leading-relaxed mb-3">
              Standard rate applied when patients book doctor appointments from home via portal.
            </p>

            <div>
              <label className="text-[11px] font-bold text-slate-500 block mb-1">
                Current Fee (₹)
              </label>
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="text"
                    value={remotePrice}
                    disabled
                    readOnly
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl pl-7 pr-3 py-1.5 text-sm font-black font-mono text-slate-400 cursor-not-allowed select-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => openModal('REMOTE')}
                  className="flex items-center space-x-1.5 text-xs font-bold text-[#0284C7] bg-[#E0F2FE] hover:bg-[#BAE6FD] border border-[#0284C7]/30 px-3 py-1.5 rounded-xl transition active:scale-95 shrink-0"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Change Price</span>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/60 text-[10px] text-[#0284C7] flex items-center space-x-1 font-medium">
            <CheckCircle className="w-3 h-3 shrink-0" />
            <span>Enforced strictly on server-side order calculation</span>
          </div>
        </div>
      </div>

      {/* Booking Time & Priority Queue Mode Settings */}
      <div className="bg-[#F8FAFC] border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl ${
              enableBookingTime 
                ? 'bg-sky-100 text-[#0284C7]' 
                : 'bg-amber-100 text-amber-700'
            }`}>
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="font-extrabold text-sm text-[#1E293B]">
                  Clinic Booking Time Slots
                </h4>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  enableBookingTime
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}>
                  {enableBookingTime ? 'Time Slots Enabled' : 'Turned OFF (Book For Now)'}
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                {enableBookingTime
                  ? 'Patients can select specific dates and consultation time slots (09:30 AM, etc.).'
                  : 'Time slots are turned off. Patients book for now/today, and can join the queue right away with the ₹50 option.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleBookingTime}
            disabled={isTogglingBookingTime}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 shadow-xs active:scale-95 disabled:opacity-60 shrink-0 ${
              enableBookingTime
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>
              {isTogglingBookingTime
                ? 'Saving...'
                : enableBookingTime
                ? 'Turn OFF Booking Time'
                : 'Turn ON Booking Time'}
            </span>
          </button>
        </div>

        {/* Priority Pass Explainer Card */}
        <div className="bg-white border border-amber-200/80 rounded-xl p-3.5 flex items-start space-x-3 text-xs">
          <div className="p-1.5 bg-amber-50 rounded-lg text-amber-600 shrink-0 mt-0.5">
            <Zap className="w-4 h-4 fill-amber-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="font-black text-amber-900">
                Instant Queue Right Away Pass (+₹50 Extra)
              </span>
              <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                Automatic Feature
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
              When booking time is turned OFF, patients cannot book at a specified time—they register for today. Patients who choose the <b>+₹50 option join the doctor\'s live queue right away</b> with an active priority token (<span className="font-mono font-bold text-amber-700">P01, P02...</span>).
            </p>
          </div>
        </div>
      </div>

      {/* TARGETED POPUP MODAL: Updates ONLY the selected price */}
      {editingTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-4">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  editingTarget === 'IN_CLINIC'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-[#E0F2FE] text-[#0284C7]'
                }`}>
                  {editingTarget === 'IN_CLINIC' ? (
                    <QrCode className="w-4 h-4" />
                  ) : (
                    <Globe className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-[#1E293B]">
                    {editingTarget === 'IN_CLINIC' ? 'Change In-Clinic Walk-in Fee' : 'Change Remote Booking Fee'}
                  </h4>
                  <p className="text-[11px] text-[#64748B]">
                    {editingTarget === 'IN_CLINIC'
                      ? 'Discounted TV QR code scanning price'
                      : 'Home & mobile portal booking price'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Message */}
            {modalError && (
              <div className="p-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold flex items-center space-x-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Single Price Input Form */}
            <form onSubmit={handleSaveModal} className="space-y-3">
              <div className={`border rounded-xl p-3.5 space-y-1.5 ${
                editingTarget === 'IN_CLINIC'
                  ? 'bg-emerald-50/60 border-emerald-200/80'
                  : 'bg-sky-50/60 border-sky-200/80'
              }`}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    New Fee Amount (₹)
                  </label>
                  <span className="text-[10px] font-mono font-bold text-slate-500 bg-white/80 border border-slate-200 px-1.5 py-0.5 rounded">
                    Current: ₹{editingTarget === 'IN_CLINIC' ? inClinicPrice : remotePrice}
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={tempPrice}
                    onChange={(e) => setTempPrice(Number(e.target.value))}
                    autoFocus
                    className="w-full bg-white border border-slate-300 rounded-xl pl-7 pr-3 py-2 text-sm font-black font-mono text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className={`flex items-center space-x-1.5 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-sm transition active:scale-95 disabled:opacity-50 ${
                    editingTarget === 'IN_CLINIC'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-[#0284C7] hover:bg-[#0369A1]'
                  }`}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Updating...' : 'Save Price'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
