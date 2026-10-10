import React, { useState, useEffect } from 'react';

interface AuthUser {
  id: string;
  phoneNumber: string;
  name: string;
  role: string;
  clinicId?: string;
}

export default function App() {
  const [phoneNumber, setPhoneNumber] = useState('+919876543210');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('123456');
  const [step, setStep] = useState<'PHONE' | 'OTP' | 'LOGGED_IN'>('PHONE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [apiHealth, setApiHealth] = useState<'checking' | 'connected' | 'offline'>('checking');

  useEffect(() => {
    fetch('/health')
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'ok') setApiHealth('connected');
        else setApiHealth('offline');
      })
      .catch(() => setApiHealth('offline'));
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to send OTP');
      }

      setSuccessMsg(`OTP sent to ${phoneNumber}. (Use test code: 123456)`);
      setStep('OTP');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, otp, name: name || undefined }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Invalid OTP code');
      }

      setUser(json.data.user);
      localStorage.setItem('accessToken', json.data.tokens.accessToken);
      setStep('LOGGED_IN');
      setSuccessMsg('Successfully authenticated!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    setUser(null);
    setStep('PHONE');
    setSuccessMsg('Logged out successfully.');
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 md:p-8 max-w-md mx-auto">
      {/* Header */}
      <header className="py-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🏥</span>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">QueueApp</h1>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                apiHealth === 'connected'
                  ? 'bg-emerald-500'
                  : apiHealth === 'checking'
                  ? 'bg-amber-400'
                  : 'bg-rose-500'
              }`}
            />
            <span className="text-slate-500 capitalize">{apiHealth}</span>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="my-auto py-8">
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg">
            {successMsg}
          </div>
        )}

        {step === 'PHONE' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Sign in with Mobile</h2>
              <p className="text-sm text-slate-500 mt-1">
                Passwordless access for patients and healthcare staff.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Indian Mobile Number (+91)
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+919876543210"
                required
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm transition disabled:opacity-50 text-sm"
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        )}

        {step === 'OTP' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Enter Verification Code</h2>
              <p className="text-sm text-slate-500 mt-1">
                Sent to <span className="font-medium text-slate-700">{phoneNumber}</span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Full Name (Optional for first-time patients)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rahul Verma"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm mb-3"
              />

              <label className="block text-xs font-medium text-slate-600 mb-1">6-Digit OTP</label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                required
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-center tracking-widest text-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setStep('PHONE')}
                className="w-1/3 py-2.5 px-3 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-sm"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-2/3 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm transition disabled:opacity-50 text-sm"
              >
                {loading ? 'Verifying...' : 'Verify & Login'}
              </button>
            </div>
          </form>
        )}

        {step === 'LOGGED_IN' && user && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg">
                {user.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">{user.name}</h3>
                <p className="text-xs text-slate-500">{user.phoneNumber}</p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Role:</span>
                <span className="font-medium bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                  {user.role}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">User ID:</span>
                <span className="font-mono text-slate-600 truncate max-w-[180px]">{user.id}</span>
              </div>
              {user.clinicId && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Clinic ID:</span>
                  <span className="font-mono text-slate-600 truncate max-w-[180px]">{user.clinicId}</span>
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="w-full mt-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition"
            >
              Sign Out
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-100">
        Milestone M2 Scaffold &bull; Multi-Clinic Queue SaaS
      </footer>
    </div>
  );
}
