import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Stethoscope, 
  Building2, 
  CreditCard, 
  CheckCircle, 
  AlertCircle, 
  X, 
  QrCode, 
  Globe, 
  ShieldCheck, 
  ChevronRight, 
  ArrowLeft,
  Sparkles,
  Phone,
  User,
  Zap,
  Lock,
  Layers
} from 'lucide-react';
import { ClinicItem } from './ClinicSearchSelect';

interface DoctorOption {
  id: string;
  name: string;
  specialization?: string;
  roomNumber?: string;
}

interface AppointmentBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  clinics: ClinicItem[];
  preselectedClinicId?: string;
  initialBookingType?: 'IN_CLINIC' | 'REMOTE';
  qrToken?: string;
  currentUser?: any;
  token?: string | null;
  onOpenPatientLogin?: () => void;
  onLoginSuccess?: (user: any, token: string) => void;
  onBookingConfirmed?: (tokenNumber: string, clinicId: string) => void;
}

export const AppointmentBookingModal: React.FC<AppointmentBookingModalProps> = ({
  isOpen,
  onClose,
  clinics,
  preselectedClinicId = '',
  initialBookingType = 'REMOTE',
  qrToken: initialQrToken = '',
  currentUser,
  token,
  onOpenPatientLogin,
  onLoginSuccess,
  onBookingConfirmed,
}) => {
  const [step, setStep] = useState<'DETAILS' | 'PAYMENT' | 'SUCCESS'>('DETAILS');
  const [bookingType, setBookingType] = useState<'IN_CLINIC' | 'REMOTE'>(initialBookingType);
  const [selectedClinicId, setSelectedClinicId] = useState<string>(preselectedClinicId || (clinics[0]?.id ?? ''));
  const [qrToken, setQrToken] = useState<string>(initialQrToken);

  // Doctors & Slot State
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('10:30 AM');
  const [joinQueueImmediately, setJoinQueueImmediately] = useState<boolean>(false);

  // Patient Info State (if not logged in)
  const [patientName, setPatientName] = useState('');
  const [patientPhone10, setPatientPhone10] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
  const [phoneStep, setPhoneStep] = useState<'PHONE' | 'OTP'>('PHONE');

  // Pricing & Execution State
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
  const [isProcessingBooking, setIsProcessingBooking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Completed Confirmation State
  const [confirmedTokenNumber, setConfirmedTokenNumber] = useState<string | null>(null);
  const [confirmedAppointment, setConfirmedAppointment] = useState<any | null>(null);

  // Determine current active clinic & booking mode
  const activeClinic = clinics.find((c) => c.id === selectedClinicId);
  const isBookingTimeEnabled = (activeClinic as any)?.enableBookingTime !== false;
  const inClinicFee = (activeClinic as any)?.inClinicPrice ?? 200;
  const remoteFee = (activeClinic as any)?.remotePrice ?? 250;
  const baseFee = bookingType === 'IN_CLINIC' ? inClinicFee : remoteFee;
  const priorityFee = joinQueueImmediately ? 50 : 0;
  const currentFee = baseFee + priorityFee;

  // Sync props when modal opens or query params arrive
  useEffect(() => {
    if (preselectedClinicId) {
      setSelectedClinicId(preselectedClinicId);
    } else if (!selectedClinicId && clinics.length > 0) {
      setSelectedClinicId(clinics[0].id);
    }
    if (initialBookingType) {
      setBookingType(initialBookingType);
    }
    if (initialQrToken) {
      setQrToken(initialQrToken);
    }
    setErrorMsg(null);
  }, [isOpen, preselectedClinicId, initialBookingType, initialQrToken, clinics]);

  // Fetch doctors for current clinic
  useEffect(() => {
    if (!selectedClinicId) return;
    setIsLoadingDoctors(true);
    fetch(`/api/clinics/${selectedClinicId}/doctors`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setDoctors(data.data);
          if (data.data.length > 0) {
            setSelectedDoctorId(data.data[0].id);
          } else {
            setSelectedDoctorId('');
          }
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingDoctors(false));
  }, [selectedClinicId]);

  if (!isOpen) return null;

  // Time slot options
  const timeSlots = [
    '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', 
    '11:30 AM', '12:00 PM', '02:00 PM', '02:30 PM', 
    '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'
  ];

  // Helper to convert date + time string into ISO 8601 string
  const getSlotIsoTime = (): string => {
    if (!isBookingTimeEnabled) {
      return new Date().toISOString();
    }
    try {
      const [time, period] = selectedTimeSlot.split(' ');
      const [hoursStr, minutesStr] = time.split(':');
      let hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);
      if (period === 'PM' && hours < 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;

      const dateObj = new Date(selectedDate);
      dateObj.setHours(hours, minutes, 0, 0);
      return dateObj.toISOString();
    } catch {
      return new Date().toISOString();
    }
  };

  // Inline OTP login for patients if not logged in
  const handleQuickPatientLogin = async () => {
    const clean10 = patientPhone10.replace(/\D/g, '').slice(0, 10);
    if (clean10.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit Indian phone number.');
      return;
    }

    setIsVerifyingPhone(true);
    setErrorMsg(null);

    try {
      const verifyRes = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: `+91${clean10}`,
          otp: otpCode || '123456',
        }),
      });

      const verifyData = await verifyRes.json();
      if (verifyData.success && verifyData.data) {
        const { user, accessToken } = verifyData.data;
        localStorage.setItem('token', accessToken);
        localStorage.setItem('user', JSON.stringify(user));
        if (onLoginSuccess) {
          onLoginSuccess(user, accessToken);
        }
        setPhoneStep('PHONE');
        return accessToken;
      } else {
        setErrorMsg(verifyData.error?.message || 'Verification failed. Try OTP 123456.');
        return null;
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error verifying phone number.');
      return null;
    } finally {
      setIsVerifyingPhone(false);
    }
  };

  // Step 1: Proceed to Payment Summary
  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedClinicId) {
      setErrorMsg('Please select a healthcare clinic.');
      return;
    }

    if (bookingType === 'IN_CLINIC' && !qrToken) {
      setErrorMsg('In-Clinic discounted booking requires scanning the rotating QR code on the clinic TV screen.');
      return;
    }

    // Enforce authentication: User MUST be logged in to book appointment
    if (!token && !currentUser) {
      setErrorMsg('Patient login is required to book an appointment.');
      if (onOpenPatientLogin) {
        onClose();
        onOpenPatientLogin();
      }
      return;
    }

    setStep('PAYMENT');
  };

  // Step 2 & 3: Create Appointment -> Create Payment Order -> Verify Payment -> Get Assigned Token
  const handleExecutePayment = async () => {
    setIsProcessingBooking(true);
    setErrorMsg(null);

    const activeToken = token || localStorage.getItem('token');
    if (!activeToken) {
      setErrorMsg('Authentication token missing. Please sign in as patient.');
      setIsProcessingBooking(false);
      return;
    }

    try {
      // 1. Create Appointment (Server calculates fee strictly, rejects expired QR)
      const slotIso = getSlotIsoTime();
      const bookRes = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`,
        },
        body: JSON.stringify({
          clinicId: selectedClinicId,
          doctorId: selectedDoctorId || undefined,
          slotTime: slotIso,
          bookingType: bookingType,
          qrToken: bookingType === 'IN_CLINIC' ? qrToken : undefined,
          joinQueueImmediately: joinQueueImmediately,
        }),
      });

      const bookJson = await bookRes.json();
      if (!bookJson.success) {
        throw new Error(bookJson.error?.message || bookJson.message || 'Failed to initialize appointment.');
      }

      const appointment = bookJson.data;

      // 2. Create Payment Order (Razorpay)
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`,
        },
        body: JSON.stringify({
          appointmentId: appointment.id,
          amount: appointment.bookingFee,
          currency: 'INR',
          provider: 'RAZORPAY',
        }),
      });

      const orderJson = await orderRes.json();
      if (!orderJson.success) {
        throw new Error(orderJson.error?.message || orderJson.message || 'Payment order generation failed.');
      }

      const paymentOrder = orderJson.data;

      // 3. Verify Payment & Allocate First-Paid First-Served Queue Position
      const mockPaymentId = `pay_mock_${Date.now()}`;
      const verifyRes = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`,
        },
        body: JSON.stringify({
          paymentId: paymentOrder.paymentId,
          razorpayOrderId: paymentOrder.orderId,
          razorpayPaymentId: mockPaymentId,
          razorpaySignature: 'mock_paid_signature',
        }),
      });

      const verifyJson = await verifyRes.json();
      if (!verifyJson.success) {
        throw new Error(verifyJson.error?.message || verifyJson.message || 'Payment verification failed.');
      }

      const finalToken = verifyJson.data?.tokenNumber || 'Q01';
      setConfirmedTokenNumber(finalToken);
      setConfirmedAppointment(appointment);
      setStep('SUCCESS');

      if (onBookingConfirmed) {
        onBookingConfirmed(finalToken, selectedClinicId);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred during booking.');
    } finally {
      setIsProcessingBooking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] relative"
        role="dialog"
      >
        {/* Top Header */}
        <div className="bg-gradient-to-r from-[#0284C7] to-[#0369A1] p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg leading-tight">
                {step === 'SUCCESS' ? 'Booking Confirmed!' : 'Book Doctor Appointment'}
              </h2>
              <p className="text-xs text-sky-100 mt-0.5">
                {step === 'SUCCESS'
                  ? 'Your queue token has been allocated atomically'
                  : 'Fast confirmation & automatic queue token allocation'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert Banner */}
        {errorMsg && (
          <div className="bg-red-50 border-b border-red-200 p-3 px-5 text-xs text-red-700 font-semibold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* STEP 1: APPOINTMENT DETAILS & PRICING TIER */}
          {step === 'DETAILS' && (
            <form onSubmit={handleProceedToPayment} className="space-y-5">
              {/* Pricing Fee Card (Remote shows strictly non-discounted; In-Clinic shows locked TV discount) */}
              <div>
                <label className="text-xs font-bold text-[#1E293B] block mb-2">
                  Appointment Consultation Fee
                </label>
                {bookingType === 'IN_CLINIC' ? (
                  /* In-Clinic TV QR Scanned Mode */
                  <div className="p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50/70 text-emerald-950 flex items-center justify-between shadow-xs">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-200/80 text-emerald-900 flex items-center space-x-1">
                          <QrCode className="w-3 h-3 text-emerald-700" />
                          <span>In-Clinic TV Screen Discount</span>
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-white border border-emerald-200 px-2 py-0.5 rounded-full">
                          ₹50 Discount Applied
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-800/80 mt-1">
                        Cryptographically verified code from waiting room TV screen
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black font-mono text-emerald-700">₹{inClinicFee}</div>
                      <div className="text-[10px] text-slate-400 line-through">Standard ₹{remoteFee}</div>
                    </div>
                  </div>
                ) : (
                  /* Standard Remote Booking Mode - ONLY Non-Discounted Price */
                  <div className="p-4 rounded-2xl border-2 border-[#0284C7]/30 bg-[#F0F9FF] text-sky-950 flex items-center justify-between shadow-xs">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#E0F2FE] text-[#0284C7] flex items-center space-x-1">
                          <Globe className="w-3 h-3" />
                          <span>Doctor Consultation Booking</span>
                        </span>
                        <span className="text-[10px] font-bold text-[#0284C7] bg-white border border-sky-200 px-2 py-0.5 rounded-full">
                          Standard Fee
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1">
                        Online scheduled consultation with priority queue token allocation
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black font-mono text-[#0284C7]">₹{remoteFee}</div>
                      <div className="text-[10px] text-slate-500 font-medium">Standard rate</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Clinic Selector */}
              <div>
                <label className="text-xs font-bold text-[#1E293B] block mb-1.5">
                  Healthcare Clinic Facility
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <select
                    value={selectedClinicId}
                    onChange={(e) => setSelectedClinicId(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-slate-300 rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-bold text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
                    required
                  >
                    {clinics.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.address ? `(${c.address})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Doctor / Chamber Selection */}
              <div>
                <label className="text-xs font-bold text-[#1E293B] block mb-1.5">
                  Doctor / Consultation Chamber
                </label>
                <div className="relative">
                  <Stethoscope className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    disabled={isLoadingDoctors}
                    className="w-full bg-[#F8FAFC] border border-slate-300 rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-bold text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] focus:outline-none disabled:opacity-60"
                  >
                    <option value="">General OPD (First Available Doctor)</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.specialization ? `&bull; ${d.specialization}` : ''} {d.roomNumber ? `(${d.roomNumber})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Slot Date & Slot Time Grid (Visible when clinic booking time is enabled) */}
              {isBookingTimeEnabled ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#1E293B] block mb-1.5">
                      Appointment Date
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#1E293B] block mb-1.5">
                      Consultation Time Slot
                    </label>
                    <select
                      value={selectedTimeSlot}
                      onChange={(e) => setSelectedTimeSlot(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
                    >
                      {timeSlots.map((ts) => (
                        <option key={ts} value={ts}>
                          {ts}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                /* When booking time is turned OFF: Book for now banner */
                <div className="bg-sky-50 border-2 border-sky-200 rounded-2xl p-4 flex items-start space-x-3 shadow-xs">
                  <div className="p-2 bg-sky-100 text-[#0284C7] rounded-xl shrink-0 mt-0.5">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-xs text-[#0284C7] uppercase tracking-wide">
                        Book For Now (Instant Queue)
                      </span>
                      <span className="bg-sky-200/80 text-sky-900 text-[10px] font-black px-2 py-0.5 rounded-full">
                        Time Slots Turned Off
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                      This clinic has turned off scheduled time slots. Your booking is registered immediately for <b>Today</b>.
                    </p>
                  </div>
                </div>
              )}

              {/* Extra ₹50 Priority Pass Option: Join Queue Right Away */}
              <div
                onClick={() => setJoinQueueImmediately(!joinQueueImmediately)}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer shadow-xs ${
                  joinQueueImmediately
                    ? 'border-amber-500 bg-amber-50/90 ring-2 ring-amber-400/30'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={joinQueueImmediately}
                      onChange={(e) => setJoinQueueImmediately(e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-xs text-[#1E293B] flex items-center space-x-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                          <span>Join Queue Right Away (Priority Pass)</span>
                        </span>
                        <span className="bg-amber-100 border border-amber-300 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                          +₹50 Extra
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                        {joinQueueImmediately
                          ? '✅ Priority active! You will join the doctor\'s live queue immediately with a priority token.'
                          : 'Skip the booked appointment waitlist and join the live active queue immediately.'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-black font-mono text-amber-700">+₹50</div>
                    <div className="text-[10px] text-slate-400 font-semibold">Instant Queue</div>
                  </div>
                </div>
              </div>

              {/* Patient Profile / Authentication State */}
              {!token || !currentUser ? (
                <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 text-center space-y-2">
                  <div className="text-xs font-bold text-amber-900 flex items-center justify-center space-x-1.5">
                    <Lock className="w-4 h-4 text-amber-600" />
                    <span>Patient Authentication Required to Book</span>
                  </div>
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    You must be signed in as a patient to book appointments and receive a confirmed queue token.
                  </p>
                  {onOpenPatientLogin && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenPatientLogin();
                      }}
                      className="bg-[#0284C7] hover:bg-[#0369A1] text-white px-5 py-2 rounded-xl text-xs font-bold shadow-sm transition active:scale-95 inline-flex items-center space-x-1.5 mt-1"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Log in with Mobile Number</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-[#1E293B]">
                        {currentUser?.name || 'Registered Patient'}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 font-bold">
                        {currentUser?.phoneNumber || ''}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Verified Patient
                  </span>
                </div>
              )}

              {/* Bottom Action */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isVerifyingPhone}
                  className="w-full bg-[#0284C7] hover:bg-[#0369A1] text-white py-3.5 rounded-2xl font-bold text-sm shadow-md transition flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50"
                >
                  <span>Proceed to Payment</span>
                  <span className="bg-white/20 px-2.5 py-0.5 rounded-lg text-xs font-mono font-black">
                    ₹{currentFee}
                  </span>
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: PAYMENT WORKFLOW (FIRST-PAID FIRST-SERVED QUEUE POLICY) */}
          {step === 'PAYMENT' && (
            <div className="space-y-5">
              {/* Summary Card */}
              <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <span className="text-xs text-slate-500 font-medium">Clinic</span>
                  <span className="text-xs font-black text-[#1E293B] text-right">{activeClinic?.name}</span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <span className="text-xs text-slate-500 font-medium">Doctor / Chamber</span>
                  <span className="text-xs font-bold text-[#1E293B]">
                    {doctors.find((d) => d.id === selectedDoctorId)?.name || 'General OPD'}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <span className="text-xs text-slate-500 font-medium">Slot Time</span>
                  <span className="text-xs font-bold font-mono text-[#1E293B]">
                    {isBookingTimeEnabled ? `${selectedDate} at ${selectedTimeSlot}` : 'Immediate (Book For Now)'}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <span className="text-xs text-slate-500 font-medium">Booking Mode</span>
                  <span className="text-xs font-bold text-[#0284C7] bg-[#E0F2FE] px-2 py-0.5 rounded">
                    {bookingType === 'IN_CLINIC' ? 'In-Clinic TV Screen Discount' : 'Remote Online'}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <span className="text-xs text-slate-500 font-medium">Consultation Fee</span>
                  <span className="text-xs font-bold font-mono text-slate-700">₹{baseFee}</span>
                </div>

                {joinQueueImmediately && (
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 text-amber-700">
                    <span className="text-xs font-bold flex items-center space-x-1">
                      <Zap className="w-3.5 h-3.5 text-amber-600" />
                      <span>Join Queue Right Away Pass</span>
                    </span>
                    <span className="text-xs font-bold font-mono">+₹50</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm font-black text-[#1E293B]">Total Booking Fee</span>
                  <span className="text-2xl font-black font-mono text-emerald-600">₹{currentFee}</span>
                </div>
              </div>

              {/* Policy Banner: First-Paid First-Served */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 space-y-1">
                <div className="flex items-center space-x-1.5 font-bold">
                  <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Strict First-Paid, First-in-Queue Policy</span>
                </div>
                <p className="leading-relaxed">
                  Your live token sequence number is confirmed atomically when payment is received. Never submit altered fees; price is locked server-side.
                </p>
              </div>

              {/* Payment Gateway Options Mockup */}
              <div>
                <label className="text-xs font-bold text-[#1E293B] block mb-2">
                  Select Payment Method (Razorpay Gateway)
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="border-2 border-[#0284C7] bg-[#E0F2FE]/40 p-2.5 rounded-xl text-center cursor-pointer">
                    <div className="text-base font-bold text-[#0284C7]">UPI</div>
                    <div className="text-[10px] text-slate-500 font-medium">GPay &bull; PhonePe</div>
                  </div>
                  <div className="border border-slate-200 p-2.5 rounded-xl text-center opacity-70">
                    <div className="text-base font-bold text-slate-700">Card</div>
                    <div className="text-[10px] text-slate-500 font-medium">Debit / Credit</div>
                  </div>
                  <div className="border border-slate-200 p-2.5 rounded-xl text-center opacity-70">
                    <div className="text-base font-bold text-slate-700">NetBanking</div>
                    <div className="text-[10px] text-slate-500 font-medium">All Indian Banks</div>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('DETAILS')}
                  disabled={isProcessingBooking}
                  className="px-4 py-3 rounded-2xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition"
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={handleExecutePayment}
                  disabled={isProcessingBooking}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-2xl font-bold text-sm shadow-md transition flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  <span>{isProcessingBooking ? 'Verifying & Allocating Token...' : `Pay ₹${currentFee} & Confirm`}</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS & ASSIGNED TOKEN RECEIPT */}
          {step === 'SUCCESS' && (
            <div className="text-center py-4 space-y-5 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-[#DCFCE7] text-[#16A34A] rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle className="w-9 h-9" />
              </div>

              <div>
                <span className="text-[11px] font-black uppercase tracking-widest text-[#16A34A] bg-[#DCFCE7] px-3 py-1 rounded-full">
                  Payment Verified &bull; Token Allocated
                </span>
                <h3 className="text-xl font-black text-[#1E293B] mt-2">
                  Appointment Confirmed!
                </h3>
                <p className="text-xs text-[#64748B] mt-1">
                  Assigned atomically on first-paid first-in-queue order
                </p>
              </div>

              {/* Token Number Card */}
              <div className="bg-[#F8FAFC] border-2 border-emerald-500/40 rounded-3xl p-6 shadow-sm">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Your Queue Token
                </div>
                <div className="text-6xl font-black font-mono tracking-tight text-[#1E293B]">
                  {confirmedTokenNumber}
                </div>
                <div className="text-xs font-bold text-[#0284C7] mt-2 flex items-center justify-center space-x-1">
                  {joinQueueImmediately ? (
                    <span className="text-amber-700 bg-amber-50 border border-amber-300 px-3 py-1 rounded-full flex items-center space-x-1">
                      <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                      <span>⚡ Immediate Priority Token (Live in Queue)</span>
                    </span>
                  ) : (
                    <span>{bookingType === 'IN_CLINIC' ? 'In-Clinic Discounted Token' : 'Remote Advance Token'}</span>
                  )}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl text-xs text-slate-600 space-y-1 text-left">
                <div><b>Clinic:</b> {activeClinic?.name}</div>
                <div><b>Booking Mode:</b> {isBookingTimeEnabled ? `${selectedDate} at ${selectedTimeSlot}` : 'Immediate (Booked For Today)'}</div>
                <div><b>Queue Status:</b> <span className={joinQueueImmediately ? 'text-amber-700 font-bold' : 'text-emerald-700 font-bold'}>{joinQueueImmediately ? '⚡ In Live Queue Right Away' : 'Registered in Clinic Queue'}</span></div>
                <div><b>Total Paid:</b> ₹{currentFee} {joinQueueImmediately ? '(Includes ₹50 Priority Pass)' : ''}</div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onBookingConfirmed && confirmedTokenNumber) {
                      onBookingConfirmed(confirmedTokenNumber, selectedClinicId);
                    }
                  }}
                  className="flex-1 bg-[#0284C7] hover:bg-[#0369A1] text-white py-3.5 rounded-2xl font-bold text-xs shadow-md transition active:scale-95 flex items-center justify-center space-x-1.5"
                >
                  <Zap className="w-4 h-4" />
                  <span>Track Live Token Progress Now</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-3 rounded-2xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
