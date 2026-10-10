import React, { useState, useEffect } from 'react';

interface AuthUser {
  id: string;
  phoneNumber: string;
  name: string;
  role: string;
  clinicId?: string;
}

interface Clinic {
  id: string;
  name: string;
  slug: string;
  phoneNumber: string;
  address?: string;
  doctorsCount?: number;
  servicesCount?: number;
}

interface PublicTokenStatus {
  tokenNumber: string;
  status: string;
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

export default function App() {
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'LIVE_TOKEN'>('LOGIN');

  // Auth State
  const [phoneNumber, setPhoneNumber] = useState('+919876500001');
  const [otp, setOtp] = useState('123456');
  const [step, setStep] = useState<'PHONE' | 'OTP' | 'LOGGED_IN'>('PHONE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [apiHealth, setApiHealth] = useState<'checking' | 'connected' | 'offline'>('checking');

  // Clinics & Queue State
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [lookupSlug, setLookupSlug] = useState('abc-health');
  const [lookupTokenNum, setLookupTokenNum] = useState('A-01');
  const [tokenStatus, setTokenStatus] = useState<PublicTokenStatus | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);

  useEffect(() => {
    fetch('/health')
      .then((res) => res.json())
      .then((data) => setApiHealth(data.status === 'ok' ? 'connected' : 'offline'))
      .catch(() => setApiHealth('offline'));

    loadClinics();
  }, []);

  // Auto-poll live token status every 5 seconds if a token is active
  useEffect(() => {
    if (!tokenStatus || activeTab !== 'LIVE_TOKEN') return;

    const interval = setInterval(() => {
      fetch(`/api/queue/lookup?clinicSlug=${lookupSlug}&tokenNumber=${tokenStatus.tokenNumber}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success) setTokenStatus(json.data);
        })
        .catch(() => {});
    }, 5000);

    return () => clearInterval(interval);
  }, [tokenStatus, lookupSlug, activeTab]);

  const loadClinics = () => {
    fetch('/api/clinics')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setClinics(json.data);
      });
  };

  const handleLookupToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTokenLoading(true);

    try {
      const res = await fetch(
        `/api/queue/lookup?clinicSlug=${lookupSlug}&tokenNumber=${encodeURIComponent(lookupTokenNum)}`,
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Token not found');

      setTokenStatus(json.data);
      setSuccessMsg(`Showing live status for Token ${json.data.tokenNumber}`);
    } catch (err: any) {
      setError(err.message);
      setTokenStatus(null);
    } finally {
      setTokenLoading(false);
    }
  };

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
      if (!res.ok) throw new Error(json.error?.message || 'Failed to send OTP');

      setSuccessMsg(`OTP sent to ${phoneNumber}. (Test code: 123456)`);
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
        body: JSON.stringify({ phoneNumber, otp }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Invalid OTP code');

      setUser(json.data.user);
      localStorage.setItem('accessToken', json.data.tokens.accessToken);
      setStep('LOGGED_IN');
      setSuccessMsg(`Welcome, ${json.data.user.name}!`);
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
    <div className="min-h-screen flex flex-col justify-between p-3 sm:p-6 max-w-lg mx-auto bg-slate-50">
      {/* Top Header */}
      <header className="py-3 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🏥</span>
            <div>
              <h1 className="text-lg font-bold text-slate-800 tracking-tight leading-none">QueueApp</h1>
              <span className="text-[10px] text-slate-400 font-medium">Public QR & Clinic Platform</span>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                apiHealth === 'connected' ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
            <span className="text-slate-500 text-[11px] capitalize">{apiHealth}</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex mt-3 bg-slate-200/80 p-0.5 rounded-lg text-xs font-medium">
          <button
            onClick={() => setActiveTab('LOGIN')}
            className={`flex-1 py-1.5 rounded-md transition text-center ${
              activeTab === 'LOGIN' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Staff / Patient Login
          </button>
          <button
            onClick={() => setActiveTab('LIVE_TOKEN')}
            className={`flex-1 py-1.5 rounded-md transition text-center ${
              activeTab === 'LIVE_TOKEN' ? 'bg-white text-emerald-800 font-semibold shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📱 Public QR Token (No Login)
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="my-auto py-5 space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg">
            {successMsg}
          </div>
        )}

        {/* TAB 1: PUBLIC QR TOKEN STATUS (ZERO LOGIN) */}
        {activeTab === 'LIVE_TOKEN' && (
          <div className="space-y-4">
            {/* Lookup Form */}
            <form onSubmit={handleLookupToken} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Live Queue Token Lookup
              </h2>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Select Clinic:</label>
                  <select
                    value={lookupSlug}
                    onChange={(e) => setLookupSlug(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-800 text-xs"
                  >
                    {clinics.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Token Number:</label>
                  <input
                    type="text"
                    value={lookupTokenNum}
                    onChange={(e) => setLookupTokenNum(e.target.value)}
                    placeholder="A-01 or W-01"
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 font-mono font-bold text-xs"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={tokenLoading}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
              >
                {tokenLoading ? 'Checking...' : 'Check Status (No Login Required)'}
              </button>
            </form>

            {/* Live Token Status Card (360px Mobile-First) */}
            {tokenStatus && (
              <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase">{tokenStatus.clinicName}</h3>
                    <p className="text-xs text-slate-800 font-medium">{tokenStatus.queueName}</p>
                    {tokenStatus.doctorName && (
                      <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                        👨‍⚕️ {tokenStatus.doctorName}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 text-[10px] text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live 5s</span>
                  </div>
                </div>

                {/* Big Token Number Display */}
                <div className="text-center py-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Your Token
                  </div>
                  <div className="text-4xl font-extrabold text-slate-900 tracking-tight font-mono my-1">
                    {tokenStatus.tokenNumber}
                  </div>

                  {/* Status Badges */}
                  <div className="mt-2">
                    {tokenStatus.status === 'CALLED' ? (
                      <div className="inline-block px-3 py-1 bg-emerald-600 text-white rounded-full text-xs font-bold animate-bounce shadow">
                        🔔 NOW BEING CALLED! Proceed to room
                      </div>
                    ) : tokenStatus.status === 'IN_SERVICE' ? (
                      <div className="inline-block px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-bold">
                        ⚕️ In Consultation
                      </div>
                    ) : tokenStatus.status === 'ON_HOLD' ? (
                      <div className="inline-block px-3 py-1 bg-amber-500 text-white rounded-full text-xs font-bold">
                        ⚠️ On Hold: {tokenStatus.holdReason || 'Please check reception'}
                      </div>
                    ) : tokenStatus.status === 'COMPLETED' ? (
                      <div className="inline-block px-3 py-1 bg-slate-400 text-white rounded-full text-xs font-bold">
                        ✅ Completed
                      </div>
                    ) : (
                      <div className="inline-block px-3 py-1 bg-slate-200 text-slate-700 rounded-full text-xs font-semibold">
                        ⏳ Waiting in Line
                      </div>
                    )}
                  </div>
                </div>

                {/* Queue Position & ETA Metrics */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-[10px] text-slate-400">Now Serving</div>
                    <div className="font-bold font-mono text-sm text-slate-800 mt-0.5">
                      {tokenStatus.currentServingToken || '—'}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-[10px] text-slate-400">Ahead of You</div>
                    <div className="font-bold text-sm text-slate-800 mt-0.5">
                      {tokenStatus.positionAhead} {tokenStatus.positionAhead === 1 ? 'person' : 'people'}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-[10px] text-slate-400">Est. Wait</div>
                    <div className="font-bold text-sm text-emerald-700 mt-0.5">
                      ~{tokenStatus.estimatedWaitMinutes} min
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-center text-slate-400 italic">
                  Keep this window open. Screen auto-updates when next patient is called.
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: STAFF / PATIENT LOGIN */}
        {activeTab === 'LOGIN' && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {user ? 'Staff Account' : 'Passwordless Mobile Login'}
            </h2>

            {!user ? (
              step === 'PHONE' ? (
                <form onSubmit={handleSendOtp} className="space-y-3">
                  <div className="grid grid-cols-2 gap-1.5 text-xs mb-2">
                    <button
                      type="button"
                      onClick={() => setPhoneNumber('+919876500001')}
                      className="p-1.5 border rounded text-left border-emerald-500 bg-emerald-50 font-medium"
                    >
                      ABC Receptionist
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhoneNumber('+919876511111')}
                      className="p-1.5 border rounded text-left border-slate-200"
                    >
                      Patient
                    </button>
                  </div>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
                  >
                    {loading ? 'Sending...' : 'Send OTP'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-3">
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-center tracking-widest text-lg font-mono"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
                  >
                    {loading ? 'Verifying...' : 'Verify OTP (123456)'}
                  </button>
                </form>
              )
            ) : (
              <div className="space-y-2 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="font-semibold text-slate-800">{user.name}</div>
                  <div className="text-slate-500">{user.phoneNumber} &bull; {user.role}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-100"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-3 text-center text-[11px] text-slate-400 border-t border-slate-200">
        QueueApp &bull; Milestone M6 Public QR Verified
      </footer>
    </div>
  );
}
