import React, { useState, useEffect } from 'react';
import { UserCheck, AlertTriangle, X, CheckCircle, Lock, ShieldAlert } from 'lucide-react';

interface PatientProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  token: string | null;
  onProfileUpdated: (updatedUser: any) => void;
  warningMessage?: string | null;
  canSkip?: boolean;
  onProceedAfterComplete?: () => void;
}

export const PatientProfileModal: React.FC<PatientProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  token,
  onProfileUpdated,
  warningMessage = null,
  canSkip = true,
  onProceedAfterComplete,
}) => {
  // If user already has a temporary or seeded name, prefill it (unless it's the placeholder "Patient xxxx")
  const initialName = currentUser?.name && !currentUser.name.startsWith('Patient ') ? currentUser.name : '';
  const initialAge = currentUser?.age ? String(currentUser.age) : '';
  const initialGender = currentUser?.gender || 'Male';

  const [name, setName] = useState(initialName);
  const [age, setAge] = useState(initialAge);
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>(initialGender as any);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const currentName = currentUser?.name && !currentUser.name.startsWith('Patient ') ? currentUser.name : '';
      const currentAge = currentUser?.age ? String(currentUser.age) : '';
      const currentGender = currentUser?.gender || 'Male';
      setName(currentName);
      setAge(currentAge);
      setGender(currentGender as any);
      setErrorMsg(null);
    }
  }, [isOpen, currentUser?.id]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = name.trim();
    if (!cleanName || cleanName.length < 2) {
      setErrorMsg('Please enter a valid full name (at least 2 characters).');
      return;
    }

    const parsedAge = parseInt(age, 10);
    if (isNaN(parsedAge) || parsedAge < 1 || parsedAge > 125) {
      setErrorMsg('Please enter a valid age between 1 and 125.');
      return;
    }

    if (!gender) {
      setErrorMsg('Please select your sex/gender.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Bypass-Tunnel-Reminder': 'true',
        },
        body: JSON.stringify({
          name: cleanName,
          age: parsedAge,
          gender,
        }),
      });

      const data = await res.json();

      if (data.success && data.data) {
        const updatedUser = {
          ...currentUser,
          ...data.data,
          isProfileComplete: true,
        };

        // Update local storage
        localStorage.setItem('user', JSON.stringify(updatedUser));
        localStorage.setItem('queueapp_user', JSON.stringify(updatedUser));

        onProfileUpdated(updatedUser);
        onClose();

        if (onProceedAfterComplete) {
          onProceedAfterComplete();
        }
      } else {
        setErrorMsg(data.error?.message || data.message || 'Failed to update profile. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error communicating with server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative animate-in zoom-in-95 duration-150">
        
        {/* Close / Skip X Button if skippable */}
        {canSkip && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 transition"
            title="Skip for now"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-sky-100 text-[#0284C7] border border-sky-200 flex items-center justify-center shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-[#1E293B]">Complete Your Patient Profile</h3>
            <p className="text-xs text-[#64748B]">Fill in your details for appointments &amp; OPD tokens</p>
          </div>
        </div>

        {/* Warning Banner if blocked from booking */}
        {warningMessage && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-start space-x-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Profile Completion Required</p>
              <p className="text-[11px] text-amber-800 mt-0.5">{warningMessage}</p>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Verma"
              className="w-full bg-[#F8FAFC] border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-[#1E293B] font-semibold focus:outline-none focus:border-[#0284C7] focus:bg-white"
            />
          </div>

          {/* Age and Sex / Gender in a 2-column grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Age */}
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1.5">
                Age (Years) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min={1}
                max={125}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 28"
                className="w-full bg-[#F8FAFC] border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-[#1E293B] font-semibold focus:outline-none focus:border-[#0284C7] focus:bg-white"
              />
            </div>

            {/* Sex / Gender */}
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1.5">
                Sex / Gender <span className="text-red-500">*</span>
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full bg-[#F8FAFC] border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-[#1E293B] font-semibold focus:outline-none focus:border-[#0284C7] focus:bg-white"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Mobile Phone Number (Unchangeable & Pre-filled) */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-[#334155]">
                Registered Mobile Number
              </label>
              <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                <Lock className="w-2.5 h-2.5" />
                <span>Verified Account</span>
              </span>
            </div>
            <div className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-600 font-mono font-bold flex items-center justify-between cursor-not-allowed">
              <span>{currentUser?.phoneNumber || '+91 Mobile Number'}</span>
              <span className="text-[10px] text-emerald-600 font-sans font-bold flex items-center space-x-1">
                <CheckCircle className="w-3 h-3" />
                <span>Linked</span>
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Your verified mobile number is linked to your clinic queue alerts.
            </p>
          </div>

          {/* Buttons: Save & Complete vs Skip for now */}
          <div className="pt-2 space-y-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0284C7] hover:bg-[#0369A1] text-white py-2.5 rounded-xl font-bold text-xs transition shadow-sm flex items-center justify-center space-x-1.5 active:scale-95"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{loading ? 'Saving Profile...' : 'Save & Complete Profile'}</span>
            </button>

            {canSkip && (
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
              >
                Skip for now
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
