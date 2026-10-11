import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface ActiveAd {
  id: string;
  title: string;
  imageUrl?: string | null;
  targetUrl?: string | null;
  placement: string;
  clinicId?: string | null;
}

interface QueueBottomAdProps {
  clinicId?: string;
  refreshIntervalSeconds?: number;
  showFallbackOnNoFill?: boolean;
}

export const QueueBottomAd: React.FC<QueueBottomAdProps> = ({
  clinicId,
  refreshIntervalSeconds = 45,
  showFallbackOnNoFill = true,
}) => {
  const [ad, setAd] = useState<ActiveAd | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const currentAdIdRef = useRef<string | null>(null);

  const recordImpression = useCallback((adId: string) => {
    try {
      const beaconData = JSON.stringify({
        deviceId: 'TV_KIOSK_' + (clinicId || 'DEFAULT'),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'TV_APP',
      });

      if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
        navigator.sendBeacon(`/api/ads/${adId}/impression`, new Blob([beaconData], { type: 'application/json' }));
      } else {
        fetch(`/api/ads/${adId}/impression`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: beaconData,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // Beacon failsafe
    }
  }, [clinicId]);

  const fetchAd = useCallback(async () => {
    if (typeof document !== 'undefined' && document.hidden) {
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);

    try {
      const url = clinicId
        ? `/api/ads/TV_VIEWER_BOTTOM?clinicId=${encodeURIComponent(clinicId)}`
        : `/api/ads/TV_VIEWER_BOTTOM`;

      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });

      if (!res.ok) {
        throw new Error(`Ad server error: ${res.status}`);
      }

      const json = await res.json();

      if (json.success && json.data) {
        const nextAd: ActiveAd = json.data;
        setImgLoaded(false);
        setImgError(false);
        setAd(nextAd);
        currentAdIdRef.current = nextAd.id;
        recordImpression(nextAd.id);
      } else {
        setAd(null);
        currentAdIdRef.current = null;
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setAd(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [clinicId, recordImpression]);

  useEffect(() => {
    fetchAd();

    const startInterval = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        fetchAd();
      }, Math.max(refreshIntervalSeconds, 30) * 1000);
    };

    startInterval();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchAd();
        startInterval();
      } else {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      setAd(null);
    };
  }, [fetchAd, refreshIntervalSeconds]);

  if (!ad && !showFallbackOnNoFill) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      tabIndex={-1}
      // @ts-ignore
      focusable="false"
      className="w-full flex flex-col items-center justify-center mt-4 pt-2 select-none pointer-events-none"
      style={{
        paddingLeft: 'env(safe-area-inset-left, 16px)',
        paddingRight: 'env(safe-area-inset-right, 16px)',
        paddingBottom: 'env(safe-area-inset-bottom, 12px)',
      }}
    >
      <div
        tabIndex={-1}
        // @ts-ignore
        focusable="false"
        className="w-full max-w-[728px] min-h-[90px] h-[90px] bg-white border border-slate-200/90 rounded-2xl shadow-sm flex items-center justify-between px-4 sm:px-6 relative overflow-hidden transition-all duration-300"
      >
        {ad && !imgError ? (
          <div className="w-full h-full flex items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5 min-w-0">
              <span className="shrink-0 bg-[#E0F2FE] text-[#0284C7] border border-[#0284C7]/30 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider">
                SPONSORED
              </span>

              {ad.imageUrl && (
                <img
                  src={ad.imageUrl}
                  alt={ad.title}
                  tabIndex={-1}
                  // @ts-ignore
                  focusable="false"
                  onLoad={() => setImgLoaded(true)}
                  onError={() => setImgError(true)}
                  className={`h-14 w-20 object-cover rounded-lg border border-slate-200 shrink-0 transition-opacity duration-300 ${
                    imgLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              )}

              <div className="min-w-0">
                <p className="font-bold text-sm text-[#1E293B] truncate tracking-tight">
                  {ad.title}
                </p>
                <p className="text-[11px] text-[#64748B] truncate mt-0.5">
                  Healthcare partner announcement &middot; Verified Partner
                </p>
              </div>
            </div>

            <div className="shrink-0 text-right hidden sm:block">
              <span className="text-[10px] text-[#94A3B8] font-mono tracking-wider uppercase block">
                728x90 Leaderboard
              </span>
              <span className="text-[11px] text-[#16A34A] font-bold">
                Live Verified
              </span>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-between text-[#64748B] text-xs">
            <div className="flex items-center space-x-3">
              <div className="w-2.5 h-2.5 rounded-full bg-[#16A34A] animate-pulse" />
              <div>
                <span className="text-[#1E293B] font-bold">Smart TV Healthcare Display</span>
                <span className="mx-2 text-slate-300">&bull;</span>
                <span className="text-[#64748B]">Real-time Chamber Routing Active</span>
              </div>
            </div>
            <div className="text-[11px] text-[#94A3B8] font-mono hidden sm:inline">
              QueueApp Healthcare OS
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
