import React, { useState, useEffect } from 'react';
import { TVViewerKiosk } from './components/TVViewerKiosk';
import { ReceptionistConsole } from './components/ReceptionistConsole';
import { MobileTokenTracker } from './components/MobileTokenTracker';
import { LoginModal } from './components/LoginModal';
import { ClinicSearchSelect, ClinicItem } from './components/ClinicSearchSelect';
import { Monitor, LayoutDashboard, Smartphone, Building2, LogIn, LogOut } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'RECEPTIONIST' | 'TV_VIEWER' | 'MOBILE_TRACKER'>('RECEPTIONIST');
  
  // Multi-Tenant Clinic State - EMPTY BY DEFAULT
  const [clinics, setClinics] = useState<ClinicItem[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string>('');

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
        if (res.success && res.data) {
          setClinics(res.data);
          // Keep empty by default unless user is logged in with a clinic assignment
        }
      })
      .catch((err) => {
        console.warn('Could not fetch clinics list:', err);
      });
  }, []);

  // When staff logs in, auto-bind to their assigned clinic
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

  const currentClinic = clinics.find((c) => c.id === selectedClinicId);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#334155] flex flex-col font-sans antialiased">
      {/* Top Application Navigation Bar - Primary Navy (#1E293B) */}
      <nav className="bg-[#1E293B] text-white px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between text-xs sticky top-0 z-40 shadow-sm gap-2">
        <div className="flex items-center space-x-3">
          <span className="text-xl">🏥</span>
          <div className="flex items-center space-x-2">
            <span className="font-extrabold tracking-tight text-white text-base">QueueApp</span>
            <span className="bg-[#0284C7]/20 text-[#38BDF8] font-bold px-2 py-0.5 rounded text-[10px] border border-[#0284C7]/40">
              Healthcare OS
            </span>
          </div>

          {/* Global Multi-Tenant Clinic Search & Select */}
          <div className="hidden lg:flex items-center space-x-1.5 text-slate-200">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Clinic:</span>
            <ClinicSearchSelect
              clinics={clinics}
              selectedClinicId={selectedClinicId}
              onSelectClinicId={setSelectedClinicId}
              variant="navbar"
            />
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex space-x-1 bg-[#0F172A] p-1 rounded-xl border border-slate-700/80 order-3 sm:order-2">
          <button
            onClick={() => setActiveTab('RECEPTIONIST')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition ${
              activeTab === 'RECEPTIONIST'
                ? 'bg-[#0284C7] text-white shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Receptionist Console</span>
          </button>

          <button
            onClick={() => setActiveTab('TV_VIEWER')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition ${
              activeTab === 'TV_VIEWER'
                ? 'bg-[#0284C7] text-white shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>TV Viewer Kiosk</span>
          </button>

          <button
            onClick={() => setActiveTab('MOBILE_TRACKER')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition ${
              activeTab === 'MOBILE_TRACKER'
                ? 'bg-[#0284C7] text-white shadow-sm'
                : 'text-slate-300 hover:text-white'
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
              onClick={() => setIsLoginOpen(true)}
              className="flex items-center space-x-1.5 bg-[#0284C7] hover:bg-[#0369A1] text-white px-3 py-1.5 rounded-xl font-bold text-xs shadow-sm transition"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Staff Login</span>
            </button>
          )}
        </div>
      </nav>

      {/* Main Render View - Soft Off-White Canvas (#F8FAFC) */}
      <main className="flex-1 flex flex-col bg-[#F8FAFC]">
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
            selectedClinicId={selectedClinicId}
            onSelectClinicId={setSelectedClinicId}
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
