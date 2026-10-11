import React, { useState, useEffect } from 'react';
import { TVViewerKiosk } from './components/TVViewerKiosk';
import { ReceptionistConsole } from './components/ReceptionistConsole';
import { MobileTokenTracker } from './components/MobileTokenTracker';
import { LoginModal, LoginProfile } from './components/LoginModal';
import { ClinicSearchSelect, ClinicItem } from './components/ClinicSearchSelect';
import { Monitor, LayoutDashboard, Smartphone, LogIn, LogOut, User } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'PATIENT' | 'RECEPTIONIST' | 'TV_VIEWER'>('RECEPTIONIST');
  
  // Multi-Tenant Clinic State - EMPTY BY DEFAULT
  const [clinics, setClinics] = useState<ClinicItem[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string>('');

  // Authentication State
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  
  // Login modal with profile context
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginProfile, setLoginProfile] = useState<LoginProfile>('GENERAL');

  // Fetch available clinics from backend
  useEffect(() => {
    fetch('/api/clinics')
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          setClinics(res.data);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch clinics list:', err);
      });
  }, []);

  // When staff/receptionist logs in, auto-bind to their mapped clinic
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
    setSelectedClinicId('');
  };

  // Profile-specific login openers
  const openGeneralLogin = () => {
    setLoginProfile('GENERAL');
    setIsLoginOpen(true);
  };

  const openReceptionistLogin = () => {
    setLoginProfile('RECEPTIONIST');
    setIsLoginOpen(true);
  };

  const openPatientLogin = () => {
    setLoginProfile('PATIENT');
    setIsLoginOpen(true);
  };

  const currentClinic = clinics.find((c) => c.id === selectedClinicId);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#334155] flex flex-col font-sans antialiased">
      {/* 
        Top Application Navigation Bar:
        Contains ONLY:
        1. App Brand Name
        2. 3 Profile Switcher Tabs (Patient, Receptionist, TV View)
        3. Simple Login / Logout Button
      */}
      <nav className="bg-[#1E293B] text-white px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between text-xs sticky top-0 z-40 shadow-sm gap-2">
        {/* 1. App Brand Name */}
        <div className="flex items-center space-x-2">
          <span className="text-xl">🏥</span>
          <span className="font-extrabold tracking-tight text-white text-base">QueueApp</span>
          <span className="bg-[#0284C7]/20 text-[#38BDF8] font-bold px-2 py-0.5 rounded text-[10px] border border-[#0284C7]/40">
            Healthcare OS
          </span>
        </div>

        {/* 2. Three Profile Switcher Views: Patient, Receptionist, TV View */}
        <div className="flex space-x-1 bg-[#0F172A] p-1 rounded-xl border border-slate-700/80">
          {/* Profile 1: Patient (Mobile QR Tracker) */}
          <button
            onClick={() => setActiveTab('PATIENT')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition ${
              activeTab === 'PATIENT'
                ? 'bg-[#0284C7] text-white shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Patient</span>
          </button>

          {/* Profile 2: Receptionist (Chamber Console) */}
          <button
            onClick={() => setActiveTab('RECEPTIONIST')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition ${
              activeTab === 'RECEPTIONIST'
                ? 'bg-[#0284C7] text-white shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Receptionist</span>
          </button>

          {/* Profile 3: TV View (Waiting Room Kiosk) */}
          <button
            onClick={() => setActiveTab('TV_VIEWER')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition ${
              activeTab === 'TV_VIEWER'
                ? 'bg-[#0284C7] text-white shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>TV View</span>
          </button>
        </div>

        {/* 3. Global Navbar Login Button - Says "Login" only */}
        <div className="flex items-center space-x-2">
          {currentUser ? (
            <div className="flex items-center space-x-2">
              <div className="hidden sm:flex items-center space-x-1.5 bg-[#0F172A] border border-slate-700 px-2.5 py-1 rounded-xl">
                <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
                <span className="font-bold text-slate-100">{currentUser.name || currentUser.phoneNumber}</span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono font-medium">
                  {currentUser.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 bg-slate-800 hover:bg-[#DC2626] hover:text-white text-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-slate-700 transition"
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <button
              onClick={openGeneralLogin}
              className="flex items-center space-x-1.5 bg-[#0284C7] hover:bg-[#0369A1] text-white px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-sm transition"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login</span>
            </button>
          )}
        </div>
      </nav>

      {/* Main Render Views */}
      <main className="flex-1 flex flex-col bg-[#F8FAFC]">
        {/* 1. Patient Profile: Zero-login basic tracking with optional Patient Login */}
        {activeTab === 'PATIENT' && (
          <MobileTokenTracker
            clinics={clinics}
            selectedClinicId={selectedClinicId}
            onSelectClinicId={setSelectedClinicId}
            defaultClinicSlug={currentClinic?.slug}
            onOpenPatientLogin={openPatientLogin}
            currentUser={currentUser}
          />
        )}

        {/* 2. Receptionist Profile: STRICT AUTH REQUIRED - no dashboard before login */}
        {activeTab === 'RECEPTIONIST' && (
          <ReceptionistConsole
            token={token}
            currentUser={currentUser}
            onOpenLogin={openReceptionistLogin}
            selectedClinicId={selectedClinicId}
            clinics={clinics}
          />
        )}

        {/* 3. TV View: Auto-mapped to receptionist profile clinic if logged in, or search & select */}
        {activeTab === 'TV_VIEWER' && (
          <TVViewerKiosk
            selectedClinicId={selectedClinicId}
            clinics={clinics}
            onSelectClinicId={setSelectedClinicId}
            clinicSlug={currentClinic?.slug}
            currentUser={currentUser}
          />
        )}
      </main>

      {/* Profile-Aware Authentication Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        profileType={loginProfile}
      />
    </div>
  );
}
