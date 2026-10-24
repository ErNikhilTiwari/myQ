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
  Check,
  AlertTriangle,
  Ban,
  Play,
  Lock,
  Clock,
  ShieldAlert,
  Key,
  Eye,
  EyeOff,
  Zap
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
  subscriptionStatus?: string;
  plan?: string;
  enableBookingTime?: boolean;
  enablePriorityQueue?: boolean;
  createdAt: string;
  doctorsCount: number;
  servicesCount: number;
  queuesCount?: number;
  staffCount?: number;
}

interface SubscriptionData {
  id: string;
  clinicId: string;
  clinicName: string;
  clinicSlug?: string;
  plan: string;
  status: string;
  billingCycle?: string;
  amountPaid?: number;
  startDate?: string;
  endDate?: string | null;
  currentPeriodEnd?: string;
  maxDoctors: number;
  maxStaff?: number;
  maxDisplays?: number;
  hasAds?: boolean;
  maxDailyTokens?: number;
  daysRemaining?: number;
  isExpiringSoon?: boolean;
  isExpired?: boolean;
  doctorsUsed?: number;
  staffUsed?: number;
  displaysUsed?: number;
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
  enableBookingTime?: boolean;
  enablePriorityQueue?: boolean;
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
  const [activeTab, setActiveTab] = useState<'CLINICS' | 'CHAINS' | 'SUBSCRIPTIONS' | 'RECEPTIONISTS' | 'SUSPENDED'>('CLINICS');
  
  // Data states
  const [clinics, setClinics] = useState<ClinicData[]>([]);
  const [chains, setChains] = useState<HospitalChainData[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([]);
  const [receptionists, setReceptionists] = useState<ClinicReceptionistSummaryData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [recSearchQuery, setRecSearchQuery] = useState('');
  const [suspendedSearchQuery, setSuspendedSearchQuery] = useState('');
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
  const [newClinicEnableBookingTime, setNewClinicEnableBookingTime] = useState(true);
  const [newClinicEnablePriorityQueue, setNewClinicEnablePriorityQueue] = useState(true);
  const [clinicFormError, setClinicFormError] = useState('');
  const [submittingClinic, setSubmittingClinic] = useState(false);
  const [togglingBookingTimeClinicId, setTogglingBookingTimeClinicId] = useState<string | null>(null);
  const [togglingPriorityQueueClinicId, setTogglingPriorityQueueClinicId] = useState<string | null>(null);

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
  const [selectedPlan, setSelectedPlan] = useState<'FREE' | 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE'>('PROFESSIONAL');
  const [submittingUpgrade, setSubmittingUpgrade] = useState(false);

  // Extend Validity Modal
  const [extendTarget, setExtendTarget] = useState<SubscriptionData | null>(null);
  const [extendDays, setExtendDays] = useState(30);
  const [submittingExtend, setSubmittingExtend] = useState(false);

  // Subscription Filters
  const [subStatusFilter, setSubStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'SUSPENDED'>('ALL');
  const [subPlanFilter, setSubPlanFilter] = useState<'ALL' | 'FREE' | 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE'>('ALL');
  const [subSearchQuery, setSubSearchQuery] = useState('');

  // Suspend Membership Modal
  const [suspendTarget, setSuspendTarget] = useState<ClinicData | null>(null);
  const [submittingSuspend, setSubmittingSuspend] = useState(false);

  // Permanent Delete Clinic Forever Modal
  const [deleteForeverTarget, setDeleteForeverTarget] = useState<ClinicData | null>(null);
  const [deleteAuthMethod, setDeleteAuthMethod] = useState<'PASSWORD' | 'OTP'>('PASSWORD');
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteOtp, setDeleteOtp] = useState('');
  const [deleteOtpSent, setDeleteOtpSent] = useState(false);
  const [deleteOtpSending, setDeleteOtpSending] = useState(false);
  const [deleteOtpCountdown, setDeleteOtpCountdown] = useState(0);
  const [deleteOtpAttempts, setDeleteOtpAttempts] = useState<number[]>([]);
  const [deleteError, setDeleteError] = useState('');
  const [submittingDeleteForever, setSubmittingDeleteForever] = useState(false);

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
      // Robust clinic fetcher: tries /api/super/clinics, then /api/clinics?all=true, then /api/clinics
      const fetchClinics = async () => {
        try {
          const res = await fetch('/api/super/clinics', { headers });
          if (res.ok) {
            const json = await res.json();
            if (Array.isArray(json?.data) && json.data.length > 0) {
              return json;
            }
            if (Array.isArray(json?.data)) {
              // Check fallback if super returned empty array
              const fallback = await fetch('/api/clinics?all=true', { headers }).then(r => r.json()).catch(() => null);
              if (Array.isArray(fallback?.data) && fallback.data.length > json.data.length) {
                return fallback;
              }
              return json;
            }
          }
        } catch (e) {
          console.warn('Super clinics fetch error, falling back:', e);
        }

        try {
          const res2 = await fetch('/api/clinics?all=true', { headers });
          if (res2.ok) {
            const json2 = await res2.json();
            if (Array.isArray(json2?.data)) {
              return json2;
            }
          }
        } catch (e) {
          console.warn('Clinics all=true fetch error, falling back:', e);
        }

        try {
          const res3 = await fetch('/api/clinics');
          if (res3.ok) {
            const json3 = await res3.json();
            if (Array.isArray(json3?.data)) {
              return json3;
            }
            if (Array.isArray(json3)) {
              return { success: true, data: json3 };
            }
          }
        } catch (e) {
          console.warn('Public clinics fetch error:', e);
        }

        return { success: true, data: [] };
      };

      const [cRes, chainRes, subRes, recRes] = await Promise.all([
        fetchClinics(),
        fetch('/api/hospital-chains').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/super/subscriptions', { headers }).then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/super/receptionists', { headers }).then(r => r.json()).catch(() => ({ success: false })),
      ]);

