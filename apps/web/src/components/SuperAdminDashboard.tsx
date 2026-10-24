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
  DollarSign,
  UserCheck,
  UserPlus,
  Edit3,
  Trash2,
  ChevronRight,
  Stethoscope,
  Sparkles,
  Check
} from 'lucide-react';

export interface ClinicReceptionistSummaryData {
  clinicId: string;
  clinicName: string;
  clinicSlug: string;
  clinicPhone: string;
  receptionist: {
    id: string;
    userId: string;
    name: string;
    phoneNumber: string;
    email?: string | null;
    isActive: boolean;
    createdAt: string;
  } | null;
}

interface ClinicData {
  id: string;
  chainId?: string | null;
  name: string;
  slug: string;
  phoneNumber: string;
  city?: string | null;
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

export interface ChainClinicData {
  id: string;
  name: string;
  slug: string;
  phoneNumber: string;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  inClinicPrice?: number;
  remotePrice?: number;
  voiceAnnouncementMode?: string;
  isActive: boolean;
  createdAt?: string;
  doctorsCount?: number;
  servicesCount?: number;
  queuesCount?: number;
  receptionist?: {
    id: string;
    name: string;
    phoneNumber: string;
    email?: string | null;
  } | null;
  admin?: {
    id: string;
    name: string;
    phoneNumber: string;
    email?: string | null;
  } | null;
}

interface HospitalChainData {
  id: string;
  name: string;
  code: string;
  headquarters?: string;
  clinicsCount: number;
  clinics?: ChainClinicData[];
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
  const [activeTab, setActiveTab] = useState<'CLINICS' | 'CHAINS' | 'SUBSCRIPTIONS' | 'RECEPTIONISTS'>('CLINICS');
  
