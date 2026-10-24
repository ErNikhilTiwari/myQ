import React, { useState, useEffect } from 'react';
import {
  Crown,
  Check,
  AlertCircle,
  CheckCircle,
  Clock,
  Shield,
  CreditCard,
  FileText,
  Calendar,
  Sparkles,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Users,
  Monitor,
  Stethoscope,
  X,
  Download,
  Printer,
  ChevronRight,
  Zap,
} from 'lucide-react';
import {
  SubscriptionDto,
  SubscriptionInvoiceDto,
  SubscriptionPlanType,
  SubscriptionBillingCycle,
  PLAN_LIMITS,
} from '@queueapp/shared';

interface ClinicSubscriptionTabProps {
  clinicId: string;
  clinicName: string;
  token: string | null;
  onRefreshData?: () => void;
}

export const ClinicSubscriptionTab: React.FC<ClinicSubscriptionTabProps> = ({
  clinicId,
  clinicName,
  token,
  onRefreshData,
}) => {
  const [sub, setSub] = useState<SubscriptionDto | null>(null);
  const [invoices, setInvoices] = useState<SubscriptionInvoiceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Billing Cycle Toggle (Monthly, Quarterly 10% off, Yearly 20% off)
  const [selectedCycle, setSelectedCycle] = useState<SubscriptionBillingCycle>('MONTHLY');

  // Checkout Modal State
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<SubscriptionPlanType>('PROFESSIONAL');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD' | 'NETBANKING'>('UPI');
  const [upiId, setUpiId] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Invoice Receipt Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<SubscriptionInvoiceDto | null>(null);

  const fetchSubscription = async () => {
    if (!clinicId || !token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/clinics/${clinicId}/subscription`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSub(data.data);
        if (data.data.invoices) {
          setInvoices(data.data.invoices);
        }
      }
    } catch (err: any) {
      console.error('Failed to load clinic subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [clinicId, token]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const openCheckout = (plan: SubscriptionPlanType) => {
    setCheckoutPlan(plan);
    setCheckoutModalOpen(true);
  };

  const handleProcessPayment = async () => {
    if (!token) return;
    setSubmittingPayment(true);
    try {
      const res = await fetch(`/api/clinics/${clinicId}/subscription/renew`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: checkoutPlan,
          billingCycle: selectedCycle,
          paymentMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error?.message || 'Payment processing failed');
      }

      showToast(
        'success',
        `Payment successful! "${data.data.subscription.plan}" plan is now active until ${new Date(data.data.subscription.endDate).toLocaleDateString()}.`,
      );
      setCheckoutModalOpen(false);
      setSub(data.data.subscription);
      if (data.data.invoice) {
        setInvoices((prev) => [data.data.invoice, ...prev]);
        setSelectedInvoice(data.data.invoice);
      }
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showToast('error', err.message || 'Payment failed. Please try again.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Pricing helper
  const getCyclePrice = (plan: SubscriptionPlanType, cycle: SubscriptionBillingCycle) => {
    const limits = PLAN_LIMITS[plan];
    if (cycle === 'QUARTERLY') return limits.priceQuarterlyINR;
    if (cycle === 'YEARLY') return limits.priceYearlyINR;
    return limits.priceMonthlyINR;
  };

  const getMonthlyEquivalent = (plan: SubscriptionPlanType, cycle: SubscriptionBillingCycle) => {
    const limits = PLAN_LIMITS[plan];
    if (cycle === 'QUARTERLY') return Math.round(limits.priceQuarterlyINR / 3);
    if (cycle === 'YEARLY') return Math.round(limits.priceYearlyINR / 12);
    return limits.priceMonthlyINR;
  };

  const checkoutPrice = getCyclePrice(checkoutPlan, selectedCycle);
  const checkoutTax = checkoutPrice > 0 ? Math.round(checkoutPrice * 0.18) : 0;
  const checkoutTotal = checkoutPrice + checkoutTax;

  if (loading && !sub) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200">
        <RefreshCw className="w-8 h-8 text-[#0284C7] animate-spin mb-3" />
        <p className="text-xs font-bold text-slate-600">Loading subscription and billing data...</p>
      </div>
    );
  }

  const currentPlan = sub?.plan || 'FREE';
  const isExpiringSoon = sub?.isExpiringSoon || false;
  const isExpired = sub?.isExpired || false;
  const daysRemaining = sub?.daysRemaining ?? 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {feedbackMsg && (
        <div
          className={`fixed top-5 right-5 z-[99999] px-5 py-3.5 rounded-2xl shadow-2xl flex items-center space-x-2.5 text-xs sm:text-sm font-bold transition-all duration-200 animate-in slide-in-from-top-4 border pointer-events-auto ${
            feedbackMsg.type === 'success'
              ? 'bg-[#16A34A] text-white border-green-400/30 ring-4 ring-green-600/20'
              : 'bg-[#DC2626] text-white border-red-400/30 ring-4 ring-red-600/20'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. EXPIRING OR EXPIRED WARNING BANNER                                     */}
      {/* ========================================================================= */}
      {isExpired && (
        <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white p-5 rounded-2xl shadow-lg border border-red-400/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top-2">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md">
                  Subscription Expired
                </span>
                <span className="text-xs text-red-100 font-medium">Service Grace Period</span>
              </div>
              <h2 className="text-base font-black mt-0.5 tracking-tight">
                Your clinic membership has expired!
              </h2>
              <p className="text-xs text-red-100 mt-0.5 leading-relaxed">
                Multi-doctor chambers, smart voice callouts, and TV queues may be restricted. Renew immediately to restore full platform access.
              </p>
            </div>
          </div>
          <button
            onClick={() => openCheckout(currentPlan === 'FREE' ? 'BASIC' : currentPlan)}
            className="bg-white hover:bg-red-50 text-red-700 px-5 py-2.5 rounded-xl font-black text-xs shadow-md transition-all active:scale-95 shrink-0 flex items-center space-x-1.5"
          >
            <Crown className="w-4 h-4 text-amber-500" />
            <span>Renew Membership Now</span>
          </button>
        </div>
      )}

      {!isExpired && isExpiringSoon && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-5 rounded-2xl shadow-lg border border-amber-300/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top-2">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md">
                  Expiring in {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
                </span>
                <span className="text-xs text-amber-100 font-medium">
                  Valid until {sub?.endDate ? new Date(sub.endDate).toLocaleDateString() : 'soon'}
                </span>
              </div>
              <h2 className="text-base font-black mt-0.5 tracking-tight">
                Your {sub?.plan} membership is expiring soon
              </h2>
              <p className="text-xs text-amber-100 mt-0.5 leading-relaxed">
                Renew today to ensure seamless doctor queue continuation, TV announcements, and SMS notifications.
              </p>
            </div>
          </div>
          <button
            onClick={() => openCheckout(currentPlan)}
            className="bg-white hover:bg-amber-50 text-amber-800 px-5 py-2.5 rounded-xl font-black text-xs shadow-md transition-all active:scale-95 shrink-0 flex items-center space-x-1.5"
          >
            <Crown className="w-4 h-4 text-amber-600" />
            <span>Renew Membership ({sub?.plan})</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CURRENT PLAN OVERVIEW & USAGE METERS                                    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Current Plan Card */}
        <div className="bg-white border-2 border-slate-200/90 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#64748B]">
                Active Subscription
              </span>
              <span
                className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                  isExpired
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : isExpiringSoon
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {sub?.status}
              </span>
            </div>

            <div className="mt-3 flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200/80 flex items-center justify-center font-black text-xl shadow-sm">
                <Crown className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">
                  {PLAN_LIMITS[currentPlan]?.name || currentPlan}
                </h3>
                <span className="text-xs font-bold text-slate-500">
                  {sub?.billingCycle || 'MONTHLY'} Billing Cycle
                </span>
              </div>
            </div>

            <div className="mt-5 space-y-2.5 text-xs text-slate-600 pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <span>Start Date:</span>
                <span className="font-bold text-slate-800 font-mono">
                  {sub?.startDate ? new Date(sub.startDate).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Expiration Date:</span>
                <span className="font-bold text-slate-800 font-mono">
                  {sub?.endDate ? new Date(sub.endDate).toLocaleDateString() : 'Lifetime Free'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Validity Remaining:</span>
                <span
                  className={`font-black font-mono ${
                    isExpired
                      ? 'text-red-600'
                      : isExpiringSoon
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                  }`}
                >
                  {isExpired ? 'Expired' : `${daysRemaining} Days`}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center space-x-2">
            <button
              onClick={() => openCheckout(currentPlan === 'FREE' ? 'BASIC' : currentPlan)}
              className="flex-1 bg-[#0284C7] hover:bg-[#0369A1] text-white py-2.5 rounded-xl font-bold text-xs shadow-sm transition active:scale-95 text-center flex items-center justify-center space-x-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isExpired ? 'Reactivate Plan' : 'Renew / Extend'}</span>
            </button>
            <button
              onClick={fetchSubscription}
              title="Refresh status"
              className="p-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quota & Resource Usage Meters */}
        <div className="lg:col-span-2 bg-white border-2 border-slate-200/90 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                  Quota &amp; Resource Utilization
                </h4>
                <p className="text-xs text-slate-500">
                  Allocated limits under your current {sub?.plan} tier
                </p>
              </div>
              <span className="text-xs font-bold text-[#0284C7] bg-[#E0F2FE] px-2.5 py-1 rounded-lg">
                Multi-Tenant Isolated
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              {/* Doctors Meter */}
              <div className="bg-[#F8FAFC] border border-slate-200/80 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 flex items-center space-x-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-[#0284C7]" />
                    <span>Doctor Chambers</span>
                  </span>
                  <span className="text-xs font-black text-slate-800 font-mono">
                    {sub?.doctorsUsed || 0} / {sub?.maxDoctors}
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full mt-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      (sub?.doctorsUsed || 0) >= (sub?.maxDoctors || 1)
                        ? 'bg-amber-500'
                        : 'bg-[#0284C7]'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(((sub?.doctorsUsed || 0) / (sub?.maxDoctors || 1)) * 100),
                      )}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-medium mt-1 block">
                  {(sub?.doctorsUsed || 0) >= (sub?.maxDoctors || 1)
                    ? 'Quota Full • Upgrade to add more'
                    : `${(sub?.maxDoctors || 1) - (sub?.doctorsUsed || 0)} chamber slots available`}
                </span>
              </div>

              {/* Staff / Receptionist Meter */}
              <div className="bg-[#F8FAFC] border border-slate-200/80 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 flex items-center space-x-1.5">
                    <Users className="w-3.5 h-3.5 text-teal-600" />
                    <span>Front Desk Staff</span>
                  </span>
                  <span className="text-xs font-black text-slate-800 font-mono">
                    {sub?.staffUsed || 0} / {sub?.maxStaff}
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full mt-2.5 overflow-hidden">
                  <div
                    className="h-full bg-teal-500 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(((sub?.staffUsed || 0) / (sub?.maxStaff || 1)) * 100),
                      )}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-medium mt-1 block">
                  1 Receptionist limit enforced per clinic
                </span>
              </div>

              {/* Smart TV Display Meter */}
              <div className="bg-[#F8FAFC] border border-slate-200/80 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 flex items-center space-x-1.5">
                    <Monitor className="w-3.5 h-3.5 text-purple-600" />
                    <span>Smart TV Screens</span>
                  </span>
                  <span className="text-xs font-black text-slate-800 font-mono">
                    {sub?.displaysUsed || 0} / {sub?.maxDisplays}
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full mt-2.5 overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(((sub?.displaysUsed || 0) / (sub?.maxDisplays || 1)) * 100),
                      )}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-medium mt-1 block">
                  {sub?.hasAds ? 'Platform banner ads enabled' : '✨ 100% Ad-Free display'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center space-x-1.5">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span>Full HIPAA &amp; Medical Data Encryption Guaranteed</span>
            </span>
            <span className="font-semibold text-slate-700">Facility ID: {clinicId.slice(0, 8)}...</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. INTERACTIVE PLAN SELECTOR & BILLING CYCLE TOGGLE                       */}
      {/* ========================================================================= */}
      <div className="bg-white border-2 border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="text-center max-w-xl mx-auto mb-8">
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#0284C7] bg-[#E0F2FE] px-3 py-1 rounded-full">
            Flexible Healthcare SaaS Plans
          </span>
          <h2 className="text-2xl font-black text-slate-800 mt-2 tracking-tight">
            Choose or Upgrade Your Clinic Subscription
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Scale seamlessly from single doctor practice to multi-room hospital chains with instant automated activation.
          </p>

          {/* Billing Cycle Switcher */}
          <div className="inline-flex items-center bg-slate-100 p-1.5 rounded-2xl mt-5 shadow-inner border border-slate-200">
            <button
              onClick={() => setSelectedCycle('MONTHLY')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedCycle === 'MONTHLY'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setSelectedCycle('QUARTERLY')}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedCycle === 'QUARTERLY'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Quarterly</span>
              <span className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                Save 10%
              </span>
            </button>
            <button
              onClick={() => setSelectedCycle('YEARLY')}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedCycle === 'YEARLY'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Yearly</span>
              <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded-full font-black flex items-center space-x-0.5">
                <span>Save 20%</span>
                <span>🔥</span>
              </span>
            </button>
          </div>
        </div>

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {(['FREE', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE'] as SubscriptionPlanType[]).map((planKey) => {
            const planInfo = PLAN_LIMITS[planKey];
            const isThisCurrent = currentPlan === planKey;
            const cyclePrice = getCyclePrice(planKey, selectedCycle);
            const monthlyEquiv = getMonthlyEquivalent(planKey, selectedCycle);

            return (
              <div
                key={planKey}
                className={`rounded-2xl p-6 flex flex-col justify-between border-2 transition-all relative ${
                  planInfo.recommended
                    ? 'border-[#0284C7] bg-sky-50/20 shadow-md ring-2 ring-[#0284C7]/20'
                    : isThisCurrent
                    ? 'border-purple-300 bg-purple-50/20 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                }`}
              >
                {planInfo.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0284C7] text-white text-[10px] font-black uppercase px-3 py-0.5 rounded-full shadow-sm tracking-wider">
                    Most Popular
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 tracking-tight uppercase">
                      {planInfo.name}
                    </span>
                    {isThisCurrent && (
                      <span className="text-[10px] font-black bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md">
                        Current Tier
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 min-h-[32px]">{planInfo.tagline}</p>

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-baseline space-x-1">
                      <span className="text-2xl sm:text-3xl font-black text-slate-900">
                        {cyclePrice === 0 ? 'Free' : `₹${cyclePrice.toLocaleString('en-IN')}`}
                      </span>
                      {cyclePrice > 0 && (
                        <span className="text-xs text-slate-500 font-semibold">
                          /{selectedCycle === 'MONTHLY' ? 'mo' : selectedCycle === 'QUARTERLY' ? 'qtr' : 'yr'}
                        </span>
                      )}
                    </div>

                    {selectedCycle !== 'MONTHLY' && cyclePrice > 0 && (
                      <span className="text-[10px] font-bold text-emerald-600 block mt-0.5">
                        ≈ ₹{monthlyEquiv.toLocaleString('en-IN')}/mo effective rate
                      </span>
                    )}
                  </div>

                  <div className="mt-5 space-y-2.5 pt-4 border-t border-slate-100">
                    {planInfo.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start space-x-2 text-xs text-slate-700">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="leading-snug">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  {isThisCurrent ? (
                    <button
                      onClick={() => openCheckout(planKey)}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl font-bold text-xs shadow-sm transition active:scale-95 flex items-center justify-center space-x-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{isExpired ? 'Reactivate Plan' : 'Renew Current Plan'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => openCheckout(planKey)}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs transition active:scale-95 flex items-center justify-center space-x-1.5 ${
                        planInfo.recommended
                          ? 'bg-[#0284C7] hover:bg-[#0369A1] text-white shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                      }`}
                    >
                      <span>Choose {planInfo.name}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. BILLING INVOICES & RECEIPT HISTORY TABLE                                */}
      {/* ========================================================================= */}
      <div className="bg-white border-2 border-slate-200/90 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800 tracking-tight">
                Billing Invoices &amp; Payment Receipts
              </h3>
              <p className="text-xs text-slate-500">
                Official GST payment vouchers and renewal transaction history
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-xl">
            {invoices.length} {invoices.length === 1 ? 'Invoice' : 'Invoices'}
          </span>
        </div>

        {invoices.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200/60">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-600">No Invoices Generated Yet</p>
            <p className="mt-0.5">Your invoices and renewal receipts will appear here after payment.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Plan / Cycle</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#0284C7]">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {new Date(inv.paidAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-800">{inv.plan}</span>
                      <span className="text-slate-400 font-medium ml-1">({inv.billingCycle})</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      ₹{inv.totalAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      {inv.paymentMethod}
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                        {inv.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="inline-flex items-center space-x-1 text-xs font-bold text-[#0284C7] bg-[#E0F2FE] hover:bg-sky-100 px-2.5 py-1 rounded-lg transition"
                      >
                        <FileText className="w-3 h-3" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. CHECKOUT & PAYMENT MODAL                                               */}
      {/* ========================================================================= */}
      {checkoutModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base">Confirm &amp; Activate Membership</h3>
                  <p className="text-xs text-slate-500">{clinicName}</p>
                </div>
              </div>
              <button
                onClick={() => setCheckoutModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Order Summary */}
            <div className="mt-5 bg-slate-50 border border-slate-200/80 rounded-2xl p-4.5 space-y-2.5 text-xs text-slate-600">
              <div className="flex justify-between items-center font-semibold">
                <span>Selected Plan:</span>
                <span className="font-bold text-slate-900">{PLAN_LIMITS[checkoutPlan]?.name}</span>
              </div>
              <div className="flex justify-between items-center font-semibold">
                <span>Billing Period:</span>
                <span className="font-bold text-slate-900">
                  {selectedCycle === 'MONTHLY'
                    ? '1 Month (30 Days)'
                    : selectedCycle === 'QUARTERLY'
                    ? '3 Months (90 Days - 10% Discount)'
                    : '12 Months (365 Days - 20% Discount)'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Base Price:</span>
                <span className="font-mono font-bold">₹{checkoutPrice.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Applicable GST (18%):</span>
                <span className="font-mono font-bold">₹{checkoutTax.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>Total Payable:</span>
                <span className="text-[#0284C7] font-mono text-base">
                  ₹{checkoutTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="mt-5">
              <label className="text-xs font-bold text-slate-700 block mb-2">
                Select Payment Mode (Instant Gateway Simulation)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('UPI')}
                  className={`p-3 rounded-xl border text-center text-xs font-bold transition flex flex-col items-center justify-center space-y-1 ${
                    paymentMethod === 'UPI'
                      ? 'border-[#0284C7] bg-[#E0F2FE] text-[#0284C7] ring-2 ring-[#0284C7]/20'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>UPI / QR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CARD')}
                  className={`p-3 rounded-xl border text-center text-xs font-bold transition flex flex-col items-center justify-center space-y-1 ${
                    paymentMethod === 'CARD'
                      ? 'border-[#0284C7] bg-[#E0F2FE] text-[#0284C7] ring-2 ring-[#0284C7]/20'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-purple-600" />
                  <span>Debit / Card</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('NETBANKING')}
                  className={`p-3 rounded-xl border text-center text-xs font-bold transition flex flex-col items-center justify-center space-y-1 ${
                    paymentMethod === 'NETBANKING'
                      ? 'border-[#0284C7] bg-[#E0F2FE] text-[#0284C7] ring-2 ring-[#0284C7]/20'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>Net Banking</span>
                </button>
              </div>

              {paymentMethod === 'UPI' && (
                <div className="mt-3">
                  <input
                    type="text"
                    placeholder="Enter UPI ID (e.g. doctor@okhdfcbank, clinic@paytm)"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    GPay, PhonePe, Paytm, BHIM or any Indian VPA supported
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end space-x-2.5">
              <button
                type="button"
                onClick={() => setCheckoutModalOpen(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingPayment}
                onClick={handleProcessPayment}
                className="bg-[#16A34A] hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 flex items-center space-x-2 disabled:opacity-50"
              >
                {submittingPayment ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Payment...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>
                      {checkoutTotal === 0 ? 'Activate Free Plan' : `Pay ₹${checkoutTotal.toLocaleString('en-IN')}`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. PRINTABLE / DOWNLOADABLE INVOICE RECEIPT MODAL                         */}
      {/* ========================================================================= */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 text-slate-800">
            {/* Invoice Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xl font-black tracking-tight text-[#0284C7]">Healthcare OS</span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                    PAID RECEIPT
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">SaaS Queue Management System Platform</p>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Invoice Meta */}
            <div className="grid grid-cols-2 gap-4 mt-5 text-xs text-slate-600">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Billed To</span>
                <span className="font-extrabold text-slate-900 text-sm block">{clinicName}</span>
                <span className="text-slate-500 font-mono text-[11px] block">Facility ID: {clinicId}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Invoice Details</span>
                <span className="font-mono font-bold text-[#0284C7] block">{selectedInvoice.invoiceNumber}</span>
                <span className="text-slate-500 block">
                  Date: {new Date(selectedInvoice.paidAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="mt-5 border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Service Description</th>
                    <th className="py-2.5 px-3">Billing Term</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-900">{selectedInvoice.plan} Membership</span>
                      <span className="text-slate-500 text-[11px] block">
                        Valid: {new Date(selectedInvoice.billingPeriodStart).toLocaleDateString()} to{' '}
                        {new Date(selectedInvoice.billingPeriodEnd).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-700">
                      {selectedInvoice.billingCycle}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      ₹{selectedInvoice.amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2} className="py-2 px-3 text-right font-semibold text-slate-600">
                      Applicable GST (18%):
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                      ₹{selectedInvoice.taxAmount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                  <tr className="bg-slate-50 font-black text-slate-900 text-sm">
                    <td colSpan={2} className="py-3 px-3 text-right">
                      Total Paid:
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[#0284C7]">
                      ₹{selectedInvoice.totalAmount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <span>Payment Mode: <strong>{selectedInvoice.paymentMethod}</strong></span>
              <span>Txn: <strong className="font-mono">{selectedInvoice.transactionId || 'TXN-PAID'}</strong></span>
            </div>

            {/* Actions */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                onClick={() => window.print()}
                className="flex items-center space-x-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Receipt</span>
              </button>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-xl font-bold text-xs transition shadow-sm"
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
