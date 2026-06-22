import { useState, useEffect, useRef } from 'react';
import { FaceName, CubeColor, CubeState } from '../types';
import { cloneState } from '../utils/cubeEngine';
import { CubeScannerDetector } from '../utils/cubeScannerDetector';
import { triggerHaptic } from '../utils/haptics';

// Map center colors of a standard Rubik's cube to their respective face names
export const CENTER_COLOR_TO_FACE: Record<CubeColor, FaceName> = {
  white: 'U',
  orange: 'L',
  green: 'F',
  red: 'R',
  blue: 'B',
  yellow: 'D',
};

// Play pleasant synthesizer sound fx using standard native Web Audio API
export const playSoundFeedback = (type: 'tick' | 'capture' | 'error') => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    if (type === 'tick') {
      osc.frequency.setValueAtTime(600, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.05);
    } else if (type === 'capture') {
      // Elegant arpeggio double tone
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.1); // G5
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } else if (type === 'error') {
      osc.frequency.setValueAtTime(220, audioCtx.currentTime); // Low buzz
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    }
  } catch (e) {
    // Fail silently if browser security blocks dynamic auto-audio streams
  }
};

interface UseCubeScannerProps {
  currentState: CubeState;
  onApplyScan: (scannedState: CubeState) => void;
  onClose: () => void;
}

