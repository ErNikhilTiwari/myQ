import React, { useState, useEffect } from 'react';
import { TVViewerKiosk } from './components/TVViewerKiosk';
import { ReceptionistConsole } from './components/ReceptionistConsole';
import { MobileTokenTracker } from './components/MobileTokenTracker';
import { LoginModal, LoginProfile } from './components/LoginModal';
import { ClinicItem } from './components/ClinicSearchSelect';
import { 
  Monitor, 
  LayoutDashboard, 
  Smartphone, 
  LogIn, 
  LogOut, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck,
  Building2,
  ChevronLeft
} from 'lucide-react';

export type AppView = 'LANDING' | 'PATIENT' | 'RECEPTIONIST' | 'TV_VIEWER';

export default function App() {
  // Start on the LANDING page prompting the user to pick one of the 3 views
  const [activeTab, setActiveTab] = useState<AppView>('LANDING');
  
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
    // If logging in from receptionist gate or landing, route directly into receptionist
    if (user.role === 'RECEPTIONIST' || user.role === 'CLINIC_ADMIN') {
      setActiveTab('RECEPTIONIST');
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
        2. 3 Profile Switcher Tabs (Patient, Receptionist, TV View) + Home button if in view
        3. Simple Login / Logout Button
      */}
      <nav className="bg-[#1E293B] text-white px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between text-xs sticky top-0 z-40 shadow-sm gap-2">
        {/* 1. App Brand Name (Click to return to Landing Page) */}
        <button
          onClick={() => setActiveTab('LANDING')}
          className="flex items-center space-x-2 text-left hover:opacity-90 transition focus:outline-none"
        >
          <span className="text-xl">🏥</span>
          <span className="font-extrabold tracking-tight text-white text-base">QueueApp</span>
          <span className="bg-[#0284C7]/20 text-[#38BDF8] font-bold px-2 py-0.5 rounded text-[10px] border border-[#0284C7]/40">
            Healthcare OS
          </span>
        </button>

        {/* 2. Profile Switcher Tabs in Navbar (Visible across all screens) */}
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

        {/* 3. Global Navbar Login Button */}
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
        {/* ========================================================================= */}
        {/* 0. LANDING PAGE: 3 Large Prominent Selection Tiles in a Vertical List     */}
        {/* ========================================================================= */}
        {activeTab === 'LANDING' && (
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-4xl mx-auto w-full my-auto animate-in fade-in duration-200">
            {/* Landing Header */}
            <div className="text-center mb-8 max-w-xl">
              <div className="inline-flex items-center space-x-2 bg-[#E0F2FE] border border-[#0284C7]/20 text-[#0284C7] px-3 py-1 rounded-full text-xs font-bold mb-3 shadow-sm">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Multi-Tenant Queue Management System</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#1E293B] tracking-tight">
                Select Your Access Profile
              </h1>
              <p className="text-xs sm:text-sm text-[#64748B] mt-2 leading-relaxed">
                Choose how you would like to interact with QueueApp today. Each role is tailored for its specific clinical workflow.
              </p>
            </div>

            {/* List of 3 Large Selection Tiles */}
            <div className="w-full space-y-4">
              
              {/* TILE 1: Patient View (Zero-Login Public Token Tracker) */}
              <div
                onClick={() => setActiveTab('PATIENT')}
                className="group w-full bg-white border-2 border-slate-200/90 hover:border-[#0284C7] rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
              >
                <div className="flex items-start sm:items-center space-x-5">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#E0F2FE] text-[#0284C7] border border-[#0284C7]/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
                    <Smartphone className="w-7 h-7 sm:w-8 sm:h-8" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs font-black uppercase tracking-wider text-[#0284C7] bg-[#E0F2FE] px-2.5 py-0.5 rounded-full">
                        Profile 1
                      </span>
                      <span className="text-xs font-bold text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded-full">
                        Zero-Login Ready
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-[#1E293B] tracking-tight group-hover:text-[#0284C7] transition-colors">
                      Patient &bull; Mobile Token Tracker
                    </h2>
                    <p className="text-xs text-[#64748B] mt-1 leading-relaxed max-w-lg">
                      Track your live token position, estimated chamber wait time, and doctor consultation progress directly from your phone. No password or login required.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-[#0284C7] font-black text-xs shrink-0 self-end sm:self-center bg-[#E0F2FE] group-hover:bg-[#0284C7] group-hover:text-white px-4 py-2.5 rounded-xl transition-colors">
                  <span>Enter as Patient</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* TILE 2: Receptionist View (Chamber Console & Counter Registrations) */}
              <div
                onClick={() => setActiveTab('RECEPTIONIST')}
                className="group w-full bg-white border-2 border-slate-200/90 hover:border-[#0284C7] rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
              >
                <div className="flex items-start sm:items-center space-x-5">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#FEF3C7] text-[#D97706] border border-[#D97706]/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
                    <LayoutDashboard className="w-7 h-7 sm:w-8 sm:h-8" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs font-black uppercase tracking-wider text-[#D97706] bg-[#FEF3C7] px-2.5 py-0.5 rounded-full">
                        Profile 2
                      </span>
                      <span className="text-xs font-bold text-[#DC2626] bg-[#FEF2F2] px-2 py-0.5 rounded-full">
                        Staff Auth Required
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-[#1E293B] tracking-tight group-hover:text-[#0284C7] transition-colors">
                      Receptionist &bull; Counter Operations Console
                    </h2>
                    <p className="text-xs text-[#64748B] mt-1 leading-relaxed max-w-lg">
                      Call next patients into doctor chambers, put tokens on hold, mark completed consultations, and issue instant walk-in registration tokens.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-[#0284C7] font-black text-xs shrink-0 self-end sm:self-center bg-[#E0F2FE] group-hover:bg-[#0284C7] group-hover:text-white px-4 py-2.5 rounded-xl transition-colors">
                  <span>Enter as Receptionist</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* TILE 3: TV View (Waiting Hall Live Token Kiosk) */}
              <div
                onClick={() => setActiveTab('TV_VIEWER')}
                className="group w-full bg-white border-2 border-slate-200/90 hover:border-[#0284C7] rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
              >
                <div className="flex items-start sm:items-center space-x-5">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#DCFCE7] text-[#16A34A] border border-[#16A34A]/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
                    <Monitor className="w-7 h-7 sm:w-8 sm:h-8" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs font-black uppercase tracking-wider text-[#16A34A] bg-[#DCFCE7] px-2.5 py-0.5 rounded-full">
                        Profile 3
                      </span>
                      <span className="text-xs font-bold text-[#0284C7] bg-[#E0F2FE] px-2 py-0.5 rounded-full">
                        Smart TV &amp; Wall Display
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-[#1E293B] tracking-tight group-hover:text-[#0284C7] transition-colors">
                      TV View &bull; Waiting Room Kiosk
                    </h2>
                    <p className="text-xs text-[#64748B] mt-1 leading-relaxed max-w-lg">
                      Full-screen broadcasting screen for patient waiting halls. Plays audio chimes, shows the current serving token in large text, and displays upcoming numbers.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-[#0284C7] font-black text-xs shrink-0 self-end sm:self-center bg-[#E0F2FE] group-hover:bg-[#0284C7] group-hover:text-white px-4 py-2.5 rounded-xl transition-colors">
                  <span>Launch TV Kiosk</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

            </div>

            {/* Quick Demo Footer Notice */}
            <div className="mt-8 flex items-center justify-center space-x-4 text-xs text-[#64748B]">
              <span className="flex items-center space-x-1">
                <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
                <span>Multi-tenant facility isolation</span>
              </span>
              <span>&bull;</span>
              <span>Click any tile or navbar tab to switch anytime</span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 1. Patient Profile: Zero-login basic tracking with optional Patient Login */}
        {/* ========================================================================= */}
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

        {/* ========================================================================= */}
        {/* 2. Receptionist Profile: STRICT AUTH REQUIRED - no dashboard before login */}
        {/* ========================================================================= */}
        {activeTab === 'RECEPTIONIST' && (
          <ReceptionistConsole
            token={token}
            currentUser={currentUser}
            onOpenLogin={openReceptionistLogin}
            selectedClinicId={selectedClinicId}
            clinics={clinics}
          />
        )}

        {/* ========================================================================= */}
        {/* 3. TV View: Auto-mapped for Receptionist or Search & Select for Guest      */}
        {/* ========================================================================= */}
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
