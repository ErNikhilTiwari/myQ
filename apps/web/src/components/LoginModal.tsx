import React, { useState, useEffect } from 'react';
import { LogIn, KeyRound, Phone, CheckCircle, AlertCircle, X, Sparkles, UserCheck, Shield, Lock, Eye, EyeOff, Send, Monitor } from 'lucide-react';

export type LoginProfile = 'PATIENT' | 'RECEPTIONIST' | 'CLINIC_ADMIN' | 'SUPER_ADMIN' | 'GENERAL' | 'TV_VIEWER';

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
  // Set default 10-digit phone according to selected profile
  const getDefaultPhone10 = () => {
    if (profileType === 'CLINIC_ADMIN') return '9876500002';
    if (profileType === 'RECEPTIONIST' || profileType === 'TV_VIEWER') return '9876500001';
    if (profileType === 'PATIENT') return '9876511111';
    if (profileType === 'SUPER_ADMIN') return '9999999999';
    return '9876511111';
  };

  const [phone10, setPhone10] = useState(getDefaultPhone10());
  const [authMethod, setAuthMethod] = useState<'OTP' | 'PASSWORD'>('OTP');
  const [password, setPassword] = useState('Password@123');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'INPUT' | 'OTP'>('INPUT');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [telegramBotUsername, setTelegramBotUsername] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState<number>(0);
  const [otpAttemptsInMinute, setOtpAttemptsInMinute] = useState<number[]>([]);

  // 1-second countdown ticker for OTP resend cooldown
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const interval = setInterval(() => {
      setResendCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCountdown]);

  useEffect(() => {
    if (isOpen) {
      setPhone10(getDefaultPhone10());
      setOtp('');
      setErrorMsg(null);
    }
  }, [isOpen, profileType]);

  useEffect(() => {
    fetch('/api/auth/telegram/info', {
      headers: { 'Bypass-Tunnel-Reminder': 'true' },
    })
      .then((res) => res.json())
      .then((res) => {
        if (res?.data?.username) {
          setTelegramBotUsername(res.data.username);
        }
      })
      .catch(() => {});
  }, []);

  if (!isOpen) return null;

  // Header Title & Subtitle customized per profile
  const getHeaderInfo = () => {
    switch (profileType) {
      case 'CLINIC_ADMIN':
        return {
          title: 'Clinic Owner & Admin Login',
          subtitle: 'Full Clinic Management Suite, Doctors, Services, Pricing & Analytics',
          icon: <Shield className="w-5 h-5" />,
          accentColor: '#0284C7',
          bgColor: '#E0F2FE',
        };
      case 'RECEPTIONIST':
        return {
          title: 'Receptionist Counter Login',
          subtitle: 'Front Desk Queue Operator, Call Next, Tokens & TV Display Access',
          icon: <UserCheck className="w-5 h-5" />,
          accentColor: '#0F766E',
          bgColor: '#CCFBF1',
        };
      case 'TV_VIEWER':
        return {
          title: 'TV View Kiosk Login',
          subtitle: 'Waiting Hall Display Screen (Uses Receptionist Credentials)',
          icon: <Monitor className="w-5 h-5" />,
          accentColor: '#0F766E',
          bgColor: '#CCFBF1',
        };
      case 'PATIENT':
        return {
          title: 'Patient Login',
          subtitle: 'Sync Your Bookings, Appointments & Live Token Alerts',
          icon: <KeyRound className="w-5 h-5" />,
          accentColor: '#16A34A',
          bgColor: '#DCFCE7',
        };
      case 'SUPER_ADMIN':
        return {
          title: 'Super Admin Login',
          subtitle: 'Global Platform Control & Multi-Tenant Infrastructure',
          icon: <Shield className="w-5 h-5" />,
          accentColor: '#D97706',
          bgColor: '#FEF3C7',
        };
      default:
        return {
          title: 'Account Login',
          subtitle: 'Sign in as Patient, Clinic Admin, Receptionist, or Super Admin',
          icon: <Shield className="w-5 h-5" />,
          accentColor: '#0284C7',
          bgColor: '#E0F2FE',
        };
    }
  };

  // Preset quick-test accounts (including Super Admin for demo purposes)
  const allQuickAccounts = [
    { label: 'Clinic Owner / Doctor', phone: '+919876500002', role: 'CLINIC_ADMIN', clinic: 'ABC Health Clinic' },
    { label: 'Receptionist Desk', phone: '+919876500001', role: 'RECEPTIONIST', clinic: 'ABC Health Clinic' },
    { label: 'Patient (Rahul)', phone: '+919876511111', role: 'PATIENT', clinic: 'Patient Account' },
    { label: 'Platform Super Admin', phone: '+919999999999', role: 'SUPER_ADMIN', clinic: 'System Root' },
  ];

  // Present relevant profile accounts at top
  const quickAccounts = [
    ...(profileType === 'CLINIC_ADMIN'
      ? allQuickAccounts.filter((a) => a.role === 'CLINIC_ADMIN')
      : profileType === 'RECEPTIONIST' || profileType === 'TV_VIEWER'
      ? allQuickAccounts.filter((a) => a.role === 'RECEPTIONIST')
      : profileType === 'PATIENT'
      ? allQuickAccounts.filter((a) => a.role === 'PATIENT')
      : profileType === 'SUPER_ADMIN'
      ? allQuickAccounts.filter((a) => a.role === 'SUPER_ADMIN')
      : []),
    ...allQuickAccounts.filter((a) => {
      if (profileType === 'CLINIC_ADMIN') return a.role !== 'CLINIC_ADMIN';
      if (profileType === 'RECEPTIONIST' || profileType === 'TV_VIEWER') return a.role !== 'RECEPTIONIST';
      if (profileType === 'PATIENT') return a.role !== 'PATIENT';
      if (profileType === 'SUPER_ADMIN') return a.role !== 'SUPER_ADMIN';
      return true;
    }),
  ];

  const headerInfo = getHeaderInfo();

  const handleSendOtp = async (e?: React.FormEvent, isResend = false) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const clean10 = phone10.replace(/\D/g, '').slice(0, 10);
    if (clean10.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit Indian phone number.');
      return;
    }

    const now = Date.now();
    const recentAttempts = otpAttemptsInMinute.filter((t) => now - t < 60000);
    
    // Rule: After 5 attempts in single minute -> cooldown is 60s
    if (recentAttempts.length >= 5) {
      setErrorMsg('Too many OTP attempts (maximum 5 in 1 minute). Please wait 60 seconds.');
      setResendCountdown(60);
      return;
    }

    // Rule: After 3 attempts in single minute -> cooldown is 10s
    if (recentAttempts.length >= 3) {
      const lastAttempt = recentAttempts[recentAttempts.length - 1];
      const elapsed = now - lastAttempt;
      if (elapsed < 10000) {
        const remaining = Math.ceil((10000 - elapsed) / 1000);
        setErrorMsg(`Please wait ${remaining}s before requesting a new OTP.`);
        setResendCountdown(remaining);
        return;
      }
    }

    setLoading(true);
    const validPhone = `+91${clean10}`;

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Bypass-Tunnel-Reminder': 'true',
        },
        body: JSON.stringify({ phoneNumber: validPhone }),
      });

      const rawText = await res.text();
      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(`Server returned non-JSON response (${res.status}). Ensure API backend is active.`);
      }

      if (data.success) {
        setOtp('');
        if (data.data?.telegramBotUsername || data.telegramBotUsername) {
          setTelegramBotUsername(data.data?.telegramBotUsername || data.telegramBotUsername);
        }
        setStep('OTP');
        const updatedAttempts = [...recentAttempts, now];
        setOtpAttemptsInMinute(updatedAttempts);

        // Cooldown policy:
        // - First 3 attempts: No cooldown (0s)
        // - After 3 attempts: 10s cooldown
        // - After 5 attempts: 60s cooldown
        let cooldown = 0;
        if (updatedAttempts.length >= 5) {
          cooldown = 60;
        } else if (updatedAttempts.length >= 3) {
          cooldown = 10;
        }
        if (data.data?.resendCooldownSeconds !== undefined) {
          cooldown = data.data.resendCooldownSeconds;
        }
        setResendCountdown(cooldown);
      } else {
        const errorText = data.error?.message || data.message || 'Failed to send OTP.';
        setErrorMsg(errorText);
        if (errorText.includes('5 attempts') || errorText.includes('60 seconds') || recentAttempts.length >= 4) {
          setResendCountdown(60);
        } else if (errorText.includes('10 seconds') || recentAttempts.length >= 3) {
          setResendCountdown(10);
        }
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

    const clean10 = phone10.replace(/\D/g, '').slice(0, 10);
    if (clean10.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit Indian phone number.');
      return;
    }

    setLoading(true);
    const validPhone = `+91${clean10}`;

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Bypass-Tunnel-Reminder': 'true',
        },
        body: JSON.stringify({
          phoneNumber: validPhone,
          otp: otp.trim(),
        }),
      });

      const rawText = await res.text();
      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(`Server returned non-JSON response (${res.status}).`);
      }

      const accessToken = data.data?.tokens?.accessToken || data.data?.token;

      if (data.success && accessToken) {
        const user = { ...data.data.user, isNewUser: Boolean(data.data.isNewUser) };
        const isClinicStaff = user.role === 'RECEPTIONIST' || user.role === 'CLINIC_ADMIN' || user.role === 'SUPER_ADMIN';

        if ((profileType === 'RECEPTIONIST' || profileType === 'TV_VIEWER') && !isClinicStaff) {
          setErrorMsg(
            'This phone number is registered as a Patient, not a Clinic account. Clinics can log in only with credentials provisioned by Super Admin. Please switch to Patient Login.'
          );
          setLoading(false);
          return;
        }

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

  const handleLoginWithPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const clean10 = phone10.replace(/\D/g, '').slice(0, 10);
    if (clean10.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit Indian phone number.');
      return;
    }

    if (!password.trim()) {
      setErrorMsg('Please enter your account password.');
      return;
    }

    setLoading(true);
    const validPhone = `+91${clean10}`;

    try {
      const res = await fetch('/api/auth/login-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Bypass-Tunnel-Reminder': 'true',
        },
        body: JSON.stringify({
          phoneNumber: validPhone,
          password: password.trim(),
        }),
      });

      const rawText = await res.text();
      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(`Server returned non-JSON response (${res.status}). Ensure API backend is active.`);
      }

      const accessToken = data.data?.tokens?.accessToken || data.data?.token;

      if (data.success && accessToken) {
        const user = { ...data.data.user, isNewUser: Boolean(data.data.isNewUser) };
        const isClinicStaff = user.role === 'RECEPTIONIST' || user.role === 'CLINIC_ADMIN' || user.role === 'SUPER_ADMIN';

        if ((profileType === 'RECEPTIONIST' || profileType === 'TV_VIEWER') && !isClinicStaff) {
          setErrorMsg(
            'This phone number is registered as a Patient, not a Clinic account. Clinics can log in only with credentials provisioned by Super Admin. Please switch to Patient Login.'
          );
          setLoading(false);
          return;
        }

        localStorage.setItem('token', accessToken);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('queueapp_token', accessToken);
        localStorage.setItem('queueapp_user', JSON.stringify(user));
        onLoginSuccess(user, accessToken);
        onClose();
      } else {
        const msg = data.error?.message || data.message || (typeof data.error === 'string' ? data.error : 'Invalid phone number or password.');
        setErrorMsg(msg);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error communicating with auth server.');
    } finally {
      setLoading(false);
    }
  };

  const handleInstantDemoLogin = async (phone: string) => {
    setErrorMsg(null);
    setLoading(true);
    const clean10 = phone.replace('+91', '').replace(/\D/g, '').slice(0, 10);
    setPhone10(clean10);
    setOtp('123456');
    const validPhone = `+91${clean10}`;

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Bypass-Tunnel-Reminder': 'true',
        },
        body: JSON.stringify({
          phoneNumber: validPhone,
          otp: '123456',
        }),
      });

      const rawText = await res.text();
      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(`Server returned non-JSON response (${res.status}). Ensure port 4000 is running.`);
      }

      const accessToken = data.data?.tokens?.accessToken || data.data?.token;

      if (data.success && accessToken) {
        const user = { ...data.data.user, isNewUser: Boolean(data.data.isNewUser) };
        const isClinicStaff = user.role === 'RECEPTIONIST' || user.role === 'CLINIC_ADMIN' || user.role === 'SUPER_ADMIN';

        if ((profileType === 'RECEPTIONIST' || profileType === 'TV_VIEWER') && !isClinicStaff) {
          setErrorMsg(
            'This phone number is registered as a Patient, not a Clinic account. Clinics can log in only with credentials provisioned by Super Admin. Please switch to Patient Login.'
          );
          setLoading(false);
          return;
        }

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
        <div className="flex items-center space-x-3 mb-5">
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

        {/* Clinic Login Provisioning Notice */}
        {profileType === 'RECEPTIONIST' && (
          <div className="mb-4 p-2.5 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-900 text-[11px] flex items-center space-x-2">
            <span className="shrink-0 text-sm">🔒</span>
            <span>
              <strong>Clinic Login Only:</strong> Existing clinic accounts can sign in here. Adding new clinic profiles is restricted to the Super Admin.
            </span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 bg-[#FEF2F2] border border-[#DC2626]/20 rounded-xl text-[#DC2626] text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {step === 'INPUT' ? (
          <div>
            {/* Step 1: Phone Number Input */}
            <div className="mb-3.5">
              <label className="block text-xs font-semibold text-[#334155] mb-1.5">
                Mobile Phone Number
              </label>
              <div className="flex space-x-2">
                {/* Fixed Unchangeable Country Code Box */}
                <div className="bg-slate-100 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1E293B] select-none flex items-center justify-center shrink-0">
                  +91
                </div>
                {/* 10-Digit Only Number Input Box */}
                <input
                  type="tel"
                  inputMode="numeric"
                  required
                  maxLength={10}
                  placeholder="9876500001"
                  value={phone10}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setPhone10(digits);
                  }}
                  className="flex-1 bg-[#F8FAFC] border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-[#1E293B] font-mono font-semibold focus:outline-none focus:border-[#0284C7] focus:bg-white"
                />
              </div>
              <p className="text-[10px] text-[#64748B] mt-1">10 digits Indian mobile number</p>
            </div>

            {/* Choose Login Method: OTP (Passwordless) or Password */}
            <div className="mb-4">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Choose Sign-In Method
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('OTP');
                    setErrorMsg(null);
                  }}
                  className={`py-2 px-3 text-xs font-bold rounded-lg flex items-center justify-center space-x-1.5 transition ${
                    authMethod === 'OTP'
                      ? 'bg-white text-[#0284C7] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Login with OTP</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('PASSWORD');
                    setErrorMsg(null);
                  }}
                  className={`py-2 px-3 text-xs font-bold rounded-lg flex items-center justify-center space-x-1.5 transition ${
                    authMethod === 'PASSWORD'
                      ? 'bg-white text-[#0284C7] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Login with Password</span>
                </button>
              </div>
            </div>

            {/* METHOD 1: Password-based Login Form */}
            {authMethod === 'PASSWORD' && (
              <form onSubmit={handleLoginWithPassword} className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-[#334155]">
                      Account Password
                    </label>
                    <span className="text-[10px] text-[#0284C7] font-semibold">
                      Demo: Password@123
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter account password"
                      className="w-full bg-[#F8FAFC] border border-slate-300 rounded-xl pl-4 pr-10 py-2.5 text-xs text-[#1E293B] font-semibold focus:outline-none focus:border-[#0284C7] focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-[#64748B] mt-1">
                    Demo accounts use default password: <span className="font-mono font-bold text-slate-700">Password@123</span> (or 123456)
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-[#0284C7] hover:bg-[#0369A1] text-white py-2.5 rounded-xl font-bold text-xs transition shadow-sm flex items-center justify-center space-x-1"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{loading ? 'Logging in...' : 'Login with Password'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleInstantDemoLogin(phone10)}
                    className="bg-[#16A34A] hover:bg-[#15803D] text-white py-2.5 rounded-xl font-bold text-xs transition shadow-sm flex items-center justify-center space-x-1"
                  >
                    <span>⚡ Instant Sign In</span>
                  </button>
                </div>
              </form>
            )}

            {/* METHOD 2: Passwordless OTP Login Form */}
            {authMethod === 'OTP' && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl text-sky-900 text-[11px] flex items-center space-x-2">
                  <KeyRound className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>
                    Passwordless sign in: We will generate a one-time 6-digit verification code for your phone number.
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-[#0284C7] hover:bg-[#0369A1] text-white py-2.5 rounded-xl font-bold text-xs transition shadow-sm flex items-center justify-center space-x-1"
                  >
                    <span>{loading ? 'Sending...' : 'Send OTP & Login'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleInstantDemoLogin(phone10)}
                    className="bg-[#16A34A] hover:bg-[#15803D] text-white py-2.5 rounded-xl font-bold text-xs transition shadow-sm flex items-center justify-center space-x-1"
                  >
                    <span>⚡ Instant Sign In</span>
                  </button>
                </div>
              </form>
            )}

            {/* Quick-test Presets for Solo Dev / Reviewer */}
            <div className="pt-3 mt-4 border-t border-slate-100">
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
                      onClick={() => {
                        const cleanDigits = acc.phone.replace('+91', '').replace(/\D/g, '').slice(0, 10);
                        setPhone10(cleanDigits);
                        setPassword('Password@123');
                      }}
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
          </div>
        ) : (
          /* STEP 2: Enter OTP Code Screen */
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-[#334155]">
                  Enter 6-Digit Verification Code
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setOtp('');
                    setStep('INPUT');
                  }}
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
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className="w-full bg-[#F8FAFC] border border-slate-300 rounded-xl px-4 py-2.5 text-center text-lg tracking-widest text-[#0284C7] font-mono font-bold focus:outline-none focus:border-[#0284C7] focus:bg-white placeholder:text-slate-400 placeholder:font-normal placeholder:opacity-50"
              />
              <div className="bg-[#E0F2FE] border border-[#0284C7]/20 rounded-xl p-2.5 mt-2 text-center text-[11px] text-[#0284C7]">
                <p className="font-semibold">Local Dev Testing:</p>
                <p className="text-[10px] text-[#64748B] mt-0.5">
                  Enter the code from your backend terminal (or use mock bypass <span className="font-mono font-bold text-[#0284C7]">123456</span>).
                </p>
              </div>

              {telegramBotUsername && (
                <div className="bg-sky-50 border border-sky-200 rounded-xl p-2.5 mt-2.5 text-xs text-sky-900 flex items-center justify-between shadow-xs">
                  <div className="flex items-center space-x-2">
                    <span className="text-base shrink-0">🤖</span>
                    <div className="text-left">
                      <p className="font-bold text-[11px] text-sky-950">Receive OTP on Your Telegram</p>
                      <p className="text-[10px] text-sky-700">Link your phone once to get OTP directly:</p>
                    </div>
                  </div>
                  <a
                    href={`https://t.me/${telegramBotUsername}?start=${phone10}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 px-2.5 py-1.5 bg-[#0088cc] hover:bg-[#0077b5] text-white text-[11px] font-bold rounded-lg shadow-xs shrink-0 transition flex items-center space-x-1"
                  >
                    <span>Open Bot</span>
                    <span>↗</span>
                  </a>
                </div>
              )}

              {/* Resend OTP Row with 10s cooldown and 3-tries rate limit */}
              <div className="flex items-center justify-between text-xs pt-2">
                <span className="text-slate-500 font-medium">Didn't receive the OTP?</span>
                <button
                  type="button"
                  disabled={loading || resendCountdown > 0}
                  onClick={() => handleSendOtp(undefined, true)}
                  className="font-bold text-[#0284C7] hover:underline disabled:text-slate-400 disabled:no-underline transition cursor-pointer disabled:cursor-not-allowed"
                >
                  {resendCountdown > 0
                    ? `Resend in ${resendCountdown}s`
                    : 'Resend OTP'}
                </button>
              </div>

              {/* Rate limit warning banners: 10s after 3 attempts, 60s after 5 attempts */}
              {resendCountdown > 10 && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 text-center font-medium">
                  ⚠️ 5 attempts reached within 1 minute. Please wait 60 seconds before resending.
                </div>
              )}
              {resendCountdown > 0 && resendCountdown <= 10 && (
                <div className="p-2 bg-sky-50 border border-sky-200 rounded-xl text-[10px] text-sky-800 text-center font-medium">
                  ⏳ 3 attempts reached in 1 minute. 10-second cooldown active.
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#16A34A] hover:bg-[#15803D] text-white py-3 rounded-xl font-bold text-xs transition shadow-sm flex items-center justify-center space-x-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{loading ? 'Verifying...' : 'Verify OTP & Login'}</span>
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setStep('INPUT');
                  setAuthMethod('PASSWORD');
                }}
                className="text-xs text-slate-500 hover:text-[#0284C7] transition"
              >
                Prefer password? <span className="font-semibold underline">Login with Password instead</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
