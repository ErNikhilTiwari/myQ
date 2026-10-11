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
  Save 
} from 'lucide-react';

interface ClinicPricingConfigProps {
  clinicId: string;
  token: string | null;
  initialInClinicPrice?: number;
  initialRemotePrice?: number;
  onUpdated?: () => void;
}

export const ClinicPricingConfig: React.FC<ClinicPricingConfigProps> = ({
  clinicId,
  token,
  initialInClinicPrice = 200,
  initialRemotePrice = 250,
  onUpdated,
}) => {
  const [inClinicPrice, setInClinicPrice] = useState<number>(initialInClinicPrice);
  const [remotePrice, setRemotePrice] = useState<number>(initialRemotePrice);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editInClinicPrice, setEditInClinicPrice] = useState<number>(initialInClinicPrice);
  const [editRemotePrice, setEditRemotePrice] = useState<number>(initialRemotePrice);

  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setInClinicPrice(initialInClinicPrice);
  }, [initialInClinicPrice]);

  useEffect(() => {
    setRemotePrice(initialRemotePrice);
  }, [initialRemotePrice]);

  const openEditModal = () => {
    setEditInClinicPrice(inClinicPrice);
    setEditRemotePrice(remotePrice);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicId || !token) return;

    if (editInClinicPrice <= 0 || editRemotePrice <= 0) {
      setModalError('Pricing fees must be positive values greater than ₹0.');
      return;
    }

    setIsSaving(true);
    setModalError(null);

    try {
      const res = await fetch(`/api/clinics/${clinicId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          inClinicPrice: Number(editInClinicPrice),
          remotePrice: Number(editRemotePrice),
        }),
      });

      const json = await res.json();
      if (json.success) {
        setInClinicPrice(Number(editInClinicPrice));
        setRemotePrice(Number(editRemotePrice));
        setMessage({ type: 'success', text: 'Clinic appointment pricing updated successfully!' });
        setIsModalOpen(false);
        if (onUpdated) onUpdated();
        setTimeout(() => setMessage(null), 4000);
      } else {
        setModalError(json.error?.message || json.message || 'Failed to update pricing.');
      }
    } catch (err: any) {
      setModalError(err.message || 'Network communication error.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2.5">
            <DollarSign className="w-5 h-5 text-[#0284C7]" />
            <h3 className="font-extrabold text-base text-[#1E293B]">Appointment Pricing & Fee Configuration</h3>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Set tier pricing for patients scanning in-clinic TV screen QR codes versus booking remotely from home.
          </p>
        </div>

        <button
          type="button"
          onClick={openEditModal}
          className="flex items-center space-x-2 bg-[#0284C7] hover:bg-[#0369A1] text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition active:scale-95 shrink-0"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Change Price</span>
        </button>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center space-x-2 ${
            message.type === 'success'
              ? 'bg-[#DCFCE7] text-[#16A34A] border border-[#16A34A]/30'
              : 'bg-red-50 text-red-600 border border-red-200'
          }`}
        >
          {message.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Pricing Cards Grid (Prices Greyed Out with Change Action) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tier 1: In-Clinic TV QR Price */}
        <div className="bg-[#F8FAFC] border-2 border-emerald-500/20 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg flex items-center space-x-1.5">
                <QrCode className="w-3.5 h-3.5" />
                <span>1. In-Clinic QR Booking</span>
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-white border border-emerald-200 px-2 py-0.5 rounded-full">
                Active Fee
              </span>
            </div>

            <p className="text-xs text-[#64748B] leading-relaxed mb-4">
              Discounted walk-in rate applied when a patient scans the live rotating cryptographic QR code on the clinic's waiting room TV screen.
            </p>

            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1.5">
                Current In-Clinic Fee (₹)
              </label>
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="text"
                    value={inClinicPrice}
                    disabled
                    readOnly
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl pl-8 pr-3.5 py-2.5 text-sm font-black font-mono text-slate-400 cursor-not-allowed select-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={openEditModal}
                  className="flex items-center space-x-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3.5 py-2.5 rounded-xl transition active:scale-95 shrink-0"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Change</span>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200/80 text-[11px] text-emerald-700 flex items-center space-x-1.5 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Validates rotating cryptographic timestamp on TV screen</span>
          </div>
        </div>

        {/* Tier 2: Remote Booking Price */}
        <div className="bg-[#F8FAFC] border-2 border-[#0284C7]/20 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-[#0284C7] bg-[#E0F2FE] px-2.5 py-1 rounded-lg flex items-center space-x-1.5">
                <Globe className="w-3.5 h-3.5" />
                <span>2. Remote Online Booking</span>
              </span>
              <span className="text-[10px] font-bold text-[#0284C7] bg-white border border-[#0284C7]/30 px-2 py-0.5 rounded-full">
                Active Fee
              </span>
            </div>

            <p className="text-xs text-[#64748B] leading-relaxed mb-4">
              Standard booking rate applied when patients book appointments from home via the web portal or mobile phone.
            </p>

            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1.5">
                Current Remote Fee (₹)
              </label>
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="text"
                    value={remotePrice}
                    disabled
                    readOnly
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl pl-8 pr-3.5 py-2.5 text-sm font-black font-mono text-slate-400 cursor-not-allowed select-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={openEditModal}
                  className="flex items-center space-x-1.5 text-xs font-bold text-[#0284C7] bg-[#E0F2FE] hover:bg-[#BAE6FD] border border-[#0284C7]/30 px-3.5 py-2.5 rounded-xl transition active:scale-95 shrink-0"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Change</span>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200/80 text-[11px] text-[#0284C7] flex items-center space-x-1.5 font-semibold">
            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Enforced strictly on server-side order calculation</span>
          </div>
        </div>
      </div>

      {/* POPUP MODAL: Change Price */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-[#1E293B]">Change Appointment Pricing</h4>
                  <p className="text-xs text-[#64748B]">Update in-clinic and remote consultation fees</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error in Modal */}
            {modalError && (
              <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-2xl text-xs font-bold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleSaveModal} className="space-y-4">
              {/* Field 1: In-Clinic Price */}
              <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-950 flex items-center space-x-1.5">
                    <QrCode className="w-3.5 h-3.5 text-emerald-700" />
                    <span>In-Clinic TV QR Price</span>
                  </label>
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md font-bold">
                    Currently: ₹{inClinicPrice}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800/80 pb-1">
                  Discounted price for patients scanning the TV screen QR code in clinic.
                </p>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-500">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={editInClinicPrice}
                    onChange={(e) => setEditInClinicPrice(Number(e.target.value))}
                    className="w-full bg-white border border-emerald-300 rounded-xl pl-8 pr-3.5 py-2.5 text-sm font-black font-mono text-[#1E293B] focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Field 2: Remote Price */}
              <div className="bg-sky-50/60 border border-sky-200/80 rounded-2xl p-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-sky-950 flex items-center space-x-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#0284C7]" />
                    <span>Remote Online Booking Price</span>
                  </label>
                  <span className="text-[10px] font-mono text-[#0284C7] bg-[#E0F2FE] px-2 py-0.5 rounded-md font-bold">
                    Currently: ₹{remotePrice}
                  </span>
                </div>
                <p className="text-[11px] text-sky-800/80 pb-1">
                  Standard booking price for patients booking from home via portal.
                </p>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-500">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={editRemotePrice}
                    onChange={(e) => setEditRemotePrice(Number(e.target.value))}
                    className="w-full bg-white border border-sky-300 rounded-xl pl-8 pr-3.5 py-2.5 text-sm font-black font-mono text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center space-x-1.5 bg-[#0284C7] hover:bg-[#0369A1] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition active:scale-95 disabled:opacity-50"
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
