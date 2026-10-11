import React, { useState } from 'react';
import { 
  DollarSign, 
  Tv, 
  Globe, 
  CheckCircle, 
  AlertCircle, 
  Save, 
  HelpCircle,
  QrCode,
  ShieldCheck,
  TrendingDown
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
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicId || !token) return;

    if (inClinicPrice <= 0 || remotePrice <= 0) {
      setMessage({ type: 'error', text: 'Pricing fees must be positive values greater than ₹0.' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/clinics/${clinicId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          inClinicPrice: Number(inClinicPrice),
          remotePrice: Number(remotePrice),
        }),
      });

      const json = await res.json();
      if (json.success) {
        setMessage({ type: 'success', text: 'Clinic appointment pricing updated successfully!' });
        if (onUpdated) onUpdated();
      } else {
        setMessage({ type: 'error', text: json.error?.message || json.message || 'Failed to update pricing.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Network communication error.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-6">
      <div className="flex items-start justify-between pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2.5">
            <DollarSign className="w-5 h-5 text-[#0284C7]" />
            <h3 className="font-extrabold text-base text-[#1E293B]">Appointment Pricing & Fee Configuration</h3>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Set tier pricing for patients scanning in-clinic TV screen QR codes versus booking remotely from home.
          </p>
        </div>
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

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tier 1: In-Clinic TV QR Price */}
        <div className="bg-[#F8FAFC] border-2 border-emerald-500/30 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg flex items-center space-x-1.5">
                <QrCode className="w-3.5 h-3.5" />
                <span>1. In-Clinic QR Booking</span>
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-white border border-emerald-200 px-2 py-0.5 rounded-full">
                Default: ₹200
              </span>
            </div>

            <p className="text-xs text-[#64748B] leading-relaxed mb-4">
              Discounted walk-in rate applied when a patient scans the live rotating cryptographic QR code on the clinic's waiting room TV screen.
            </p>

            <div>
              <label className="text-xs font-bold text-[#1E293B] block mb-1.5">
                In-Clinic Appointment Fee (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={inClinicPrice}
                  onChange={(e) => setInClinicPrice(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-8 pr-3.5 py-2.5 text-sm font-black font-mono text-[#1E293B] focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/80 text-[11px] text-emerald-700 flex items-center space-x-1.5 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Validates rotating cryptographic timestamp on TV screen</span>
          </div>
        </div>

        {/* Tier 2: Remote Booking Price */}
        <div className="bg-[#F8FAFC] border-2 border-[#0284C7]/30 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-[#0284C7] bg-[#E0F2FE] px-2.5 py-1 rounded-lg flex items-center space-x-1.5">
                <Globe className="w-3.5 h-3.5" />
                <span>2. Remote Online Booking</span>
              </span>
              <span className="text-[10px] font-bold text-[#0284C7] bg-white border border-[#0284C7]/30 px-2 py-0.5 rounded-full">
                Default: ₹250
              </span>
            </div>

            <p className="text-xs text-[#64748B] leading-relaxed mb-4">
              Standard booking rate applied when patients book appointments from home via the web portal or mobile phone.
            </p>

            <div>
              <label className="text-xs font-bold text-[#1E293B] block mb-1.5">
                Remote Booking Fee (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={remotePrice}
                  onChange={(e) => setRemotePrice(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-8 pr-3.5 py-2.5 text-sm font-black font-mono text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/80 text-[11px] text-[#0284C7] flex items-center space-x-1.5 font-semibold">
            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Enforced strictly on server-side order calculation</span>
          </div>
        </div>

        {/* Submit Action */}
        <div className="col-span-full flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center space-x-2 bg-[#0284C7] hover:bg-[#0369A1] text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-md transition active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Changes...' : 'Save Pricing Rules'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
