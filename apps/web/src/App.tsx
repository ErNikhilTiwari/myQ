import React, { useState } from 'react';
import { TVViewerKiosk } from './components/TVViewerKiosk';
import { ReceptionistConsole } from './components/ReceptionistConsole';
import { MobileTokenTracker } from './components/MobileTokenTracker';
import { Monitor, LayoutDashboard, Smartphone, Building2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'RECEPTIONIST' | 'TV_VIEWER' | 'MOBILE_TRACKER'>('RECEPTIONIST');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
      {/* Top Application Navigation Bar */}
      <nav className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <span className="text-xl">🏥</span>
          <div className="flex items-center space-x-1.5">
            <span className="font-extrabold tracking-tight text-white text-sm">QueueApp</span>
            <span className="bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded text-[10px] border border-emerald-500/30">
              Healthcare OS
            </span>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
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

        {/* Network & Tenant Indicator */}
        <div className="hidden sm:flex items-center space-x-2 text-slate-400 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Active Clinic: ABC Health</span>
        </div>
      </nav>

      {/* Main Render View */}
      <main className="flex-1 flex flex-col">
        {activeTab === 'RECEPTIONIST' && <ReceptionistConsole />}
        {activeTab === 'TV_VIEWER' && <TVViewerKiosk />}
        {activeTab === 'MOBILE_TRACKER' && <MobileTokenTracker />}
      </main>
    </div>
  );
}