export function useCubeScanner({ currentState, onApplyScan, onClose }: UseCubeScannerProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeFace, _setActiveFace] = useState<FaceName>('U');
  const activeFaceRef = useRef<FaceName>('U');
  const setActiveFace = (face: FaceName) => {
    _setActiveFace(face);
    activeFaceRef.current = face;
  };

  const [scannedCube, _setScannedCube] = useState<CubeState>(cloneState(currentState));
  const scannedCubeRef = useRef<CubeState>(cloneState(currentState));
  const setScannedCube = (valOrFn: CubeState | ((prev: CubeState) => CubeState)) => {
    if (typeof valOrFn === 'function') {
      _setScannedCube((prev) => {
        const next = valOrFn(prev);
        scannedCubeRef.current = next;
        return next;
      });
    } else {
      _setScannedCube(valOrFn);
      scannedCubeRef.current = valOrFn;
    }
  };

  const [cameraActive, setCameraActive] = useState<boolean>(true);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isAutoMode, setIsAutoMode] = useState<boolean>(true);
  const [aiDetectedFace, setAiDetectedFace] = useState<FaceName | null>(null);
  const [scannedFacesInSession, setScannedFacesInSession] = useState<Set<FaceName>>(new Set<FaceName>());

  // Interactive Cube Face detection phases (Detect first, classify colors later)
  const [isCubeFaceDetected, setIsCubeFaceDetected] = useState<boolean>(false);
  const [detectionConfidence, setDetectionConfidence] = useState<number>(0);

  // Auto-capture stability trackers
  const [stabilityProgress, setStabilityProgress] = useState<number>(0);
  const [cooldownCountdown, setCooldownCountdown] = useState<number>(0);

  // Real-time detected state of the current 3x3 face
  const [detectedColors, setDetectedColors] = useState<CubeColor[]>(Array(9).fill('white'));

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);

  // Tracking dynamic stability frames
  const isCooldownActiveRef = useRef<boolean>(false);
  const centerStabilityRef = useRef<{ face: FaceName; count: number }>({ face: 'U', count: 0 });
  const lastCandidateColorsRef = useRef<string>('');
  const candidateStabilityCounterRef = useRef<number>(0);

  // Timer for cooldown decrements
  useEffect(() => {
    let timer: any;
    if (cooldownCountdown > 0) {
      timer = setInterval(() => {
        setCooldownCountdown((prev) => {
          if (prev <= 1) {
            isCooldownActiveRef.current = false;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldownCountdown]);

  // Safely bind stream to video element when it becomes available and trigger autoplay
  useEffect(() => {
    let active = true;
    const bindAndPlayStream = async () => {
      if (!active) return;
      const video = videoRef.current;
      if (video && stream) {
        try {
          if (video.srcObject !== stream) {
            video.srcObject = stream;
          }
          // Force Safari/browser to start decoding frames and rendering
          await video.play();
        } catch (playErr) {
          console.warn('Yêu cầu autoplay tự động bị chặn hoặc gián đoạn:', playErr);
        }
      }
    };
    bindAndPlayStream();
    return () => {
      active = false;
    };
  }, [stream]);

  const stopCamera = () => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const startCamera = async () => {
    setErrorMessage(null);
    try {
      // 1. Clean up existing tracks
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      // 2. Guard for standard sandboxed iframe environments where mediaDevices may not be accessible
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          'Thiết bị hoặc trình duyệt của bạn chặn quyền truy cập Camera qua kênh bảo mật iframe. ' +
          'Hãy nhấn nút "Mô phỏng Quét nhanh" để trải nghiệm ngay lập tức, hoặc cấp quyền camera trong cài đặt trình duyệt của bạn!'
        );
      }

      // 3. Request user media with ideal modern constraints
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      setStream(mediaStream);
    } catch (err: any) {
      console.error('Lỗi truy cập camera:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage(
          'Trình duyệt chưa được cấp quyền truy cập Camera. Hãy cấp quyền truy cập camera trong cài đặt trang web hoặc dùng nút "Mô phỏng Quét nhanh" bên dưới để test thử ngay!'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('Không tìm thấy Camera khả dụng trên thiết bị này. Bạn có thể sử dụng chức năng mô phỏng quét nhanh để trải nghiệm!');
      } else {
        setErrorMessage('Không thể mở camera: ' + (err.message || 'Lỗi không rõ') + '. Thử dùng "Mô phỏng Quét nhanh" (Demo) để nạp dữ liệu Rubik!');
      }
    }
  };

  // Restart stream when facingMode or cameraActive changes
  useEffect(() => {
    if (cameraActive) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [facingMode, cameraActive]);

  // Real-time canvas processing loop
  const processFrame = () => {
    if (!cameraActive || !videoRef.current || !canvasRef.current) {
      requestRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState >= video.HAVE_CURRENT_DATA && ctx) {
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const sizeClient = Math.min(canvas.width, canvas.height);
      const gridBoxSize = Math.round(sizeClient * 0.45); // Slightly larger grid for scanning comfort
      const step = Math.round(gridBoxSize / 3);
      const halfGrid = Math.round(gridBoxSize / 2);
      
      const startX = Math.round(canvas.width / 2 - halfGrid);
      const startY = Math.round(canvas.height / 2 - halfGrid);

      const sampled: CubeColor[] = [];
      let totalStickerBrightness = 0;

      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const pxX = startX + col * step + Math.round(step / 2);
          const pxY = startY + row * step + Math.round(step / 2);

          let rSum = 0, gSum = 0, bSum = 0, count = 0;
          const kernel = 5;
          const halfKernel = Math.floor(kernel / 2);

          try {
            const imgData = ctx.getImageData(pxX - halfKernel, pxY - halfKernel, kernel, kernel);
            const data = imgData.data;
            for (let i = 0; i < data.length; i += 4) {
              rSum += data[i];
              gSum += data[i + 1];
              bSum += data[i + 2];
              count++;
            }
          } catch (e) {
            rSum = 255; gSum = 255; bSum = 255;
            count = 1;
          }

          const rAvg = Math.round(rSum / count);
          const gAvg = Math.round(gSum / count);
          const bAvg = Math.round(bSum / count);

          const classified = CubeScannerDetector.getScannedColor(rAvg, gAvg, bAvg);
          sampled.push(classified);
          totalStickerBrightness += (0.299 * rAvg + 0.587 * gAvg + 0.114 * bAvg);
        }
      }

      // --- CUBE FACE DETECTOR (PHÁT HIỆN MẶT RUBIK TRƯỚC, XÁC ĐỊNH MÀU SAU VIA EXTERNAL CLASS DETECTOR) ---
      const { isCubeFaceDetected: hasCube, detectionConfidence: smoothedConfidence } = CubeScannerDetector.analyzeCubePresence(
        ctx,
        startX,
        startY,
        step,
        sampled,
        totalStickerBrightness
      );

      setDetectionConfidence(smoothedConfidence);

      setIsCubeFaceDetected((prev) => {
        if (prev !== hasCube) {
          if (hasCube) {
            playSoundFeedback('tick');
            triggerHaptic([30, 20]);
          }
          return hasCube;
        }
        return prev;
      });

      if (hasCube) {
        setDetectedColors(sampled);

        // --- KIỂM TRA ĐỘ ỔN ĐỊNH CỦA KHUNG HÌNH (TEMPORAL INTEGRATION) ---
        const colorsString = sampled.join(',');
        const isSameAsLast = colorsString === lastCandidateColorsRef.current;

        if (isSameAsLast) {
          candidateStabilityCounterRef.current += 1;
        } else {
          candidateStabilityCounterRef.current = 1;
          lastCandidateColorsRef.current = colorsString;
        }

        const STABILITY_REQUIRED = 8; // Đạt độ ổn định trong khoảng 250ms (với 30fps)
        const currentProgress = Math.min(100, Math.round((candidateStabilityCounterRef.current / STABILITY_REQUIRED) * 100));
        setStabilityProgress(currentProgress);

        // --- TỰ ĐỘNG DÒ MẶT THÔNG MINH QUA Ô TÂM ---
        const centerColor = sampled[4];
        const mappedFace = CENTER_COLOR_TO_FACE[centerColor];

        let targetFace = activeFaceRef.current;
        if (mappedFace && !isCooldownActiveRef.current) {
          if (mappedFace === centerStabilityRef.current.face) {
            centerStabilityRef.current.count += 1;
            
            if (centerStabilityRef.current.count >= 2) {
              setAiDetectedFace(mappedFace);
              if (activeFaceRef.current !== mappedFace) {
                setActiveFace(mappedFace);
                targetFace = mappedFace;
                triggerHaptic(8);
              }
            }
          } else {
            centerStabilityRef.current = { face: mappedFace, count: 1 };
          }
        }

        // --- TỰ ĐỘNG CHỤP KHI ĐẠT ĐỘ ỔN ĐỊNH TUYỆT ĐỐI ---
        if (candidateStabilityCounterRef.current >= STABILITY_REQUIRED) {
          const currentFaceColors = scannedCubeRef.current[targetFace];
          const isDifferent = sampled.some((col, idx) => col !== currentFaceColors[idx]);

          if (isDifferent && !isCooldownActiveRef.current) {
            // Thực hiện chụp tự động khi không nằm trong thời gian cooldown
            triggerAutoCapture(sampled, targetFace);
          }
        }
      } else {
        candidateStabilityCounterRef.current = 0;
        setStabilityProgress(0);
        setDetectedColors(Array(9).fill('white')); // Trả về mẫu chuẩn trống khi không thấy Rubik
      }
    }

    requestRef.current = requestAnimationFrame(processFrame);
  };

  const triggerAutoCapture = (colors: CubeColor[], targetFace: FaceName) => {
    isCooldownActiveRef.current = true;
    playSoundFeedback('capture');
    triggerHaptic([45, 10, 40]);
    
    // Save colors to active buffer state
    setScannedCube((prev) => ({
      ...prev,
      [targetFace]: [...colors],
    }));

    // Record the newly scanned face in session
    setScannedFacesInSession((prev) => {
      const next = new Set(prev);
      next.add(targetFace);
      return next;
    });

    // Trigger visual absolute lock and transition
    setCooldownCountdown(3); // 3 seconds screen lock before next scan is active

    // Double haptic success feedback
    setTimeout(() => {
      triggerHaptic([60, 20, 80]);
    }, 300);
  };

  useEffect(() => {
    if (stream && cameraActive) {
      requestRef.current = requestAnimationFrame(processFrame);
    }
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [stream, cameraActive, isAutoMode, activeFace]);

  const toggleFacingMode = () => {
    triggerHaptic(10);
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleManualCapture = () => {
    if (cooldownCountdown > 0) return;
    triggerHaptic(15);
    triggerAutoCapture(detectedColors, activeFace);
  };

  const handleModifySticker = (idx: number, newColor: CubeColor) => {
    triggerHaptic(5);
    setScannedCube((prev) => {
      const updatedFace = [...prev[activeFace]];
      updatedFace[idx] = newColor;
      return {
        ...prev,
        [activeFace]: updatedFace,
      };
    });
  };

  const handleApplyCompletedScan = () => {
    triggerHaptic([20, 10, 35]);
    onApplyScan(scannedCube);
    onClose();
  };

  const countColorDistribution = () => {
    const counts: Record<CubeColor, number> = {
      white: 0,
      yellow: 0,
      green: 0,
      blue: 0,
      orange: 0,
      red: 0,
    };

    (Object.keys(scannedCube) as FaceName[]).forEach((face) => {
      const faceColors = scannedCube[face];
      faceColors.forEach((color) => {
        counts[color]++;
      });
    });

    return counts;
  };

  const colorCounts = countColorDistribution();
  const allFacesCaptured = (Object.keys(scannedCube) as FaceName[]).every(
    (face) => scannedCube[face].length === 9
  );

  const scanValidationMessage = () => {
    const anomalies: string[] = [];
    (Object.keys(colorCounts) as CubeColor[]).forEach((col) => {
      if (colorCounts[col] !== 9) {
        const trans: Record<CubeColor, string> = {
          white: 'Trắng',
          yellow: 'Vàng',
          green: 'Lục',
          blue: 'Lam',
          orange: 'Cam',
          red: 'Đỏ',
        };
        anomalies.push(`${trans[col]}:${colorCounts[col]}`);
      }
    });

    if (anomalies.length === 0) {
      return {
        isValid: true,
        text: 'Dữ liệu hợp lệ, sẵn sàng giải!',
      };
    } else {
      return {
        isValid: false,
        text: `Sai lệch màu: ${anomalies.join(', ')}. Hãy chạm để sửa.`,
      };
    }
  };

  const validation = scanValidationMessage();

  return {
    stream,
    errorMessage,
    activeFace,
    setActiveFace,
    scannedCube,
    setScannedCube,
    cameraActive,
    setCameraActive,
    facingMode,
    isAutoMode,
    setIsAutoMode,
    aiDetectedFace,
    scannedFacesInSession,
    isCubeFaceDetected,
    detectionConfidence,
    stabilityProgress,
    cooldownCountdown,
    detectedColors,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    toggleFacingMode,
    handleManualCapture,
    handleModifySticker,
    handleApplyCompletedScan,
    colorCounts,
    allFacesCaptured,
    validation,
  };
}
