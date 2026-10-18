import { useEffect, useRef, useState, useCallback } from 'react';
import * as MP4BoxModule from 'mp4box';
import type { MP4File, MP4Info, MP4Sample, TrackBox, MP4MediaTrack } from 'mp4box';

const LERP_TAU = 9;
const SNAP = 0.0015;
const SEEK_THRESHOLD = 0.033; // ~1 frame at 30fps
const WATCHDOG = 15000;

interface DecodedFrame {
  timestamp: number; // in microseconds
  bitmap: ImageBitmap;
}

export type ScrubStatus = 'idle' | 'building' | 'ready' | 'fallback' | 'reverted';

export interface UseVideoScrubReturn {
  containerRef: React.RefObject<HTMLDivElement>;
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  progress: number;
  currentTime: number;
  duration: number;
  isReady: boolean;
  canvasLive: boolean;
  status: ScrubStatus;
  fallbackReason: string | null;
}

// Module-level cache for video array buffer to prevent repeated multi-megabyte downloads across navigations
let globalVideoBufferPromise: Promise<ArrayBuffer> | null = null;

function fetchVideoBufferOnce(src: string): Promise<ArrayBuffer> {
  if (!globalVideoBufferPromise) {
    globalVideoBufferPromise = fetch(src, { mode: 'cors' })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Video fetch failed: ${res.status} ${res.statusText}`);
        }
        return res.arrayBuffer();
      })
      .catch((err) => {
        globalVideoBufferPromise = null;
        throw err;
      });
  }
  return globalVideoBufferPromise;
}

export interface UseVideoScrubOptions {
  enabled?: boolean;
}

export function useVideoScrub(
  videoSrc: string,
  options: UseVideoScrubOptions = {}
): UseVideoScrubReturn {
  const { enabled = true } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const lastDrawnIndexRef = useRef<number>(-1);

  const [progress, setProgress] = useState<number>(0);
  const [duration, setDuration] = useState<number>(10.04);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [canvasLive, setCanvasLive] = useState<boolean>(false);
  const [status, setStatus] = useState<ScrubStatus>('idle');
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);

  // Time & progress refs (to avoid forced layout and unthrottled React re-renders)
  const targetProgressRef = useRef<number>(0);
  const currentProgressRef = useRef<number>(0);
  const lastRenderedProgressRef = useRef<number>(-1);
  const durationRef = useRef<number>(10.04);
  const maxScrollRef = useRef<number>(0);
  const isReadyRef = useRef<boolean>(false);
  const isRevertedRef = useRef<boolean>(false);
  const canvasLiveRef = useRef<boolean>(false);

  // Hardware video seeking pipeline refs
  const isSeekingRef = useRef<boolean>(false);
  const pendingSeekTargetRef = useRef<number | null>(null);

  // Frame bank (ImageBitmaps directly stored without expensive WebP conversions)
  const frameBankRef = useRef<DecodedFrame[]>([]);

  // Check reduced motion
  const prefersReducedMotionRef = useRef<boolean>(false);

  // Measure and cache max scroll to eliminate forced synchronous layouts during scrolling
  const updateMaxScroll = useCallback(() => {
    const container = containerRef.current;
    if (container) {
      const scrollRange = container.offsetHeight - window.innerHeight;
      maxScrollRef.current = scrollRange > 0 ? scrollRange : window.innerHeight * 5;
    } else {
      maxScrollRef.current = window.innerHeight * 5;
    }
  }, []);

  // Update duration when video metadata loads and wire hardware seek listener
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      if (video.duration && !isNaN(video.duration) && video.duration > 0) {
        durationRef.current = video.duration;
        setDuration(video.duration);
        setIsReady(true);
        isReadyRef.current = true;
      }
    };

    const handleSeeked = () => {
      isSeekingRef.current = false;
      // If a newer scroll target arrived while seeking, execute it immediately
      if (pendingSeekTargetRef.current !== null) {
        const nextTime = pendingSeekTargetRef.current;
        pendingSeekTargetRef.current = null;
        performHardwareSeek(nextTime);
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleLoadedMetadata);
    video.addEventListener('seeked', handleSeeked);

    if (video.readyState >= 1 && video.duration && !isNaN(video.duration) && video.duration > 0) {
      handleLoadedMetadata();
    }

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('canplay', handleLoadedMetadata);
      video.removeEventListener('seeked', handleSeeked);
    };
  }, []);

  // Event-driven non-blocking hardware video seek
  const performHardwareSeek = (targetTime: number) => {
    const video = videoRef.current;
    if (!video || !video.duration || isNaN(video.duration)) return;

    // Clamp within bounds
    const safeTarget = Math.max(0, Math.min(video.duration - 0.05, targetTime));

    // If a seek is already in flight in the browser media pipeline, queue target and return
    if (isSeekingRef.current) {
      pendingSeekTargetRef.current = safeTarget;
      return;
    }

    // Skip redundant micro-seeks smaller than threshold (~1 frame interval)
    if (Math.abs(video.currentTime - safeTarget) < SEEK_THRESHOLD) {
      return;
    }

    isSeekingRef.current = true;
    try {
      if ('fastSeek' in video && typeof (video as any).fastSeek === 'function') {
        (video as any).fastSeek(safeTarget);
      } else {
        video.currentTime = safeTarget;
      }
    } catch {
      isSeekingRef.current = false;
    }
  };

  // Binary search by timestamp (in microseconds)
  const findNearestFrameIndex = (timestampUs: number): number => {
    const bank = frameBankRef.current;
    if (bank.length === 0) return -1;
    let low = 0;
    let high = bank.length - 1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      if (bank[mid].timestamp < timestampUs) {
        low = mid + 1;
      } else if (bank[mid].timestamp > timestampUs) {
        high = mid - 1;
      } else {
        return mid;
      }
    }
    if (low >= bank.length) return bank.length - 1;
    if (high < 0) return 0;
    return Math.abs(bank[low].timestamp - timestampUs) < Math.abs(bank[high].timestamp - timestampUs)
      ? low
      : high;
  };

  // Build frame bank using WebCodecs (fast hardware-to-bitmap copy, avoiding CPU-heavy WebP encoding)
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotionRef.current = mql.matches;
    const handleMotionChange = (e: MediaQueryListEvent) => {
      prefersReducedMotionRef.current = e.matches;
    };
    mql.addEventListener('change', handleMotionChange);

    if (mql.matches) {
      setStatus('fallback');
      setFallbackReason('Prefers-reduced-motion is active. Using direct video seek.');
      return () => {
        mql.removeEventListener('change', handleMotionChange);
      };
    }

    if (typeof window === 'undefined' || !('VideoDecoder' in window)) {
      setStatus('fallback');
      setFallbackReason('WebCodecs VideoDecoder not supported. Direct video hardware seeking active.');
      return () => {
        mql.removeEventListener('change', handleMotionChange);
      };
    }

    let isCancelled = false;
    let decoder: VideoDecoder | null = null;
    let watchdogTimer: ReturnType<typeof setTimeout> | null = null;

    const startBuilding = async () => {
      setStatus('building');

      watchdogTimer = setTimeout(() => {
        if (!canvasLiveRef.current) {
          isRevertedRef.current = true;
          setStatus('reverted');
          setFallbackReason('Frame bank building timed out. Operating in direct video mode.');
          if (decoder && decoder.state !== 'closed') {
            decoder.close();
          }
        }
      }, WATCHDOG);

      try {
        const buffer = await fetchVideoBufferOnce(videoSrc);
        if (isCancelled) return;

        const mp4boxAny = MP4BoxModule as unknown as { default?: unknown; createFile: () => MP4File };
        const createFile = mp4boxAny.createFile || (mp4boxAny.default as { createFile: () => MP4File })?.createFile;
        const DataStream =
          (MP4BoxModule as unknown as { DataStream: typeof import('mp4box').DataStream }).DataStream ||
          ((mp4boxAny.default as unknown) as { DataStream: typeof import('mp4box').DataStream })?.DataStream;

        if (!createFile) {
          throw new Error('MP4Box createFile is unavailable.');
        }

        const mp4boxFile = createFile();
        const bufferWithStart = buffer.slice(0) as ArrayBuffer & { fileStart: number };
        bufferWithStart.fileStart = 0;

        let videoTrackInfo: MP4MediaTrack | null = null;
        let videoTrackBox: TrackBox | null = null;
        let totalSamplesToExtract = 0;
        let samplesProcessed = 0;
        const tempFrames: DecodedFrame[] = [];
        let lastKeptUs = -Infinity;
        const MIN_FRAME_INTERVAL_US = 80000; // ~80ms (12.5 fps), bounded memory bank of ~120 frames at 1080p

        const initDecoder = () => {
          if (decoder && decoder.state !== 'closed') {
            decoder.close();
          }

          decoder = new VideoDecoder({
            output: async (frame: VideoFrame) => {
              if (isCancelled || isRevertedRef.current) {
                frame.close();
                return;
              }

              const timestamp = frame.timestamp;
              // Retain first frame and evenly spaced intervals to guarantee bounded memory and smooth scrub
              const isFirst = tempFrames.length === 0;
              const shouldKeep = isFirst || (timestamp - lastKeptUs >= MIN_FRAME_INTERVAL_US);

              if (!shouldKeep) {
                frame.close();
                return;
              }

              lastKeptUs = timestamp;
              try {
                // Direct zero-copy hardware blit to ImageBitmap at full native 1080p resolution
                const bitmap = await createImageBitmap(frame);
                frame.close();
                if (!isCancelled && !isRevertedRef.current) {
                  tempFrames.push({ timestamp, bitmap });
                  // Immediately draw first frame so the landing hero appears instantly without delay
                  if (isFirst && canvasRef.current && !canvasLiveRef.current) {
                    const canvas = canvasRef.current;
                    const ctx = ctxRef.current || canvas.getContext('2d', { alpha: false, desynchronized: true });
                    if (ctx) {
                      ctxRef.current = ctx;
                      ctx.drawImage(bitmap, 0, 0, 1920, 1080);
                      canvasLiveRef.current = true;
                      lastDrawnIndexRef.current = 0;
                      setCanvasLive(true);
                    }
                  }
                } else {
                  bitmap.close();
                }
              } catch {
                frame.close();
              }
            },
            error: (err: Error) => {
              console.warn('[useVideoScrub] Decoder note:', err.message);
              setStatus('fallback');
              setFallbackReason(err.message);
            },
          });

          if (!videoTrackInfo || !videoTrackBox) return;

          const stsdEntry = videoTrackBox.mdia.minf.stbl.stsd.entries[0];
          const box = stsdEntry.avcC || stsdEntry.hvcC || stsdEntry.vpcC || stsdEntry.av1C;
          let description: Uint8Array | undefined = undefined;

          if (box && DataStream) {
            const stream = new DataStream(undefined, 0, DataStream.BIG_ENDIAN);
            box.write(stream);
            description = new Uint8Array(stream.buffer, 8);
          }

          const config: VideoDecoderConfig = {
            codec: videoTrackInfo.codec,
            codedWidth: videoTrackInfo.video?.width || videoTrackInfo.track_width,
            codedHeight: videoTrackInfo.video?.height || videoTrackInfo.track_height,
            description,
            hardwareAcceleration: 'prefer-hardware',
          };

          decoder.configure(config);
        };

        mp4boxFile.onReady = (info: MP4Info) => {
          if (isCancelled) return;
          const vt = info.videoTracks[0];
          if (!vt) throw new Error('No video track found.');
          videoTrackInfo = vt;
          totalSamplesToExtract = vt.nb_samples;
          videoTrackBox = mp4boxFile.getTrackById(vt.id);

          initDecoder();
          mp4boxFile.setExtractionOptions(vt.id, null, { nbSamples: 100 });
          mp4boxFile.start();
        };

        mp4boxFile.onSamples = (_id: number, _user: unknown, samples: MP4Sample[]) => {
          if (isCancelled || isRevertedRef.current || !decoder || decoder.state !== 'configured') return;

          for (const sample of samples) {
            // Supply all valid encoded video chunks in sequence to preserve H.264 reference frame integrity
            const chunk = new EncodedVideoChunk({
              type: sample.is_sync ? 'key' : 'delta',
              timestamp: Math.round((sample.cts * 1e6) / sample.timescale),
              duration: Math.round((sample.duration * 1e6) / sample.timescale),
              data: sample.data,
            });
            decoder.decode(chunk);
          }

          samplesProcessed += samples.length;
          if (samplesProcessed >= totalSamplesToExtract) {
            if (decoder && decoder.state === 'configured') {
              decoder.flush().then(() => {
                if (isCancelled || isRevertedRef.current) return;
                tempFrames.sort((a, b) => a.timestamp - b.timestamp);
                frameBankRef.current = tempFrames;
                canvasLiveRef.current = true;
                lastDrawnIndexRef.current = -1;
                setCanvasLive(true);
                setStatus('ready');
                if (watchdogTimer) clearTimeout(watchdogTimer);
              });
            }
          }
        };

        mp4boxFile.onError = (e: string | Error) => {
          setStatus('fallback');
          setFallbackReason(`MP4Box note: ${String(e)}`);
        };

        mp4boxFile.appendBuffer(bufferWithStart);
        mp4boxFile.flush();
      } catch (err: unknown) {
        setStatus('fallback');
        setFallbackReason(err instanceof Error ? err.message : String(err));
      }
    };

    startBuilding();

    return () => {
      isCancelled = true;
      if (watchdogTimer) clearTimeout(watchdogTimer);
      if (decoder && decoder.state !== 'closed') {
        decoder.close();
      }
      mql.removeEventListener('change', handleMotionChange);

      // Clean up bitmaps
      frameBankRef.current.forEach((f) => {
        f.bitmap.close();
      });
      frameBankRef.current = [];
    };
  }, [videoSrc]);

  // RequestAnimationFrame loop for interpolation & presentation (active only when enabled)
  useEffect(() => {
    if (!enabled) {
      return;
    }

    let rafId: number = 0;
    let lastTime = performance.now();
    lastDrawnIndexRef.current = -1; // Force immediate frame draw on activation

    // Initial measurement
    updateMaxScroll();

    // Pure, non-blocking scroll handler: NO forced synchronous layout, NO React setState in scroll handler
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const maxScroll = maxScrollRef.current > 0 ? maxScrollRef.current : window.innerHeight * 5;
      targetProgressRef.current = Math.min(1, Math.max(0, scrollY / maxScroll));
    };

    const handleResize = () => {
      updateMaxScroll();
      handleScroll();
    };

    const loop = (now: number) => {
      if (document.hidden) {
        rafId = 0;
        return;
      }

      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const dur = durationRef.current;
      const targetP = targetProgressRef.current;
      let p = currentProgressRef.current;

      if (prefersReducedMotionRef.current) {
        p = targetP;
      } else {
        p += (targetP - p) * (1 - Math.exp(-dt * LERP_TAU));
        if (Math.abs(targetP - p) < SNAP) {
          p = targetP;
        }
      }
      currentProgressRef.current = p;

      // Throttle React state updates to when progress meaningfully changed or motion stopped
      if (Math.abs(p - lastRenderedProgressRef.current) >= 0.002 || p === targetP) {
        lastRenderedProgressRef.current = p;
        setProgress(p);
      }

      const currentSeconds = p * dur;

      // Rendering: Decoded Frame Bank vs Hardware Video Element Seeking
      if (canvasLiveRef.current && frameBankRef.current.length > 0) {
        const canvas = canvasRef.current;
        if (canvas) {
          if (!ctxRef.current) {
            ctxRef.current = canvas.getContext('2d', {
              alpha: false,
              desynchronized: true,
            });
          }
          const ctx = ctxRef.current;
          if (ctx) {
            const nearestIdx = findNearestFrameIndex(currentSeconds * 1e6);
            if (nearestIdx >= 0 && nearestIdx !== lastDrawnIndexRef.current) {
              const frame = frameBankRef.current[nearestIdx];
              if (frame) {
                ctx.drawImage(frame.bitmap, 0, 0, 1920, 1080);
                lastDrawnIndexRef.current = nearestIdx;
              }
            }
          }
        }
      } else {
        // Direct event-driven hardware video seeking (zero main-thread decoding)
        performHardwareSeek(currentSeconds);
      }

      rafId = requestAnimationFrame(loop);
    };

    // Pause/resume loop on tab visibility changes to save GPU/CPU cycles
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = 0;
        }
      } else if (!rafId) {
        lastTime = performance.now();
        lastDrawnIndexRef.current = -1;
        rafId = requestAnimationFrame(loop);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    handleScroll();

    rafId = requestAnimationFrame(loop);

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [updateMaxScroll, enabled]);

  return {
    containerRef,
    videoRef,
    canvasRef,
    progress,
    currentTime: currentProgressRef.current * durationRef.current,
    duration,
    isReady,
    canvasLive,
    status,
    fallbackReason,
  };
}
