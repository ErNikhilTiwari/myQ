import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  UserPlus, 
  Phone, 
  Lock, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  Trash2, 
  Edit3, 
  Key, 
  Shield, 
  Info, 
  RefreshCw,
  X
} from 'lucide-react';

interface ReceptionistData {
  id: string;
  clinicId: string;
  role: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    phoneNumber: string;
    email?: string | null;
    role: string;
    isActive: boolean;
    createdAt?: string;
  };
}

interface ReceptionistManagementProps {
  clinicId: string;
  clinicName?: string;
  token: string | null;
  currentUser?: any;
  onReceptionistUpdated?: () => void;
}

export const ReceptionistManagement: React.FC<ReceptionistManagementProps> = ({
  clinicId,
  clinicName,
  token,
  currentUser,
  onReceptionistUpdated,
}) => {
  const [receptionist, setReceptionist] = useState<ReceptionistData | null>(null);
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchReceptionist = async () => {
    if (!clinicId || !token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/clinics/${clinicId}/receptionist`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (json.success) {
        setReceptionist(json.data);
      } else {
        setReceptionist(null);
      }
    } catch (err: any) {
      console.error('Failed to load receptionist:', err);
      showToast('error', 'Could not load receptionist details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceptionist();
  }, [clinicId, token]);

  const handleOpenAdd = () => {
    setFormName('');
    setFormPhone('');
    setFormPassword('');
    setFormError('');
    setShowAddModal(true);
  };

  const handleOpenEdit = () => {
    if (!receptionist) return;
    setFormName(receptionist.user.name);
    // Strip +91 for clean editing display if present
    const cleanDigits = receptionist.user.phoneNumber.replace(/\D/g, '').slice(-10);
    setFormPhone(cleanDigits);
    setFormPassword('');
    setFormError('');
    setShowEditModal(true);
  };

  const handleAddReceptionist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) {
      setFormError('Receptionist name and mobile number are required.');
      return;
    }

    const cleanDigits = formPhone.replace(/\D/g, '').slice(-10);
    if (cleanDigits.length !== 10) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setFormSubmitting(true);
    setFormError('');

    try {
      const res = await fetch(`/api/clinics/${clinicId}/receptionist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formName.trim(),
          phoneNumber: cleanDigits,
          password: formPassword.trim() || 'Password@123',
        }),
      });

      const json = await res.json();
      if (json.success) {
        showToast('success', `Receptionist "${formName}" registered successfully!`);
        setShowAddModal(false);
        fetchReceptionist();
        onReceptionistUpdated?.();
      } else {
        setFormError(json.error?.message || json.message || 'Failed to register receptionist');
      }
    } catch (err: any) {
      setFormError(err.message || 'Network error while registering receptionist');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditReceptionist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) {
      setFormError('Receptionist name and mobile number are required.');
      return;
    }

    const cleanDigits = formPhone.replace(/\D/g, '').slice(-10);
    if (cleanDigits.length !== 10) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setFormSubmitting(true);
    setFormError('');

    try {
      const payload: any = {
        name: formName.trim(),
        phoneNumber: cleanDigits,
      };
      if (formPassword.trim()) {
        payload.password = formPassword.trim();
      }

      const res = await fetch(`/api/clinics/${clinicId}/receptionist`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        showToast('success', 'Receptionist profile updated successfully!');
        setShowEditModal(false);
        fetchReceptionist();
        onReceptionistUpdated?.();
      } else {
        setFormError(json.error?.message || json.message || 'Failed to update receptionist');
      }
    } catch (err: any) {
      setFormError(err.message || 'Network error while updating receptionist');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteReceptionist = async () => {
    setFormSubmitting(true);
    try {
      const res = await fetch(`/api/clinics/${clinicId}/receptionist`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const json = await res.json();
      if (json.success) {
        showToast('success', 'Receptionist removed from this clinic.');
        setShowDeleteModal(false);
        setReceptionist(null);
        fetchReceptionist();
        onReceptionistUpdated?.();
      } else {
        showToast('error', json.error?.message || json.message || 'Failed to remove receptionist');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Network error while removing receptionist');
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toastMsg && (
        <div
          className={`fixed top-5 right-5 z-[99999] px-5 py-3.5 rounded-2xl shadow-2xl flex items-center space-x-2.5 text-xs sm:text-sm font-bold transition-all duration-200 animate-in slide-in-from-top-4 border ${
            toastMsg.type === 'success'
              ? 'bg-[#16A34A] text-white border-green-400/30 ring-4 ring-green-600/20'
              : 'bg-[#DC2626] text-white border-red-400/30 ring-4 ring-red-600/20'
          }`}
        >
          {toastMsg.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Top Banner & Policy Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center font-bold text-xl shadow-sm">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-black text-slate-800 tracking-tight">Front Desk Receptionist</h2>
              <span className="bg-teal-50 text-teal-700 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase border border-teal-200">
                1 Per Clinic Limit
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Manage the dedicated receptionist account for {clinicName || 'this clinic'}. Operates counter token calls and walk-ins.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={fetchReceptionist}
            disabled={loading}
            title="Refresh"
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-600' : ''}`} />
          </button>

          {!receptionist && !loading && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center space-x-1.5 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-sm transition active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register Receptionist</span>
            </button>
          )}
        </div>
      </div>

      {/* Policy Notice Box */}
      <div className="bg-teal-50/70 border border-teal-200/80 rounded-2xl p-4 flex items-start space-x-3 text-teal-900 text-xs">
        <Info className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Facility Capacity Policy: 1 Receptionist Counter Account</p>
          <p className="text-teal-800/90 leading-relaxed font-normal">
            To maintain synchronized queue operations, each clinic is provisioned with exactly <strong>1 Receptionist account</strong>. 
            The receptionist can log in on the landing page or hamburger menu selecting <strong>Receptionist Counter Desk</strong> using their mobile number and OTP or password.
          </p>
        </div>
      </div>

      {/* Main Content Area: Active Receptionist Card or Empty State */}
      {loading ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-teal-600" />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Loading receptionist records...</p>
        </div>
      ) : receptionist ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center font-black text-2xl shadow-md border-2 border-white ring-2 ring-teal-100">
                  {receptionist.user.name.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold" title="Active">
                  ✓
                </div>
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-black text-slate-800">{receptionist.user.name}</h3>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border border-emerald-300">
                    Active Counter Desk
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500">
                  <div className="flex items-center space-x-1 font-mono font-medium text-slate-700">
                    <Phone className="w-3.5 h-3.5 text-teal-600" />
                    <span>{receptionist.user.phoneNumber}</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center space-x-1 text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Assigned: {new Date(receptionist.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 mt-1">
                  Role: <span className="font-semibold text-slate-600">RECEPTIONIST</span> • Clinic ID: <span className="font-mono text-slate-500">{clinicId.slice(0, 8)}...</span>
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2.5 w-full md:w-auto justify-end border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
              <button
                onClick={handleOpenEdit}
                className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl font-bold text-xs transition active:scale-95"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                <span>Edit Profile</span>
              </button>

              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center space-x-1.5 bg-red-50 hover:bg-red-100 text-red-600 px-3.5 py-2 rounded-xl font-bold text-xs transition border border-red-200 active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                <span>Remove</span>
              </button>
            </div>
          </div>

          {/* Quick Login Info Card for Staff */}
          <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Desk Login Credentials
              </span>
              <p className="text-xs text-slate-700">
                Registered Mobile: <strong className="font-mono text-slate-900">{receptionist.user.phoneNumber}</strong>
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Default password on setup is <code className="bg-white px-1.5 py-0.5 rounded text-teal-700 font-mono border">Password@123</code> (or custom if configured). OTP login is also supported.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Assigned Desk Permissions
              </span>
              <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                <li>Call Next Patient, Hold, and Complete Tokens</li>
                <li>Issue Walk-in Tokens for Patients</li>
                <li>Sync Live Voice Announcements to TV Kiosk</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 text-teal-600 mx-auto flex items-center justify-center font-bold text-2xl shadow-sm mb-4">
            <UserPlus className="w-8 h-8" />
          </div>
          <h3 className="text-base font-black text-slate-800 tracking-tight">No Receptionist Assigned</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 font-medium">
            Your clinic currently does not have an active front desk receptionist account. Register one below to empower your counter staff to call patient tokens and manage walk-ins.
          </p>

          <div className="mt-6">
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center space-x-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register Receptionist Now</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal: Register Receptionist */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-teal-50 to-emerald-50">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-sm">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Register Front Desk Receptionist</h3>
                  <p className="text-[11px] text-slate-500">1 receptionist allowed for this clinic</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-white/80 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddReceptionist} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pooja Sharma"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mobile Number (10 Digits) <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center">
                  <span className="bg-slate-100 border border-r-0 border-slate-300 text-slate-600 text-xs px-3 py-2.5 rounded-l-xl font-bold font-mono">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="9876543210"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-r-xl focus:ring-2 focus:ring-teal-500 outline-none font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  This mobile number will be used for OTP & password login at the counter desk.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password <span className="text-slate-400 font-normal">(Optional, default: Password@123)</span>
                </label>
                <input
                  type="text"
                  placeholder="Password@123"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting || !formName.trim() || formPhone.length !== 10}
                  className="px-5 py-2 rounded-xl text-xs font-bold shadow-md transition disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed bg-teal-600 hover:bg-teal-700 text-white cursor-pointer"
                >
                  {formSubmitting ? 'Registering...' : 'Register Receptionist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Receptionist */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-teal-50 to-emerald-50">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-sm">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Edit Receptionist Profile</h3>
                  <p className="text-[11px] text-slate-500">Update name, phone number, or password</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-white/80 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditReceptionist} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mobile Number (10 Digits) <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center">
                  <span className="bg-slate-100 border border-r-0 border-slate-300 text-slate-600 text-xs px-3 py-2.5 rounded-l-xl font-bold font-mono">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-r-xl focus:ring-2 focus:ring-teal-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Password <span className="text-slate-400 font-normal">(Leave blank to keep unchanged)</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter new password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting || !formName.trim() || formPhone.length !== 10}
                  className="px-5 py-2 rounded-xl text-xs font-bold shadow-md transition disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed bg-teal-600 hover:bg-teal-700 text-white cursor-pointer"
                >
                  {formSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Removal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 mx-auto flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-800">Remove Receptionist?</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Are you sure you want to remove <strong className="text-slate-800">{receptionist?.user.name}</strong> from this clinic? 
              They will immediately lose counter desk access for this clinic. You can register a new receptionist anytime.
            </p>

            <div className="mt-6 flex items-center justify-center space-x-2.5">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteReceptionist}
                disabled={formSubmitting}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
              >
                {formSubmitting ? 'Removing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
