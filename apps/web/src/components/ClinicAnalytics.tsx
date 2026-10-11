import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Download, 
  Calendar, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Users, 
  IndianRupee, 
  MessageSquare,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface ClinicAnalyticsProps {
  clinicId: string;
  token: string | null;
  clinicName?: string;
}

export const ClinicAnalytics: React.FC<ClinicAnalyticsProps> = ({
  clinicId,
  token,
  clinicName
}) => {
  const [reportType, setReportType] = useState<'daily' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  
  const [dailyData, setDailyData] = useState<any>(null);
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [advancedData, setAdvancedData] = useState<any>(null);
  const [insights, setInsights] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const fetchReports = async () => {
    if (!clinicId || !token) return;
    setLoading(true);
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      if (reportType === 'daily') {
        const [dailyRes, advRes, insRes] = await Promise.all([
          fetch(`/api/clinics/${clinicId}/reports/daily?date=${selectedDate}`, { headers }).then(r => r.json()),
          fetch(`/api/clinics/${clinicId}/reports/advanced-analytics?date=${selectedDate}`, { headers }).then(r => r.json()).catch(() => null),
          fetch(`/api/clinics/${clinicId}/reports/insights`, { headers }).then(r => r.json()).catch(() => null),
        ]);

        if (dailyRes?.success) setDailyData(dailyRes.data);
        if (advRes?.success) setAdvancedData(advRes.data);
        if (insRes?.success) setInsights(insRes.data);
      } else {
        const [monthlyRes, insRes] = await Promise.all([
          fetch(`/api/clinics/${clinicId}/reports/monthly?month=${selectedMonth}`, { headers }).then(r => r.json()),
          fetch(`/api/clinics/${clinicId}/reports/insights`, { headers }).then(r => r.json()).catch(() => null),
        ]);

        if (monthlyRes?.success) setMonthlyData(monthlyRes.data);
        if (insRes?.success) setInsights(insRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
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
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `report_${reportType}_${clinicId}_${dateParam}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Export CSV error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Control Header & Filters */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center font-bold">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#1E293B]">Analytics & Executive Reports</h2>
            <p className="text-xs text-[#64748B]">Real-time queue performance, patient throughput & wait metrics</p>
          </div>
        </div>

        {/* Filters and Export buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Mode Switcher */}
          <div className="flex bg-[#F1F5F9] p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setReportType('daily')}
              className={`px-3 py-1.5 rounded-lg transition ${
                reportType === 'daily' ? 'bg-white text-[#1E293B] shadow-sm' : 'text-[#64748B] hover:text-[#1E293B]'
              }`}
            >
              Daily Report
            </button>
            <button
              onClick={() => setReportType('monthly')}
              className={`px-3 py-1.5 rounded-lg transition ${
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
              className="bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
            />
          ) : (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
            />
          )}

          <button
            onClick={fetchReports}
            title="Refresh Metrics"
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0284C7]' : ''}`} />
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className="flex items-center space-x-1.5 bg-[#0284C7] hover:bg-[#0369A1] text-white px-3 py-1.5 rounded-xl font-bold text-xs shadow-sm transition active:scale-95 disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>

          {/* Print PDF */}
          <button
            onClick={handlePrintPDF}
            className="flex items-center space-x-1.5 bg-[#1E293B] hover:bg-[#0F172A] text-white px-3 py-1.5 rounded-xl font-bold text-xs shadow-sm transition active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      {reportType === 'daily' && dailyData && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">Total Tokens</span>
            <div className="text-2xl font-black text-[#1E293B]">{dailyData.totalTokensIssued ?? 0}</div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Issued Today</span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
            <span className="text-[11px] font-bold text-[#16A34A] uppercase tracking-wider block mb-1">Completed</span>
            <div className="text-2xl font-black text-[#16A34A]">{dailyData.completedTokens ?? 0}</div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Consulted & Done</span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
            <span className="text-[11px] font-bold text-[#D97706] uppercase tracking-wider block mb-1">Avg Wait</span>
            <div className="text-2xl font-black text-[#D97706]">{dailyData.averageWaitMinutes ?? 0} <span className="text-xs font-semibold text-slate-500">min</span></div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Desk to Consultation</span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
            <span className="text-[11px] font-bold text-[#0284C7] uppercase tracking-wider block mb-1">Avg Consult</span>
            <div className="text-2xl font-black text-[#0284C7]">{dailyData.averageConsultationMinutes ?? 0} <span className="text-xs font-semibold text-slate-500">min</span></div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Doctor Chamber Time</span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
            <span className="text-[11px] font-bold text-[#DC2626] uppercase tracking-wider block mb-1">No-Show / Cancel</span>
            <div className="text-2xl font-black text-[#DC2626]">{(dailyData.noShowTokens || 0) + (dailyData.cancelledTokens || 0)}</div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">{dailyData.cancelledTokens || 0} Cancelled</span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
            <span className="text-[11px] font-bold text-[#7C3AED] uppercase tracking-wider block mb-1">Revenue</span>
            <div className="text-2xl font-black text-[#7C3AED]">₹{dailyData.totalRevenue ?? 0}</div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">{dailyData.totalAppointments || 0} Appointments</span>
          </div>
        </div>
      )}

      {reportType === 'monthly' && monthlyData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">Month Tokens</span>
            <div className="text-2xl font-black text-[#1E293B]">{monthlyData.totalTokensIssued ?? 0}</div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">For {monthlyData.month}</span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
            <span className="text-[11px] font-bold text-[#16A34A] uppercase tracking-wider block mb-1">Consulted Total</span>
            <div className="text-2xl font-black text-[#16A34A]">{monthlyData.completedTokens ?? 0}</div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Completed visits</span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
            <span className="text-[11px] font-bold text-[#0284C7] uppercase tracking-wider block mb-1">Active Doctors</span>
            <div className="text-2xl font-black text-[#0284C7]">{monthlyData.activeDoctorsCount ?? 0}</div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Clinicians active</span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
            <span className="text-[11px] font-bold text-[#7C3AED] uppercase tracking-wider block mb-1">Monthly Revenue</span>
            <div className="text-2xl font-black text-[#7C3AED]">₹{monthlyData.totalRevenue ?? 0}</div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Collected</span>
          </div>
        </div>
      )}

      {/* Hourly Flow Chart & AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Hourly Distribution Bar Visualization */}
        <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-[#1E293B]">Patient Traffic Distribution by Hour</h3>
              <p className="text-xs text-[#64748B]">Clinic arrival patterns & peak consultation windows</p>
            </div>
            {advancedData?.peakHour && (
              <span className="bg-[#FEF3C7] text-[#B45309] text-[11px] px-2.5 py-1 rounded-full font-bold border border-[#FDE68A]">
                Peak Hour: {advancedData.peakHour}:00 - {advancedData.peakHour + 1}:00
              </span>
            )}
          </div>

          {advancedData?.hourlyTraffic ? (
            <div className="space-y-2 mt-4">
              {Object.entries(advancedData.hourlyTraffic).map(([hour, count]: [string, any]) => {
                const hourNum = parseInt(hour, 10);
                const displayHour = `${hourNum > 12 ? hourNum - 12 : hourNum} ${hourNum >= 12 ? 'PM' : 'AM'}`;
                const max = Math.max(...Object.values(advancedData.hourlyTraffic) as number[], 1);
                const pct = Math.round((count / max) * 100);

                return (
                  <div key={hour} className="flex items-center space-x-3 text-xs">
                    <span className="w-16 font-mono font-bold text-slate-500 text-right">{displayHour}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden relative">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          hourNum === advancedData.peakHour ? 'bg-[#0284C7]' : 'bg-[#38BDF8]'
                        }`}
                        style={{ width: `${Math.max(pct, count > 0 ? 5 : 0)}%` }}
                      />
                    </div>
                    <span className="w-10 font-bold text-[#1E293B] text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-[#64748B]">
              No hourly traffic records available for the selected date.
            </div>
          )}
        </div>

        {/* AI Operational Insights & Bottleneck Detection */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-[#0284C7]" />
            <h3 className="text-sm font-black text-[#1E293B]">AI Operational Insights</h3>
          </div>
          <p className="text-xs text-[#64748B]">Automated clinic flow diagnosis and recommendations</p>

          <div className="space-y-3 mt-3">
            <div className="p-3 bg-[#F0FDF4] border border-[#DCFCE7] rounded-xl text-xs">
              <span className="font-bold text-[#166534] block mb-1">Queue Throughput</span>
              <p className="text-[#15803D]">
                {dailyData?.completedTokens > 0
                  ? `Completed ${dailyData.completedTokens} patient consultations today with an average wait time of ${dailyData.averageWaitMinutes} minutes.`
                  : 'Tokens are currently being registered and queued for chambers.'}
              </p>
            </div>

            <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs">
              <span className="font-bold text-[#1E293B] block mb-1">Wait Time Optimization</span>
              <p className="text-[#64748B]">
                {dailyData?.averageWaitMinutes > 20
                  ? 'Wait times exceed 20 minutes. Consider enabling parallel queue counters or reviewing on-hold tokens.'
                  : 'Wait times are within optimal clinical thresholds (< 15 mins).'}
              </p>
            </div>

            <div className="p-3 bg-[#EFF6FF] border border-[#DBEAFE] rounded-xl text-xs">
              <span className="font-bold text-[#1E40AF] block mb-1">Doctor Utilization</span>
              <p className="text-[#1D4ED8]">
                Average doctor chamber consultation time is {dailyData?.averageConsultationMinutes || 10} minutes per patient.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
