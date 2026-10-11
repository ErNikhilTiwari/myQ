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
  refreshIntervalSeconds?: number; // e.g. 45 to 60 seconds
  /** Optional custom fallback banner text or component if no fill */
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
  
  // Abort controller reference for active async fetches
  const abortControllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const currentAdIdRef = useRef<string | null>(null);

  // Send beacon impression asynchronously without blocking UI
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
      // Beacon failsafe: never throw
    }
  }, [clinicId]);

  // Clean fetch ad logic with cancellation
  const fetchAd = useCallback(async () => {
    // Only refresh if tab is active and visible to prevent background waste / memory accumulation
    if (typeof document !== 'undefined' && document.hidden) {
      return;
    }

    // Cancel any ongoing fetch to avoid out-of-order race conditions
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
        throw new Error(`Ad server responded with status: ${res.status}`);
      }

      const json = await res.json();

      if (json.success && json.data) {
        const nextAd: ActiveAd = json.data;

        // Reset previous image status before binding new ad
        setImgLoaded(false);
        setImgError(false);
        setAd(nextAd);
        currentAdIdRef.current = nextAd.id;

        // Fire impression beacon
        recordImpression(nextAd.id);
      } else {
        // No fill returned from ad server
        setAd(null);
        currentAdIdRef.current = null;
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        // Soft fail on network error - will retry on next cycle
        setAd(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [clinicId, recordImpression]);

  // 1. Lifecycle: Periodic auto-refresh every 45-60s with visibility management
  useEffect(() => {
    // Fetch immediately on mount or clinic change
    fetchAd();

    // Setup periodic refresh
    const startInterval = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        fetchAd();
      }, Math.max(refreshIntervalSeconds, 30) * 1000);
    };

    startInterval();

    // Page visibility change handler
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Immediately refresh when returning to view
        fetchAd();
        startInterval();
      } else {
        // Pause timer while hidden to prevent memory leaks in TV browsers
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
      // Clean up ad reference
      setAd(null);
    };
  }, [fetchAd, refreshIntervalSeconds]);

  // If no ad and no fallback wanted, collapse container cleanly
  if (!ad && !showFallbackOnNoFill) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      tabIndex={-1}
      // @ts-ignore - TV remote / D-Pad navigation safety attribute
      focusable="false"
      className="w-full flex flex-col items-center justify-center mt-3 pt-2 select-none pointer-events-none"
      style={{
        // TV safe area margins (padding away from screen edges)
        paddingLeft: 'env(safe-area-inset-left, 16px)',
        paddingRight: 'env(safe-area-inset-right, 16px)',
        paddingBottom: 'env(safe-area-inset-bottom, 12px)',
      }}
    >
      {/* 
        Standard Leaderboard / Responsive TV Banner Ad Space 
        Dimensions: 728x90 aspect ratio, max-w-[728px], min-h-[90px] (scales down on small screens)
      */}
      <div
        tabIndex={-1}
        // @ts-ignore
        focusable="false"
        className="w-full max-w-[728px] min-h-[90px] h-[90px] bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-xl flex items-center justify-between px-4 sm:px-6 relative overflow-hidden backdrop-blur-sm transition-all duration-300"
      >
        {ad && !imgError ? (
          <div className="w-full h-full flex items-center justify-between gap-4">
            {/* Left: Sponsored Badge + Ad Creative Title / Media */}
            <div className="flex items-center space-x-3.5 min-w-0">
              <span className="shrink-0 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider">
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
                  className={`h-14 w-20 object-cover rounded-lg border border-slate-800 shrink-0 transition-opacity duration-300 ${
                    imgLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              )}

              <div className="min-w-0">
                <p className="font-bold text-sm text-slate-100 truncate tracking-tight">
                  {ad.title}
                </p>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  Exclusive healthcare partner offers &middot; QueueApp Network
                </p>
              </div>
            </div>

            {/* Right: Network Watermark */}
            <div className="shrink-0 text-right hidden sm:block">
              <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase block">
                Ad Space &bull; 728x90
              </span>
              <span className="text-[11px] text-emerald-400/80 font-semibold">
                Healthcare Verified
              </span>
            </div>
          </div>
        ) : (
          /* Subtle ambient default banner when no-fill or loading fallback */
          <div className="w-full h-full flex items-center justify-between text-slate-500 text-xs">
            <div className="flex items-center space-x-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60 animate-pulse" />
              <div>
                <span className="text-slate-300 font-medium">Smart TV Patient Display</span>
                <span className="mx-2 text-slate-600">&bull;</span>
                <span className="text-slate-400">Live Queue &amp; Chamber Routing</span>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 font-mono hidden sm:inline">
              QueueApp SaaS Active
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