      if (Array.isArray(cRes?.data)) {
        setClinics(cRes.data);
      } else if (Array.isArray(cRes)) {
        setClinics(cRes);
      }
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
          enableBookingTime: newClinicEnableBookingTime,
          enablePriorityQueue: newClinicEnablePriorityQueue,
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
        setNewClinicEnableBookingTime(true);
        setNewClinicEnablePriorityQueue(true);
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

  const handleToggleBookingTime = async (clinicId: string, currentVal?: boolean) => {
    if (!token) return;
    const newVal = currentVal === false ? true : false;
    setTogglingBookingTimeClinicId(clinicId);
    try {
      const res = await fetch(`/api/clinics/${clinicId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ enableBookingTime: newVal }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setClinics((prev) =>
          prev.map((c) => (c.id === clinicId ? { ...c, enableBookingTime: newVal } : c))
        );
        setSelectedChain((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            clinics: (prev.clinics || []).map((c) =>
              c.id === clinicId ? { ...c, enableBookingTime: newVal } : c
            ),
          };
        });
        showToast(
          'success',
          `Booking time slots turned ${newVal ? 'ON (Slot Booking)' : 'OFF (Instant Queue Only)'} for this clinic.`
        );
      } else {
        showToast('error', data.message || 'Failed to update booking time preference.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error updating booking time preference.');
    } finally {
      setTogglingBookingTimeClinicId(null);
    }
  };

  const handleTogglePriorityQueue = async (clinicId: string, currentVal?: boolean) => {
    if (!token) return;
    const newVal = currentVal === false ? true : false;
    setTogglingPriorityQueueClinicId(clinicId);
    try {
      const res = await fetch(`/api/clinics/${clinicId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ enablePriorityQueue: newVal }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setClinics((prev) =>
          prev.map((c) => (c.id === clinicId ? { ...c, enablePriorityQueue: newVal } : c))
        );
        setSelectedChain((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            clinics: (prev.clinics || []).map((c) =>
              c.id === clinicId ? { ...c, enablePriorityQueue: newVal } : c
            ),
          };
        });
        showToast(
          'success',
          `Instant priority queue feature turned ${newVal ? 'ON (+₹50 Instant Queue)' : 'OFF (Plain Appointments Only)'} for this clinic.`
        );
      } else {
        showToast('error', data.message || 'Failed to update priority queue preference.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error updating priority queue preference.');
    } finally {
      setTogglingPriorityQueueClinicId(null);
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

  const handleExtendValidity = async () => {
    if (!extendTarget || !token) return;
    setSubmittingExtend(true);
    try {
      const res = await fetch(`/api/super/subscriptions/${extendTarget.clinicId}/extend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ additionalDays: extendDays }),
      });
      const json = await res.json();
      if (json.success) {
        setExtendTarget(null);
        showToast('success', `Granted +${extendDays} days validity to "${extendTarget.clinicName}"!`);
        await loadData();
      } else {
        showToast('error', json.error?.message || json.message || 'Failed to extend validity');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to extend validity');
    } finally {
      setSubmittingExtend(false);
    }
  };

  const handleConfirmSuspend = async () => {
    if (!suspendTarget || !token) return;
    setSubmittingSuspend(true);
    try {
      let res = await fetch(`/api/super/clinics/${suspendTarget.id}/suspend`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // Fallback: If super suspend endpoint is 404, use PATCH /api/clinics/:id
      if (res.status === 404) {
        res = await fetch(`/api/clinics/${suspendTarget.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ isActive: false }),
        });
      }

      const data = await res.json();
      if (!res.ok || (data.success === false)) {
        throw new Error(data.message || data.error?.message || 'Failed to suspend clinic membership');
      }
      showToast('success', `Membership for "${suspendTarget.name}" suspended. All data preserved in Suspended Memberships.`);
      setSuspendTarget(null);
      await loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Error suspending clinic membership');
    } finally {
      setSubmittingSuspend(false);
    }
  };

  const handleReactivateClinic = async (clinicId: string, clinicName: string) => {
    if (!token) return;
    try {
      let res = await fetch(`/api/super/clinics/${clinicId}/reactivate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // Fallback: If super reactivate endpoint is 404, use PATCH /api/clinics/:id
      if (res.status === 404) {
        res = await fetch(`/api/clinics/${clinicId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ isActive: true }),
        });
      }

      const data = await res.json();
      if (!res.ok || (data.success === false)) {
        throw new Error(data.message || data.error?.message || 'Failed to reactivate clinic membership');
      }
      showToast('success', `Membership for "${clinicName}" reactivated successfully!`);
      await loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Error reactivating clinic');
    }
  };

  const handleSendDeleteOtp = async () => {
    const phone = currentUser?.phoneNumber || '+919999999999';
    const now = Date.now();
    const recentAttempts = deleteOtpAttempts.filter((t) => now - t < 60000);
    if (recentAttempts.length >= 5) {
      setDeleteError('Too many OTP attempts (maximum 5 in 1 minute). Please wait 60 seconds.');
      setDeleteOtpCountdown(60);
      return;
    }

    if (recentAttempts.length >= 3) {
      const lastAttempt = recentAttempts[recentAttempts.length - 1];
      const elapsed = now - lastAttempt;
      if (elapsed < 10000) {
        const remaining = Math.ceil((10000 - elapsed) / 1000);
        setDeleteError(`Please wait ${remaining}s before requesting a new OTP.`);
        setDeleteOtpCountdown(remaining);
        return;
      }
    }

    setDeleteOtpSending(true);
    setDeleteError('');
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to send OTP code');
      }
      setDeleteOtpSent(true);
      const updatedAttempts = [...recentAttempts, now];
      setDeleteOtpAttempts(updatedAttempts);

      // Cooldown policy: No cooldown for first 3 attempts, 10s after 3, 60s after 5
      let cooldown = 0;
      if (updatedAttempts.length >= 5) {
        cooldown = 60;
      } else if (updatedAttempts.length >= 3) {
        cooldown = 10;
      }
      if (data.data?.resendCooldownSeconds !== undefined) {
        cooldown = data.data.resendCooldownSeconds;
      }
      setDeleteOtpCountdown(cooldown);
      if (cooldown > 0) {
        const interval = setInterval(() => {
          setDeleteOtpCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
      showToast('success', `Authorization OTP sent to ${phone}`);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to send authorization OTP');
      if (err.message?.includes('5 attempts') || err.message?.includes('60 seconds') || recentAttempts.length >= 4) {
        setDeleteOtpCountdown(60);
      } else if (err.message?.includes('10 seconds') || recentAttempts.length >= 3) {
        setDeleteOtpCountdown(10);
      }
    } finally {
      setDeleteOtpSending(false);
    }
  };

  const handleConfirmDeleteForever = async () => {
    if (!deleteForeverTarget || !token) return;
    setSubmittingDeleteForever(true);
    setDeleteError('');
    try {
      const payload = deleteAuthMethod === 'PASSWORD' 
        ? { password: deletePassword } 
        : { otp: deleteOtp };

      const res = await fetch(`/api/super/clinics/${deleteForeverTarget.id}/permanent`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to permanently delete clinic');
      }

      showToast('success', `Clinic "${deleteForeverTarget.name}" has been permanently deleted forever.`);
      setDeleteForeverTarget(null);
      setDeletePassword('');
      setDeleteOtp('');
      await loadData();
    } catch (err: any) {
      setDeleteError(err.message || 'Verification failed. Could not delete clinic.');
    } finally {
      setSubmittingDeleteForever(false);
    }
  };

  // Enrich clinics with matching subscription data if not already present
  const enrichedClinics = clinics.map((c) => {
    const matchingSub = subscriptions.find(s => s.clinicId === c.id);
    const subStatus = c.subscriptionStatus || matchingSub?.status || (c.isActive !== false ? 'ACTIVE' : 'SUSPENDED');
    const isSuspended = c.isActive === false || subStatus === 'SUSPENDED';
    return {
      ...c,
      isActive: !isSuspended,
      subscriptionStatus: subStatus,
      plan: c.plan || matchingSub?.plan || 'FREE',
    };
  });

  const activeClinics = enrichedClinics.filter(c => c.isActive !== false && c.subscriptionStatus !== 'SUSPENDED');
  const suspendedClinics = enrichedClinics.filter(c => c.isActive === false || c.subscriptionStatus === 'SUSPENDED');

  const uniqueCities = Array.from(
    new Set(activeClinics.map((c) => c.city).filter((city): city is string => Boolean(city && city.trim())))
  ).sort();

  const filteredClinics = activeClinics.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    const cleanQDigits = q.replace(/\D/g, '');
    const cleanPhoneDigits = c.phoneNumber ? c.phoneNumber.replace(/\D/g, '') : '';

    const matchesQuery = !q || Boolean(
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.slug && c.slug.toLowerCase().includes(q)) ||
      (c.city && c.city.toLowerCase().includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (cleanQDigits.length > 0 && cleanPhoneDigits.includes(cleanQDigits)) ||
      (c.phoneNumber && c.phoneNumber.includes(q))
    );

    const matchesChain = clinicChainFilter === 'ALL' ||
      (clinicChainFilter === 'STANDALONE' ? !c.chainId : c.chainId === clinicChainFilter);

    const matchesCity = clinicCityFilter === 'ALL' || c.city === clinicCityFilter;

    return matchesQuery && matchesChain && matchesCity;
  });

  const filteredSuspendedClinics = suspendedClinics.filter((c) => {
    const q = suspendedSearchQuery.trim().toLowerCase();
    const cleanQDigits = q.replace(/\D/g, '');
    const cleanPhoneDigits = c.phoneNumber ? c.phoneNumber.replace(/\D/g, '') : '';

    return !q || Boolean(
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.slug && c.slug.toLowerCase().includes(q)) ||
      (c.city && c.city.toLowerCase().includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q)) ||
      (cleanQDigits.length > 0 && cleanPhoneDigits.includes(cleanQDigits)) ||
      (c.phoneNumber && c.phoneNumber.includes(q))
    );
  });

  const filteredReceptionists = receptionists.filter(r => 
    r.clinicName.toLowerCase().includes(recSearchQuery.toLowerCase()) ||
    r.clinicSlug.toLowerCase().includes(recSearchQuery.toLowerCase()) ||
    (r.receptionist && (
      r.receptionist.name.toLowerCase().includes(recSearchQuery.toLowerCase()) ||
      r.receptionist.phoneNumber.includes(recSearchQuery)
    ))
  );

  const filteredSubscriptions = subscriptions.filter((sub) => {
    const q = subSearchQuery.trim().toLowerCase();
    const matchesQuery = !q || Boolean(
      (sub.clinicName && sub.clinicName.toLowerCase().includes(q)) ||
      (sub.clinicSlug && sub.clinicSlug.toLowerCase().includes(q)) ||
      sub.plan.toLowerCase().includes(q)
    );
    const matchesStatus = subStatusFilter === 'ALL' || sub.status === subStatusFilter;
    const matchesPlan = subPlanFilter === 'ALL' || sub.plan === subPlanFilter;
    return matchesQuery && matchesStatus && matchesPlan;
  });

  const totalMRR = subscriptions.reduce((acc, s) => {
    if (s.status !== 'ACTIVE' && s.status !== 'EXPIRING_SOON') return acc;
    if (s.plan === 'BASIC') return acc + 999;
    if (s.plan === 'PROFESSIONAL' || s.plan === 'PRO') return acc + 2499;
    if (s.plan === 'ENTERPRISE') return acc + 7999;
    return acc;
  }, 0);

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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-6">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Active Clinics</span>
            <Building2 className="w-4 h-4 text-[#0284C7]" />
          </div>
          <div className="text-2xl font-black text-[#1E293B] mt-1">{activeClinics.length}</div>
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

        <div 
          onClick={() => setActiveTab('SUSPENDED')}
          className={`border rounded-2xl p-4 shadow-sm cursor-pointer transition ${
            activeTab === 'SUSPENDED' 
              ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/40' 
              : 'bg-white border-amber-200 hover:shadow-md'
          }`}
          title="Click to view suspended memberships"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Suspended</span>
            <Ban className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-900 mt-1">{suspendedClinics.length}</div>
          <span className="text-[10px] text-amber-700 font-semibold mt-0.5 block">Inactive Memberships</span>
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
            Clinics Directory ({activeClinics.length})
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
          <button
            onClick={() => setActiveTab('SUSPENDED')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg transition ${
              activeTab === 'SUSPENDED' ? 'bg-amber-600 text-white shadow-sm' : 'text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100'
            }`}
          >
            <Ban className="w-3.5 h-3.5" />
            <span>Suspended Memberships ({suspendedClinics.length})</span>
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

        {activeTab === 'SUSPENDED' && (
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search suspended clinics..."
              value={suspendedSearchQuery}
              onChange={(e) => setSuspendedSearchQuery(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl pl-9 pr-8 py-1.5 text-xs font-semibold text-[#1E293B] focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
            {suspendedSearchQuery && (
              <button
                type="button"
                onClick={() => setSuspendedSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
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
                {filteredClinics.length} of {activeClinics.length} Active Clinics
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

                      {/* Booking Time Slots Toggle */}
                      <div className="mt-3.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2 min-w-0">
                          <Clock className={`w-4 h-4 shrink-0 ${clinic.enableBookingTime !== false ? 'text-sky-600' : 'text-amber-600'}`} />
                          <div className="truncate">
                            <div className="text-[11px] font-bold text-slate-800 flex items-center space-x-1.5">
                              <span>Time Slots:</span>
                              <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                                clinic.enableBookingTime !== false
                                  ? 'bg-sky-100 text-sky-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {clinic.enableBookingTime !== false ? 'ENABLED' : 'OFF (Instant Only)'}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {clinic.enableBookingTime !== false
                                ? 'Patients select appointment time'
                                : 'Queue for now (+₹50 fast queue)'}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={togglingBookingTimeClinicId === clinic.id}
                          onClick={() => handleToggleBookingTime(clinic.id, clinic.enableBookingTime)}
                          className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition border shadow-xs active:scale-95 disabled:opacity-50 ${
                            clinic.enableBookingTime !== false
                              ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                              : 'bg-sky-600 text-white border-sky-600 hover:bg-sky-700'
                          }`}
                        >
                          {togglingBookingTimeClinicId === clinic.id ? 'Updating...' : clinic.enableBookingTime !== false ? 'Turn OFF' : 'Turn ON'}
                        </button>
                      </div>

                      {/* Instant Priority Queue (+₹50 Option) Toggle */}
                      <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2 min-w-0">
                          <Zap className={`w-4 h-4 shrink-0 ${clinic.enablePriorityQueue !== false ? 'text-amber-600 fill-amber-500' : 'text-slate-400'}`} />
                          <div className="truncate">
                            <div className="text-[11px] font-bold text-slate-800 flex items-center space-x-1.5">
                              <span>Priority Queue:</span>
                              <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                                clinic.enablePriorityQueue !== false
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {clinic.enablePriorityQueue !== false ? 'ENABLED (+₹50)' : 'DISABLED (Plain Only)'}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {clinic.enablePriorityQueue !== false
                                ? 'Patients can join live queue right away'
                                : 'Plain appointments without live entry'}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={togglingPriorityQueueClinicId === clinic.id}
                          onClick={() => handleTogglePriorityQueue(clinic.id, clinic.enablePriorityQueue)}
                          className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition border shadow-xs active:scale-95 disabled:opacity-50 ${
                            clinic.enablePriorityQueue !== false
                              ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                              : 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700'
                          }`}
                        >
                          {togglingPriorityQueueClinicId === clinic.id ? 'Updating...' : clinic.enablePriorityQueue !== false ? 'Turn OFF' : 'Turn ON'}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-400 font-mono">
                        ID: {clinic.id.slice(0, 8)}...
                      </span>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => setSuspendTarget(clinic)}
                          className="text-[11px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-1 rounded-lg flex items-center space-x-1 transition"
                          title="Suspend clinic membership (Data will NOT be deleted)"
                        >
                          <Ban className="w-3 h-3 text-amber-600" />
                          <span>Suspend</span>
                        </button>

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
        <div className="space-y-4">
          {/* SaaS Subscriptions KPI Banner */}
          <div className="bg-gradient-to-r from-purple-900 to-indigo-950 text-white rounded-2xl p-5 shadow-sm border border-purple-800/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-bold text-xl shadow-md text-amber-300">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-black tracking-tight text-white">SaaS Memberships &amp; Revenue Portal</h2>
                  <span className="bg-purple-500/30 text-purple-200 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase border border-purple-400/30">
                    Platform Revenue
                  </span>
                </div>
                <p className="text-xs text-purple-200/80 mt-0.5 font-medium">
                  Multi-tier subscription management, validity overrides, and recurring billing oversight across all provisioned clinics.
                </p>
              </div>
            </div>

            {/* Quick KPI Strip */}
            <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              <div className="bg-white/10 border border-white/10 rounded-xl px-3 py-1.5 shrink-0">
                <span className="text-[10px] text-purple-200 uppercase font-bold block">Est. MRR</span>
                <span className="text-base font-black text-amber-300 font-mono">
                  ₹{totalMRR.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="bg-white/10 border border-white/10 rounded-xl px-3 py-1.5 shrink-0">
                <span className="text-[10px] text-purple-200 uppercase font-bold block">Active</span>
                <span className="text-base font-black text-emerald-300">
                  {subscriptions.filter(s => s.status === 'ACTIVE').length}
                </span>
              </div>
              <div className="bg-white/10 border border-white/10 rounded-xl px-3 py-1.5 shrink-0">
                <span className="text-[10px] text-purple-200 uppercase font-bold block">Expiring Soon</span>
                <span className="text-base font-black text-amber-300">
                  {subscriptions.filter(s => s.isExpiringSoon || (s.daysRemaining !== undefined && s.daysRemaining <= 7 && s.daysRemaining > 0)).length}
                </span>
              </div>
              <div className="bg-white/10 border border-white/10 rounded-xl px-3 py-1.5 shrink-0">
                <span className="text-[10px] text-purple-200 uppercase font-bold block">Expired</span>
                <span className="text-base font-black text-rose-300">
                  {subscriptions.filter(s => s.isExpired || s.status === 'EXPIRED').length}
                </span>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search subscriptions by clinic name, slug, or plan..."
                value={subSearchQuery}
                onChange={(e) => setSubSearchQuery(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl pl-10 pr-9 py-2 text-xs font-semibold text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
              />
              {subSearchQuery && (
                <button
                  type="button"
                  onClick={() => setSubSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={subStatusFilter}
                onChange={(e) => setSubStatusFilter(e.target.value as any)}
                className="bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
              >
                <option value="ALL">All Statuses ({subscriptions.length})</option>
                <option value="ACTIVE">Active</option>
                <option value="EXPIRING_SOON">Expiring Soon (≤ 7 Days)</option>
                <option value="EXPIRED">Expired</option>
                <option value="SUSPENDED">Suspended</option>
              </select>

              <select
                value={subPlanFilter}
                onChange={(e) => setSubPlanFilter(e.target.value as any)}
                className="bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
              >
                <option value="ALL">All Plans</option>
                <option value="FREE">Starter Free</option>
                <option value="BASIC">Essential Practice</option>
                <option value="PROFESSIONAL">Professional Clinic</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>
            </div>
          </div>

          {/* Subscriptions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSubscriptions.length === 0 ? (
              <div className="col-span-full py-16 text-center text-xs text-[#64748B] bg-white rounded-2xl border border-slate-200 p-6">
                <Crown className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-700 text-sm">No Matching Subscriptions</p>
                <p className="text-slate-400 mt-1">Try clearing your search query or filters.</p>
                {(subSearchQuery || subStatusFilter !== 'ALL' || subPlanFilter !== 'ALL') && (
                  <button
                    onClick={() => {
                      setSubSearchQuery('');
                      setSubStatusFilter('ALL');
                      setSubPlanFilter('ALL');
                    }}
                    className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              filteredSubscriptions.map((sub) => {
                const isExpiring = sub.isExpiringSoon || (sub.daysRemaining !== undefined && sub.daysRemaining <= 7 && sub.daysRemaining > 0 && sub.status !== 'EXPIRED');
                const isExpired = sub.isExpired || sub.status === 'EXPIRED';

                return (
                  <div 
                    key={sub.id}
                    className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-extrabold text-[#1E293B] text-base">{sub.clinicName || 'Clinic'}</h3>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="text-xs font-black uppercase text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-md border border-purple-200/80">
                              {sub.plan}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              {sub.billingCycle || 'MONTHLY'}
                            </span>
                          </div>
                        </div>

                        <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                          isExpired
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : isExpiring
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : sub.status === 'SUSPENDED'
                            ? 'bg-slate-100 text-slate-700 border-slate-300'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {sub.status}
                        </span>
                      </div>

                      <div className="mt-4 space-y-2 text-xs text-[#64748B] pt-3 border-t border-slate-100">
                        <div className="flex justify-between items-center">
                          <span>Doctor Chambers:</span>
                          <span className="font-bold text-[#1E293B] font-mono">
                            {sub.doctorsUsed || 0} / {sub.maxDoctors}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Front Desk Accounts:</span>
                          <span className="font-bold text-[#1E293B] font-mono">
                            {sub.staffUsed || 0} / {sub.maxStaff || 5}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Smart TV Displays:</span>
                          <span className="font-bold text-[#1E293B] font-mono">
                            {sub.displaysUsed || 0} / {sub.maxDisplays || 1} {sub.hasAds ? '(Ads)' : '(Zero-Ads)'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-slate-50">
                          <span>Renews / Expiry:</span>
                          <span className="font-bold text-[#1E293B] font-mono">
                            {sub.endDate ? new Date(sub.endDate).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                        {sub.daysRemaining !== undefined && (
                          <div className="flex justify-between items-center">
                            <span>Remaining:</span>
                            <span className={`font-black font-mono ${
                              isExpired ? 'text-rose-600' : isExpiring ? 'text-amber-600' : 'text-emerald-600'
                            }`}>
                              {isExpired ? 'Expired' : `${sub.daysRemaining} Days`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setExtendTarget(sub);
                          setExtendDays(30);
                        }}
                        className="flex items-center space-x-1 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1.5 rounded-xl transition"
                        title="Grant trial or grace days"
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Extend</span>
                      </button>

                      <button
                        onClick={() => {
                          setUpgradeTarget(sub);
                          setSelectedPlan((sub.plan as any) || 'PROFESSIONAL');
                        }}
                        className="flex items-center space-x-1 text-xs font-bold text-[#0284C7] bg-[#E0F2FE] hover:bg-sky-100 px-2.5 py-1.5 rounded-xl transition"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Change Tier</span>
                      </button>

                      {sub.status === 'ACTIVE' && (
                        <button
                          type="button"
                          onClick={() => {
                            const targetClinic = clinics.find(c => c.id === sub.clinicId);
                            if (targetClinic) {
                              setSuspendTarget(targetClinic);
                            } else {
                              setSuspendTarget({
                                id: sub.clinicId,
                                name: sub.clinicName || 'Clinic',
                                slug: '',
                                phoneNumber: '',
                                isActive: true,
                                createdAt: '',
                                doctorsCount: sub.maxDoctors,
                                servicesCount: 0,
                              });
                            }
                          }}
                          className="flex items-center space-x-1 text-xs font-bold text-slate-600 hover:text-amber-700 bg-slate-100 hover:bg-amber-50 px-2 py-1.5 rounded-xl transition"
                          title="Suspend membership"
                        >
                          <Ban className="w-3.5 h-3.5" />
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

      {/* TAB 5: SUSPENDED MEMBERSHIPS */}
      {activeTab === 'SUSPENDED' && (
        <div className="space-y-4">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-amber-50 to-rose-50 border border-amber-200/80 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
                <Ban className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-black text-slate-800 tracking-tight">Suspended Clinic Memberships</h2>
                  <span className="bg-amber-100 text-amber-800 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase border border-amber-300">
                    Preserved Data
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5 font-medium">
                  Clinics removed from active subscription. Doctors, services, patient queues, and appointments remain preserved. Reactivate subscription anytime or permanently delete forever with Super Admin verification.
                </p>
              </div>
            </div>

            <span className="text-xs font-bold text-amber-800 bg-amber-100/80 px-3.5 py-1.5 rounded-xl border border-amber-200 shrink-0">
              {suspendedClinics.length} Suspended {suspendedClinics.length === 1 ? 'Clinic' : 'Clinics'}
            </span>
          </div>

          {/* Suspended Clinics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suspendedClinics.length === 0 ? (
              <div className="col-span-full py-16 text-center text-xs text-[#64748B] bg-white rounded-2xl border border-slate-200 p-6">
                <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="font-bold text-slate-700 text-sm">No Suspended Memberships</p>
                <p className="text-slate-400 mt-1">
                  All provisioned clinics currently have active subscription memberships.
                </p>
              </div>
            ) : filteredSuspendedClinics.length === 0 ? (
              <div className="col-span-full py-16 text-center text-xs text-[#64748B] bg-white rounded-2xl border border-slate-200 p-6">
                <Search className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                <p className="font-bold text-slate-700 text-sm">No Matching Suspended Clinics</p>
                <p className="text-slate-400 mt-1">
                  No suspended clinics match &quot;{suspendedSearchQuery}&quot;.
                </p>
                <button
                  onClick={() => setSuspendedSearchQuery('')}
                  className="mt-3 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold rounded-lg transition"
                >
                  Clear Search
                </button>
              </div>
            ) : (
              filteredSuspendedClinics.map((clinic) => {
                const chain = clinic.chainId ? chains.find((c) => c.id === clinic.chainId) : null;
                return (
                  <div 
                    key={clinic.id}
                    className="bg-white border-2 border-amber-200/80 hover:border-amber-300 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-all"
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

                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          Suspended Membership
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
                      </div>

                      {/* Preserved Data Notification Box */}
                      <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
                        <div className="font-bold text-slate-700 flex items-center space-x-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Preserved Database Records:</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-200/60">
                          <span>Physicians: <b className="text-slate-700">{clinic.doctorsCount || 0}</b></span>
                          <span>Services: <b className="text-slate-700">{clinic.servicesCount || 0}</b></span>
                          <span>Queues: <b className="text-slate-700">{clinic.queuesCount || 0}</b></span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-400 font-mono">
                        ID: {clinic.id.slice(0, 8)}...
                      </span>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleReactivateClinic(clinic.id, clinic.name)}
                          className="text-xs font-bold text-white bg-[#0284C7] hover:bg-[#0369A1] px-3 py-1.5 rounded-xl shadow-sm transition active:scale-95 flex items-center space-x-1"
                          title="Restore and reactivate clinic membership"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Reactivate</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setDeleteForeverTarget(clinic);
                            setDeleteAuthMethod('PASSWORD');
                            setDeletePassword('');
                            setDeleteOtp('');
                            setDeleteOtpSent(false);
                            setDeleteError('');
                          }}
                          className="text-xs font-bold text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 px-2.5 py-1.5 rounded-xl transition flex items-center space-x-1"
                          title="Delete clinic forever with authorization"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete Forever</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
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

              {/* Enable Booking Time Slots Setting */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="newClinicEnableBookingTime"
                  checked={newClinicEnableBookingTime}
                  onChange={(e) => setNewClinicEnableBookingTime(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-[#0284C7] rounded border-slate-300 focus:ring-[#0284C7]"
                />
                <label htmlFor="newClinicEnableBookingTime" className="text-xs cursor-pointer select-none">
                  <span className="font-bold text-slate-800 block">
                    Enable Appointment Time Slots
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    When checked, patients pick specific appointment times. When unchecked, booking is for today/now directly with an optional +₹50 instant queue priority pass.
                  </span>
                </label>
              </div>

              {/* Enable Instant Priority Queue Setting */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="newClinicEnablePriorityQueue"
                  checked={newClinicEnablePriorityQueue}
                  onChange={(e) => setNewClinicEnablePriorityQueue(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                />
                <label htmlFor="newClinicEnablePriorityQueue" className="text-xs cursor-pointer select-none">
                  <span className="font-bold text-slate-800 flex items-center space-x-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                    <span>Enable Instant Priority Queue (+₹50 Option)</span>
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    When checked, patients can choose to pay +₹50 extra to join the doctor's live queue right away upon booking. When unchecked, all bookings are plain appointments.
                  </span>
                </label>
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
              {([
                { tier: 'FREE', title: 'Starter Free', desc: '1 Doctor Chamber, 2 Staff, 1 TV Screen, Platform Ads (₹0)' },
                { tier: 'BASIC', title: 'Essential Practice', desc: 'Up to 3 Doctors, 5 Staff, 2 TV Screens, Voice Chimes (₹999/mo)' },
                { tier: 'PROFESSIONAL', title: 'Professional Clinic', desc: 'Up to 10 Doctors, 20 Staff, 5 TV Screens, Ad-Free (₹2,499/mo)' },
                { tier: 'ENTERPRISE', title: 'Hospital & Chain Enterprise', desc: 'Up to 100 Doctors, 200 Staff, 25 TV Screens, Zero Ads (₹7,999/mo)' },
              ] as const).map(({ tier, title, desc }) => (
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
                      onChange={() => setSelectedPlan(tier as any)}
                      className="text-[#0284C7] focus:ring-[#0284C7]"
                    />
                    <div>
                      <span className="font-extrabold text-xs text-[#1E293B] block">{title}</span>
                      <span className="text-[10px] text-slate-500">{desc}</span>
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

      {/* MODAL 3B: EXTEND MEMBERSHIP VALIDITY */}
      {extendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <Clock className="w-5 h-5 text-amber-600" />
                <h3 className="font-black text-lg text-[#1E293B]">Extend Membership Validity</h3>
              </div>
              <button onClick={() => setExtendTarget(null)} className="p-1 hover:bg-slate-100 text-slate-400 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#64748B] mt-3">
              Grant free trial or grace days to <b className="text-[#1E293B]">{extendTarget.clinicName}</b> ({extendTarget.plan} Plan)
            </p>

            <div className="mt-4 space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Select Additional Days:</label>
              <div className="grid grid-cols-4 gap-2">
                {[15, 30, 60, 90].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setExtendDays(days)}
                    className={`py-2 rounded-xl text-xs font-black transition ${
                      extendDays === days
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    +{days} Days
                  </button>
                ))}
              </div>

              <div className="mt-3">
                <label className="text-xs font-semibold text-slate-600 block mb-1">Or Custom Days:</label>
                <input
                  type="number"
                  min="1"
                  max="3650"
                  value={extendDays}
                  onChange={(e) => setExtendDays(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800"
                />
              </div>

              <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-[11px] text-amber-800">
                <span>Extended expiration date will be: </span>
                <strong className="font-mono">
                  {new Date(
                    (extendTarget.endDate && new Date(extendTarget.endDate) > new Date()
                      ? new Date(extendTarget.endDate)
                      : new Date()
                    ).getTime() + extendDays * 86400000
                  ).toLocaleDateString()}
                </strong>
              </div>
            </div>

            <div className="mt-5 pt-3 flex items-center justify-end space-x-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setExtendTarget(null)}
                className="px-4 py-2 text-xs font-bold text-[#64748B] hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExtendValidity}
                disabled={submittingExtend}
                className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-md transition disabled:opacity-50 flex items-center space-x-1.5"
              >
                <Clock className="w-4 h-4" />
                <span>{submittingExtend ? 'Granting...' : `Grant +${extendDays} Days`}</span>
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
                              <span>Remote: <b className="text-emerald-700">₹{clinic.remotePrice ?? 200}</b></span>
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

                          {/* Booking Time Slots Toggle */}
                          <div className="mt-3.5 p-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2">
                            <div className="flex items-center space-x-2 min-w-0">
                              <Clock className={`w-3.5 h-3.5 shrink-0 ${clinic.enableBookingTime !== false ? 'text-sky-600' : 'text-amber-600'}`} />
                              <div className="truncate">
                                <div className="text-[11px] font-bold text-slate-800 flex items-center space-x-1.5">
                                  <span>Time Slots:</span>
                                  <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                                    clinic.enableBookingTime !== false
                                      ? 'bg-sky-100 text-sky-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {clinic.enableBookingTime !== false ? 'ENABLED' : 'OFF (Instant)'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              disabled={togglingBookingTimeClinicId === clinic.id}
                              onClick={() => handleToggleBookingTime(clinic.id, clinic.enableBookingTime)}
                              className={`shrink-0 px-2 py-0.5 rounded-lg text-[10px] font-extrabold transition border shadow-xs active:scale-95 disabled:opacity-50 ${
                                clinic.enableBookingTime !== false
                                  ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                  : 'bg-sky-600 text-white border-sky-600 hover:bg-sky-700'
                              }`}
                            >
                              {togglingBookingTimeClinicId === clinic.id ? 'Updating...' : clinic.enableBookingTime !== false ? 'Turn OFF' : 'Turn ON'}
                            </button>
                          </div>

                          {/* Instant Priority Queue Toggle */}
                          <div className="mt-2 p-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2">
                            <div className="flex items-center space-x-2 min-w-0">
                              <Zap className={`w-3.5 h-3.5 shrink-0 ${clinic.enablePriorityQueue !== false ? 'text-amber-600 fill-amber-500' : 'text-slate-400'}`} />
                              <div className="truncate">
                                <div className="text-[11px] font-bold text-slate-800 flex items-center space-x-1.5">
                                  <span>Priority:</span>
                                  <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                                    clinic.enablePriorityQueue !== false
                                      ? 'bg-amber-100 text-amber-900'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {clinic.enablePriorityQueue !== false ? 'ON (+₹50)' : 'OFF (Plain)'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              disabled={togglingPriorityQueueClinicId === clinic.id}
                              onClick={() => handleTogglePriorityQueue(clinic.id, clinic.enablePriorityQueue)}
                              className={`shrink-0 px-2 py-0.5 rounded-lg text-[10px] font-extrabold transition border shadow-xs active:scale-95 disabled:opacity-50 ${
                                clinic.enablePriorityQueue !== false
                                  ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                  : 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700'
                              }`}
                            >
                              {togglingPriorityQueueClinicId === clinic.id ? 'Updating...' : clinic.enablePriorityQueue !== false ? 'Turn OFF' : 'Turn ON'}
                            </button>
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

      {/* MODAL: SUSPEND CLINIC MEMBERSHIP WARNING */}
      {suspendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-[#1E293B]">
              Suspend Clinic Membership?
            </h3>
            <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
              You are removing <b className="text-slate-800">{suspendTarget.name}</b> from its active subscription.
            </p>

            <div className="mt-4 p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 space-y-2">
              <div className="font-bold flex items-center space-x-1.5 text-amber-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>All Clinic Data Will NOT Be Deleted</span>
              </div>
              <p className="text-amber-800/90 text-[11px] leading-relaxed">
                • Doctor chambers, active services, appointment records, and historical patient queues are 100% preserved.
              </p>
              <p className="text-amber-800/90 text-[11px] leading-relaxed">
                • The clinic will be moved to the <b>Suspended Memberships</b> tab.
              </p>
              <p className="text-amber-800/90 text-[11px] leading-relaxed">
                • Public bookings and desk queue operations will be temporarily paused until membership is reactivated.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setSuspendTarget(null)}
                disabled={submittingSuspend}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition"
              >
                Cancel / Keep Active
              </button>
              <button
                type="button"
                onClick={handleConfirmSuspend}
                disabled={submittingSuspend}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center space-x-1.5 disabled:opacity-50"
              >
                {submittingSuspend ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Ban className="w-3.5 h-3.5" />
                )}
                <span>{submittingSuspend ? 'Suspending...' : 'Suspend Membership'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CLINIC FOREVER WITH VERIFICATION (PASSWORD OR OTP) */}
      {deleteForeverTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border-2 border-rose-200">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <button
                onClick={() => {
                  setDeleteForeverTarget(null);
                  setDeletePassword('');
                  setDeleteOtp('');
                  setDeleteError('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <h3 className="text-lg font-black text-rose-700 mt-4 flex items-center space-x-2">
              <span>Permanently Delete Clinic Forever</span>
            </h3>

            <div className="mt-3 p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-xs text-rose-900 space-y-1.5">
              <p className="font-extrabold text-rose-800">
                ⚠️ DANGER: PERMANENT & IRREVERSIBLE ACTION
              </p>
              <p className="text-rose-800/90 text-[11px] leading-relaxed">
                You are about to permanently delete <b>{deleteForeverTarget.name}</b> (/{deleteForeverTarget.slug}) forever. All linked queues, tokens, physician records, staff assignments, and service configurations will be permanently purged from the database.
              </p>
            </div>

            {/* Verification Method Selector */}
            <div className="mt-5">
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Required Super Admin Verification:
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteAuthMethod('PASSWORD');
                    setDeleteError('');
                  }}
                  className={`py-2 rounded-lg transition ${
                    deleteAuthMethod === 'PASSWORD'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Enter Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteAuthMethod('OTP');
                    setDeleteError('');
                  }}
                  className={`py-2 rounded-lg transition ${
                    deleteAuthMethod === 'OTP'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Verify with OTP
                </button>
              </div>
            </div>

            {deleteError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            {/* Method 1: Password */}
            {deleteAuthMethod === 'PASSWORD' && (
              <div className="mt-4 space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Super Admin Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showDeletePassword ? 'text' : 'password'}
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Enter your Super Admin account password"
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs font-semibold text-[#1E293B] focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeletePassword(!showDeletePassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Re-enter your Super Admin account password to authorize permanent deletion.
                </p>
              </div>
            )}

            {/* Method 2: OTP */}
            {deleteAuthMethod === 'OTP' && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    One-Time Password (OTP)
                  </label>
                  <span className="text-[11px] text-slate-500 font-mono">
                    To: {currentUser?.phoneNumber || 'Registered Phone'}
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={deleteOtp}
                    onChange={(e) => setDeleteOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="6-digit OTP code"
                    className="flex-1 bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold tracking-widest text-[#1E293B] focus:ring-2 focus:ring-rose-500 focus:outline-none text-center"
                  />
                  <button
                    type="button"
                    onClick={handleSendDeleteOtp}
                    disabled={deleteOtpSending || deleteOtpCountdown > 0}
                    className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shrink-0"
                  >
                    {deleteOtpSending
                      ? 'Sending...'
                      : deleteOtpCountdown > 0
                      ? `Resend (${deleteOtpCountdown}s)`
                      : deleteOtpSent
                      ? 'Resend OTP'
                      : 'Send OTP'}
                  </button>
                </div>
                {deleteOtpSent && (
                  <p className="text-[11px] text-emerald-600 font-medium">
                    ✓ OTP code dispatched to {currentUser?.phoneNumber || 'your registered phone number'}.
                  </p>
                )}
                {deleteOtpCountdown > 10 && (
                  <p className="text-[11px] text-amber-700 font-medium bg-amber-50 border border-amber-200 p-2 rounded-lg text-center">
                    ⚠️ 5 attempts reached within 1 minute. Please wait 60 seconds before resending.
                  </p>
                )}
                {deleteOtpCountdown > 0 && deleteOtpCountdown <= 10 && (
                  <p className="text-[11px] text-sky-800 font-medium bg-sky-50 border border-sky-200 p-2 rounded-lg text-center">
                    ⏳ 3 attempts reached in 1 minute. 10-second cooldown active.
                  </p>
                )}
              </div>
            )}

            {/* Footer Buttons */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setDeleteForeverTarget(null);
                  setDeletePassword('');
                  setDeleteOtp('');
                  setDeleteError('');
                }}
                disabled={submittingDeleteForever}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteForever}
                disabled={
                  submittingDeleteForever ||
                  (deleteAuthMethod === 'PASSWORD' ? !deletePassword.trim() : deleteOtp.length < 6)
                }
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center space-x-1.5 disabled:opacity-40"
              >
                {submittingDeleteForever ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{submittingDeleteForever ? 'Deleting Forever...' : 'Delete Clinic Forever'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
