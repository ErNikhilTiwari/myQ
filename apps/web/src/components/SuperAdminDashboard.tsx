import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Building2, 
  Plus, 
  Search, 
  CreditCard, 
  Layers, 
  TrendingUp, 
  Users, 
  MapPin, 
  Phone, 
  Mail, 
  CheckCircle, 
  X, 
  AlertCircle,
  ExternalLink,
  Crown,
  FileSpreadsheet,
  RefreshCw,
  Sliders,
  DollarSign
} from 'lucide-react';

interface ClinicData {
  id: string;
  name: string;
  slug: string;
  phoneNumber: string;
  email?: string | null;
  address?: string | null;
  isActive: boolean;
  createdAt: string;
  doctorsCount: number;
  servicesCount: number;
}

interface SubscriptionData {
  id: string;
  clinicId: string;
  plan: string;
  status: string;
  currentPeriodEnd: string;
  maxDoctors: number;
  maxDailyTokens: number;
  clinicName: string;
}

interface HospitalChainData {
  id: string;
  name: string;
  code: string;
  headquarters?: string;
  clinicsCount: number;
}

interface SuperAdminDashboardProps {
  token: string | null;
  currentUser: any;
  onSelectClinicAsStaff?: (clinicId: string) => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
  token,
  currentUser,
  onSelectClinicAsStaff,
}) => {
  const [activeTab, setActiveTab] = useState<'CLINICS' | 'CHAINS' | 'SUBSCRIPTIONS'>('CLINICS');
  
  // Data states
  const [clinics, setClinics] = useState<ClinicData[]>([]);
  const [chains, setChains] = useState<HospitalChainData[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // New Clinic Modal
  const [showClinicModal, setShowClinicModal] = useState(false);
  const [newClinicName, setNewClinicName] = useState('');
  const [newClinicSlug, setNewClinicSlug] = useState('');
  const [newClinicPhone, setNewClinicPhone] = useState('');
  const [newClinicEmail, setNewClinicEmail] = useState('');
  const [newClinicAddress, setNewClinicAddress] = useState('');
  const [newClinicCity, setNewClinicCity] = useState('');
  const [newClinicChainId, setNewClinicChainId] = useState('');
  const [clinicFormError, setClinicFormError] = useState('');
  const [submittingClinic, setSubmittingClinic] = useState(false);

  // New Chain Modal
  const [showChainModal, setShowChainModal] = useState(false);
  const [chainName, setChainName] = useState('');
  const [chainCode, setChainCode] = useState('');
  const [chainHQ, setChainHQ] = useState('');
  const [chainFormError, setChainFormError] = useState('');
  const [submittingChain, setSubmittingChain] = useState(false);

  // Plan Upgrade Modal
  const [upgradeTarget, setUpgradeTarget] = useState<SubscriptionData | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE'>('PRO');
  const [submittingUpgrade, setSubmittingUpgrade] = useState(false);

  // Toast feedback state (guaranteed z-[99999] top-most)
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      const [cRes, chainRes, subRes] = await Promise.all([
        fetch('/api/clinics').then(r => r.json()),
        fetch('/api/hospital-chains').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/super/subscriptions', { headers }).then(r => r.json()).catch(() => ({ success: false })),
      ]);

      if (cRes?.success && Array.isArray(cRes.data)) setClinics(cRes.data);
      if (chainRes?.success && Array.isArray(chainRes.data)) setChains(chainRes.data);
      if (subRes?.success && Array.isArray(subRes.data)) setSubscriptions(subRes.data);
    } catch (err: any) {
      console.error('Failed to load super admin data:', err);
      showToast('error', 'Error loading administrative platform data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const handleCreateClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClinicName.trim() || !newClinicSlug.trim() || !newClinicPhone.trim()) {
      setClinicFormError('Clinic name, unique slug identifier, and phone number are required.');
      return;
    }

    setSubmittingClinic(true);
    setClinicFormError('');

    try {
      const res = await fetch('/api/super/clinics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newClinicName.trim(),
          slug: newClinicSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
          phoneNumber: newClinicPhone.startsWith('+91') ? newClinicPhone : `+91${newClinicPhone.replace(/\D/g, '')}`,
          email: newClinicEmail.trim() || undefined,
          address: newClinicAddress.trim() || undefined,
          city: newClinicCity.trim() || undefined,
          chainId: newClinicChainId || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setShowClinicModal(false);
        showToast('success', `Clinic facility "${newClinicName}" provisioned successfully!`);
        // Reset form
        setNewClinicName('');
        setNewClinicSlug('');
        setNewClinicPhone('');
        setNewClinicEmail('');
        setNewClinicAddress('');
        setNewClinicCity('');
        setNewClinicChainId('');
        loadData();
      } else {
        setClinicFormError(json.error?.message || json.message || 'Failed to create clinic facility');
      }
    } catch (err: any) {
      setClinicFormError(err.message || 'Network request failed');
    } finally {
      setSubmittingClinic(false);
    }
  };

  const handleCreateChain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chainName.trim() || !chainCode.trim()) {
      setChainFormError('Chain name and unique short code are required.');
      return;
    }

    setSubmittingChain(true);
    setChainFormError('');

    try {
      const res = await fetch('/api/super/hospital-chains', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: chainName.trim(),
          code: chainCode.trim().toUpperCase(),
          headquarters: chainHQ.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setShowChainModal(false);
        showToast('success', `Hospital Enterprise Chain "${chainName}" registered!`);
        setChainName('');
        setChainCode('');
        setChainHQ('');
        loadData();
      } else {
        setChainFormError(json.error?.message || json.message || 'Failed to create chain');
      }
    } catch (err: any) {
      setChainFormError(err.message || 'Network request failed');
    } finally {
      setSubmittingChain(false);
    }
  };

  const handleUpgradePlan = async () => {
    if (!upgradeTarget || !token) return;
    setSubmittingUpgrade(true);

    try {
      const res = await fetch(`/api/clinics/${upgradeTarget.clinicId}/subscription/upgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: selectedPlan }),
      });

      const json = await res.json();
      if (json.success) {
        setUpgradeTarget(null);
        showToast('success', `Subscription upgraded to ${selectedPlan} tier!`);
        loadData();
      } else {
        showToast('error', json.error?.message || json.message || 'Upgrade failed');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Network error');
    } finally {
      setSubmittingUpgrade(false);
    }
  };

  const filteredClinics = clinics.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.address && c.address.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC] text-[#334155] p-4 md:p-6 overflow-y-auto">
      {/* Toast Notification - Guaranteed top-most z-[99999] */}
      {toastMsg && (
        <div
          className={`fixed top-5 right-5 z-[99999] px-5 py-3.5 rounded-2xl shadow-2xl flex items-center space-x-2.5 text-xs sm:text-sm font-bold transition-all duration-200 animate-in slide-in-from-top-4 border pointer-events-auto ${
            toastMsg.type === 'success'
              ? 'bg-[#16A34A] text-white border-green-400/30 ring-4 ring-green-600/20'
              : 'bg-[#DC2626] text-white border-red-400/30 ring-4 ring-red-600/20'
          }`}
        >
          {toastMsg.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#0F172A] text-white flex items-center justify-center font-black text-xl shadow-md border border-slate-700">
            👑
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-[#1E293B] tracking-tight">Super Admin Platform Portal</h1>
              <span className="bg-amber-100 text-amber-800 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase border border-amber-300">
                Root System
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5 font-medium">
              Multi-tenant clinic provisioning, hospital chain hierarchies, and subscription tiers
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={loadData}
            title="Refresh Platform Data"
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0284C7]' : ''}`} />
          </button>

          <button
            onClick={() => setShowChainModal(true)}
            className="flex items-center space-x-1.5 bg-[#1E293B] hover:bg-[#0F172A] text-white px-3.5 py-2 rounded-xl font-bold text-xs shadow-sm transition active:scale-95"
          >
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
            <span>New Hospital Chain</span>
          </button>

          <button
            onClick={() => setShowClinicModal(true)}
            className="flex items-center space-x-1.5 bg-[#0284C7] hover:bg-[#0369A1] text-white px-4 py-2 rounded-xl font-bold text-xs shadow-sm transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Provision New Clinic</span>
          </button>
        </div>
      </div>

      {/* KPI Platform Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Total Clinics</span>
            <Building2 className="w-4 h-4 text-[#0284C7]" />
          </div>
          <div className="text-2xl font-black text-[#1E293B] mt-1">{clinics.length}</div>
          <span className="text-[10px] text-[#16A34A] font-semibold mt-0.5 block">Active Facilities</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Hospital Chains</span>
            <Layers className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-[#1E293B] mt-1">{chains.length}</div>
          <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">Enterprise Groups</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Subscriptions</span>
            <Crown className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-[#1E293B] mt-1">{subscriptions.length}</div>
          <span className="text-[10px] text-purple-600 font-semibold mt-0.5 block">Provisioned Tiers</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Total Clinicians</span>
            <Users className="w-4 h-4 text-[#16A34A]" />
          </div>
          <div className="text-2xl font-black text-[#1E293B] mt-1">
            {clinics.reduce((sum, c) => sum + (c.doctorsCount || 0), 0)}
          </div>
          <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">Across Facilities</span>
        </div>
      </div>

      {/* Tabs Switcher & Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex bg-[#F1F5F9] p-1 rounded-xl text-xs font-bold shrink-0">
          <button
            onClick={() => setActiveTab('CLINICS')}
            className={`px-3.5 py-1.5 rounded-lg transition ${
              activeTab === 'CLINICS' ? 'bg-white text-[#1E293B] shadow-sm' : 'text-[#64748B] hover:text-[#1E293B]'
            }`}
          >
            Clinics Directory ({clinics.length})
          </button>
          <button
            onClick={() => setActiveTab('CHAINS')}
            className={`px-3.5 py-1.5 rounded-lg transition ${
              activeTab === 'CHAINS' ? 'bg-white text-[#1E293B] shadow-sm' : 'text-[#64748B] hover:text-[#1E293B]'
            }`}
          >
            Hospital Chains ({chains.length})
          </button>
          <button
            onClick={() => setActiveTab('SUBSCRIPTIONS')}
            className={`px-3.5 py-1.5 rounded-lg transition ${
              activeTab === 'SUBSCRIPTIONS' ? 'bg-white text-[#1E293B] shadow-sm' : 'text-[#64748B] hover:text-[#1E293B]'
            }`}
          >
            SaaS Subscriptions ({subscriptions.length})
          </button>
        </div>

        {activeTab === 'CLINICS' && (
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search clinic or slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs font-semibold text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* TAB 1: CLINICS DIRECTORY */}
      {activeTab === 'CLINICS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClinics.length === 0 ? (
            <div className="col-span-full py-16 text-center text-xs text-[#64748B] bg-white rounded-2xl border border-slate-200">
              No clinics match your query. Click "Provision New Clinic" to add one.
            </div>
          ) : (
            filteredClinics.map((clinic) => (
              <div 
                key={clinic.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-extrabold text-[#1E293B] text-base">{clinic.name}</h3>
                      <span className="text-[11px] font-mono text-[#0284C7] bg-[#E0F2FE] px-2 py-0.5 rounded-md font-semibold">
                        /{clinic.slug}
                      </span>
                    </div>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#16A34A]">
                      Active
                    </span>
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs text-[#64748B]">
                    {clinic.address && (
                      <div className="flex items-center space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{clinic.address}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1.5">
                      <Phone className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span>{clinic.phoneNumber}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Physicians: <b className="text-[#1E293B]">{clinic.doctorsCount || 0}</b></span>
                    <span className="text-slate-500 font-medium">Services: <b className="text-[#1E293B]">{clinic.servicesCount || 0}</b></span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">
                    ID: {clinic.id.slice(0, 8)}...
                  </span>

                  {onSelectClinicAsStaff && (
                    <button
                      onClick={() => onSelectClinicAsStaff(clinic.id)}
                      className="text-xs font-bold text-[#0284C7] hover:underline flex items-center space-x-1"
                    >
                      <span>Open Desk</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: HOSPITAL CHAINS */}
      {activeTab === 'CHAINS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {chains.length === 0 ? (
            <div className="col-span-full py-16 text-center text-xs text-[#64748B] bg-white rounded-2xl border border-slate-200">
              No hospital enterprise chains configured. Register groups like Apollo, Fortis, or Manipal.
            </div>
          ) : (
            chains.map((chain) => (
              <div 
                key={chain.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-extrabold text-[#1E293B] text-base">{chain.name}</h3>
                      <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        CODE: {chain.code}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      Multi-Tenant Chain
                    </span>
                  </div>

                  {chain.headquarters && (
                    <div className="mt-3 flex items-center space-x-1.5 text-xs text-[#64748B]">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>HQ: {chain.headquarters}</span>
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-[#64748B]">
                    <span>Linked Clinics: </span>
                    <span className="font-bold text-[#1E293B]">{chain.clinicsCount || 0} Locations</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: SAAS SUBSCRIPTIONS */}
      {activeTab === 'SUBSCRIPTIONS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subscriptions.length === 0 ? (
            <div className="col-span-full py-16 text-center text-xs text-[#64748B] bg-white rounded-2xl border border-slate-200">
              No active subscription records found.
            </div>
          ) : (
            subscriptions.map((sub) => (
              <div 
                key={sub.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-extrabold text-[#1E293B] text-base">{sub.clinicName || 'Clinic'}</h3>
                      <div className="flex items-center space-x-1.5 mt-1">
                        <Crown className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-xs font-black uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          {sub.plan} Plan
                        </span>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      sub.status === 'ACTIVE' ? 'bg-[#DCFCE7] text-[#16A34A]' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {sub.status}
                    </span>
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs text-[#64748B]">
                    <div className="flex justify-between">
                      <span>Doctor Chamber Limit:</span>
                      <span className="font-bold text-[#1E293B] font-mono">{sub.maxDoctors}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Daily Token Quota:</span>
                      <span className="font-bold text-[#1E293B] font-mono">{sub.maxDailyTokens}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Renews On:</span>
                      <span className="font-medium text-[#1E293B]">
                        {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end">
                  <button
                    onClick={() => {
                      setUpgradeTarget(sub);
                      setSelectedPlan(sub.plan as any || 'PRO');
                    }}
                    className="flex items-center space-x-1 text-xs font-bold text-[#0284C7] bg-[#E0F2FE] hover:bg-sky-100 px-3 py-1.5 rounded-xl transition"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Change Tier</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL 1: PROVISION NEW CLINIC */}
      {showClinicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <Building2 className="w-5 h-5 text-[#0284C7]" />
                <h3 className="font-black text-lg text-[#1E293B]">Provision New Clinic Facility</h3>
              </div>
              <button onClick={() => setShowClinicModal(false)} className="p-1 hover:bg-slate-100 text-slate-400 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {clinicFormError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{clinicFormError}</span>
              </div>
            )}

            <form onSubmit={handleCreateClinic} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#64748B] block mb-1">Clinic Name</label>
                  <input
                    type="text"
                    placeholder="e.g. City Care Clinic"
                    value={newClinicName}
                    onChange={(e) => {
                      setNewClinicName(e.target.value);
                      if (!newClinicSlug) {
                        setNewClinicSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                      }
                    }}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#64748B] block mb-1">Unique URL Slug</label>
                  <input
                    type="text"
                    placeholder="e.g. city-care"
                    value={newClinicSlug}
                    onChange={(e) => setNewClinicSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-semibold text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#64748B] block mb-1">Phone Number (+91)</label>
                  <input
                    type="text"
                    placeholder="+919876543210"
                    value={newClinicPhone}
                    onChange={(e) => setNewClinicPhone(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#64748B] block mb-1">Contact Email</label>
                  <input
                    type="email"
                    placeholder="clinic@example.com"
                    value={newClinicEmail}
                    onChange={(e) => setNewClinicEmail(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#64748B] block mb-1">City</label>
                  <input
                    type="text"
                    placeholder="e.g. Bengaluru, Mumbai"
                    value={newClinicCity}
                    onChange={(e) => setNewClinicCity(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#64748B] block mb-1">Hospital Chain (Optional)</label>
                  <select
                    value={newClinicChainId}
                    onChange={(e) => setNewClinicChainId(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
                  >
                    <option value="">-- Independent Clinic --</option>
                    {chains.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        {ch.name} ({ch.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#64748B] block mb-1">Street Address</label>
                <input
                  type="text"
                  placeholder="e.g. 104 Park Avenue, Medical Enclave"
                  value={newClinicAddress}
                  onChange={(e) => setNewClinicAddress(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowClinicModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[#64748B] hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingClinic}
                  className="px-5 py-2 text-xs font-bold bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {submittingClinic ? 'Provisioning...' : 'Provision Clinic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: NEW HOSPITAL CHAIN */}
      {showChainModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <Building2 className="w-5 h-5 text-amber-500" />
                <h3 className="font-black text-lg text-[#1E293B]">Register Hospital Chain</h3>
              </div>
              <button onClick={() => setShowChainModal(false)} className="p-1 hover:bg-slate-100 text-slate-400 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {chainFormError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{chainFormError}</span>
              </div>
            )}

            <form onSubmit={handleCreateChain} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-[#64748B] block mb-1">Chain Name</label>
                <input
                  type="text"
                  placeholder="e.g. Apollo Hospitals Group"
                  value={chainName}
                  onChange={(e) => setChainName(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#64748B] block mb-1">Chain Short Code</label>
                <input
                  type="text"
                  placeholder="e.g. APOLLO, MANIPAL"
                  value={chainCode}
                  onChange={(e) => setChainCode(e.target.value.toUpperCase())}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-semibold text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#64748B] block mb-1">Corporate Headquarters (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Chennai, India"
                  value={chainHQ}
                  onChange={(e) => setChainHQ(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowChainModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[#64748B] hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingChain}
                  className="px-5 py-2 text-xs font-bold bg-[#1E293B] hover:bg-[#0F172A] text-white rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {submittingChain ? 'Registering...' : 'Register Chain'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CHANGE SUBSCRIPTION TIER */}
      {upgradeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <Crown className="w-5 h-5 text-purple-600" />
                <h3 className="font-black text-lg text-[#1E293B]">Upgrade Subscription Tier</h3>
              </div>
              <button onClick={() => setUpgradeTarget(null)} className="p-1 hover:bg-slate-100 text-slate-400 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#64748B] mt-3">
              Configure subscription tier for <b className="text-[#1E293B]">{upgradeTarget.clinicName}</b>
            </p>

            <div className="mt-4 space-y-2.5">
              {(['FREE', 'STARTER', 'PRO', 'ENTERPRISE'] as const).map((tier) => (
                <label
                  key={tier}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition ${
                    selectedPlan === tier 
                      ? 'border-[#0284C7] bg-[#E0F2FE]/50 ring-2 ring-[#0284C7]/20' 
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <input
                      type="radio"
                      name="subscriptionTier"
                      checked={selectedPlan === tier}
                      onChange={() => setSelectedPlan(tier)}
                      className="text-[#0284C7] focus:ring-[#0284C7]"
                    />
                    <div>
                      <span className="font-extrabold text-xs text-[#1E293B] block">{tier}</span>
                      <span className="text-[10px] text-slate-500">
                        {tier === 'FREE' ? '1 Doctor, 50 Tokens/day' :
                         tier === 'STARTER' ? '3 Doctors, 150 Tokens/day' :
                         tier === 'PRO' ? '10 Doctors, Unlimited Tokens' :
                         'Unlimited Doctors & Multi-Chains'}
                      </span>
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-5 pt-3 flex items-center justify-end space-x-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUpgradeTarget(null)}
                className="px-4 py-2 text-xs font-bold text-[#64748B] hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpgradePlan}
                disabled={submittingUpgrade}
                className="px-5 py-2 text-xs font-bold bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-xl shadow-md transition disabled:opacity-50"
              >
                {submittingUpgrade ? 'Updating...' : 'Save Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
