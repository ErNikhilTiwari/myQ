import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle, 
  X, 
  DoorClosed, 
  UserCheck, 
  UserX,
  AlertCircle
} from 'lucide-react';

export interface DoctorItem {
  id: string;
  clinicId: string;
  name: string;
  specialization: string;
  roomNumber?: string | null;
  isActive: boolean;
}

interface DoctorManagementProps {
  clinicId: string;
  token: string | null;
  onDoctorsUpdated?: () => void;
}

export const DoctorManagement: React.FC<DoctorManagementProps> = ({
  clinicId,
  token,
  onDoctorsUpdated
}) => {
  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<DoctorItem | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDoctors = async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/clinics/${clinicId}/doctors`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setDoctors(data.data);
      }
    } catch (err) {
      console.error('Error fetching doctors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, [clinicId]);

  const handleOpenAdd = () => {
    setEditingDoctor(null);
    setName('');
    setSpecialization('');
    setRoomNumber('');
    setFormError('');
    setShowModal(true);
  };

  const handleOpenEdit = (doc: DoctorItem) => {
    setEditingDoctor(doc);
    setName(doc.name);
    setSpecialization(doc.specialization);
    setRoomNumber(doc.roomNumber || '');
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Doctor name is required.');
      return;
    }
    if (!specialization.trim()) {
      setFormError('Department / Specialization is required.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    try {
      let res;
      if (editingDoctor) {
        // PATCH
        res = await fetch(`/api/clinics/${clinicId}/doctors/${editingDoctor.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            name: name.trim(),
            specialization: specialization.trim(),
            roomNumber: roomNumber.trim() || undefined,
          })
        });
      } else {
        // POST
        res = await fetch(`/api/clinics/${clinicId}/doctors`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: name.trim(),
            specialization: specialization.trim(),
            roomNumber: roomNumber.trim() || undefined,
          })
        });
      }

      const json = await res.json();
      if (json.success) {
        setShowModal(false);
        fetchDoctors();
        if (onDoctorsUpdated) onDoctorsUpdated();
      } else {
        setFormError(json.error?.message || json.message || 'Operation failed');
      }
    } catch (err: any) {
      setFormError(err.message || 'Network error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (doc: DoctorItem) => {
    if (!token) return;
    try {
      await fetch(`/api/clinics/${clinicId}/doctors/${doc.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !doc.isActive })
      });
      fetchDoctors();
      if (onDoctorsUpdated) onDoctorsUpdated();
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!token) return;
    if (!window.confirm('Are you sure you want to remove this doctor from the clinic?')) return;

    try {
      const res = await fetch(`/api/clinics/${clinicId}/doctors/${docId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchDoctors();
        if (onDoctorsUpdated) onDoctorsUpdated();
      } else {
        alert(data.error?.message || data.message || 'Failed to delete');
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Add Button */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center font-bold">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#1E293B]">Doctor & Department Management</h2>
            <p className="text-xs text-[#64748B]">Manage clinic physicians, medical departments, and chamber rooms</p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center space-x-2 bg-[#0284C7] hover:bg-[#0369A1] text-white px-4 py-2 rounded-xl font-bold text-xs shadow-sm transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Doctor</span>
        </button>
      </div>

      {/* Doctors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {doctors.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-[#64748B] bg-white rounded-2xl border border-slate-200">
            No doctors registered in this clinic. Click "Add New Doctor" to get started.
          </div>
        ) : (
          doctors.map((doc) => (
            <div 
              key={doc.id}
              className={`bg-white border rounded-2xl p-5 shadow-sm flex flex-col justify-between transition ${
                doc.isActive ? 'border-slate-200/90' : 'border-slate-200 opacity-60 bg-slate-50'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">👨‍⚕️</span>
                    <div>
                      <h3 className="font-extrabold text-[#1E293B] text-base">{doc.name}</h3>
                      <span className="text-xs font-semibold text-[#0284C7] bg-[#E0F2FE] px-2 py-0.5 rounded-md">
                        {doc.specialization}
                      </span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    doc.isActive ? 'bg-[#DCFCE7] text-[#16A34A]' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {doc.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="mt-4 flex items-center space-x-2 text-xs text-[#64748B]">
                  <DoorClosed className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">Chamber / Room:</span>
                  <span className="font-bold text-[#1E293B] font-mono">{doc.roomNumber || 'Room 1'}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => handleToggleActive(doc)}
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg transition ${
                    doc.isActive 
                      ? 'text-[#D97706] hover:bg-[#FEF3C7]' 
                      : 'text-[#16A34A] hover:bg-[#DCFCE7]'
                  }`}
                >
                  {doc.isActive ? 'Set Inactive' : 'Activate'}
                </button>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleOpenEdit(doc)}
                    className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition"
                    title="Edit Doctor"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition"
                    title="Delete Doctor"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Doctor Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-black text-lg text-[#1E293B]">
                {editingDoctor ? 'Edit Doctor Profile' : 'Add New Clinic Doctor'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-slate-100 text-slate-400 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-[#64748B] block mb-1">Doctor Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Sarah Jenkins, MD"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#64748B] block mb-1">Department / Specialization</label>
                <input
                  type="text"
                  placeholder="e.g. General Medicine, Cardiology, Pediatrics"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#64748B] block mb-1">Chamber / Room Number</label>
                <input
                  type="text"
                  placeholder="e.g. Room 102, Chamber B"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[#64748B] hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingDoctor ? 'Save Changes' : 'Create Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