  // Data states
  const [clinics, setClinics] = useState<ClinicData[]>([]);
  const [chains, setChains] = useState<HospitalChainData[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([]);
  const [receptionists, setReceptionists] = useState<ClinicReceptionistSummaryData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [recSearchQuery, setRecSearchQuery] = useState('');
  const [clinicChainFilter, setClinicChainFilter] = useState('ALL');
  const [clinicCityFilter, setClinicCityFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);

  // New Clinic Modal
  const [showClinicModal, setShowClinicModal] = useState(false);
  const [newClinicName, setNewClinicName] = useState('');
  const [newClinicSlug, setNewClinicSlug] = useState('');
  const [newClinicPhone, setNewClinicPhone] = useState('');
  const [newClinicAdminPassword, setNewClinicAdminPassword] = useState('');
  const [newClinicEmail, setNewClinicEmail] = useState('');
  const [newClinicAddress, setNewClinicAddress] = useState('');
  const [newClinicCity, setNewClinicCity] = useState('');
  const [newClinicChainId, setNewClinicChainId] = useState('');
  const [newClinicReceptionistName, setNewClinicReceptionistName] = useState('');
  const [newClinicReceptionistPhone, setNewClinicReceptionistPhone] = useState('');
  const [newClinicReceptionistPassword, setNewClinicReceptionistPassword] = useState('');
  const [clinicFormError, setClinicFormError] = useState('');
  const [submittingClinic, setSubmittingClinic] = useState(false);

  // Super Admin Receptionist Management Modals
  const [assignClinic, setAssignClinic] = useState<{ id: string; name: string } | null>(null);
  const [editReceptionistTarget, setEditReceptionistTarget] = useState<{ clinicId: string; clinicName: string; name: string; phone: string } | null>(null);
  const [deleteReceptionistTarget, setDeleteReceptionistTarget] = useState<{ clinicId: string; clinicName: string; name: string } | null>(null);
  const [recFormName, setRecFormName] = useState('');
  const [recFormPhone, setRecFormPhone] = useState('');
  const [recFormPassword, setRecFormPassword] = useState('');
  const [recFormError, setRecFormError] = useState('');
  const [recSubmitting, setRecSubmitting] = useState(false);

  // New Chain Modal
  const [showChainModal, setShowChainModal] = useState(false);
  const [chainName, setChainName] = useState('');
  const [chainCode, setChainCode] = useState('');
  const [chainHQ, setChainHQ] = useState('');
  const [chainFormError, setChainFormError] = useState('');
  const [submittingChain, setSubmittingChain] = useState(false);

  // Selected Hospital Chain for Registered Clinics Detail Modal
  const [selectedChain, setSelectedChain] = useState<HospitalChainData | null>(null);
  const [chainClinicsFilter, setChainClinicsFilter] = useState('');
  const [loadingChainDetails, setLoadingChainDetails] = useState(false);

  const handleSelectChain = async (chain: HospitalChainData) => {
    setSelectedChain(chain);
    setChainClinicsFilter('');
    try {
      setLoadingChainDetails(true);
      const res = await fetch(`/api/hospital-chains/${chain.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success && data.data) {
        setSelectedChain(data.data);
      }
    } catch (err) {
      console.warn('Could not fetch fresh chain details:', err);
    } finally {
      setLoadingChainDetails(false);
    }
  };

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
      const [cRes, chainRes, subRes, recRes] = await Promise.all([
        fetch('/api/clinics').then(r => r.json()),
        fetch('/api/hospital-chains').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/super/subscriptions', { headers }).then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/super/receptionists', { headers }).then(r => r.json()).catch(() => ({ success: false })),
      ]);

      if (cRes?.success && Array.isArray(cRes.data)) setClinics(cRes.data);
      if (chainRes?.success && Array.isArray(chainRes.data)) setChains(chainRes.data);
      if (subRes?.success && Array.isArray(subRes.data)) setSubscriptions(subRes.data);
      if (recRes?.success && Array.isArray(recRes.data)) setReceptionists(recRes.data);
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
      setClinicFormError('Clinic name, unique slug identifier, and mobile number are required.');
      return;
    }

    const cleanPhoneDigits = newClinicPhone.replace(/\D/g, '').slice(-10);
    if (cleanPhoneDigits.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhoneDigits)) {
      setClinicFormError('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9 for the clinic.');
      return;
    }

    if (newClinicReceptionistPhone.trim()) {
      const cleanRecDigits = newClinicReceptionistPhone.replace(/\D/g, '').slice(-10);
      if (cleanRecDigits.length !== 10 || !/^[6-9]\d{9}$/.test(cleanRecDigits)) {
        setClinicFormError('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9 for the receptionist.');
        return;
      }
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
          phoneNumber: cleanPhoneDigits,
          adminPassword: newClinicAdminPassword.trim() || undefined,
          email: newClinicEmail.trim() || undefined,
          address: newClinicAddress.trim() || undefined,
          city: newClinicCity.trim() || undefined,
          chainId: newClinicChainId || undefined,
          receptionistName: newClinicReceptionistName.trim() || undefined,
          receptionistPhoneNumber: newClinicReceptionistPhone.trim() ? newClinicReceptionistPhone.replace(/\D/g, '').slice(-10) : undefined,
          receptionistPassword: newClinicReceptionistPassword.trim() || undefined,
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
        setNewClinicAdminPassword('');
        setNewClinicEmail('');
        setNewClinicAddress('');
        setNewClinicCity('');
        setNewClinicChainId('');
        setNewClinicReceptionistName('');
        setNewClinicReceptionistPhone('');
        setNewClinicReceptionistPassword('');
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

  const handleSuperAssignReceptionist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignClinic) return;
    if (!recFormName.trim() || !recFormPhone.trim()) {
      setRecFormError('Receptionist name and mobile number are required.');
      return;
    }

    const cleanDigits = recFormPhone.replace(/\D/g, '').slice(-10);
    if (cleanDigits.length !== 10) {
      setRecFormError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setRecSubmitting(true);
    setRecFormError('');

    try {
      const res = await fetch(`/api/clinics/${assignClinic.id}/receptionist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: recFormName.trim(),
          phoneNumber: cleanDigits,
          password: recFormPassword.trim() || 'Password@123',
        }),
      });

