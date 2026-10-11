import React, { useState, useEffect } from 'react';
import { TVViewerKiosk } from './components/TVViewerKiosk';
import { ReceptionistConsole } from './components/ReceptionistConsole';
import { MobileTokenTracker } from './components/MobileTokenTracker';
import { LoginModal } from './components/LoginModal';
import { Monitor, LayoutDashboard, Smartphone, Building2, LogIn, LogOut, ShieldCheck, User } from 'lucide-react';

interface Clinic {
  id: string;
  name: string;
  slug: string;
  phone?: string;
  address?: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'RECEPTIONIST' | 'TV_VIEWER' | 'MOBILE_TRACKER'>('RECEPTIONIST');
  
  // Multi-Tenant Clinic State
  const [clinics, setClinics] = useState<Clinic[]>([
    { id: '1', name: 'ABC Health Clinic', slug: 'abc-health' },
    { id: '2', name: 'City Dental Care', slug: 'city-dental' },
  ]);
  const [selectedClinicId, setSelectedClinicId] = useState<string>('1');

  // Authentication State
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // Fetch available clinics from backend
  useEffect(() => {
    fetch('/api/clinics')
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          setClinics(res.data);
          // If current selected clinic isn't in fetched list, default to first
          if (!res.data.some((c: Clinic) => c.id === selectedClinicId)) {
            setSelectedClinicId(res.data[0].id);
          }
        }
      })
      .catch((err) => {
        console.warn('Could not fetch clinics list:', err);
      });
  }, []);

  const handleLoginSuccess = (user: any, newToken: string) => {
    setCurrentUser(user);
    setToken(newToken);
    if (user.clinicId) {
      setSelectedClinicId(user.clinicId);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setCurrentUser(null);
  };

  const currentClinic = clinics.find((c) => c.id === selectedClinicId) || clinics[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
      {/* Top Application Navigation Bar */}
      <nav className="bg-slate-900 border-b border-slate-800 px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between text-xs sticky top-0 z-40 backdrop-blur-md gap-2">
        <div className="flex items-center space-x-3">
          <span className="text-xl">🏥</span>
          <div className="flex items-center space-x-1.5">
            <span className="font-extrabold tracking-tight text-white text-sm">QueueApp</span>
            <span className="bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded text-[10px] border border-emerald-500/30">
              Healthcare OS
            </span>
          </div>

          {/* Global Multi-Tenant Clinic Switcher */}
          <div className="hidden lg:flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-slate-300">
            <Building2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] text-slate-500 font-bold uppercase">Clinic:</span>
            <select
              value={selectedClinicId}
              onChange={(e) => setSelectedClinicId(e.target.value)}
              className="bg-transparent text-emerald-300 font-bold text-xs outline-none cursor-pointer"
            >
              {clinics.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 order-3 sm:order-2">
          <button
            onClick={() => setActiveTab('RECEPTIONIST')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition ${
              activeTab === 'RECEPTIONIST'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Receptionist Console</span>
          </button>

          <button
            onClick={() => setActiveTab('TV_VIEWER')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition ${
              activeTab === 'TV_VIEWER'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>TV Viewer Kiosk</span>
          </button>

          <button
            onClick={() => setActiveTab('MOBILE_TRACKER')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition ${
              activeTab === 'MOBILE_TRACKER'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile QR Tracker</span>
          </button>
        </div>

        {/* Auth / Account Controls */}
        <div className="flex items-center space-x-2 order-2 sm:order-3">
          {currentUser ? (
            <div className="flex items-center space-x-2">
              <div className="hidden sm:flex items-center space-x-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-xl">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-slate-200">{currentUser.name || currentUser.phoneNumber}</span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono font-medium">
                  {currentUser.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 bg-slate-800 hover:bg-rose-900/60 hover:text-rose-200 text-slate-300 px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-slate-700 transition"
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsLoginOpen(true)}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl font-bold text-xs shadow-md shadow-emerald-950 transition"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Staff Login</span>
            </button>
          )}
        </div>
      </nav>

      {/* Main Render View */}
      <main className="flex-1 flex flex-col">
        {activeTab === 'RECEPTIONIST' && (
          <ReceptionistConsole
            token={token}
            currentUser={currentUser}
            onOpenLogin={() => setIsLoginOpen(true)}
            selectedClinicId={selectedClinicId}
            onSelectClinicId={setSelectedClinicId}
            clinics={clinics}
          />
        )}
        {activeTab === 'TV_VIEWER' && (
          <TVViewerKiosk
            selectedClinicId={selectedClinicId}
            clinics={clinics}
            onSelectClinicId={setSelectedClinicId}
            clinicSlug={currentClinic?.slug}
          />
        )}
        {activeTab === 'MOBILE_TRACKER' && (
          <MobileTokenTracker
            clinics={clinics}
            defaultClinicSlug={currentClinic?.slug}
          />
        )}
      </main>

      {/* Global Staff & Demo Login Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
