import React, { useState } from 'react';
import { LogIn, KeyRound, Phone, CheckCircle, AlertCircle, X, Sparkles, UserCheck, Shield } from 'lucide-react';

export type LoginProfile = 'PATIENT' | 'RECEPTIONIST' | 'GENERAL';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: any, token: string) => void;
  profileType?: LoginProfile; // Explicit role context
}

export const LoginModal: React.FC<LoginModalProps> = ({ 
  isOpen, 
  onClose, 
  onLoginSuccess,
  profileType = 'GENERAL'
}) => {
  // Set default phone according to selected profile
  const getDefaultPhone = () => {
    if (profileType === 'RECEPTIONIST') return '+919876500001';
    if (profileType === 'PATIENT') return '+919876511111';
    return '+919876500001';
  };

  const [phoneNumber, setPhoneNumber] = useState(getDefaultPhone());
  const [otp, setOtp] = useState('123456');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Header Title & Subtitle customized per profile
  const getHeaderInfo = () => {
    switch (profileType) {
      case 'RECEPTIONIST':
        return {
          title: 'Receptionist Login',
          subtitle: 'Clinic Desk & Live Queue Operator Access',
          icon: <UserCheck className="w-5 h-5" />,
          accentColor: '#0284C7',
          bgColor: '#E0F2FE',
        };
      case 'PATIENT':
        return {
          title: 'Patient Login',
          subtitle: 'Sync Your Bookings, Appointments & Token Alerts',
          icon: <KeyRound className="w-5 h-5" />,
          accentColor: '#16A34A',
          bgColor: '#DCFCE7',
        };
      default:
        return {
          title: 'Account Login',
          subtitle: 'Sign in to your Healthcare OS profile',
          icon: <Shield className="w-5 h-5" />,
          accentColor: '#0284C7',
          bgColor: '#E0F2FE',
        };
    }
  };

  // Preset quick-test accounts filtered or ordered by profileType
  const allQuickAccounts = [
    { label: 'Receptionist (ABC Health)', phone: '+919876500001', role: 'RECEPTIONIST', clinic: 'ABC Health Clinic' },
    { label: 'Patient (Rahul)', phone: '+919876511111', role: 'PATIENT', clinic: 'Patient Account' },
    { label: 'Clinic Admin', phone: '+919876500000', role: 'CLINIC_ADMIN', clinic: 'ABC Health Clinic' },
    { label: 'Super Admin', phone: '+919999999999', role: 'SUPER_ADMIN', clinic: 'System Root' },
  ];

  const quickAccounts = profileType === 'RECEPTIONIST'
    ? allQuickAccounts.filter((a) => a.role === 'RECEPTIONIST' || a.role === 'CLINIC_ADMIN')
    : profileType === 'PATIENT'
    ? allQuickAccounts.filter((a) => a.role === 'PATIENT')
    : allQuickAccounts;

  const headerInfo = getHeaderInfo();

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phoneNumber.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setStep('OTP');
      } else {
        setErrorMsg(data.error?.message || 'Failed to send OTP.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error communicating with auth server.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phoneNumber.trim(),
          otp: otp.trim(),
        }),
      });
      const data = await res.json();
      const accessToken = data.data?.tokens?.accessToken || data.data?.token;

      if (data.success && accessToken) {
        const user = data.data.user;
        localStorage.setItem('token', accessToken);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('queueapp_token', accessToken);
        localStorage.setItem('queueapp_user', JSON.stringify(user));
        onLoginSuccess(user, accessToken);
        onClose();
      } else {
        const msg = data.error?.message || data.message || (typeof data.error === 'string' ? data.error : 'Invalid OTP code.');
        setErrorMsg(msg);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error verifying OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const handleInstantDemoLogin = async (phone: string) => {
    setErrorMsg(null);
    setLoading(true);
    setPhoneNumber(phone);
    setOtp('123456');

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phone.trim(),
          otp: '123456',
        }),
      });
      const data = await res.json();
      const accessToken = data.data?.tokens?.accessToken || data.data?.token;

      if (data.success && accessToken) {
        const user = data.data.user;
        localStorage.setItem('token', accessToken);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('queueapp_token', accessToken);
        localStorage.setItem('queueapp_user', JSON.stringify(user));
        onLoginSuccess(user, accessToken);
        onClose();
      } else {
        const msg = data.error?.message || data.message || 'Quick login failed. Make sure API backend is running on port 4000.';
        setErrorMsg(msg);
      }
    } catch (err: any) {
      setErrorMsg('Cannot reach backend on port 4000. Please ensure API server is started.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-[#1E293B] transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center border"
            style={{ backgroundColor: headerInfo.bgColor, color: headerInfo.accentColor, borderColor: `${headerInfo.accentColor}30` }}
          >
            {headerInfo.icon}
          </div>
          <div>
            <h3 className="text-lg font-black text-[#1E293B]">{headerInfo.title}</h3>
            <p className="text-xs text-[#64748B]">{headerInfo.subtitle}</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-[#FEF2F2] border border-[#DC2626]/20 rounded-xl text-[#DC2626] text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: Enter Phone Number */}
        {step === 'PHONE' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1.5">
                Phone Number (with country code)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  placeholder="+919876500001"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#1E293B] font-mono focus:outline-none focus:border-[#0284C7] focus:bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0284C7] hover:bg-[#0369A1] text-white py-3 rounded-xl font-bold text-xs transition shadow-sm flex items-center justify-center space-x-2"
            >
              <span>{loading ? 'Sending OTP...' : 'Send OTP Code'}</span>
            </button>

            {/* Quick-test Presets for Solo Dev / Reviewer */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-[#D97706]" />
                  <span>Instant Demo Accounts:</span>
                </span>
                <span className="text-[10px] text-[#0284C7] font-semibold">1-Click Sign In</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {quickAccounts.map((acc, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-[#F8FAFC] hover:border-[#0284C7] hover:bg-sky-50/50 transition group"
                  >
                    <button
                      type="button"
                      onClick={() => setPhoneNumber(acc.phone)}
                      className="text-left flex-1"
                    >
                      <div className="font-bold text-xs text-[#1E293B] group-hover:text-[#0284C7] transition">
                        {acc.label}
                      </div>
                      <div className="text-[10px] font-mono text-[#64748B]">
                        {acc.phone} • {acc.clinic}
                      </div>
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleInstantDemoLogin(acc.phone)}
                      className="ml-2 px-3 py-1.5 bg-[#0284C7] hover:bg-[#0369A1] text-white text-[11px] font-bold rounded-lg shadow-sm shrink-0 transition flex items-center space-x-1"
                    >
                      <span>⚡ Sign In</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </form>
        ) : (
          /* STEP 2: Enter OTP Code */
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-[#334155]">
                  Enter 6-Digit Verification Code
                </label>
                <button
                  type="button"
                  onClick={() => setStep('PHONE')}
                  className="text-[11px] text-[#0284C7] hover:underline"
                >
                  Change phone
                </button>
              </div>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                className="w-full bg-[#F8FAFC] border border-slate-300 rounded-xl px-4 py-2.5 text-center text-lg tracking-widest text-[#0284C7] font-mono font-bold focus:outline-none focus:border-[#0284C7] focus:bg-white"
              />
              <div className="bg-[#E0F2FE] border border-[#0284C7]/20 rounded-xl p-2.5 mt-2 text-center text-[11px] text-[#0284C7]">
                <p className="font-semibold">Local Dev Testing:</p>
                <p className="text-[10px] text-[#64748B] mt-0.5">
                  Enter the code from your backend terminal (or use mock bypass <span className="font-mono font-bold text-[#0284C7]">123456</span>).
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#16A34A] hover:bg-[#15803D] text-white py-3 rounded-xl font-bold text-xs transition shadow-sm flex items-center justify-center space-x-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{loading ? 'Verifying...' : 'Verify & Enter Dashboard'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
