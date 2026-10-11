import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Calendar, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Users, 
  FileSpreadsheet, 
  Printer, 
  RefreshCw, 
  Sparkles,
  AlertCircle,
  DollarSign,
  MessageSquare,
  Building2,
  Flame,
  Lightbulb
} from 'lucide-react';

interface ClinicAnalyticsProps {
  clinicId: string;
  token: string | null;
  clinicName?: string;
}

export const ClinicAnalytics: React.FC<ClinicAnalyticsProps> = ({
  clinicId,
  token,
  clinicName,
}) => {
  const [reportType, setReportType] = useState<'daily' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  
  const [dailyData, setDailyData] = useState<any>(null);
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [advancedData, setAdvancedData] = useState<any>(null);
  const [insights, setInsights] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const fetchReports = async () => {
    if (!clinicId || !token) return;
    setLoading(true);
    setErrorMsg(null);
    const headers = { 
      'Authorization': `Bearer ${token}`,
      'Bypass-Tunnel-Reminder': 'true'
    };

    try {
      if (reportType === 'daily') {
        const [dailyRes, advRes, insRes] = await Promise.all([
          fetch(`/api/clinics/${clinicId}/reports/daily?date=${selectedDate}`, { headers }).then(r => r.json()),
          fetch(`/api/clinics/${clinicId}/reports/advanced-analytics?date=${selectedDate}`, { headers }).then(r => r.json()).catch(() => null),
          fetch(`/api/clinics/${clinicId}/reports/insights`, { headers }).then(r => r.json()).catch(() => null),
        ]);

        if (dailyRes?.success) {
          setDailyData(dailyRes.data);
        } else {
          setErrorMsg(dailyRes?.error?.message || dailyRes?.message || 'Failed to fetch daily report.');
        }

        if (advRes?.success) setAdvancedData(advRes.data);
        if (insRes?.success) setInsights(insRes.data);
      } else {
        const [monthlyRes, insRes] = await Promise.all([
          fetch(`/api/clinics/${clinicId}/reports/monthly?month=${selectedMonth}`, { headers }).then(r => r.json()),
          fetch(`/api/clinics/${clinicId}/reports/insights`, { headers }).then(r => r.json()).catch(() => null),
        ]);

        if (monthlyRes?.success) {
          setMonthlyData(monthlyRes.data);
        } else {
          setErrorMsg(monthlyRes?.error?.message || monthlyRes?.message || 'Failed to fetch monthly report.');
        }

        if (insRes?.success) setInsights(insRes.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch reports:', err);
      setErrorMsg(err.message || 'Error communicating with analytics server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [clinicId, reportType, selectedDate, selectedMonth, token]);

  const handleExportCSV = async () => {
    if (!clinicId || !token) return;
    setIsExporting(true);
    try {
      const dateParam = reportType === 'monthly' ? selectedMonth : selectedDate;
      const url = `/api/clinics/${clinicId}/reports/export?format=csv&type=${reportType}&date=${dateParam}`;
      const response = await fetch(url, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Bypass-Tunnel-Reminder': 'true'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to generate CSV export.');
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `report_${reportType}_${clinicId}_${dateParam}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      console.error('Export CSV error:', err);
      alert(err.message || 'Failed to export CSV report.');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const getLoadBadge = (load: string) => {
    switch (load) {
      case 'CRITICAL':
        return { label: 'CRITICAL LOAD', bg: 'bg-red-100 text-red-800 border-red-300' };
      case 'HIGH':
        return { label: 'HIGH LOAD', bg: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'LOW':
        return { label: 'LOW LOAD', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      default:
        return { label: 'MODERATE LOAD', bg: 'bg-sky-100 text-sky-800 border-sky-300' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Print-specific style */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          nav, header, button, .no-print { display: none !important; }
          .print-clean { box-shadow: none !important; border: 1px solid #cbd5e1 !important; }
        }
      `}</style>

      {/* Control Header & Filters */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0284C7] to-[#0369A1] text-white flex items-center justify-center shadow-sm shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-black text-[#1E293B]">Analytics & Executive Reports</h2>
              {clinicName && (
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  {clinicName}
                </span>
              )}
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Live patient throughput, chamber duration, wait-time bottlenecks & exportable reports.
            </p>
          </div>
        </div>

        {/* Filters and Export buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto no-print">
          {/* Mode Switcher */}
          <div className="flex bg-[#F1F5F9] p-1 rounded-2xl text-xs font-bold">
            <button
              onClick={() => setReportType('daily')}
              className={`px-3.5 py-2 rounded-xl transition ${
                reportType === 'daily' ? 'bg-white text-[#1E293B] shadow-sm' : 'text-[#64748B] hover:text-[#1E293B]'
              }`}
            >
              Daily Report
            </button>
            <button
              onClick={() => setReportType('monthly')}
              className={`px-3.5 py-2 rounded-xl transition ${
                reportType === 'monthly' ? 'bg-white text-[#1E293B] shadow-sm' : 'text-[#64748B] hover:text-[#1E293B]'
              }`}
            >
              Monthly Summary
            </button>
          </div>

          {/* Date / Month Picker */}
          {reportType === 'daily' ? (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-[#F8FAFC] border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-[#1E293B] focus:outline-none focus:border-[#0284C7] focus:bg-white"
            />
          ) : (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-[#F8FAFC] border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-[#1E293B] focus:outline-none focus:border-[#0284C7] focus:bg-white"
            />
          )}

          <button
            onClick={fetchReports}
            title="Refresh Metrics"
            disabled={loading}
            className="p-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0284C7]' : ''}`} />
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className="flex items-center space-x-1.5 bg-[#0284C7] hover:bg-[#0369A1] text-white px-3.5 py-2 rounded-xl font-bold text-xs shadow-sm transition active:scale-95 disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>

          {/* Print PDF */}
          <button
            onClick={handlePrintPDF}
            className="flex items-center space-x-1.5 bg-[#1E293B] hover:bg-[#0F172A] text-white px-3.5 py-2 rounded-xl font-bold text-xs shadow-sm transition active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between text-xs font-semibold text-red-700">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={fetchReports}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-xs font-bold transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !dailyData && !monthlyData && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-12 text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-[#0284C7] mx-auto" />
          <p className="text-xs font-bold text-[#64748B]">Loading analytics and performance metrics...</p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. DAILY KPI CARDS GRID                                                  */}
      {/* ========================================================================= */}
      {reportType === 'daily' && dailyData && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4 print-clean">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">Total Tokens</span>
            <div className="text-2xl font-black font-mono text-[#1E293B]">{dailyData.totalTokensIssued ?? 0}</div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Issued Today</span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
            <span className="text-[11px] font-bold text-[#16A34A] uppercase tracking-wider block mb-1">Completed</span>
            <div className="text-2xl font-black font-mono text-[#16A34A]">{dailyData.completedTokens ?? 0}</div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Consulted</span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
            <span className="text-[11px] font-bold text-[#D97706] uppercase tracking-wider block mb-1">Avg Wait</span>
            <div className="text-2xl font-black font-mono text-[#D97706]">{dailyData.averageWaitMinutes ?? 0}<span className="text-xs font-semibold text-slate-500">m</span></div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Desk to Doctor</span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
            <span className="text-[11px] font-bold text-[#0284C7] uppercase tracking-wider block mb-1">Avg Consult</span>
            <div className="text-2xl font-black font-mono text-[#0284C7]">{dailyData.averageConsultationMinutes ?? 0}<span className="text-xs font-semibold text-slate-500">m</span></div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">In Chamber</span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
            <span className="text-[11px] font-bold text-[#DC2626] uppercase tracking-wider block mb-1">No-Show / Cancel</span>
            <div className="text-2xl font-black font-mono text-[#DC2626]">{(dailyData.noShowTokens || 0) + (dailyData.cancelledTokens || 0)}</div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">{dailyData.cancelledTokens || 0} Cancelled</span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
            <span className="text-[11px] font-bold text-[#0F766E] uppercase tracking-wider block mb-1">Appointments</span>
            <div className="text-2xl font-black font-mono text-[#0F766E]">{dailyData.totalAppointments ?? 0}</div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Booked Slots</span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
            <span className="text-[11px] font-bold text-[#7C3AED] uppercase tracking-wider block mb-1">Revenue</span>
            <div className="text-2xl font-black font-mono text-[#7C3AED]">₹{dailyData.totalRevenue ?? 0}</div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Collected Today</span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
            <span className="text-[11px] font-bold text-[#2563EB] uppercase tracking-wider block mb-1">WhatsApp</span>
            <div className="text-2xl font-black font-mono text-[#2563EB]">{dailyData.totalWhatsAppSent ?? 0}</div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Alerts Dispatched</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MONTHLY KPI CARDS GRID                                                */}
      {/* ========================================================================= */}
      {reportType === 'monthly' && monthlyData && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 print-clean">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">Month Tokens</span>
            <div className="text-2xl font-black font-mono text-[#1E293B]">{monthlyData.totalTokensIssued ?? 0}</div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">In {monthlyData.month}</span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
            <span className="text-[11px] font-bold text-[#16A34A] uppercase tracking-wider block mb-1">Consulted Total</span>
            <div className="text-2xl font-black font-mono text-[#16A34A]">{monthlyData.completedTokens ?? 0}</div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Completed Visits</span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
            <span className="text-[11px] font-bold text-[#DC2626] uppercase tracking-wider block mb-1">Cancelled</span>
            <div className="text-2xl font-black font-mono text-[#DC2626]">{monthlyData.cancelledTokens ?? 0}</div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Cancelled Tokens</span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
            <span className="text-[11px] font-bold text-[#0F766E] uppercase tracking-wider block mb-1">Appointments</span>
            <div className="text-2xl font-black font-mono text-[#0F766E]">{monthlyData.totalAppointments ?? 0}</div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Total Bookings</span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
            <span className="text-[11px] font-bold text-[#0284C7] uppercase tracking-wider block mb-1">Active Doctors</span>
            <div className="text-2xl font-black font-mono text-[#0284C7]">{monthlyData.activeDoctorsCount ?? 0}</div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Clinicians On Duty</span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
            <span className="text-[11px] font-bold text-[#7C3AED] uppercase tracking-wider block mb-1">Monthly Revenue</span>
            <div className="text-2xl font-black font-mono text-[#7C3AED]">₹{monthlyData.totalRevenue ?? 0}</div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Collected Total</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. HOURLY FLOW VISUALIZATION & AI CLINIC INSIGHTS                         */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Hourly Distribution Bar Visualization */}
        <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm print-clean">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
            <div>
              <h3 className="text-sm font-black text-[#1E293B]">Patient Traffic Distribution by Hour</h3>
              <p className="text-xs text-[#64748B] mt-0.5">Clinic arrival flow, chamber congestion & peak windows</p>
            </div>
            {advancedData?.peakHour !== undefined && (
              <span className="bg-[#FEF3C7] text-[#B45309] text-[11px] px-3 py-1 rounded-full font-bold border border-[#FDE68A] flex items-center space-x-1 shrink-0">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>Peak Hour: {advancedData.peakHour}:00 - {advancedData.peakHour + 1}:00</span>
              </span>
            )}
          </div>

          {/* Quick Stats Badges */}
          {advancedData && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 py-4 border-b border-slate-100 text-xs">
              <div className="bg-[#F8FAFC] p-2.5 rounded-xl border border-slate-200/70 text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Completion Rate</span>
                <span className="font-mono font-black text-[#16A34A] text-sm">{advancedData.completionRatePercent ?? 100}%</span>
              </div>
              <div className="bg-[#F8FAFC] p-2.5 rounded-xl border border-slate-200/70 text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">No-Show Rate</span>
                <span className="font-mono font-black text-[#DC2626] text-sm">{advancedData.noShowRatePercent ?? 0}%</span>
              </div>
              <div className="bg-[#F8FAFC] p-2.5 rounded-xl border border-slate-200/70 text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Longest Wait</span>
                <span className="font-mono font-black text-[#D97706] text-sm">{advancedData.longestWaitMinutes ?? 0} min</span>
              </div>
              <div className="bg-[#F8FAFC] p-2.5 rounded-xl border border-slate-200/70 text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Avg Chamber Time</span>
                <span className="font-mono font-black text-[#0284C7] text-sm">{advancedData.averageConsultationMinutes ?? 10} min</span>
              </div>
            </div>
          )}

          {/* Robust Array-Safe Hourly Bars */}
          {Array.isArray(advancedData?.hourlyTraffic) && advancedData.hourlyTraffic.length > 0 ? (
            <div className="space-y-2 mt-4">
              {advancedData.hourlyTraffic.map((item: any) => {
                const hourNum = typeof item === 'object' ? item.hour : parseInt(item, 10);
                const count = typeof item === 'object' ? Number(item.tokensCount || 0) : 0;
                const displayHour = `${hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum} ${hourNum >= 12 ? 'PM' : 'AM'}`;
                const maxCount = Math.max(
                  ...advancedData.hourlyTraffic.map((t: any) => Number(t.tokensCount || 0)),
                  1
                );
                const pct = Math.round((count / maxCount) * 100);
                const isPeak = hourNum === advancedData.peakHour;

                return (
                  <div key={hourNum} className="flex items-center space-x-3 text-xs">
                    <span className="w-16 font-mono font-bold text-slate-500 text-right">{displayHour}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden relative">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isPeak ? 'bg-amber-500' : 'bg-[#0284C7]'
                        }`}
                        style={{ width: `${Math.max(pct, count > 0 ? 8 : 0)}%` }}
                      />
                    </div>
                    <span className={`w-8 font-mono font-bold text-right ${isPeak ? 'text-amber-600' : 'text-[#1E293B]'}`}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-[#64748B]">
              No hourly traffic recorded yet for the selected date.
            </div>
          )}
        </div>

        {/* AI Operational Insights & Bottleneck Detection */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-4 print-clean">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-[#0284C7]" />
              <h3 className="text-sm font-black text-[#1E293B]">AI Operational Insights</h3>
            </div>
            {insights?.predictedTomorrowLoad && (
              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${getLoadBadge(insights.predictedTomorrowLoad).bg}`}>
                {getLoadBadge(insights.predictedTomorrowLoad).label}
              </span>
            )}
          </div>

          <p className="text-xs text-[#64748B]">
            Automated clinic flow diagnosis, bottleneck identification & load forecast.
          </p>

          <div className="space-y-3 mt-3">
            {/* AI Summary Banner */}
            <div className="p-3.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl text-xs space-y-1">
              <span className="font-bold text-[#1E40AF] flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#0284C7]" />
                <span>Executive Summary</span>
              </span>
              <p className="text-[#1E3A8A] leading-relaxed">
                {insights?.summary || (dailyData?.completedTokens > 0
                  ? `Completed ${dailyData.completedTokens} patient consultations today with an average wait time of ${dailyData.averageWaitMinutes} minutes.`
                  : 'Clinic queue flow is operating with active tokens waiting for doctor consultation.')}
              </p>
              {insights?.estimatedPeakWindow && (
                <div className="text-[11px] font-bold text-[#0284C7] pt-1">
                  Estimated Peak Window: {insights.estimatedPeakWindow}
                </div>
              )}
            </div>

            {/* Bottlenecks Detected */}
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs space-y-1.5">
              <span className="font-bold text-amber-900 flex items-center space-x-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Bottlenecks Detected</span>
              </span>
              {insights?.bottlenecksDetected && insights.bottlenecksDetected.length > 0 ? (
                <ul className="space-y-1 text-amber-800 text-[11px]">
                  {insights.bottlenecksDetected.map((b: string, idx: number) => (
                    <li key={idx} className="flex items-start space-x-1.5">
                      <span className="text-amber-500 font-bold">&bull;</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-amber-700 text-[11px]">No active operational bottlenecks observed.</p>
              )}
            </div>

            {/* Recommended Clinical Actions */}
            <div className="p-3.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl text-xs space-y-1.5">
              <span className="font-bold text-[#166534] flex items-center space-x-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-emerald-600" />
                <span>Recommended Actions</span>
              </span>
              {insights?.recommendedActions && insights.recommendedActions.length > 0 ? (
                <ul className="space-y-1 text-[#15803D] text-[11px]">
                  {insights.recommendedActions.map((rec: string, idx: number) => (
                    <li key={idx} className="flex items-start space-x-1.5">
                      <span className="text-emerald-500 font-bold">&bull;</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[#15803D] text-[11px]">Keep queue calling active to maintain standard throughput.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
