import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  Lock,
  Key,
  Building2,
  Phone,
  Mail,
  MapPin,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Stethoscope,
  Volume2,
  DollarSign,
  UserCheck,
  RefreshCw,
  Crown,
  Calendar,
  Clock,
  CalendarDays,
  Sun,
  Trash2
} from 'lucide-react';
import { ClinicDto } from '@queueapp/shared';

interface ClinicAdminProfileProps {
  clinicId: string;
  token: string | null;
  currentUser: any;
  onProfileUpdated?: (updatedUser: any) => void;
  onNavigateTab?: (tab: any) => void;
}

export const ClinicAdminProfile: React.FC<ClinicAdminProfileProps> = ({
  clinicId,
  token,
  currentUser,
  onProfileUpdated,
  onNavigateTab,
}) => {
  // Clinic data state
  const [clinic, setClinic] = useState<ClinicDto | null>(null);
  const [loadingClinic, setLoadingClinic] = useState(false);
  const [savingClinic, setSavingClinic] = useState(false);

  // Clinic fields
  const [clinicName, setClinicName] = useState('');
  const [clinicPhone10, setClinicPhone10] = useState('');
  const [clinicEmail, setClinicEmail] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [clinicCity, setClinicCity] = useState('');

  // Working Hours, Operating Days, Lunch Window & Holidays State
  const [workingDays, setWorkingDays] = useState<string[]>([
    'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'
  ]);
  const [openTime, setOpenTime] = useState<string>('09:00 AM');
  const [closeTime, setCloseTime] = useState<string>('06:00 PM');
  const [lunchStartTime, setLunchStartTime] = useState<string>('01:00 PM');
  const [lunchEndTime, setLunchEndTime] = useState<string>('02:00 PM');
  const [enableLunchBreak, setEnableLunchBreak] = useState<boolean>(true);
  const [slotDurationMinutes, setSlotDurationMinutes] = useState<number>(15);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Admin Profile fields
  const [adminName, setAdminName] = useState(currentUser?.name || '');
  const [adminPhone10, setAdminPhone10] = useState(
    currentUser?.phoneNumber ? currentUser.phoneNumber.replace(/\D/g, '').slice(-10) : ''
  );
  const [adminEmail, setAdminEmail] = useState(currentUser?.email || '');
  const [savingAdmin, setSavingAdmin] = useState(false);

  // Password Change fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Feedback notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Fetch Clinic Info
  const fetchClinicDetails = async () => {
    if (!clinicId) return;
    setLoadingClinic(true);
    try {
      const res = await fetch(`/api/clinics/${clinicId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success && data.data) {
        const c = data.data;
        setClinic(c);
        setClinicName(c.name || '');
        setClinicPhone10(c.phoneNumber ? c.phoneNumber.replace(/\D/g, '').slice(-10) : '');
        setClinicEmail(c.email || '');
        setClinicAddress(c.address || '');
        setClinicCity(c.city || '');
        if (c.workingDays) {
          setWorkingDays(c.workingDays.split(',').map((s: string) => s.trim().toUpperCase()));
        }
        if (c.openTime) setOpenTime(c.openTime);
        if (c.closeTime) setCloseTime(c.closeTime);
        if ((c as any).lunchStartTime) setLunchStartTime((c as any).lunchStartTime);
        if ((c as any).lunchEndTime) setLunchEndTime((c as any).lunchEndTime);
        if ((c as any).enableLunchBreak !== undefined) setEnableLunchBreak(Boolean((c as any).enableLunchBreak));
        if ((c as any).slotDurationMinutes !== undefined) setSlotDurationMinutes(Number((c as any).slotDurationMinutes));
        if (c.holidays) {
          try {
            const parsed = JSON.parse(c.holidays);
            if (Array.isArray(parsed)) setHolidays(parsed);
          } catch {}
        }
      }
    } catch (err) {
      console.error('Failed to load clinic details:', err);
    } finally {
      setLoadingClinic(false);
    }
  };

  useEffect(() => {
    fetchClinicDetails();
  }, [clinicId]);

  // Keep admin profile fields synced when currentUser prop updates
  useEffect(() => {
    if (currentUser) {
      setAdminName(currentUser.name || '');
      setAdminPhone10(
        currentUser.phoneNumber ? currentUser.phoneNumber.replace(/\D/g, '').slice(-10) : ''
      );
      setAdminEmail(currentUser.email || '');
    }
  }, [currentUser]);

  // Handle Save Admin Profile
  const handleSaveAdminProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const trimmedName = adminName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      showToast('error', 'Please enter a valid administrator name (at least 2 characters).');
      return;
    }

    const clean10 = adminPhone10.replace(/\D/g, '').slice(0, 10);
    if (clean10.length !== 10 || !/^[6-9]\d{9}$/.test(clean10)) {
      showToast('error', 'Please provide a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
      return;
    }

    try {
      setSavingAdmin(true);
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: trimmedName,
          email: adminEmail.trim() || undefined,
          phoneNumber: `+91${clean10}`,
        }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        showToast('success', 'Admin profile updated successfully!');
        if (onProfileUpdated) {
          onProfileUpdated(data.data);
        }
      } else {
        showToast('error', data.error?.message || data.message || 'Failed to update admin profile.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error updating administrator profile.');
    } finally {
      setSavingAdmin(false);
    }
  };

  // Handle Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!newPassword || newPassword.length < 6) {
      showToast('error', 'New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('error', 'New password and confirm password do not match.');
      return;
    }

    try {
      setChangingPassword(true);
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: currentPassword || undefined,
          newPassword: newPassword.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast('success', 'Password updated successfully! You can now use your new password.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showToast('error', data.error?.message || data.message || 'Failed to update password.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error updating password.');
    } finally {
      setChangingPassword(false);
    }
  };

  // Handle Save Clinic Information
  const handleSaveClinicDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !clinicId) return;

    const trimmedName = clinicName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      showToast('error', 'Please enter a valid clinic name.');
      return;
    }

    const clean10 = clinicPhone10.replace(/\D/g, '').slice(0, 10);
    if (clean10 && (clean10.length !== 10 || !/^[6-9]\d{9}$/.test(clean10))) {
      showToast('error', 'Please provide a valid 10-digit Indian mobile number for the clinic.');
      return;
    }

    try {
      setSavingClinic(true);
      const res = await fetch(`/api/clinics/${clinicId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: trimmedName,
          phoneNumber: clean10 ? `+91${clean10}` : undefined,
          email: clinicEmail.trim() || undefined,
          address: clinicAddress.trim() || undefined,
          city: clinicCity.trim() || undefined,
          workingDays: workingDays.join(','),
          openTime,
          closeTime,
          holidays: JSON.stringify(holidays),
        }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        showToast('success', 'Clinic information updated successfully!');
        setClinic(data.data);
      } else {
        showToast('error', data.error?.message || data.message || 'Failed to update clinic information.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error updating clinic details.');
    } finally {
      setSavingClinic(false);
    }
  };

  // Days of week metadata
  const DAYS_OF_WEEK = [
    { key: 'MONDAY', label: 'Mon', full: 'Monday' },
    { key: 'TUESDAY', label: 'Tue', full: 'Tuesday' },
    { key: 'WEDNESDAY', label: 'Wed', full: 'Wednesday' },
    { key: 'THURSDAY', label: 'Thu', full: 'Thursday' },
    { key: 'FRIDAY', label: 'Fri', full: 'Friday' },
    { key: 'SATURDAY', label: 'Sat', full: 'Saturday' },
    { key: 'SUNDAY', label: 'Sun', full: 'Sunday' },
  ];

  const TIME_OPTIONS = [
    '07:00 AM', '07:30 AM', '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM',
    '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM',
    '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM'
  ];

  const handleToggleDay = (dayKey: string) => {
    setWorkingDays((prev) =>
      prev.includes(dayKey) ? prev.filter((d) => d !== dayKey) : [...prev, dayKey]
    );
  };

  const handleToggleHoliday = (dateStr: string) => {
    setHolidays((prev) =>
      prev.includes(dateStr) ? prev.filter((d) => d !== dateStr) : [...prev, dateStr].sort()
    );
  };

  // Handle Save Working Hours, Days and Holidays
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !clinicId) return;

    if (workingDays.length === 0) {
      showToast('error', 'Please select at least one working day for the clinic.');
      return;
    }

    try {
      setSavingSchedule(true);
      const res = await fetch(`/api/clinics/${clinicId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workingDays: workingDays.join(','),
          openTime,
          closeTime,
          lunchStartTime,
          lunchEndTime,
          enableLunchBreak,
          slotDurationMinutes: Number(slotDurationMinutes),
          holidays: JSON.stringify(holidays),
        }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        showToast('success', 'Clinic operating days, hours, lunch window, and holidays updated successfully!');
        setClinic(data.data);
      } else {
        showToast('error', data.error?.message || data.message || 'Failed to update clinic schedule.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error updating schedule.');
    } finally {
      setSavingSchedule(false);
    }
  };

  // Renders a monthly calendar for holiday selection
  const renderMonthCalendar = (baseDate: Date) => {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const monthName = baseDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = new Date().toLocaleDateString('en-CA');

    const blanks = Array.from({ length: firstDay });
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const monthHolidays = holidays.filter((h) => {
      const [hY, hM] = h.split('-').map(Number);
      return hY === year && hM === month + 1;
    });

    return (
      <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
          <span className="font-black text-xs text-[#1E293B] uppercase tracking-wide flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#0284C7]" />
            <span>{monthName}</span>
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
            {monthHolidays.length} {monthHolidays.length === 1 ? 'Holiday' : 'Holidays'}
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400">
          <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {blanks.map((_, i) => (
            <div key={`blank-${i}`} className="h-8" />
          ))}

          {days.map((day) => {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isPast = dateStr < todayStr;
            const isHoliday = holidays.includes(dateStr);
            const isToday = dateStr === todayStr;

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => !isPast && handleToggleHoliday(dateStr)}
                disabled={isPast}
                className={`h-8 rounded-xl text-xs font-bold transition flex items-center justify-center relative ${
                  isPast
                    ? 'text-slate-300 bg-transparent cursor-not-allowed'
                    : isHoliday
                    ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-sm ring-2 ring-rose-300 font-black'
                    : isToday
                    ? 'bg-sky-100 hover:bg-sky-200 text-[#0284C7] font-black border border-sky-300'
                    : 'bg-white hover:bg-slate-200/80 text-slate-700 border border-slate-200/80'
                }`}
                title={isHoliday ? `${dateStr} is marked as Holiday` : isPast ? 'Past date' : `Click to mark ${dateStr} as Holiday`}
              >
                <span>{day}</span>
                {isHoliday && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-600 border border-white rounded-full shadow-xs" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full pb-10 animate-in fade-in duration-200">
      {/* Toast Alert */}
      {feedback && (
        <div
          className={`fixed top-5 right-5 z-[99999] px-5 py-3.5 rounded-2xl shadow-2xl flex items-center space-x-2.5 text-xs sm:text-sm font-bold border animate-in slide-in-from-top-4 ${
            feedback.type === 'success'
              ? 'bg-[#16A34A] text-white border-green-400/30 ring-4 ring-green-600/20'
              : 'bg-[#DC2626] text-white border-red-400/30 ring-4 ring-red-600/20'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Top Profile Header Hero */}
      <div className="bg-gradient-to-r from-[#1E293B] via-[#0F172A] to-[#1E293B] rounded-3xl p-6 sm:p-8 text-white shadow-lg border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-[#0284C7] to-sky-400 flex items-center justify-center text-white shadow-md font-black text-2xl sm:text-3xl border border-sky-300/30">
            {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'A'}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="bg-[#0284C7]/30 border border-sky-400/40 text-sky-300 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                Clinic Administrator &amp; Owner
              </span>
              <span className="bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Verified Account</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {currentUser?.name || 'Clinic Administrator'}
            </h1>
            <p className="text-xs text-slate-300 mt-0.5 flex items-center space-x-2">
              <span>{clinic?.name || 'Assigned Clinic'}</span>
              <span>&bull;</span>
              <span className="font-mono text-sky-300">{currentUser?.phoneNumber || 'No phone'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Admin Profile & Security Form + Clinic Info Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ========================================================================= */}
        {/* CARD 1: Administrator Personal Account Details                            */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <div className="p-2 rounded-xl bg-sky-50 text-[#0284C7] border border-sky-100">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-[#1E293B]">Admin Account Details</h2>
                <p className="text-xs text-[#64748B]">Manage your administrator profile and contact credentials</p>
              </div>
            </div>

            <form onSubmit={handleSaveAdminProfile} className="space-y-4 mt-5">
              <div>
                <label className="text-xs font-bold text-[#64748B] block mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="e.g. Dr. Rajesh Gupta / Clinic Admin"
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#64748B] block mb-1">
                  Login Mobile Number (10 Digits) <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center">
                  <span className="bg-slate-100 border border-r-0 border-slate-300 text-slate-600 text-xs px-3 py-2.5 rounded-l-xl font-bold font-mono">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={adminPhone10}
                    onChange={(e) => setAdminPhone10(e.target.value.replace(/\D/g, ''))}
                    placeholder="9876543210"
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-r-xl px-3.5 py-2.5 text-xs font-mono font-semibold text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Used for OTP and password-based login as Clinic Admin.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-[#64748B] block mb-1">
                  Admin Email Address <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@apolloclinic.com"
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingAdmin}
                  className="w-full bg-[#0284C7] hover:bg-[#0369A1] text-white py-2.5 rounded-xl font-bold text-xs shadow-sm transition flex items-center justify-center space-x-2 disabled:opacity-50 active:scale-[0.99]"
                >
                  {savingAdmin ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Admin Details</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 text-[11px] text-slate-500 flex items-center space-x-2">
            <Shield className="w-4 h-4 text-sky-600 shrink-0" />
            <span>Profile updates reflect immediately across the dashboard and session tokens.</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CARD 2: Security & Change Password                                        */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-[#1E293B]">Change Password</h2>
                <p className="text-xs text-[#64748B]">Update your login password for secure password-based access</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4 mt-5">
              <div>
                <label className="text-xs font-bold text-[#64748B] block mb-1">
                  Current Password <span className="text-slate-400 font-normal">(Leave blank if first-time set)</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-semibold text-[#1E293B] focus:ring-2 focus:ring-amber-500 focus:outline-none pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#64748B] block mb-1">
                  New Password <span className="text-red-500">*</span> <span className="text-slate-400 font-normal">(Min 6 characters)</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 chars)"
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-semibold text-[#1E293B] focus:ring-2 focus:ring-amber-500 focus:outline-none pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#64748B] block mb-1">
                  Confirm New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-semibold text-[#1E293B] focus:ring-2 focus:ring-amber-500 focus:outline-none pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-xl font-bold text-xs shadow-sm transition flex items-center justify-center space-x-2 disabled:opacity-50 active:scale-[0.99]"
                >
                  {changingPassword ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3.5 text-[11px] text-amber-800 flex items-center space-x-2">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Passwords are hashed securely with bcrypt. Default factory password: <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">Password@123</code></span>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: Clinic Facility Information Details                             */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600 border border-teal-100">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#1E293B]">Clinic Facility Information</h2>
              <p className="text-xs text-[#64748B]">
                Public clinic profile, patient contact details, and location
              </p>
            </div>
          </div>

          {clinic && (
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-500">Facility ID:</span>
              <span className="font-mono text-xs bg-slate-100 text-slate-700 font-semibold px-2.5 py-1 rounded-lg border border-slate-200">
                {clinic.id.slice(0, 8)}...
              </span>
            </div>
          )}
        </div>

        <form onSubmit={handleSaveClinicDetails} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-[#64748B] block mb-1">
              Clinic Display Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              placeholder="e.g. Apollo Medical Center"
              className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#1E293B] focus:ring-2 focus:ring-teal-500 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-[#64748B] block mb-1">
                Clinic Contact Phone (10 Digits)
              </label>
              <div className="flex items-center">
                <span className="bg-slate-100 border border-r-0 border-slate-300 text-slate-600 text-xs px-3 py-2.5 rounded-l-xl font-bold font-mono">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  value={clinicPhone10}
                  onChange={(e) => setClinicPhone10(e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-r-xl px-3.5 py-2.5 text-xs font-mono font-semibold text-[#1E293B] focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#64748B] block mb-1">
                Clinic Contact Email
              </label>
              <input
                type="email"
                value={clinicEmail}
                onChange={(e) => setClinicEmail(e.target.value)}
                placeholder="contact@apolloclinic.com"
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#1E293B] focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-[#64748B] block mb-1">Street Address</label>
              <input
                type="text"
                value={clinicAddress}
                onChange={(e) => setClinicAddress(e.target.value)}
                placeholder="e.g. 104 Park Avenue, Medical Enclave"
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#1E293B] focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#64748B] block mb-1">City</label>
              <input
                type="text"
                value={clinicCity}
                onChange={(e) => setClinicCity(e.target.value)}
                placeholder="e.g. Mumbai"
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#1E293B] focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end">
            <button
              type="submit"
              disabled={savingClinic}
              className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-sm transition flex items-center space-x-2 disabled:opacity-50 active:scale-[0.99]"
            >
              {savingClinic ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving Clinic Info...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Clinic Details</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: Clinic Working Timings, Operating Days & Holiday Calendar      */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-sky-50 text-[#0284C7] border border-sky-100">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#1E293B]">Operating Days, Hours &amp; Holiday Calendar</h2>
              <p className="text-xs text-[#64748B]">
                Configure clinic active working days, daily consultation hours, and mark holidays for current &amp; next month
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
              {workingDays.length} Working Days &bull; {holidays.length} Holidays
            </span>
          </div>
        </div>

        <form onSubmit={handleSaveSchedule} className="space-y-6">
          {/* Working Days Selector */}
          <div>
            <label className="text-xs font-bold text-[#1E293B] block mb-2 flex items-center space-x-2">
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Clinic Operating Days (Select Active Days)</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {DAYS_OF_WEEK.map((d) => {
                const isActive = workingDays.includes(d.key);
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => handleToggleDay(d.key)}
                    className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center space-y-1 ${
                      isActive
                        ? 'bg-sky-50 border-[#0284C7] text-[#0284C7] shadow-xs ring-2 ring-sky-300/30'
                        : 'bg-[#F8FAFC] border-slate-200 text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xs font-black uppercase tracking-wider">{d.label}</span>
                    <span className="text-[10px] font-medium">{isActive ? 'Open' : 'Closed'}</span>
                  </button>
                );
              })}
            </div>
            <span className="text-[11px] text-slate-400 mt-1.5 block">
              Days marked "Closed" prevent appointments and warn patients in the booking portal.
            </span>
          </div>

          {/* Working Timings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="text-xs font-bold text-[#1E293B] block mb-1.5 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Daily Opening Time</span>
              </label>
              <select
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-[#1E293B] block mb-1.5 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-rose-600" />
                <span>Daily Closing Time</span>
              </label>
              <select
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Lunch Break Window Configuration */}
          <div className="bg-[#F8FAFC] border border-slate-200/90 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/70">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                  <Sun className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-[#1E293B]">
                    Clinic Lunch / Break Window
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Exclude lunch or staff break window from patient appointment slots
                  </p>
                </div>
              </div>

              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={enableLunchBreak}
                  onChange={(e) => setEnableLunchBreak(e.target.checked)}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <span className="text-xs font-bold text-slate-700">Enable Lunch Break</span>
              </label>
            </div>

            {enableLunchBreak ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="text-[11px] font-bold text-[#1E293B] block mb-1">
                    Lunch Break Start Time
                  </label>
                  <select
                    value={lunchStartTime}
                    onChange={(e) => setLunchStartTime(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#1E293B] focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#1E293B] block mb-1">
                    Lunch Break End Time
                  </label>
                  <select
                    value={lunchEndTime}
                    onChange={(e) => setLunchEndTime(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#1E293B] focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">
                Lunch break is disabled. Patient appointment slots will run continuously between opening and closing hours.
              </p>
            )}
          </div>

          {/* Procedure / Consultation Slot Duration */}
          <div className="bg-[#F8FAFC] border border-slate-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-[#0284C7]" />
                <h4 className="text-xs font-black text-[#1E293B]">
                  Procedure / Consultation Slot Duration
                </h4>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300">
                  {slotDurationMinutes} Mins Multiples
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Appointments are generated in multiples of this duration across working hours (excluding lunch break).
              </p>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <label className="text-xs font-bold text-slate-600">Interval:</label>
              <select
                value={slotDurationMinutes}
                onChange={(e) => setSlotDurationMinutes(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] focus:outline-none cursor-pointer"
              >
                <option value={10}>10 Minutes</option>
                <option value={15}>15 Minutes (Standard)</option>
                <option value={20}>20 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes</option>
                <option value={60}>60 Minutes (1 Hour)</option>
              </select>
            </div>
          </div>

          {/* Holiday Calendar for Current and Next Month */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-black text-[#1E293B] block">
                  Mark Official Clinic Holidays (Current &amp; Next Month)
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Click on any date to toggle it as a holiday. Patients cannot book consultations on marked holidays.
                </p>
              </div>
              {holidays.length > 0 && (
                <button
                  type="button"
                  onClick={() => setHolidays([])}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-xl transition flex items-center space-x-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear All Holidays</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderMonthCalendar(new Date())}
              {renderMonthCalendar(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1))}
            </div>

            {/* Marked Holiday Chips */}
            {holidays.length > 0 && (
              <div className="bg-rose-50/60 border border-rose-200/80 rounded-2xl p-3.5 space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-rose-800 block">
                  Configured Holidays ({holidays.length}):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {holidays.map((hDate) => (
                    <span
                      key={hDate}
                      className="bg-white border border-rose-300 text-rose-800 text-[11px] font-bold px-2.5 py-1 rounded-xl flex items-center space-x-1.5 shadow-2xs"
                    >
                      <span>{hDate}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleHoliday(hDate)}
                        className="text-rose-400 hover:text-rose-700 font-black ml-1 text-xs"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingSchedule}
              className="bg-[#0284C7] hover:bg-[#0369A1] text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-sm transition flex items-center space-x-2 disabled:opacity-50 active:scale-[0.99]"
            >
              {savingSchedule ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving Schedule...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Timings &amp; Holidays</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: Clinic Management Shortcuts                                    */}
      {/* ========================================================================= */}
      {onNavigateTab && (
        <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md border border-slate-800">
          <div className="flex items-center space-x-2 mb-4">
            <Sparkles className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
              Facility Management Fast Shortcuts
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => onNavigateTab('DOCTORS')}
              className="p-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-2xl text-left transition group"
            >
              <Stethoscope className="w-4 h-4 text-sky-400 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-bold text-white">Doctors &amp; Chambers</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Manage doctor roster</p>
            </button>

            <button
              onClick={() => onNavigateTab('RECEPTIONIST')}
              className="p-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-2xl text-left transition group"
            >
              <UserCheck className="w-4 h-4 text-teal-400 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-bold text-white">Front Desk Staff</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Receptionist account</p>
            </button>

            <button
              onClick={() => onNavigateTab('PRICING')}
              className="p-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-2xl text-left transition group"
            >
              <DollarSign className="w-4 h-4 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-bold text-white">Pricing &amp; TV QR</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Configure dual rates</p>
            </button>

            <button
              onClick={() => onNavigateTab('VOICE')}
              className="p-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-2xl text-left transition group"
            >
              <Volume2 className="w-4 h-4 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-bold text-white">Voice Audio</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Chime &amp; announcements</p>
            </button>

            <button
              onClick={() => onNavigateTab('SUBSCRIPTION')}
              className="p-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-2xl text-left transition group col-span-2 sm:col-span-4"
            >
              <div className="flex items-center space-x-2">
                <Crown className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-bold text-white">Subscription &amp; Billing Portal</p>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 font-bold px-2 py-0.5 rounded-full border border-purple-400/30">
                  Manage Tier &amp; Invoices
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                View current plan limits, upgrade with Monthly/Quarterly/Yearly pricing, and download official payment receipts.
              </p>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
