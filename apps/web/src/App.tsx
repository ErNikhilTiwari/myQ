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

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  roomNumber?: string;
}

export default function App() {
  const [phoneNumber, setPhoneNumber] = useState('+919876500001'); // Pre-fill Receptionist A
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('123456');
  const [step, setStep] = useState<'PHONE' | 'OTP' | 'LOGGED_IN'>('PHONE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [apiHealth, setApiHealth] = useState<'checking' | 'connected' | 'offline'>('checking');

  // Clinic explorer state
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [clinicDoctors, setClinicDoctors] = useState<Doctor[]>([]);
  const [newDoctorName, setNewDoctorName] = useState('');
  const [newDoctorSpec, setNewDoctorSpec] = useState('');
  const [addingDoctor, setAddingDoctor] = useState(false);

  useEffect(() => {
    // Check API Health
    fetch('/health')
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'ok') setApiHealth('connected');
        else setApiHealth('offline');
      })
      .catch(() => setApiHealth('offline'));

    // Fetch clinics
    loadClinics();
  }, []);

  const loadClinics = () => {
    fetch('/api/clinics')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setClinics(json.data);
      })
      .catch((err) => console.error('Failed to load clinics:', err));
  };

  const handleSelectClinic = (clinic: Clinic) => {
    setSelectedClinic(clinic);
    fetch(`/api/clinics/${clinic.id}/doctors`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setClinicDoctors(json.data);
      });
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

      setSuccessMsg(`OTP sent to ${phoneNumber}. (Use code: 123456)`);
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

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.clinicId) return;

    setAddingDoctor(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/clinics/${user.clinicId}/doctors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newDoctorName,
          specialization: newDoctorSpec,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to add doctor');

      setSuccessMsg(`Dr. ${newDoctorName} added to your clinic!`);
      setNewDoctorName('');
      setNewDoctorSpec('');
      if (selectedClinic && selectedClinic.id === user.clinicId) {
        handleSelectClinic(selectedClinic);
      }
      loadClinics();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAddingDoctor(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    setUser(null);
    setStep('PHONE');
    setSuccessMsg('Logged out successfully.');
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <header className="py-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🏥</span>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight leading-tight">QueueApp</h1>
              <span className="text-[10px] text-slate-400 font-medium">Multi-Tenant Platform (M3)</span>
            </div>
          </div>
          <div className="flex items-center space-x-3 text-xs">
            {user ? (
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-slate-700">{user.name}</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {user.role}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-slate-400 hover:text-rose-600 underline text-[11px]"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    apiHealth === 'connected' ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
                <span className="text-slate-500 capitalize">{apiHealth}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="my-auto py-6 space-y-6">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg">
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Authentication */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-slate-800 flex items-center justify-between">
              <span>{user ? 'Staff / User Session' : 'Quick Role Login'}</span>
              {!user && (
                <span className="text-[11px] text-slate-400 font-normal">Passwordless OTP</span>
              )}
            </h2>

            {!user ? (
              step === 'PHONE' ? (
                <form onSubmit={handleSendOtp} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Choose demo role or enter mobile:
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 mb-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setPhoneNumber('+919876500001')}
                        className={`p-1.5 border rounded text-left ${
                          phoneNumber === '+919876500001'
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-medium'
                            : 'border-slate-200'
                        }`}
                      >
                        ABC Receptionist
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhoneNumber('+919876500002')}
                        className={`p-1.5 border rounded text-left ${
                          phoneNumber === '+919876500002'
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-medium'
                            : 'border-slate-200'
                        }`}
                      >
                        Dental Receptionist
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhoneNumber('+919999999999')}
                        className={`p-1.5 border rounded text-left ${
                          phoneNumber === '+919999999999'
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-medium'
                            : 'border-slate-200'
                        }`}
                      >
                        Super Admin
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhoneNumber('+919876511111')}
                        className={`p-1.5 border rounded text-left ${
                          phoneNumber === '+919876511111'
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-medium'
                            : 'border-slate-200'
                        }`}
                      >
                        Patient
                      </button>
                    </div>

                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+919876543210"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-sm transition disabled:opacity-50"
                  >
                    {loading ? 'Sending...' : 'Send OTP'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-3">
                  <div className="text-xs text-slate-600">
                    Enter code sent to <span className="font-semibold">{phoneNumber}</span>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-center tracking-widest text-lg font-mono"
                  />
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setStep('PHONE')}
                      className="w-1/3 py-2 border border-slate-300 rounded-lg text-xs"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-2/3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-xs"
                    >
                      {loading ? 'Verifying...' : 'Verify (123456)'}
                    </button>
                  </div>
                </form>
              )
            ) : (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg space-y-1.5 border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tenant / Clinic ID:</span>
                    <span className="font-mono text-slate-700">{user.clinicId || 'Global / None'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Phone:</span>
                    <span className="text-slate-700">{user.phoneNumber}</span>
                  </div>
                </div>

                {user.clinicId && (
                  <form onSubmit={handleAddDoctor} className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="font-semibold text-slate-700">Add Doctor to Your Clinic:</div>
                    <input
                      type="text"
                      placeholder="Doctor Name (e.g. Dr. Rajesh Rao)"
                      value={newDoctorName}
                      onChange={(e) => setNewDoctorName(e.target.value)}
                      required
                      className="w-full px-2.5 py-1.5 border rounded text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Specialization (e.g. ENT Specialist)"
                      value={newDoctorSpec}
                      onChange={(e) => setNewDoctorSpec(e.target.value)}
                      required
                      className="w-full px-2.5 py-1.5 border rounded text-xs"
                    />
                    <button
                      type="submit"
                      disabled={addingDoctor}
                      className="w-full py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-medium"
                    >
                      {addingDoctor ? 'Saving...' : '+ Add Doctor (Tenant-Isolated)'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Multi-Tenant Clinic Discovery */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-slate-800">Participating Clinics</h2>

            <div className="space-y-2">
              {clinics.map((clinic) => (
                <div
                  key={clinic.id}
                  onClick={() => handleSelectClinic(clinic)}
                  className={`p-3 rounded-lg border cursor-pointer transition ${
                    selectedClinic?.id === clinic.id
                      ? 'border-emerald-500 bg-emerald-50/50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-slate-900 text-sm">{clinic.name}</h3>
                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-mono">
                      {clinic.slug}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{clinic.address}</p>
                  <div className="flex space-x-3 mt-2 text-[11px] text-slate-400">
                    <span>👨‍⚕️ {clinic.doctorsCount || 0} Doctors</span>
                    <span>🧪 {clinic.servicesCount || 0} Services</span>
                  </div>
                </div>
              ))}
            </div>

            {selectedClinic && (
              <div className="pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Active Doctors at {selectedClinic.name}:
                </h4>
                {clinicDoctors.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No doctors listed.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {clinicDoctors.map((doc) => (
                      <li
                        key={doc.id}
                        className="text-xs p-2 bg-slate-50 rounded flex justify-between items-center"
                      >
                        <span className="font-medium text-slate-800">{doc.name}</span>
                        <span className="text-[11px] text-slate-500">{doc.specialization}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-100">
        Milestone M3 Multi-Tenant Core &bull; QueueApp
      </footer>
    </div>
  );
}