      const json = await res.json();
      if (json.success) {
        showToast('success', `Receptionist assigned to "${assignClinic.name}" successfully!`);
        setAssignClinic(null);
        setRecFormName('');
        setRecFormPhone('');
        setRecFormPassword('');
        loadData();
      } else {
        setRecFormError(json.error?.message || json.message || 'Failed to assign receptionist');
      }
    } catch (err: any) {
      setRecFormError(err.message || 'Network error while assigning receptionist');
    } finally {
      setRecSubmitting(false);
    }
  };

  const handleSuperEditReceptionist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editReceptionistTarget) return;
    if (!recFormName.trim() || !recFormPhone.trim()) {
      setRecFormError('Receptionist name and mobile number are required.');
      return;
    }

    const cleanDigits = recFormPhone.replace(/\D/g, '').slice(-10);
    if (cleanDigits.length !== 10) {
      setRecFormError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setRecSubmitting(true);
    setRecFormError('');

    try {
      const payload: any = {
        name: recFormName.trim(),
        phoneNumber: cleanDigits,
      };
      if (recFormPassword.trim()) {
        payload.password = recFormPassword.trim();
      }

      const res = await fetch(`/api/clinics/${editReceptionistTarget.clinicId}/receptionist`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        showToast('success', `Receptionist updated for "${editReceptionistTarget.clinicName}"!`);
        setEditReceptionistTarget(null);
        setRecFormName('');
        setRecFormPhone('');
        setRecFormPassword('');
        loadData();
      } else {
        setRecFormError(json.error?.message || json.message || 'Failed to update receptionist');
      }
    } catch (err: any) {
      setRecFormError(err.message || 'Network error while updating receptionist');
    } finally {
      setRecSubmitting(false);
    }
  };

  const handleSuperDeleteReceptionist = async () => {
    if (!deleteReceptionistTarget) return;
    setRecSubmitting(true);
    try {
      const res = await fetch(`/api/clinics/${deleteReceptionistTarget.clinicId}/receptionist`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const json = await res.json();
      if (json.success) {
        showToast('success', `Receptionist removed from "${deleteReceptionistTarget.clinicName}".`);
        setDeleteReceptionistTarget(null);
        loadData();
      } else {
        showToast('error', json.error?.message || json.message || 'Failed to remove receptionist');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Network error while removing receptionist');
    } finally {
      setRecSubmitting(false);
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

  const uniqueCities = Array.from(
    new Set(clinics.map((c) => c.city).filter((city): city is string => Boolean(city && city.trim())))
  ).sort();

  const filteredClinics = clinics.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    const cleanQDigits = q.replace(/\D/g, '');
    const cleanPhoneDigits = c.phoneNumber ? c.phoneNumber.replace(/\D/g, '') : '';

    const matchesQuery = !q || Boolean(
      c.name.toLowerCase().includes(q) ||
      c.slug.toLowerCase().includes(q) ||
      (c.city && c.city.toLowerCase().includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (cleanQDigits.length > 0 && cleanPhoneDigits.includes(cleanQDigits)) ||
      c.phoneNumber.includes(q)
    );

    const matchesChain = clinicChainFilter === 'ALL' ||
      (clinicChainFilter === 'STANDALONE' ? !c.chainId : c.chainId === clinicChainFilter);

    const matchesCity = clinicCityFilter === 'ALL' || c.city === clinicCityFilter;

    return matchesQuery && matchesChain && matchesCity;
  });

  const filteredReceptionists = receptionists.filter(r => 
    r.clinicName.toLowerCase().includes(recSearchQuery.toLowerCase()) ||
    r.clinicSlug.toLowerCase().includes(recSearchQuery.toLowerCase()) ||
    (r.receptionist && (
      r.receptionist.name.toLowerCase().includes(recSearchQuery.toLowerCase()) ||
      r.receptionist.phoneNumber.includes(recSearchQuery)
    ))
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
            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Receptionists</span>
            <UserCheck className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-[#1E293B] mt-1">
            {receptionists.filter(r => r.receptionist !== null).length} / {clinics.length}
          </div>
          <span className="text-[10px] text-teal-600 font-semibold mt-0.5 block">1 Per Clinic Max</span>
        </div>
      </div>

      {/* Tabs Switcher & Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap bg-[#F1F5F9] p-1 rounded-xl text-xs font-bold shrink-0 gap-1">
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
          <button
            onClick={() => setActiveTab('RECEPTIONISTS')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg transition ${
              activeTab === 'RECEPTIONISTS' ? 'bg-white text-[#1E293B] shadow-sm' : 'text-[#64748B] hover:text-[#1E293B]'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>Manage Receptionists ({receptionists.filter(r => r.receptionist !== null).length}/{receptionists.length || clinics.length})</span>
          </button>
        </div>

        {activeTab === 'RECEPTIONISTS' && (
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search clinic or receptionist..."
              value={recSearchQuery}
              onChange={(e) => setRecSearchQuery(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs font-semibold text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* TAB 1: CLINICS DIRECTORY */}
      {activeTab === 'CLINICS' && (
        <div className="space-y-4">
          {/* Clinic Directory Search & Filter Controls */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search clinics by name, slug, phone, city, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl pl-10 pr-9 py-2 text-xs font-semibold text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] focus:outline-none placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {chains.length > 0 && (
                <select
                  value={clinicChainFilter}
                  onChange={(e) => setClinicChainFilter(e.target.value)}
                  className="bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
                >
                  <option value="ALL">All Hospital Chains</option>
                  <option value="STANDALONE">Standalone Clinics Only</option>
                  {chains.map((chain) => (
                    <option key={chain.id} value={chain.id}>
                      {chain.name} ({chain.code})
                    </option>
                  ))}
                </select>
              )}

              {uniqueCities.length > 0 && (
                <select
                  value={clinicCityFilter}
                  onChange={(e) => setClinicCityFilter(e.target.value)}
                  className="bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
                >
                  <option value="ALL">All Cities</option>
                  {uniqueCities.map((city) => (
                    <option key={city} value={city}>
                      📍 {city}
                    </option>
                  ))}
                </select>
              )}

              {(searchQuery || clinicChainFilter !== 'ALL' || clinicCityFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setClinicChainFilter('ALL');
                    setClinicCityFilter('ALL');
                  }}
                  className="text-xs font-bold text-[#0284C7] hover:text-[#0369A1] px-2.5 py-1.5 rounded-xl hover:bg-sky-50 transition border border-transparent hover:border-sky-200"
                >
                  Reset Filters
                </button>
              )}

              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 shrink-0">
                {filteredClinics.length} of {clinics.length} Clinics
              </span>
            </div>
          </div>

          {/* Clinics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClinics.length === 0 ? (
              <div className="col-span-full py-16 text-center text-xs text-[#64748B] bg-white rounded-2xl border border-slate-200 p-6">
                <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700 text-sm">No clinics match your query</p>
                <p className="text-slate-400 mt-1">
                  {(searchQuery || clinicChainFilter !== 'ALL' || clinicCityFilter !== 'ALL')
                    ? "Try adjusting your search terms or clearing the selected filters."
                    : "No clinics have been provisioned yet. Click \"Provision New Clinic\" above to create one."}
                </p>
                {(searchQuery || clinicChainFilter !== 'ALL' || clinicCityFilter !== 'ALL') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setClinicChainFilter('ALL');
                      setClinicCityFilter('ALL');
                    }}
                    className="mt-3 inline-flex items-center space-x-1.5 bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold px-3 py-1.5 rounded-xl transition"
                  >
                    <span>Clear Search & Filters</span>
                  </button>
                )}
              </div>
            ) : (
              filteredClinics.map((clinic) => {
                const chain = clinic.chainId ? chains.find((c) => c.id === clinic.chainId) : null;
                return (
                  <div 
                    key={clinic.id}
                    className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-extrabold text-[#1E293B] text-base">{clinic.name}</h3>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="text-[11px] font-mono text-[#0284C7] bg-[#E0F2FE] px-2 py-0.5 rounded-md font-semibold">
                              /{clinic.slug}
                            </span>
                            {chain && (
                              <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                <Layers className="w-3 h-3 text-amber-600" />
                                <span>{chain.name}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#16A34A]">
                          Active
                        </span>
                      </div>

                      <div className="mt-4 space-y-1.5 text-xs text-[#64748B]">
                        {clinic.city && (
                          <div className="flex items-center space-x-1.5 text-slate-700 font-semibold">
                            <MapPin className="w-3.5 h-3.5 shrink-0 text-[#0284C7]" />
                            <span>{clinic.city}</span>
                          </div>
                        )}
                        {clinic.address && (
                          <div className="flex items-center space-x-1.5">
                            <span className="text-slate-400 text-xs shrink-0 pl-5 truncate">{clinic.address}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-1.5">
                          <Phone className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                          <span>{clinic.phoneNumber}</span>
                        </div>
                        {clinic.email && (
                          <div className="flex items-center space-x-1.5">
                            <Mail className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                            <span className="truncate">{clinic.email}</span>
                          </div>
                        )}
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
                );
              })
            )}
          </div>
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
                onClick={() => handleSelectChain(chain)}
                className="bg-white border-2 border-slate-200/90 hover:border-amber-400 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between group active:scale-[0.99]"
                title="Click to view all registered clinics in this chain"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-extrabold text-[#1E293B] text-base group-hover:text-amber-700 transition-colors">
                        {chain.name}
                      </h3>
                      <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        CODE: {chain.code}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/70">
                      Multi-Tenant Chain
                    </span>
                  </div>

                  {chain.headquarters && (
                    <div className="mt-3 flex items-center space-x-1.5 text-xs text-[#64748B]">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>HQ: {chain.headquarters}</span>
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[#64748B]">Linked Clinics: </span>
                      <span className="font-bold text-[#1E293B]">
                        {chain.clinicsCount || chain.clinics?.length || 0} Locations
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 group-hover:bg-amber-600 group-hover:text-white px-2.5 py-1 rounded-xl transition flex items-center space-x-1">
                      <span>View Clinics</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
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

      {/* TAB 4: MANAGE RECEPTIONISTS */}
      {activeTab === 'RECEPTIONISTS' && (
        <div className="space-y-4">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200/80 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-black text-slate-800 tracking-tight">Facility Receptionists Directory</h2>
                  <span className="bg-teal-100 text-teal-800 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase border border-teal-300">
                    Strict 1 Per Clinic Limit
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5 font-medium">
                  Super Admin platform portal to assign, configure, or reassign front desk receptionists across all clinics.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4 bg-white/80 border border-teal-200/60 rounded-xl px-4 py-2 shrink-0">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Desks</span>
                <span className="text-base font-black text-teal-700">
                  {receptionists.filter(r => r.receptionist !== null).length} / {receptionists.length || clinics.length}
                </span>
              </div>
              <div className="w-px h-8 bg-teal-200/60" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Unassigned</span>
                <span className="text-base font-black text-amber-600">
                  {receptionists.filter(r => r.receptionist === null).length}
                </span>
              </div>
            </div>
          </div>

          {/* Clinics & Receptionists Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReceptionists.length === 0 ? (
              <div className="col-span-full py-16 text-center text-xs text-[#64748B] bg-white rounded-2xl border border-slate-200">
                No clinics or receptionists match "{recSearchQuery}".
              </div>
            ) : (
              filteredReceptionists.map((item) => (
                <div
                  key={item.clinicId}
                  className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    {/* Clinic Header */}
                    <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-black text-sm text-[#1E293B]">{item.clinicName}</h3>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          slug: {item.clinicSlug} • phone: {item.clinicPhone}
                        </p>
                      </div>

                      {item.receptionist ? (
                        <span className="bg-emerald-50 text-emerald-700 text-[10px] px-2.5 py-0.5 rounded-full font-bold border border-emerald-200 shrink-0">
                          1/1 Assigned
                        </span>
                      ) : (
                        <span className="bg-amber-50 text-amber-700 text-[10px] px-2.5 py-0.5 rounded-full font-bold border border-amber-200 shrink-0">
                          Unassigned
                        </span>
                      )}
                    </div>

                    {/* Receptionist Body */}
                    <div className="mt-4">
                      {item.receptionist ? (
                        <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3.5 space-y-2">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                              {item.receptionist.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-800">{item.receptionist.name}</div>
                              <div className="text-[11px] text-slate-500 font-mono flex items-center space-x-1">
                                <Phone className="w-3 h-3 text-teal-600" />
                                <span>{item.receptionist.phoneNumber}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200/60">
                            <span>Role: RECEPTIONIST</span>
                            <span>Assigned: {new Date(item.receptionist.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-3.5 text-center">
                          <p className="text-xs text-amber-900 font-semibold">No Front Desk Receptionist</p>
                          <p className="text-[11px] text-amber-700/80 mt-0.5">
                            Patients cannot be processed at counter until a receptionist is assigned.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                    {item.receptionist ? (
                      <>
                        <button
                          onClick={() => {
                            setEditReceptionistTarget({
                              clinicId: item.clinicId,
                              clinicName: item.clinicName,
                              name: item.receptionist!.name,
                              phone: item.receptionist!.phoneNumber.replace(/\D/g, '').slice(-10),
                            });
                            setRecFormName(item.receptionist!.name);
                            setRecFormPhone(item.receptionist!.phoneNumber.replace(/\D/g, '').slice(-10));
                            setRecFormPassword('');
                            setRecFormError('');
                          }}
                          className="flex items-center space-x-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => {
                            setDeleteReceptionistTarget({
                              clinicId: item.clinicId,
                              clinicName: item.clinicName,
                              name: item.receptionist!.name,
                            });
                          }}
                          className="flex items-center space-x-1 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-xl transition"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          <span>Remove</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setAssignClinic({ id: item.clinicId, name: item.clinicName });
                          setRecFormName(`${item.clinicName} Receptionist`);
                          setRecFormPhone('');
                          setRecFormPassword('Password@123');
                          setRecFormError('');
                        }}
                        className="flex items-center space-x-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 px-3.5 py-1.5 rounded-xl shadow-sm transition active:scale-95"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Assign Receptionist</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
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
                  <label className="text-xs font-bold text-[#64748B] block mb-1">
                    Clinic Mobile Number (10 Digits) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center">
                    <span className="bg-slate-100 border border-r-0 border-slate-300 text-slate-600 text-xs px-3 py-2 rounded-l-xl font-bold font-mono">
                      +91
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="9876543210"
                      value={newClinicPhone}
                      onChange={(e) => setNewClinicPhone(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-[#F8FAFC] border border-slate-200 rounded-r-xl px-3.5 py-2 text-xs font-mono font-semibold text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Indian mobile number for Clinic Admin login.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#64748B] block mb-1">
                    Admin Password <span className="text-slate-400 font-normal">(Optional, default: Password@123)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Password@123"
                    value={newClinicAdminPassword}
                    onChange={(e) => setNewClinicAdminPassword(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-semibold text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Initial password for Clinic Admin account.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              </div>

              {/* Optional Front Desk Receptionist Account */}
              <div className="bg-teal-50/70 border border-teal-200/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-center space-x-2">
                  <UserCheck className="w-4 h-4 text-teal-600" />
                  <span className="text-xs font-bold text-teal-900">Front Desk Receptionist (Optional • 1 Limit)</span>
                </div>
                <p className="text-[11px] text-teal-700/90 leading-relaxed">
                  Optionally provision the clinic's dedicated front desk receptionist now, or assign later via the Receptionists tab.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Receptionist Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Pooja Sharma"
                      value={newClinicReceptionistName}
                      onChange={(e) => setNewClinicReceptionistName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Mobile Number (10 Digits)</label>
                    <div className="flex items-center">
                      <span className="bg-slate-100 border border-r-0 border-slate-200 text-slate-500 text-[11px] px-2.5 py-1.5 rounded-l-xl font-bold font-mono">
                        +91
                      </span>
                      <input
                        type="tel"
                        maxLength={10}
                        placeholder="9876543210"
                        value={newClinicReceptionistPhone}
                        onChange={(e) => setNewClinicReceptionistPhone(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-white border border-slate-200 rounded-r-xl px-2.5 py-1.5 text-xs font-mono font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Receptionist Password <span className="text-slate-400 font-normal">(Optional, default: Password@123)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Password@123"
                    value={newClinicReceptionistPassword}
                    onChange={(e) => setNewClinicReceptionistPassword(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
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

      {/* MODAL 4: SUPER ADMIN ASSIGN RECEPTIONIST */}
      {assignClinic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-sm">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-[#1E293B]">Assign Receptionist</h3>
                  <p className="text-[11px] text-slate-500">{assignClinic.name}</p>
                </div>
              </div>
              <button onClick={() => setAssignClinic(null)} className="p-1 hover:bg-slate-100 text-slate-400 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {recFormError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{recFormError}</span>
              </div>
            )}

            <form onSubmit={handleSuperAssignReceptionist} className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-bold text-[#64748B] block mb-1">
                  Receptionist Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pooja Sharma"
                  value={recFormName}
                  onChange={(e) => setRecFormName(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-[#1E293B] focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#64748B] block mb-1">
                  Mobile Number (10 Digits) <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center">
                  <span className="bg-slate-100 border border-r-0 border-slate-200 text-slate-600 text-xs px-3 py-2 rounded-l-xl font-bold font-mono">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="9876543210"
                    value={recFormPhone}
                    onChange={(e) => setRecFormPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-r-xl px-3.5 py-2 text-xs font-mono font-semibold text-[#1E293B] focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Used by the receptionist to login via OTP or password at counter desk.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-[#64748B] block mb-1">
                  Initial Password <span className="text-slate-400 font-normal">(Optional, default: Password@123)</span>
                </label>
                <input
                  type="text"
                  placeholder="Password@123"
                  value={recFormPassword}
                  onChange={(e) => setRecFormPassword(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-semibold text-[#1E293B] focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssignClinic(null)}
                  className="px-4 py-2 text-xs font-bold text-[#64748B] hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recSubmitting}
                  className="px-5 py-2 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {recSubmitting ? 'Assigning...' : 'Assign Receptionist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: SUPER ADMIN EDIT RECEPTIONIST */}
      {editReceptionistTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-sm">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-[#1E293B]">Edit Receptionist Profile</h3>
                  <p className="text-[11px] text-slate-500">{editReceptionistTarget.clinicName}</p>
                </div>
              </div>
              <button onClick={() => setEditReceptionistTarget(null)} className="p-1 hover:bg-slate-100 text-slate-400 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {recFormError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{recFormError}</span>
              </div>
            )}

            <form onSubmit={handleSuperEditReceptionist} className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-bold text-[#64748B] block mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={recFormName}
                  onChange={(e) => setRecFormName(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-[#1E293B] focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#64748B] block mb-1">
                  Mobile Number (10 Digits) <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center">
                  <span className="bg-slate-100 border border-r-0 border-slate-200 text-slate-600 text-xs px-3 py-2 rounded-l-xl font-bold font-mono">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={recFormPhone}
                    onChange={(e) => setRecFormPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-r-xl px-3.5 py-2 text-xs font-mono font-semibold text-[#1E293B] focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#64748B] block mb-1">
                  Reset Password <span className="text-slate-400 font-normal">(Leave blank to keep current)</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter new password"
                  value={recFormPassword}
                  onChange={(e) => setRecFormPassword(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-semibold text-[#1E293B] focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditReceptionistTarget(null)}
                  className="px-4 py-2 text-xs font-bold text-[#64748B] hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recSubmitting}
                  className="px-5 py-2 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {recSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: SUPER ADMIN REMOVE RECEPTIONIST CONFIRMATION */}
      {deleteReceptionistTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-slate-100 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 mx-auto flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-800">Remove Receptionist?</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Remove <strong className="text-slate-800">{deleteReceptionistTarget.name}</strong> as front desk receptionist for <strong className="text-slate-800">{deleteReceptionistTarget.clinicName}</strong>?
              They will immediately lose counter desk access. A new receptionist can be assigned anytime.
            </p>

            <div className="mt-6 flex items-center justify-center space-x-2.5">
              <button
                type="button"
                onClick={() => setDeleteReceptionistTarget(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSuperDeleteReceptionist}
                disabled={recSubmitting}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
              >
                {recSubmitting ? 'Removing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: HOSPITAL CHAIN REGISTERED CLINICS DETAILS MODAL */}
      {selectedChain && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-[#F8FAFC] rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
            {/* Modal Header Banner */}
            <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white p-5 sm:p-6 flex items-start justify-between shrink-0 shadow-md">
              <div className="flex items-start space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white border border-white/20 shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-black/25 px-2.5 py-0.5 rounded-full border border-white/20">
                      Hospital Enterprise Chain
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-amber-900/60 text-amber-200 px-2 py-0.5 rounded border border-amber-400/40">
                      CODE: {selectedChain.code}
                    </span>
                    {selectedChain.headquarters && (
                      <span className="text-[10px] bg-white/15 text-white px-2 py-0.5 rounded-full flex items-center space-x-1">
                        <MapPin className="w-3 h-3" />
                        <span>HQ: {selectedChain.headquarters}</span>
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight">{selectedChain.name}</h2>
                  <p className="text-xs text-amber-100/90 mt-0.5 font-medium">
                    Registered facilities, branch chambers, live pricing, and reception staff directory
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedChain(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95"
                title="Close Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Bar & Clinic Count */}
            <div className="bg-white px-6 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-600">Registered Facilities:</span>
                <span className="text-xs font-black bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-300">
                  {selectedChain.clinics?.length || 0} Clinics
                </span>
                {loadingChainDetails && (
                  <span className="flex items-center space-x-1 text-xs text-amber-600 font-bold ml-2">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Syncing...</span>
                  </span>
                )}
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter clinics by name, city, phone..."
                  value={chainClinicsFilter}
                  onChange={(e) => setChainClinicsFilter(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Modal Body: List of Registered Clinics with Full Details */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {(() => {
                const chainClinics = (selectedChain.clinics || []).filter((c) => {
                  if (!chainClinicsFilter.trim()) return true;
                  const q = chainClinicsFilter.toLowerCase();
                  return (
                    c.name.toLowerCase().includes(q) ||
                    c.slug.toLowerCase().includes(q) ||
                    (c.city && c.city.toLowerCase().includes(q)) ||
                    (c.address && c.address.toLowerCase().includes(q)) ||
                    c.phoneNumber.includes(q) ||
                    (c.receptionist?.name && c.receptionist.name.toLowerCase().includes(q))
                  );
                });

                if (chainClinics.length === 0) {
                  return (
                    <div className="bg-white rounded-2xl p-10 border border-slate-200 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 mx-auto flex items-center justify-center mb-3">
                        <Building2 className="w-7 h-7" />
                      </div>
                      <h4 className="text-sm font-black text-slate-800">
                        {selectedChain.clinics && selectedChain.clinics.length > 0
                          ? `No clinics match "${chainClinicsFilter}"`
                          : `No Clinics Linked to ${selectedChain.name} Yet`}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                        {selectedChain.clinics && selectedChain.clinics.length > 0
                          ? 'Try adjusting your search filter above.'
                          : 'When provisioning a new clinic facility under the Clinics tab, select this hospital chain in the "Hospital Chain (Optional)" dropdown to link it.'}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {chainClinics.map((clinic) => (
                      <div
                        key={clinic.id}
                        className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
                      >
                        {/* Clinic Header */}
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center space-x-2">
                                <h4 className="text-base font-black text-slate-800">{clinic.name}</h4>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  clinic.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {clinic.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                              <span className="text-[11px] font-mono text-amber-800 bg-amber-50 px-2 py-0.5 rounded font-semibold mt-1 inline-block border border-amber-200/60">
                                /{clinic.slug}
                              </span>
                            </div>

                            {clinic.city && (
                              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg shrink-0">
                                📍 {clinic.city}
                              </span>
                            )}
                          </div>

                          {/* Contact & Address */}
                          <div className="mt-3.5 space-y-1.5 text-xs text-slate-600">
                            <div className="flex items-center space-x-2">
                              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="font-mono font-semibold">{clinic.phoneNumber}</span>
                            </div>

                            {clinic.email && (
                              <div className="flex items-center space-x-2">
                                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{clinic.email}</span>
                              </div>
                            )}

                            {clinic.address && (
                              <div className="flex items-center space-x-2">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{clinic.address}</span>
                              </div>
                            )}
                          </div>

                          {/* Metrics Grid */}
                          <div className="mt-4 grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                            <div className="flex items-center space-x-1.5">
                              <Stethoscope className="w-3.5 h-3.5 text-sky-600" />
                              <span className="text-slate-500 font-medium">Physicians:</span>
                              <span className="font-bold text-slate-800">{clinic.doctorsCount || 0}</span>
                            </div>
                            <div className="flex items-center space-x-1.5">
                              <Layers className="w-3.5 h-3.5 text-teal-600" />
                              <span className="text-slate-500 font-medium">Queues:</span>
                              <span className="font-bold text-slate-800">{clinic.queuesCount || clinic.servicesCount || 0}</span>
                            </div>
                            <div className="col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                              <span>In-Clinic: <b className="text-emerald-700">₹{clinic.inClinicPrice ?? 200}</b></span>
                              <span>Remote: <b className="text-emerald-700">₹{clinic.remotePrice ?? 250}</b></span>
                            </div>
                          </div>

                          {/* Staff Profiles */}
                          <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-1.5 text-[11px]">
                            {/* Receptionist */}
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 flex items-center space-x-1">
                                <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                                <span>Front Desk:</span>
                              </span>
                              {clinic.receptionist ? (
                                <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200/60">
                                  {clinic.receptionist.name} ({clinic.receptionist.phoneNumber})
                                </span>
                              ) : (
                                <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                                  Unassigned
                                </span>
                              )}
                            </div>

                            {/* Clinic Admin */}
                            {clinic.admin && (
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500 flex items-center space-x-1">
                                  <Users className="w-3.5 h-3.5 text-sky-600" />
                                  <span>Admin:</span>
                                </span>
                                <span className="font-semibold text-slate-700">
                                  {clinic.admin.name} ({clinic.admin.phoneNumber})
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-mono">
                            ID: {clinic.id.slice(0, 8)}...
                          </span>

                          {onSelectClinicAsStaff && (
                            <button
                              onClick={() => {
                                setSelectedChain(null);
                                onSelectClinicAsStaff(clinic.id);
                              }}
                              className="flex items-center space-x-1.5 bg-[#0284C7] hover:bg-[#0369A1] text-white px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm active:scale-95"
                            >
                              <span>Open Clinic Desk</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="bg-white px-6 py-3.5 border-t border-slate-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedChain(null)}
                className="px-5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
