import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Plus, 
  Trash2, 
  Edit3, 
  PauseCircle, 
  PlayCircle, 
  Clock, 
  IndianRupee, 
  X, 
  AlertCircle,
  Stethoscope,
  Briefcase
} from 'lucide-react';
import { DoctorItem } from './DoctorManagement';

export interface ServiceItem {
  id: string;
  clinicId: string;
  name: string;
  description?: string | null;
  durationMinutes: number;
  priceAmount: number;
  isActive: boolean;
}

export interface QueueItemSummary {
  id: string;
  clinicId: string;
  name: string;
  doctorId?: string | null;
  serviceId?: string | null;
  isPaused: boolean;
  currentSeq: number;
  doctor?: DoctorItem | null;
  service?: ServiceItem | null;
}

interface ServiceQueueManagementProps {
  clinicId: string;
  token: string | null;
  onChanged?: () => void;
}

export const ServiceQueueManagement: React.FC<ServiceQueueManagementProps> = ({
  clinicId,
  token,
  onChanged
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'QUEUES' | 'SERVICES'>('QUEUES');

  // Queues & Services & Doctors State
  const [queues, setQueues] = useState<QueueItemSummary[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [doctors, setDoctors] = useState<DoctorItem[]>([]);

  // Queue Modal
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [queueName, setQueueName] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [queueFormError, setQueueFormError] = useState('');
  const [queueSubmitting, setQueueSubmitting] = useState(false);

  // Service Modal
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [serviceName, setServiceName] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [priceAmount, setPriceAmount] = useState(0);
  const [serviceFormError, setServiceFormError] = useState('');
  const [serviceSubmitting, setServiceSubmitting] = useState(false);

  const fetchData = async () => {
    if (!clinicId) return;
    try {
      const [qRes, sRes, dRes] = await Promise.all([
        fetch(`/api/clinics/${clinicId}/queues`).then(r => r.json()),
        fetch(`/api/clinics/${clinicId}/services`).then(r => r.json()),
        fetch(`/api/clinics/${clinicId}/doctors`).then(r => r.json())
      ]);

      if (qRes?.success && Array.isArray(qRes.data)) setQueues(qRes.data);
      if (sRes?.success && Array.isArray(sRes.data)) setServices(sRes.data);
      if (dRes?.success && Array.isArray(dRes.data)) setDoctors(dRes.data);
    } catch (err) {
      console.error('Failed to fetch queues & services:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [clinicId]);

  // Queue Operations
  const handleOpenCreateQueue = () => {
    setQueueName('');
    setSelectedDoctorId(doctors[0]?.id || '');
    setSelectedServiceId(services[0]?.id || '');
    setQueueFormError('');
    setShowQueueModal(true);
  };

  const handleCreateQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queueName.trim()) {
      setQueueFormError('Queue name is required.');
      return;
    }

    setQueueSubmitting(true);
    setQueueFormError('');

    try {
      const res = await fetch(`/api/clinics/${clinicId}/queues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: queueName.trim(),
          doctorId: selectedDoctorId || undefined,
          serviceId: selectedServiceId || undefined,
        })
      });

      const json = await res.json();
      if (json.success) {
        setShowQueueModal(false);
        fetchData();
        if (onChanged) onChanged();
      } else {
        setQueueFormError(json.error?.message || json.message || 'Failed to create queue');
      }
    } catch (err: any) {
      setQueueFormError(err.message || 'Network error');
    } finally {
      setQueueSubmitting(false);
    }
  };

  const handleToggleQueuePause = async (q: QueueItemSummary) => {
    if (!token) return;
    try {
      await fetch(`/api/clinics/${clinicId}/queues/${q.id}/pause`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isPaused: !q.isPaused })
      });
      fetchData();
      if (onChanged) onChanged();
    } catch (err) {
      console.error('Failed to toggle queue pause:', err);
    }
  };

  // Service Operations
  const handleOpenAddService = () => {
    setEditingService(null);
    setServiceName('');
    setServiceDescription('');
    setDurationMinutes(15);
    setPriceAmount(0);
    setServiceFormError('');
    setShowServiceModal(true);
  };

  const handleOpenEditService = (s: ServiceItem) => {
    setEditingService(s);
    setServiceName(s.name);
    setServiceDescription(s.description || '');
    setDurationMinutes(s.durationMinutes);
    setPriceAmount(s.priceAmount);
    setServiceFormError('');
    setShowServiceModal(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim()) {
      setServiceFormError('Service name is required.');
      return;
    }

    setServiceSubmitting(true);
    setServiceFormError('');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    try {
      let res;
      if (editingService) {
        res = await fetch(`/api/clinics/${clinicId}/services/${editingService.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            name: serviceName.trim(),
            description: serviceDescription.trim() || undefined,
            durationMinutes: Number(durationMinutes) || 15,
            priceAmount: Number(priceAmount) || 0,
          })
        });
      } else {
        res = await fetch(`/api/clinics/${clinicId}/services`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: serviceName.trim(),
            description: serviceDescription.trim() || undefined,
            durationMinutes: Number(durationMinutes) || 15,
            priceAmount: Number(priceAmount) || 0,
          })
        });
      }

      const json = await res.json();
      if (json.success) {
        setShowServiceModal(false);
        fetchData();
        if (onChanged) onChanged();
      } else {
        setServiceFormError(json.error?.message || json.message || 'Operation failed');
      }
    } catch (err: any) {
      setServiceFormError(err.message || 'Network error');
    } finally {
      setServiceSubmitting(false);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!token) return;
    if (!window.confirm('Delete this service procedure?')) return;
    try {
      const res = await fetch(`/api/clinics/${clinicId}/services/${serviceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
        if (onChanged) onChanged();
      } else {
        alert(data.error?.message || data.message || 'Failed to delete service');
      }
    } catch (err) {
      console.error('Delete service error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Header & Subtabs */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#1E293B]">Queues & Medical Services</h2>
            <p className="text-xs text-[#64748B]">Manage clinic queue lines, chamber assignments, and clinical procedures</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          {/* Subtab Switcher */}
          <div className="flex bg-[#F1F5F9] p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveSubTab('QUEUES')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeSubTab === 'QUEUES' ? 'bg-white text-[#1E293B] shadow-sm' : 'text-[#64748B] hover:text-[#1E293B]'
              }`}
            >
              Active Queues ({queues.length})
            </button>
            <button
              onClick={() => setActiveSubTab('SERVICES')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeSubTab === 'SERVICES' ? 'bg-white text-[#1E293B] shadow-sm' : 'text-[#64748B] hover:text-[#1E293B]'
              }`}
            >
              Procedures & Pricing ({services.length})
            </button>
          </div>

          {activeSubTab === 'QUEUES' ? (
            <button
              onClick={handleOpenCreateQueue}
              className="flex items-center space-x-1.5 bg-[#0284C7] hover:bg-[#0369A1] text-white px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-sm transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>New Queue</span>
            </button>
          ) : (
            <button
              onClick={handleOpenAddService}
              className="flex items-center space-x-1.5 bg-[#0284C7] hover:bg-[#0369A1] text-white px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-sm transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Procedure</span>
            </button>
          )}
        </div>
      </div>

      {/* Queues Subtab */}
      {activeSubTab === 'QUEUES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {queues.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-[#64748B] bg-white rounded-2xl border border-slate-200">
              No queues created yet for this clinic. Click "New Queue" to start routing patients.
            </div>
          ) : (
            queues.map((q) => (
              <div 
                key={q.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-extrabold text-[#1E293B] text-base">{q.name}</h3>
                      <span className="text-xs text-[#64748B] flex items-center space-x-1 mt-0.5">
                        <Stethoscope className="w-3.5 h-3.5 text-[#0284C7]" />
                        <span className="font-semibold">{q.doctor?.name || 'General Doctor'}</span>
                      </span>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      q.isPaused ? 'bg-[#FEF3C7] text-[#D97706]' : 'bg-[#DCFCE7] text-[#16A34A]'
                    }`}>
                      {q.isPaused ? 'Paused' : 'Active Flow'}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[#64748B]">Total Tokens Issued:</span>
                    <span className="font-bold text-[#1E293B] font-mono">{q.currentSeq || 0}</span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-[#64748B]">Chamber Room:</span>
                    <span className="font-bold text-[#1E293B] font-mono">{q.doctor?.roomNumber || 'Room 1'}</span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => handleToggleQueuePause(q)}
                    className={`flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition ${
                      q.isPaused
                        ? 'bg-[#DCFCE7] text-[#16A34A] hover:bg-[#bbf7d0]'
                        : 'bg-[#FEF3C7] text-[#D97706] hover:bg-[#fde68a]'
                    }`}
                  >
                    {q.isPaused ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
                    <span>{q.isPaused ? 'Resume Queue' : 'Pause Queue'}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Services Subtab */}
      {activeSubTab === 'SERVICES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-[#64748B] bg-white rounded-2xl border border-slate-200">
              No services registered. Add consultation procedures and diagnostic pricing here.
            </div>
          ) : (
            services.map((s) => (
              <div 
                key={s.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-extrabold text-[#1E293B] text-base">{s.name}</h3>
                      {s.description && (
                        <p className="text-xs text-[#64748B] mt-1">{s.description}</p>
                      )}
                    </div>

                    <span className="text-xs font-extrabold text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded-md">
                      ₹{s.priceAmount}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center space-x-2 text-xs text-[#64748B]">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Estimated Duration:</span>
                    <span className="font-bold text-[#1E293B]">{s.durationMinutes} mins</span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end space-x-1">
                  <button
                    onClick={() => handleOpenEditService(s)}
                    className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition"
                    title="Edit Service"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteService(s.id)}
                    className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition"
                    title="Delete Service"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create Queue Modal */}
      {showQueueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-black text-lg text-[#1E293B]">Create New Clinic Queue</h3>
              <button onClick={() => setShowQueueModal(false)} className="p-1 hover:bg-slate-100 text-slate-400 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {queueFormError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{queueFormError}</span>
              </div>
            )}

            <form onSubmit={handleCreateQueue} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-[#64748B] block mb-1">Queue Name</label>
                <input
                  type="text"
                  placeholder="e.g. OPD Room 1 Queue, Pediatrics Queue"
                  value={queueName}
                  onChange={(e) => setQueueName(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#64748B] block mb-1">Assigned Physician / Chamber</label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
                >
                  <option value="">-- No specific doctor --</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.specialization} - {d.roomNumber || 'Room 1'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#64748B] block mb-1">Default Service / Procedure (Optional)</label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
                >
                  <option value="">-- General Consultation --</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (₹{s.priceAmount})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowQueueModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[#64748B] hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={queueSubmitting || !queueName.trim()}
                  className="px-5 py-2 text-xs font-bold rounded-xl shadow-md transition disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed bg-[#0284C7] hover:bg-[#0369A1] text-white cursor-pointer"
                >
                  {queueSubmitting ? 'Creating...' : 'Create Queue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Service Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-black text-lg text-[#1E293B]">
                {editingService ? 'Edit Medical Procedure' : 'Add Clinical Service'}
              </h3>
              <button onClick={() => setShowServiceModal(false)} className="p-1 hover:bg-slate-100 text-slate-400 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {serviceFormError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{serviceFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveService} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-[#64748B] block mb-1">Service / Procedure Name</label>
                <input
                  type="text"
                  placeholder="e.g. General Consultation, Dental Scaling, ECG"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#64748B] block mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Brief description of the consultation or medical test"
                  value={serviceDescription}
                  onChange={(e) => setServiceDescription(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#64748B] block mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 15)}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#64748B] block mb-1">Fee Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={priceAmount}
                    onChange={(e) => setPriceAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[#64748B] hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={serviceSubmitting || !serviceName.trim() || !durationMinutes || durationMinutes <= 0 || priceAmount < 0}
                  className="px-5 py-2 text-xs font-bold rounded-xl shadow-md transition disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed bg-[#0284C7] hover:bg-[#0369A1] text-white cursor-pointer"
                >
                  {serviceSubmitting ? 'Saving...' : editingService ? 'Save Changes' : 'Create Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
