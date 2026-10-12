import React, { useState, useEffect } from 'react';
import { 
  Volume2, 
  Check, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Info,
  Radio,
  Sliders,
  Play
} from 'lucide-react';
import { VoiceAnnouncementMode } from '@queueapp/shared';

interface VoiceConfigProps {
  clinicId: string;
  token: string | null;
  initialMode?: VoiceAnnouncementMode;
  onUpdated?: (newMode: VoiceAnnouncementMode) => void;
}

interface ModeOption {
  id: VoiceAnnouncementMode;
  name: string;
  shortDesc: string;
  sampleEn: string;
  sampleHi: string;
  badge: string;
}

const MODES: ModeOption[] = [
  {
    id: 'TOKEN_ONLY',
    name: '1. Only Token Number Announcement',
    shortDesc: 'Speaks only the token number. Ideal for fast-moving queues or maximum patient privacy.',
    sampleEn: 'Token number A101.',
    sampleHi: 'टोकन नंबर A101.',
    badge: 'Privacy Mode',
  },
  {
    id: 'TOKEN_PATIENT',
    name: '2. Token Number + Patient Name',
    shortDesc: 'Speaks the token number followed by the registered patient name.',
    sampleEn: 'Token number A101. Ramesh Patel.',
    sampleHi: 'टोकन नंबर A101। रमेश पटेल।',
    badge: 'Standard Personal',
  },
  {
    id: 'TOKEN_PATIENT_DOCTOR',
    name: '3. Token Number + Patient Name + Doctor Name',
    shortDesc: 'Speaks the token number, patient name, and the consulting doctor.',
    sampleEn: 'Token number A101. Ramesh Patel. Please proceed to Dr. Sharma.',
    sampleHi: 'टोकन नंबर A101। रमेश पटेल। कृपया डॉ. शर्मा के पास जाएँ।',
    badge: 'Multi-Doctor Clinic',
  },
  {
    id: 'TOKEN_PATIENT_DOCTOR_ROOM',
    name: '4. Token Number + Patient Name + Doctor Name + Room Number',
    shortDesc: 'Comprehensive direction including token, patient, consulting doctor, and chamber room number.',
    sampleEn: 'Token number A101. Ramesh Patel. Please proceed to Room 101, Dr. Sharma.',
    sampleHi: 'टोकन नंबर A101। रमेश पटेल। कृपया कमरा 101, डॉ. शर्मा के पास जाएँ।',
    badge: 'Full Hospital Suite (Default)',
  },
];

