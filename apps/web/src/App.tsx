import React, { useState, useEffect } from 'react';
import { TVViewerKiosk } from './components/TVViewerKiosk';
import { ReceptionistConsole } from './components/ReceptionistConsole';
import { MobileTokenTracker } from './components/MobileTokenTracker';
import { PatientPortalView } from './components/PatientPortalView';
import { LoginModal, LoginProfile } from './components/LoginModal';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { AppointmentBookingModal } from './components/AppointmentBookingModal';
import { PatientProfileModal } from './components/PatientProfileModal';
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
  ChevronLeft,
  Crown,
  Calendar,
  Menu,
  X,
  User,
  UserCheck,
  Shield,
  Layers,
  ChevronRight
} from 'lucide-react';

export type AppView = 'LANDING' | 'PATIENT' | 'RECEPTIONIST' | 'CLINIC_ADMIN' | 'TV_VIEWER' | 'SUPER_ADMIN';

export default function App() {
  // Check if someone is already logged in and determine initial view:
  // If patient -> 'PATIENT', if super admin -> 'SUPER_ADMIN', if clinic owner/admin -> 'CLINIC_ADMIN', if receptionist -> 'RECEPTIONIST', else default to Patient Portal ('PATIENT')
  const getInitialView = (): AppView => {
    try {
      const savedUser = localStorage.getItem('user');
      const savedToken = localStorage.getItem('token');
      if (savedUser && savedToken) {
        const user = JSON.parse(savedUser);
        if (user.role === 'SUPER_ADMIN') return 'SUPER_ADMIN';
        if (user.role === 'CLINIC_ADMIN') return 'CLINIC_ADMIN';
        if (user.role === 'RECEPTIONIST') return 'RECEPTIONIST';
        if (user.role === 'PATIENT') return 'PATIENT';
      }
    } catch {}
    return 'PATIENT';
  };

  const [activeTab, setActiveTab] = useState<AppView>(getInitialView);
  
  // Multi-Tenant Clinic State - EMPTY BY DEFAULT
  const [clinics, setClinics] = useState<ClinicItem[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [selectedClinicId, setSelectedClinicId] = useState<string>(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        return u.clinicId || '';
      } catch {}
    }
    return '';
  });

  // Authentication State
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  
  // Login modal with profile context
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginProfile, setLoginProfile] = useState<LoginProfile>('GENERAL');

  // Appointment Booking Modal State (In-Clinic TV QR vs Remote)
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingModalType, setBookingModalType] = useState<'IN_CLINIC' | 'REMOTE'>('REMOTE');
  const [bookingQrToken, setBookingQrToken] = useState<string>('');
  const [activeTrackingToken, setActiveTrackingToken] = useState<string>('');
  const [pendingBookingAfterLogin, setPendingBookingAfterLogin] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileModalWarning, setProfileModalWarning] = useState<string | null>(null);
  const [pendingActionAfterProfile, setPendingActionAfterProfile] = useState<(() => void) | null>(null);

  // Fetch available clinics from backend & inspect URL for In-Clinic TV QR scan
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

    // Check if user scanned In-Clinic TV QR code (?clinic=...&qr=...&type=IN_CLINIC)
    try {
      const params = new URLSearchParams(window.location.search);
      const clinicParam = params.get('clinic');
      const qrParam = params.get('qr');
      const typeParam = params.get('type');

      if (clinicParam) {
        setSelectedClinicId(clinicParam);
      }

      if (qrParam || typeParam === 'IN_CLINIC') {
        setActiveTab('PATIENT');
        setBookingModalType('IN_CLINIC');
        if (qrParam) setBookingQrToken(qrParam);

        // Customer needs to login to book appointment using TV QR
        const savedToken = localStorage.getItem('token');
        if (savedToken) {
          setIsBookingOpen(true);
        } else {
          setLoginProfile('PATIENT');
          setIsLoginOpen(true);
          setPendingBookingAfterLogin(true);
        }
      }
    } catch {}
  }, []);

  // Hamburger Navigation Drawer State
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Profile-specific login openers
  const openGeneralLogin = () => {
    setLoginProfile('GENERAL');
    setIsLoginOpen(true);
  };

  const openClinicAdminLogin = () => {
    setLoginProfile('CLINIC_ADMIN');
    setIsLoginOpen(true);
  };

  const openReceptionistLogin = () => {
    setLoginProfile('RECEPTIONIST');
    setIsLoginOpen(true);
  };

  const openSuperAdminLogin = () => {
    setLoginProfile('SUPER_ADMIN');
    setIsLoginOpen(true);
  };

  const openPatientLogin = () => {
    setLoginProfile('PATIENT');
    setIsLoginOpen(true);
  };

  const openTvViewerLogin = () => {
    setLoginProfile('TV_VIEWER');
    setIsLoginOpen(true);
  };

  const isPatientProfileComplete = (user: any) => {
    if (!user) return false;
    if (user.role !== 'PATIENT') return true;
    if (user.isProfileComplete === true) return true;
    const hasValidName = user.name && !user.name.startsWith('Patient ') && user.name.trim().length > 0;
    const hasAge = user.age !== null && user.age !== undefined && Number(user.age) > 0;
    const hasGender = user.gender && user.gender.trim().length > 0;
    return Boolean(hasValidName && hasAge && hasGender);
  };

  const openProfileModal = (warningMsg?: string | null, onProceed?: () => void) => {
    setProfileModalWarning(warningMsg || null);
    if (onProceed) {
      setPendingActionAfterProfile(() => onProceed);
    } else {
      setPendingActionAfterProfile(null);
    }
    setIsProfileModalOpen(true);
  };

  // When user logs in, auto-bind to their mapped clinic and route directly to their profile
  const handleLoginSuccess = (user: any, newToken: string) => {
    setCurrentUser(user);
    setToken(newToken);
    if (user.clinicId) {
      setSelectedClinicId(user.clinicId);
    }
    // Automatically route to their designated profile view
    if (loginProfile === 'TV_VIEWER') {
      setActiveTab('TV_VIEWER');
    } else if (user.role === 'PATIENT') {
      setActiveTab('PATIENT');
      // Prompt user to complete profile if new user or incomplete details
      if (!isPatientProfileComplete(user) || user.isNewUser) {
        setIsProfileModalOpen(true);
      } else if (pendingBookingAfterLogin) {
        setIsBookingOpen(true);
        setPendingBookingAfterLogin(false);
      }
    } else if (user.role === 'CLINIC_ADMIN') {
      setActiveTab('CLINIC_ADMIN');
    } else if (user.role === 'RECEPTIONIST') {
      setActiveTab('RECEPTIONIST');
    } else if (user.role === 'SUPER_ADMIN') {
      setActiveTab('SUPER_ADMIN');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('queueapp_token');
    localStorage.removeItem('queueapp_user');
    setToken(null);
    setCurrentUser(null);
    setSelectedClinicId('');
    setActiveTrackingToken('');
    setPendingBookingAfterLogin(false);
    setPendingActionAfterProfile(null);
    setIsProfileModalOpen(false);
    setIsMenuOpen(false);
    setActiveTab('PATIENT');
  };

  // Validate saved authentication session against /api/auth/me on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${savedToken}`,
          'Bypass-Tunnel-Reminder': 'true',
        },
      })
        .then((res) => {
          if (!res.ok) {
            handleLogout();
            return null;
          }
          return res.json();
        })
        .then((data) => {
          if (data && data.success && data.data) {
            setCurrentUser(data.data);
            localStorage.setItem('user', JSON.stringify(data.data));
            localStorage.setItem('queueapp_user', JSON.stringify(data.data));
          } else if (data && !data.success) {
            handleLogout();
          }
        })
        .catch(() => {});
    }
  }, []);

  const currentClinic = clinics.find((c: ClinicItem) => c.id === selectedClinicId);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#334155] flex flex-col font-sans antialiased">
      {/* 
        Top Application Navigation Bar:
        Clean, sleek navigation bar containing:
        1. App Brand Name
        2. Status badge / Current user indicator
        3. Hamburger Menu button (Toggles the role-based profile & action drawer)
      */}
      <nav className="bg-[#1E293B] text-white px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs sticky top-0 z-40 shadow-md">
        {/* Brand & Home link (Defaults to Patient Portal) */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              if (currentUser?.role === 'PATIENT') {
                setActiveTab('PATIENT');
              } else if (currentUser?.role === 'CLINIC_ADMIN') {
                setActiveTab('CLINIC_ADMIN');
              } else if (currentUser?.role === 'RECEPTIONIST') {
                setActiveTab('RECEPTIONIST');
              } else if (currentUser?.role === 'SUPER_ADMIN') {
                setActiveTab('SUPER_ADMIN');
              } else {
                setActiveTab('PATIENT');
              }
            }}
            className="flex items-center space-x-2 text-left hover:opacity-90 transition focus:outline-none"
          >
            <span className="text-xl">🏥</span>
            <span className="font-extrabold tracking-tight text-white text-base">QueueApp</span>
            <span className="bg-[#0284C7]/20 text-[#38BDF8] font-bold px-2 py-0.5 rounded text-[10px] border border-[#0284C7]/40 hidden xs:inline-block">
              Healthcare OS
            </span>
          </button>
        </div>

        {/* Right side: User pill (if logged in) + Multi-role Login + Logo-Only Hamburger Menu */}
        <div className="flex items-center space-x-2.5">
          {currentUser ? (
            <div className="flex items-center space-x-2">
              <div 
                onClick={() => {
                  if (currentUser.role === 'CLINIC_ADMIN') setActiveTab('CLINIC_ADMIN');
                }}
                className={`hidden sm:flex items-center space-x-1.5 bg-[#0F172A] border border-slate-700 px-2.5 py-1 rounded-xl ${
                  currentUser.role === 'CLINIC_ADMIN' ? 'cursor-pointer hover:border-sky-500/60 transition' : ''
                }`}
                title={currentUser.role === 'CLINIC_ADMIN' ? 'Click to open Clinic Admin Console & Profile' : undefined}
              >
                <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
                <span className="font-bold text-slate-100">{currentUser.name || currentUser.phoneNumber}</span>
                <span className="text-[10px] bg-slate-800 text-sky-300 px-1.5 py-0.5 rounded font-mono font-medium">
                  {currentUser.role === 'CLINIC_ADMIN' ? 'CLINIC OWNER' : currentUser.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="hidden sm:flex items-center space-x-1 bg-slate-800 hover:bg-[#DC2626] hover:text-white text-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-slate-700 transition"
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <button
              onClick={openGeneralLogin}
              className="flex items-center space-x-1.5 bg-[#0284C7] hover:bg-[#0369A1] text-white px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-sm transition"
              title="Multi-Role Login (Super Admin, Clinic Admin, Receptionist, Patient)"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login</span>
            </button>
          )}

          {/* Hamburger Menu Toggle Button (No text/name, just logo) */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 bg-[#0F172A] hover:bg-slate-800 text-sky-400 hover:text-white rounded-xl border border-slate-700/80 transition shadow-sm active:scale-95 flex items-center justify-center"
            aria-label="Navigation Menu"
            title="Menu"
          >
            {isMenuOpen ? (
              <X className="w-4.5 h-4.5 text-sky-400" />
            ) : (
              <Menu className="w-4.5 h-4.5 text-sky-400" />
            )}
          </button>
        </div>
      </nav>

      {/* Hamburger Navigation Drawer / Backdrop */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Slide-over Drawer Panel */}
          <div className="relative w-full max-w-sm bg-[#0F172A] text-slate-100 h-full shadow-2xl flex flex-col z-10 border-l border-slate-800 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#1E293B]">
              <div className="flex items-center space-x-2.5">
                <span className="text-xl">🏥</span>
                <div>
                  <h3 className="font-extrabold text-sm text-white">QueueApp</h3>
                  <p className="text-[11px] text-slate-400">
                    {currentUser 
                      ? `Logged in: ${currentUser.role === 'CLINIC_ADMIN' ? 'Clinic Owner & Admin' : currentUser.role}`
                      : 'Clinical Operating System'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* SECTION 1: Clinic Logins (Clinic Admin, Receptionist, TV View) */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2.5 px-1">
                  Clinic &amp; Display Access
                </p>
                <div className="space-y-2.5">
                  {/* OPTION 1: Login as Clinic Admin */}
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      if (currentUser?.role === 'CLINIC_ADMIN') {
                        setActiveTab('CLINIC_ADMIN');
                      } else {
                        openClinicAdminLogin();
                      }
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left border transition group shadow-sm ${
                      activeTab === 'CLINIC_ADMIN'
                        ? 'bg-[#0284C7] text-white border-sky-400/50 shadow-md'
                        : 'bg-slate-800/90 hover:bg-slate-800 text-slate-100 border-slate-700/80 hover:border-sky-500/50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-xl transition ${
                        activeTab === 'CLINIC_ADMIN' ? 'bg-white/20 text-white' : 'bg-sky-500/10 text-sky-400 group-hover:bg-sky-500 group-hover:text-white'
                      }`}>
                        <Shield className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs text-white">Login as Clinic Admin</span>
                          {currentUser?.role === 'CLINIC_ADMIN' && (
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded-full border border-emerald-400/30">Active</span>
                          )}
                        </div>
                        <p className={`text-[11px] font-normal mt-0.5 ${activeTab === 'CLINIC_ADMIN' ? 'text-sky-100' : 'text-slate-400'}`}>
                          Owner suite &bull; Doctors, services &amp; pricing
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-transform" />
                  </button>

                  {/* OPTION 2: Login as Receptionist */}
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      if (currentUser?.role === 'RECEPTIONIST') {
                        setActiveTab('RECEPTIONIST');
                      } else {
                        openReceptionistLogin();
                      }
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left border transition group shadow-sm ${
                      activeTab === 'RECEPTIONIST'
                        ? 'bg-teal-600 text-white border-teal-400/50 shadow-md'
                        : 'bg-slate-800/90 hover:bg-slate-800 text-slate-100 border-slate-700/80 hover:border-teal-500/50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-xl transition ${
                        activeTab === 'RECEPTIONIST' ? 'bg-white/20 text-white' : 'bg-teal-500/10 text-teal-400 group-hover:bg-teal-500 group-hover:text-white'
                      }`}>
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs text-white">Login as Receptionist</span>
                          {currentUser?.role === 'RECEPTIONIST' && (
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded-full border border-emerald-400/30">Active</span>
                          )}
                        </div>
                        <p className={`text-[11px] font-normal mt-0.5 ${activeTab === 'RECEPTIONIST' ? 'text-teal-100' : 'text-slate-400'}`}>
                          Front desk &bull; Call next, hold &amp; token desk
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-transform" />
                  </button>

                  {/* OPTION 3: Login for TV View (same profile as receptionist) */}
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      if (currentUser?.role === 'RECEPTIONIST' || currentUser?.role === 'CLINIC_ADMIN') {
                        setActiveTab('TV_VIEWER');
                      } else {
                        openTvViewerLogin();
                      }
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left border transition group shadow-sm ${
                      activeTab === 'TV_VIEWER'
                        ? 'bg-emerald-600 text-white border-emerald-400/50 shadow-md'
                        : 'bg-slate-800/90 hover:bg-slate-800 text-slate-100 border-slate-700/80 hover:border-emerald-500/50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-xl transition ${
                        activeTab === 'TV_VIEWER' ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white'
                      }`}>
                        <Monitor className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs text-white">Login for TV View</span>
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded-full border border-emerald-400/30">
                            Receptionist Profile
                          </span>
                        </div>
                        <p className={`text-[11px] font-normal mt-0.5 ${activeTab === 'TV_VIEWER' ? 'text-emerald-100' : 'text-slate-400'}`}>
                          Waiting room screen &bull; Live audio chime &amp; tokens
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>

              {/* SECTION 2: Patient Portal */}
              <div className="pt-2 border-t border-slate-800">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2.5 px-1">
                  Patient Portal
                </p>
                <div className="space-y-2">
                  {/* View Patient Portal */}
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      if (currentUser?.role === 'PATIENT') {
                        setActiveTab('PATIENT');
                      } else {
                        openPatientLogin();
                      }
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left border transition group shadow-sm ${
                      activeTab === 'PATIENT' && currentUser?.role === 'PATIENT'
                        ? 'bg-emerald-600 text-white border-emerald-400/50 shadow-md'
                        : 'bg-slate-800/90 hover:bg-slate-800 text-slate-100 border-slate-700/80 hover:border-emerald-500/50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-xl transition ${
                        activeTab === 'PATIENT' && currentUser?.role === 'PATIENT'
                          ? 'bg-white/20 text-white'
                          : 'bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white'
                      }`}>
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs text-white">
                            {currentUser?.role === 'PATIENT' ? 'Patient Portal' : 'Login as Patient'}
                          </span>
                          {currentUser?.role === 'PATIENT' && (
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded-full border border-emerald-400/30">
                              Active
                            </span>
                          )}
                        </div>
                        <p className={`text-[11px] font-normal mt-0.5 ${
                          activeTab === 'PATIENT' && currentUser?.role === 'PATIENT'
                            ? 'text-emerald-100'
                            : 'text-slate-400'
                        }`}>
                          Search clinic, book appointment &amp; track tokens
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-transform" />
                  </button>

                  {/* Switch / Log In to Another Patient Account */}
                  {currentUser?.role === 'PATIENT' && (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        openPatientLogin();
                      }}
                      className="w-full flex items-center justify-between p-2.5 px-3 rounded-xl text-left border border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white transition group text-xs"
                    >
                      <div className="flex items-center space-x-2">
                        <User className="w-3.5 h-3.5 text-sky-400" />
                        <span className="font-semibold text-[11px]">Switch / Log in to Another Patient Account</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Drawer Footer: User status & Logout (Shown only when logged in) */}
            {currentUser && (
              <div className="p-4 border-t border-slate-800 bg-[#1E293B]">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="text-slate-400 text-[11px]">Logged in as:</span>
                    <span className="font-bold text-sky-400">{currentUser.name || currentUser.phoneNumber}</span>
                  </div>

                  {currentUser?.role === 'CLINIC_ADMIN' && (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        setActiveTab('CLINIC_ADMIN');
                      }}
                      className="w-full flex items-center justify-center space-x-2 bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-500/30 py-2.5 rounded-xl font-bold text-xs transition"
                    >
                      <Shield className="w-4 h-4" />
                      <span>Admin Profile &amp; Password</span>
                    </button>
                  )}

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center space-x-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 py-2.5 rounded-xl font-bold text-xs transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
                  <span>{currentUser?.role === 'PATIENT' ? 'Open Your Patient Portal' : 'Enter as Patient'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* TILE 2: Receptionist Desk (Front Desk Live Counter) */}
              <div
                onClick={() => setActiveTab('RECEPTIONIST')}
                className="group w-full bg-white border-2 border-slate-200/90 hover:border-teal-500 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
              >
                <div className="flex items-start sm:items-center space-x-5">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-teal-50 text-teal-600 border border-teal-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
                    <UserCheck className="w-7 h-7 sm:w-8 sm:h-8" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs font-black uppercase tracking-wider text-teal-700 bg-teal-100/80 px-2.5 py-0.5 rounded-full">
                        Profile 2
                      </span>
                      <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                        Front Desk Staff
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-[#1E293B] tracking-tight group-hover:text-teal-600 transition-colors">
                      Receptionist &bull; Front Desk Queue Desk
                    </h2>
                    <p className="text-xs text-[#64748B] mt-1 leading-relaxed max-w-lg">
                      Call next patients into chambers, put tokens on hold, recall waiting patients, issue walk-in tokens, and view the waiting hall TV screen.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-teal-700 font-black text-xs shrink-0 self-end sm:self-center bg-teal-50 group-hover:bg-teal-600 group-hover:text-white px-4 py-2.5 rounded-xl transition-colors">
                  <span>
                    {currentUser?.role === 'RECEPTIONIST' ? 'Open Receptionist Desk' : 'Enter Receptionist Desk'}
                  </span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* TILE 3: Clinic Owner & Admin (Full Management Suite) */}
              <div
                onClick={() => setActiveTab('CLINIC_ADMIN')}
                className="group w-full bg-white border-2 border-slate-200/90 hover:border-[#0284C7] rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
              >
                <div className="flex items-start sm:items-center space-x-5">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#E0F2FE] text-[#0284C7] border border-[#0284C7]/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
                    <Shield className="w-7 h-7 sm:w-8 sm:h-8" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs font-black uppercase tracking-wider text-[#0284C7] bg-[#E0F2FE] px-2.5 py-0.5 rounded-full">
                        Profile 3
                      </span>
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                        Clinic Owner / Doctor
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-[#1E293B] tracking-tight group-hover:text-[#0284C7] transition-colors">
                      Clinic Admin &bull; Owner &amp; Doctor Suite
                    </h2>
                    <p className="text-xs text-[#64748B] mt-1 leading-relaxed max-w-lg">
                      Full facility control: Manage doctor chambers, services &amp; queues, walk-in &amp; TV pricing rules, and real-time revenue analytics.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-[#0284C7] font-black text-xs shrink-0 self-end sm:self-center bg-[#E0F2FE] group-hover:bg-[#0284C7] group-hover:text-white px-4 py-2.5 rounded-xl transition-colors">
                  <span>
                    {(currentUser?.role === 'CLINIC_ADMIN' || currentUser?.role === 'SUPER_ADMIN')
                      ? 'Open Clinic Suite'
                      : 'Enter Clinic Owner'}
                  </span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* TILE 4: TV View (Waiting Hall Live Token Kiosk) */}
              <div
                onClick={() => setActiveTab('TV_VIEWER')}
                className="group w-full bg-white border-2 border-slate-200/90 hover:border-emerald-500 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
              >
                <div className="flex items-start sm:items-center space-x-5">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#DCFCE7] text-[#16A34A] border border-[#16A34A]/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
                    <Monitor className="w-7 h-7 sm:w-8 sm:h-8" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs font-black uppercase tracking-wider text-[#16A34A] bg-[#DCFCE7] px-2.5 py-0.5 rounded-full">
                        Profile 4
                      </span>
                      <span className="text-xs font-bold text-[#0284C7] bg-[#E0F2FE] px-2 py-0.5 rounded-full">
                        Smart TV &amp; Wall Display
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-[#1E293B] tracking-tight group-hover:text-[#16A34A] transition-colors">
                      TV View &bull; Waiting Room Kiosk
                    </h2>
                    <p className="text-xs text-[#64748B] mt-1 leading-relaxed max-w-lg">
                      Full-screen broadcasting screen for patient waiting halls. Plays audio chimes, shows the current serving token in large text, and displays upcoming numbers.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-[#16A34A] font-black text-xs shrink-0 self-end sm:self-center bg-[#DCFCE7] group-hover:bg-[#16A34A] group-hover:text-white px-4 py-2.5 rounded-xl transition-colors">
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
              <span>Open Hamburger Menu (top right) to switch views anytime</span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 1. Patient Profile: Full Patient Portal & Live Token Tracker             */}
        {/* ========================================================================= */}
        {activeTab === 'PATIENT' && (
          <PatientPortalView
            clinics={clinics}
            selectedClinicId={selectedClinicId}
            onSelectClinicId={setSelectedClinicId}
            defaultClinicSlug={currentClinic?.slug}
            currentUser={currentUser}
            token={token}
            onOpenPatientLogin={openPatientLogin}
            onOpenProfileModal={openProfileModal}
            onOpenBooking={(type = 'REMOTE', qrToken = '') => {
              if (!token || !currentUser || currentUser.role !== 'PATIENT') {
                setLoginProfile('PATIENT');
                setIsLoginOpen(true);
                setPendingBookingAfterLogin(true);
                setBookingModalType(type);
                setBookingQrToken(qrToken);
              } else if (!isPatientProfileComplete(currentUser)) {
                openProfileModal(
                  'Please complete your profile details (Name, Age & Sex) before booking an appointment.',
                  () => {
                    setBookingModalType(type);
                    setBookingQrToken(qrToken);
                    setIsBookingOpen(true);
                  }
                );
              } else {
                setBookingModalType(type);
                setBookingQrToken(qrToken);
                setIsBookingOpen(true);
              }
            }}
            onLogout={handleLogout}
            activeTrackingToken={activeTrackingToken}
          />
        )}

        {/* ========================================================================= */}
        {/* 2. Receptionist Profile: STRICT AUTH REQUIRED - Counter Desk Only        */}
        {/* ========================================================================= */}
        {activeTab === 'RECEPTIONIST' && (
          <ReceptionistConsole
            token={token}
            currentUser={currentUser}
            onOpenLogin={openReceptionistLogin}
            selectedClinicId={selectedClinicId}
            clinics={clinics}
            isClinicAdminMode={false}
            onOpenTVView={() => setActiveTab('TV_VIEWER')}
          />
        )}

        {/* ========================================================================= */}
        {/* 3. Clinic Admin / Owner Profile: Full Facility Suite                     */}
        {/* ========================================================================= */}
        {activeTab === 'CLINIC_ADMIN' && (
          <ReceptionistConsole
            token={token}
            currentUser={currentUser}
            onOpenLogin={openClinicAdminLogin}
            selectedClinicId={selectedClinicId}
            clinics={clinics}
            isClinicAdminMode={true}
            onOpenTVView={() => setActiveTab('TV_VIEWER')}
            onProfileUpdated={(updatedUser) => {
              const merged = { ...currentUser, ...updatedUser };
              setCurrentUser(merged);
              localStorage.setItem('user', JSON.stringify(merged));
              localStorage.setItem('queueapp_user', JSON.stringify(merged));
            }}
          />
        )}

        {/* ========================================================================= */}
        {/* 4. TV View: Auto-mapped for Clinic Staff or Search & Select for Guest    */}
        {/* ========================================================================= */}
        {activeTab === 'TV_VIEWER' && (
          <TVViewerKiosk
            selectedClinicId={selectedClinicId}
            clinics={clinics}
            onSelectClinicId={setSelectedClinicId}
            clinicSlug={currentClinic?.slug}
            currentUser={currentUser}
            token={token}
          />
        )}

        {/* ========================================================================= */}
        {/* 5. Super Admin Profile: Root Multi-Tenant System Portal                   */}
        {/* ========================================================================= */}
        {activeTab === 'SUPER_ADMIN' && (
          <SuperAdminDashboard
            token={token}
            currentUser={currentUser}
            onSelectClinicAsStaff={(clinicId) => {
              setSelectedClinicId(clinicId);
              setActiveTab('CLINIC_ADMIN');
            }}
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

      {/* Patient Appointment Booking Modal (Fixed ₹200 Base + Optional ₹50 Live Queue Checkbox) */}
      <AppointmentBookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        clinics={clinics}
        preselectedClinicId={selectedClinicId}
        initialBookingType={bookingModalType}
        qrToken={bookingQrToken}
        currentUser={currentUser}
        token={token}
        onOpenPatientLogin={openPatientLogin}
        onLoginSuccess={handleLoginSuccess}
        onBookingConfirmed={(tokenNum, clinicId) => {
          if (clinicId) setSelectedClinicId(clinicId);
          setActiveTrackingToken(tokenNum);
          setActiveTab('PATIENT');
        }}
      />

      {/* Patient Profile Details Onboarding & Completion Modal */}
      <PatientProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          setProfileModalWarning(null);
          setPendingActionAfterProfile(null);
        }}
        currentUser={currentUser}
        token={token}
        warningMessage={profileModalWarning}
        canSkip={true}
        onProfileUpdated={(updatedUser) => {
          setCurrentUser(updatedUser);
        }}
        onProceedAfterComplete={() => {
          if (pendingBookingAfterLogin) {
            setIsBookingOpen(true);
            setPendingBookingAfterLogin(false);
          } else if (pendingActionAfterProfile) {
            pendingActionAfterProfile();
            setPendingActionAfterProfile(null);
          }
        }}
      />
    </div>
  );
}
