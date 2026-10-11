import React, { useState, useEffect, useRef } from 'react';
import { Search, Building2, Check, X, ChevronDown } from 'lucide-react';

export interface ClinicItem {
  id: string;
  name: string;
  slug: string;
  phone?: string;
  address?: string;
}

interface ClinicSearchSelectProps {
  clinics: ClinicItem[];
  selectedClinicId: string;
  onSelectClinicId: (id: string) => void;
  placeholder?: string;
  className?: string;
  variant?: 'navbar' | 'card';
}

export const ClinicSearchSelect: React.FC<ClinicSearchSelectProps> = ({
  clinics,
  selectedClinicId,
  onSelectClinicId,
  placeholder = 'Search & select clinic...',
  className = '',
  variant = 'card',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedClinic = clinics.find((c) => c.id === selectedClinicId);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredClinics = clinics.filter((c) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      c.name.toLowerCase().includes(query) ||
      c.slug.toLowerCase().includes(query) ||
      (c.address && c.address.toLowerCase().includes(query))
    );
  });

  const handleSelect = (clinicId: string) => {
    onSelectClinicId(clinicId);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectClinicId('');
    setSearchQuery('');
    setIsOpen(false);
  };

  if (variant === 'navbar') {
    return (
      <div ref={wrapperRef} className={`relative ${className}`}>
        {/* Trigger Button in Navy Navbar */}
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) {
              setTimeout(() => inputRef.current?.focus(), 100);
            }
          }}
          className="flex items-center space-x-2 bg-[#0F172A] border border-slate-700 hover:border-[#0284C7] rounded-xl px-3 py-1.5 text-xs text-slate-200 transition focus:outline-none"
        >
          <Building2 className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
          <div className="text-left max-w-[170px] truncate">
            {selectedClinic ? (
              <span className="font-bold text-white">{selectedClinic.name}</span>
            ) : (
              <span className="text-slate-400 font-medium">Select Clinic...</span>
            )}
          </div>
          {selectedClinic ? (
            <X
              className="w-3.5 h-3.5 text-slate-400 hover:text-white transition ml-1"
              onClick={handleClear}
            />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>

        {/* Floating Search Popover */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-1.5 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
            {/* Search Input */}
            <div className="relative mb-2">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type clinic name or slug..."
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-[#1E293B] font-medium placeholder-slate-400 focus:outline-none focus:border-[#0284C7] focus:bg-white"
              />
            </div>

            {/* Clinic Results List */}
            <div className="max-h-56 overflow-y-auto space-y-1">
              {filteredClinics.length === 0 ? (
                <div className="p-3 text-center text-xs text-[#64748B]">
                  No matching clinics found
                </div>
              ) : (
                filteredClinics.map((clinic) => {
                  const isSelected = clinic.id === selectedClinicId;
                  return (
                    <button
                      key={clinic.id}
                      type="button"
                      onClick={() => handleSelect(clinic.id)}
                      className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between transition ${
                        isSelected
                          ? 'bg-[#E0F2FE] text-[#0284C7] font-bold'
                          : 'text-[#334155] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="font-bold truncate">{clinic.name}</div>
                        <div className="text-[10px] text-[#64748B] font-mono">slug: {clinic.slug}</div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-[#0284C7] shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Card Variant (Used in Page Headers and Form Cards)
  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
          }
        }}
        className="w-full flex items-center justify-between space-x-2 bg-white border border-slate-300 hover:border-[#0284C7] rounded-xl px-3 py-2 text-xs text-[#1E293B] shadow-sm transition focus:outline-none focus:ring-1 focus:ring-[#0284C7]"
      >
        <div className="flex items-center space-x-2 truncate">
          <Building2 className="w-4 h-4 text-[#0284C7] shrink-0" />
          <span className="truncate font-semibold">
            {selectedClinic ? selectedClinic.name : <span className="text-[#94A3B8] font-normal">{placeholder}</span>}
          </span>
        </div>
        <div className="flex items-center space-x-1 shrink-0">
          {selectedClinic ? (
            <span
              onClick={handleClear}
              className="p-0.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-[#DC2626] transition"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          )}
        </div>
      </button>

      {/* Floating Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-full min-w-[260px] bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="relative mb-2">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clinic by name or code..."
              className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-[#1E293B] font-medium placeholder-slate-400 focus:outline-none focus:border-[#0284C7] focus:bg-white"
            />
          </div>

          <div className="max-h-56 overflow-y-auto space-y-1">
            {filteredClinics.length === 0 ? (
              <div className="p-3 text-center text-xs text-[#64748B]">
                No matching clinics found
              </div>
            ) : (
              filteredClinics.map((clinic) => {
                const isSelected = clinic.id === selectedClinicId;
                return (
                  <button
                    key={clinic.id}
                    type="button"
                    onClick={() => handleSelect(clinic.id)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between transition ${
                      isSelected
                        ? 'bg-[#E0F2FE] text-[#0284C7] font-bold'
                        : 'text-[#334155] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="font-bold truncate">{clinic.name}</div>
                      <div className="text-[10px] text-[#64748B] font-mono">slug: {clinic.slug}</div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#0284C7] shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