export const VoiceAnnouncementConfig: React.FC<VoiceConfigProps> = ({
  clinicId,
  token,
  initialMode = 'TOKEN_PATIENT_DOCTOR_ROOM',
  onUpdated,
}) => {
  const [selectedMode, setSelectedMode] = useState<VoiceAnnouncementMode>(initialMode);
  const [previewLanguage, setPreviewLanguage] = useState<'en' | 'hi'>('en');
  const [isSaving, setIsSaving] = useState(false);
  const [isPlayingSample, setIsPlayingSample] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (initialMode) {
      setSelectedMode(initialMode);
    }
  }, [initialMode]);

  // Play audio sample via browser SpeechSynthesis
  const playSample = (modeOption: ModeOption) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported on this device/browser.');
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const textToSpeak = previewLanguage === 'hi' ? modeOption.sampleHi : modeOption.sampleEn;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 0.88;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      const voices = window.speechSynthesis.getVoices();
      if (previewLanguage === 'hi') {
        const hiVoice = voices.find(
          (v) => v.lang.toLowerCase().includes('hi') || v.name.toLowerCase().includes('hindi')
        );
        if (hiVoice) utterance.voice = hiVoice;
        utterance.lang = 'hi-IN';
      } else {
        const inVoice = voices.find(
          (v) => v.lang === 'en-IN' || v.lang.startsWith('en-IN') || v.name.toLowerCase().includes('india')
        );
        const enVoice = inVoice || voices.find((v) => v.lang.startsWith('en'));
        if (enVoice) utterance.voice = enVoice;
        utterance.lang = 'en-IN';
      }

      setIsPlayingSample(modeOption.id);
      utterance.onend = () => setIsPlayingSample(null);
      utterance.onerror = () => setIsPlayingSample(null);

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
      setIsPlayingSample(null);
    }
  };

  const handleSaveMode = async (mode: VoiceAnnouncementMode) => {
    if (!clinicId || !token) return;
    setIsSaving(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/clinics/${clinicId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          voiceAnnouncementMode: mode,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSelectedMode(mode);
        setFeedback({ 
          type: 'success', 
          text: `Voice announcement mode updated successfully! TV displays will now announce in this format.` 
        });
        if (onUpdated) onUpdated(mode);
        setTimeout(() => setFeedback(null), 4000);
      } else {
        setFeedback({
          type: 'error',
          text: data.error?.message || data.message || 'Failed to update voice announcement mode.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.message || 'Network error updating voice settings.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm mb-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0284C7] shrink-0 shadow-xs">
            <Volume2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-black text-[#1E293B] tracking-tight">
                Voice Announcement Configuration
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-[#0284C7] px-2.5 py-0.5 rounded-full border border-sky-200">
                4 Modes Available
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5 font-medium">
              Choose how patient tokens are spoken out on the Waiting Room Smart TV kiosk when called.
            </p>
          </div>
        </div>

        {/* Audio Sample Preview Language Switcher */}
        <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 p-1 rounded-xl self-start sm:self-center">
          <span className="text-[11px] font-bold text-slate-500 pl-2">Sample Preview:</span>
          <button
            type="button"
            onClick={() => setPreviewLanguage('en')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
              previewLanguage === 'en'
                ? 'bg-white text-[#0284C7] shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => setPreviewLanguage('hi')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
              previewLanguage === 'hi'
                ? 'bg-white text-[#0284C7] shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            हिंदी
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div className={`mt-5 p-3.5 rounded-2xl flex items-center space-x-2.5 text-xs font-semibold ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* 4 Voice Announcement Modes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {MODES.map((mode) => {
          const isCurrentActive = selectedMode === mode.id;
          const isSampleActive = isPlayingSample === mode.id;

          return (
            <div
              key={mode.id}
              className={`relative rounded-2xl p-5 border-2 transition-all flex flex-col justify-between ${
                isCurrentActive
                  ? 'border-[#0284C7] bg-sky-50/40 shadow-sm ring-2 ring-[#0284C7]/10'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
              }`}
            >
              <div>
                {/* Header & Badges */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    {mode.badge}
                  </span>
                  {isCurrentActive && (
                    <span className="inline-flex items-center space-x-1 text-[11px] font-extrabold text-[#0284C7] bg-sky-100 px-2.5 py-0.5 rounded-full border border-sky-200">
                      <Check className="w-3 h-3" />
                      <span>Active Setting</span>
                    </span>
                  )}
                </div>

                {/* Mode Name */}
                <h3 className="text-sm font-black text-[#1E293B] tracking-tight">
                  {mode.name}
                </h3>

                {/* Description */}
                <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed font-medium">
                  {mode.shortDesc}
                </p>

                {/* Audio Sample Box */}
                <div className="mt-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
                    <span>What patients will hear ({previewLanguage === 'hi' ? 'हिंदी' : 'English'}):</span>
                    <button
                      type="button"
                      onClick={() => playSample(mode)}
                      className="inline-flex items-center space-x-1 text-[#0284C7] hover:text-[#0369A1] font-bold hover:underline transition"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{isSampleActive ? 'Playing...' : 'Hear Sample'}</span>
                    </button>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 italic">
                    "{previewLanguage === 'hi' ? mode.sampleHi : mode.sampleEn}"
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => playSample(mode)}
                  disabled={isSampleActive}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition active:scale-95"
                >
                  <Volume2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Listen</span>
                </button>

                {isCurrentActive ? (
                  <button
                    disabled
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 cursor-default"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Applied to TV</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSaveMode(mode.id)}
                    disabled={isSaving}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-black text-white bg-[#0284C7] hover:bg-[#0369A1] transition shadow-xs active:scale-95 disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Updating...' : 'Select Mode'}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Footer Note */}
      <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start space-x-3 text-xs text-slate-600">
        <Info className="w-4 h-4 text-[#0284C7] shrink-0 mt-0.5" />
        <div className="leading-relaxed font-medium">
          <span className="font-bold text-slate-800">Smart TV Auto-Sync: </span>
          When you select any announcement mode above, all connected waiting hall TV displays automatically adjust their speech synthesis callout format in real-time. No TV reboot or page refresh is required.
        </div>
      </div>
    </div>
  );
};
