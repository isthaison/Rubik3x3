import React, { useState, useEffect, useRef } from 'react';
import { FaceName, CubeColor, CubeState } from '../types';
import { COLORS } from '../utils/cubeEngine';
import { Camera, RefreshCw, Check, X, AlertCircle, Sparkles, HelpCircle, Info, Zap, Settings, ShieldCheck, HelpCircle as HelpIcon, ArrowRight, CornerDownRight, ZapOff } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface CubeCameraScannerProps {
  onClose: () => void;
  onApplyScan: (scannedState: CubeState) => void;
  currentState: CubeState;
}

// Convert native color string to Vietnamese label with custom hex displays
const FACE_LABELS: Record<FaceName, string> = {
  U: 'Mặt TRÊN (Trắng - U)',
  L: 'Mặt TRÁI (Cam - L)',
  F: 'Mặt TRƯỚC (Lục - F)',
  R: 'Mặt PHẢI (Đỏ - R)',
  B: 'Mặt SAU (Lam - B)',
  D: 'Mặt DƯỚI (Vàng - D)',
};

// Map center colors of a standard Rubik's cube to their respective face names
const CENTER_COLOR_TO_FACE: Record<CubeColor, FaceName> = {
  white: 'U',
  orange: 'L',
  green: 'F',
  red: 'R',
  blue: 'B',
  yellow: 'D',
};

// Custom scanner glowing overlays and styles mapped to target standard face orientations
const FACE_GLOWS: Record<FaceName, { border: string; bg: string; shadow: string; text: string; lightGlow: string }> = {
  U: { border: 'border-slate-50/70', bg: 'bg-slate-100/5', shadow: 'shadow-[0_0_40px_rgba(248,250,252,0.3)]', text: 'text-slate-100', lightGlow: 'via-slate-200' },
  L: { border: 'border-orange-500/80', bg: 'bg-orange-500/5', shadow: 'shadow-[0_0_40px_rgba(249,115,22,0.3)]', text: 'text-orange-400', lightGlow: 'via-orange-400' },
  F: { border: 'border-emerald-500/85', bg: 'bg-emerald-500/5', shadow: 'shadow-[0_0_40px_rgba(16,185,129,0.3)]', text: 'text-emerald-400', lightGlow: 'via-emerald-400' },
  R: { border: 'border-rose-500/85', bg: 'bg-rose-500/5', shadow: 'shadow-[0_0_40px_rgba(244,63,94,0.3)]', text: 'text-rose-400', lightGlow: 'via-rose-400' },
  B: { border: 'border-blue-500/85', bg: 'bg-blue-500/5', shadow: 'shadow-[0_0_40px_rgba(59,130,246,0.3)]', text: 'text-blue-400', lightGlow: 'via-blue-400' },
  D: { border: 'border-yellow-400/85', bg: 'bg-yellow-400/5', shadow: 'shadow-[0_0_40px_rgba(250,204,21,0.3)]', text: 'text-yellow-400', lightGlow: 'via-yellow-400' },
};

// Target default colors of a standard Rubik's cube for backup distance comparison
const REF_COLORS: Record<CubeColor, { r: number; g: number; b: number }> = {
  white: { r: 235, g: 235, b: 235 },
  yellow: { r: 215, g: 215, b: 0 },
  green: { r: 0, g: 170, b: 60 },
  blue: { r: 0, g: 85, b: 210 },
  orange: { r: 245, g: 115, b: 0 },
  red: { r: 215, g: 5, b: 15 },
};

// Detailed guides instructing user how to rotate to get to the next face smoothly
const NAVIGATION_GUIDES: Record<FaceName, { step: string; tip: string; illustration: string }> = {
  U: {
    step: 'Bước 1/6: Quét Mặt TRÊN (Trắng)',
    tip: 'Đặt mặt có ô tâm TRẮNG nằm ngay chính giữa camera.',
    illustration: 'Độc mặt TRÊN hướng về thấu kính.'
  },
  L: {
    step: 'Bước 2/6: Quét Mặt TRÁI (Cam)',
    tip: 'Từ mặt Trên, hãy NGHIÊNG KHỐI XUỐNG DƯỚI một chút để thấy mặt CAM.',
    illustration: 'Nghiêng cụp đầu khối Rubik xuống.'
  },
  F: {
    step: 'Bước 3/6: Quét Mặt TRƯỚC (Lục)',
    tip: 'Tiếp tục XOAY KHỐI SANG TRÁI để lộ mặt XANH LÁ (Lục).',
    illustration: 'Xoay khối sang trái 90 độ.'
  },
  R: {
    step: 'Bước 4/6: Quét Mặt PHẢI (Đỏ)',
    tip: 'Tiếp tục XOAY KHỐI SANG TRÁI một lần nữa để lộ mặt ĐỎ.',
    illustration: 'Xoay khối sang trái 90 độ.'
  },
  B: {
    step: 'Bước 5/6: Quét Mặt SAU (Lam)',
    tip: 'Tiếp tục XOAY SANG TRÁI để lộ mặt XANH DƯƠNG (Lam).',
    illustration: 'Xoay khối sang trái 90 độ.'
  },
  D: {
    step: 'Bước 6/6: Quét Mặt DƯỚI (Vàng)',
    tip: 'Cuối cùng, LẬT KHỐI NGƯỢC LÊN hẳn để thấy mặt ĐẾ VÀNG.',
    illustration: 'Lật ngược khối lên trên hoàn toàn.'
  }
};

// Play pleasant synthesizer sound fx using standard native Web Audio API
const playSoundFeedback = (type: 'tick' | 'capture' | 'error') => {
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

export default function CubeCameraScanner({ onClose, onApplyScan, currentState }: CubeCameraScannerProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeFace, setActiveFace] = useState<FaceName>('U');
  const [scannedCube, setScannedCube] = useState<CubeState>({ ...currentState });
  const [cameraActive, setCameraActive] = useState<boolean>(true);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isAutoMode, setIsAutoMode] = useState<boolean>(true);
  const [aiDetectedFace, setAiDetectedFace] = useState<FaceName | null>(null);
  const [scannedFacesInSession, setScannedFacesInSession] = useState<Set<FaceName>>(new Set<FaceName>());

  // Auto-capture stability trackers
  const [stabilityProgress, setStabilityProgress] = useState<number>(0);
  const [cooldownCountdown, setCooldownCountdown] = useState<number>(0);

  // Real-time detected state of the current 3x3 face
  const [detectedColors, setDetectedColors] = useState<CubeColor[]>(Array(9).fill('white'));

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);

  // Tracking dynamic stability frames
  const prevColorsRef = useRef<string>('');
  const consecutiveMatchCountRef = useRef<number>(0);
  const isCooldownActiveRef = useRef<boolean>(false);
  const centerStabilityRef = useRef<{ face: FaceName; count: number }>({ face: 'U', count: 0 });

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

  const startCamera = async () => {
    setErrorMessage(null);
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Lỗi truy cập camera:', err);
      if (err.name === 'NotAllowedError') {
        setErrorMessage('Trình duyệt chưa được cấp quyền truy cập Camera. Hãy cấp quyền để quét Rubik!');
      } else if (err.name === 'NotFoundError') {
        setErrorMessage('Không tìm thấy Camera khả dụng trên thiết bị này.');
      } else {
        setErrorMessage('Không thể khởi chạy camera: ' + (err.message || 'Lỗi không rõ'));
      }
    }
  };

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

  // Convert RGB to HSV for precise chrominance classification
  const rgbToHsv = (r: number, g: number, b: number) => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const v = max;

    const d = max - min;
    s = max === 0 ? 0 : d / max;

    if (max !== min) {
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    return { h: h * 360, s, v };
  };

  // Advanced color classifier
  const classifyColor = (r: number, g: number, b: number): CubeColor => {
    const { h, s, v } = rgbToHsv(r, g, b);

    // 1. Detect White: Low saturation, relatively high brightness
    if (s < 0.22 && v > 0.42) {
      return 'white';
    }

    // Low lighting fallback
    if (v < 0.12) {
      return 'white'; // default to white under total shadow
    }

    // 2. Classify by Hue angles (0 - 360 degrees)
    if (h >= 345 || h < 14) {
      if (h >= 10 || (g > 75 && s < 0.85)) {
        return 'orange';
      }
      return 'red';
    } else if (h >= 14 && h < 42) {
      return 'orange';
    } else if (h >= 42 && h < 68) {
      if (v < 0.4 && s < 0.5) {
        return 'white';
      }
      return 'yellow';
    } else if (h >= 68 && h < 165) {
      return 'green';
    } else if (h >= 165 && h < 265) {
      return 'blue';
    } else {
      return 'red';
    }
  };

  // Fallback classic Euclidean Distance Classifier to optimize near colors
  const classifyColorDistance = (r: number, g: number, b: number): CubeColor => {
    let bestColor: CubeColor = 'white';
    let minDistance = Infinity;

    for (const [colorName, ref] of Object.entries(REF_COLORS)) {
      const dist = Math.sqrt(
        Math.pow(r - ref.r, 2) + Math.pow(g - ref.g, 2) + Math.pow(b - ref.b, 2)
      );
      if (dist < minDistance) {
        minDistance = dist;
        bestColor = colorName as CubeColor;
      }
    }
    return bestColor;
  };

  // Hybrid voting classifier for maximum real-world reliability
  const getScannedColor = (r: number, g: number, b: number): CubeColor => {
    const fromHsv = classifyColor(r, g, b);
    const fromDistance = classifyColorDistance(r, g, b);

    if (fromHsv === fromDistance) {
      return fromHsv;
    }

    if (fromHsv === 'white' || fromHsv === 'yellow') {
      return fromHsv;
    }

    return fromHsv;
  };

  // Real-time canvas processing loop
  const processFrame = () => {
    if (!cameraActive || !videoRef.current || !canvasRef.current) {
      requestRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState === video.HAVE_CURRENT_DATA && ctx) {
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

          const classified = getScannedColor(rAvg, gAvg, bAvg);
          sampled.push(classified);
        }
      }

      setDetectedColors(sampled);

      // --- TỰ ĐỘNG DÒ MẶT THÔNG MINH QUA Ô TÂM (INTELLIGENT CENTER-BASED AUTO FACE DETECTOR) ---
      const centerColor = sampled[4];
      const mappedFace = CENTER_COLOR_TO_FACE[centerColor];

      if (mappedFace && !isCooldownActiveRef.current) {
        if (mappedFace === centerStabilityRef.current.face) {
          centerStabilityRef.current.count += 1;
          
          if (centerStabilityRef.current.count >= 5) { // Stable for 5 frames (~160ms)
            setAiDetectedFace(mappedFace);
            if (activeFace !== mappedFace) {
              setActiveFace(mappedFace);
              // Clear previous match cache so it scans fresh
              prevColorsRef.current = '';
              consecutiveMatchCountRef.current = 0;
              setStabilityProgress(0);
              triggerHaptic(8);
            }
          }
        } else {
          centerStabilityRef.current = { face: mappedFace, count: 1 };
        }
      }

      // --- SỬ TRÍ TỰ ĐỘNG QUÉT THÔNG MINH (INTELLIGENT AUTO-CAPTURE DETECTOR) ---
      if (isAutoMode && !isCooldownActiveRef.current) {
        const colorsKey = sampled.join(',');
        
        if (colorsKey === prevColorsRef.current) {
          // If state is fully stable and matches previous frames
          consecutiveMatchCountRef.current += 1;
          
          const stabilityTargetFrames = 15; // Represents approx 500ms of stable footage
          const calculatedProgress = Math.min(100, Math.round((consecutiveMatchCountRef.current / stabilityTargetFrames) * 100));
          setStabilityProgress(calculatedProgress);

          // Subtly play periodic ticks as stability grows to evoke tactile responsive scanning feel
          if (consecutiveMatchCountRef.current % 4 === 0 && calculatedProgress < 100) {
            playSoundFeedback('tick');
            triggerHaptic(4);
          }

          if (consecutiveMatchCountRef.current >= stabilityTargetFrames) {
            // Trigger automatic grab!
            triggerAutoCapture(sampled, mappedFace || activeFace);
          }
        } else {
          // Reset stability countdown if frame shook or colors shifted
          prevColorsRef.current = colorsKey;
          consecutiveMatchCountRef.current = 0;
          setStabilityProgress(0);
        }
      } else if (isCooldownActiveRef.current) {
        setStabilityProgress(0);
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

  const captureActiveFace = () => {
    playSoundFeedback('capture');
    triggerHaptic([35, 15, 30]);
    
    setScannedCube((prev) => ({
      ...prev,
      [activeFace]: [...detectedColors],
    }));

    setScannedFacesInSession((prev) => {
      const next = new Set(prev);
      next.add(activeFace);
      return next;
    });

    const facesOrder: FaceName[] = ['U', 'L', 'F', 'R', 'B', 'D'];
    const currentIdx = facesOrder.indexOf(activeFace);
    if (currentIdx < facesOrder.length - 1) {
      const nextFace = facesOrder[currentIdx + 1];
      setActiveFace(nextFace);
    }
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
        text: 'Hoàn hảo! Dữ liệu màu sắc hoàn toàn khớp nhau (đủ 9 ô mỗi màu). Sẵn sàng đồng bộ!',
      };
    } else {
      return {
        isValid: false,
        text: `Tổng số màu: ${anomalies.join(', ')}. Hãy chạm chọn thủ công ở bảng bên phải để hoàn tất tinh chỉnh!`,
      };
    }
  };

  const validation = scanValidationMessage();

  return (
    <div className="fixed inset-0 bg-[#06080d]/98 backdrop-blur-2xl z-50 flex flex-col lg:grid lg:grid-cols-12 overflow-y-auto font-sans text-slate-100">
      
      {/* LEFT COLUMN: Camera Scanner & Visual Target System (7 cols) */}
      <div className="col-span-12 lg:col-span-7 flex flex-col justify-between border-r border-white/5 p-4 sm:p-6 min-h-[550px] lg:min-h-screen bg-neutral-950/20">
        
        {/* Header toolbar */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 p-1 px-2.5 bg-blue-500/10 rounded-full border border-blue-500/15 text-blue-400 text-[10px] font-mono font-bold tracking-wider animate-pulse">
              <Camera size={11} />
              <span>LIVE CORE AR</span>
            </div>
            <div>
              <h2 className="text-md font-bold text-white tracking-tight flex items-center gap-1.5">
                Quét Rảnh Tay Siêu Tốc 
                <span className="text-[10px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded-md font-serif">v2.0 AI</span>
              </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Hand-free Auto pilot toggle trigger */}
            <button
              onClick={() => {
                triggerHaptic(10);
                setIsAutoMode(!isAutoMode);
              }}
              className={`p-1.5 px-3 rounded-xl border text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer ${
                isAutoMode 
                  ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-lg shadow-blue-500/5' 
                  : 'bg-neutral-900 border-white/5 text-neutral-400 hover:text-white'
              }`}
            >
              {isAutoMode ? <Zap size={11} className="text-blue-400 animate-bounce" /> : <ZapOff size={11} />}
              <span>{isAutoMode ? 'TỰ QUÉT: BẬT' : 'TỰ QUÉT: TẮT'}</span>
            </button>

            <button
              onClick={() => {
                triggerHaptic(10);
                stopCamera();
                onClose();
              }}
              className="p-2 hover:bg-neutral-900 rounded-xl text-neutral-400 hover:text-white transition cursor-pointer border border-transparent hover:border-white/5"
              title="Thoát máy quét"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Big visual instructions helper banner */}
        <div className="bg-gradient-to-r from-blue-950/20 via-indigo-950/10 to-indigo-950/20 border border-blue-500/25 p-4 rounded-2xl my-3 space-y-1.5 text-center sm:text-left shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 -mt-2 -mr-2 w-16 h-16 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest block animate-pulse">
                {aiDetectedFace === activeFace ? '✨ CAMERA AI ĐÃ PHÁT HIỆN MẶT' : '🔍 HƯỚNG MÁY QUÉT'}
              </span>
              {aiDetectedFace === activeFace && (
                <span className="text-[9px] bg-cyan-500/20 text-cyan-300 font-bold px-1.5 py-0.5 rounded border border-cyan-500/35 font-mono">
                  KHỚP MÀU TÂM
                </span>
              )}
            </div>
            <span className="text-[10px] bg-blue-500/15 text-blue-300 font-bold px-2 py-0.5 rounded-full border border-blue-500/10 max-w-max self-center sm:self-auto">
              {scannedFacesInSession.has(activeFace) ? '✓ Đã cập nhật mặt này' : '⏳ Chờ ghi nhận màu'}
            </span>
          </div>
          <h4 className="text-lg font-black text-white flex items-center gap-1.5 justify-center sm:justify-start">
            {FACE_LABELS[activeFace]}
          </h4>
          <p className="text-xs sm:text-sm font-bold text-slate-300 leading-snug">
            {aiDetectedFace === activeFace 
              ? `AI phát hiện tâm màu ${activeFace === 'U' ? 'Trắng' : activeFace === 'D' ? 'Vàng' : activeFace === 'F' ? 'Xanh Lục' : activeFace === 'B' ? 'Xanh Lam' : activeFace === 'L' ? 'Cam' : 'Đỏ'}. Hãy Giữ nguyên khối để AI tự động lưu màu!`
              : `Hướng ô TÂM của mặt này vào đúng khung hình camera. AI sẽ tự động phân tách và khóa mặt mục tiêu.`}
          </p>
          <div className="mt-1.5 pt-1.5 border-t border-white/5 flex flex-wrap gap-2 items-center justify-center sm:justify-start text-[10px] text-slate-400">
            <span className="font-semibold text-sky-400">Tiến độ phiên:</span>
            <span>Đã quét xong <strong className="text-emerald-400 font-bold">{scannedFacesInSession.size}</strong>/6 mặt.</span>
            {scannedFacesInSession.size < 6 && (
              <span className="text-[9px] bg-amber-500/10 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/10">
                Gợi ý: Hãy xoay qua {6 - scannedFacesInSession.size} mặt còn lại
              </span>
            )}
          </div>
        </div>

        {/* Live video viewport workspace */}
        <div className="flex-1 flex flex-col items-center justify-center my-2 relative">
          
          {errorMessage ? (
            <div className="max-w-md p-6 bg-red-950/20 border border-red-500/20 rounded-2xl text-center space-y-4 shadow-xl">
              <AlertCircle size={38} className="text-red-500 mx-auto animate-bounce" />
              <p className="text-xs text-red-100 font-medium leading-relaxed">{errorMessage}</p>
              <button
                onClick={startCamera}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Nhấp Thử Lại
              </button>
            </div>
          ) : (
            <div className="relative w-full max-w-[420px] aspect-[4/3] rounded-3xl overflow-hidden border-2 border-white/10 shadow-2xl bg-[#090b11]">
              
              {/* HTML5 video elements */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Hidden analytic renderer canvas */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Visual guidance wireframes (Dây định khung nhịp 3x3) */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`relative w-[52%] aspect-square border-2 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                  cooldownCountdown > 0 
                    ? 'border-emerald-400 scale-102 bg-emerald-500/10 shadow-[0_0_50px_rgba(16,185,129,0.3)]' 
                    : `${FACE_GLOWS[activeFace].border} ${FACE_GLOWS[activeFace].bg} ${FACE_GLOWS[activeFace].shadow}`
                }`}>
                  
                  {/* Glowing dynamic brackets for visual look */}
                  <div className={`absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 -mt-1 -ml-1 rounded-tl-xl transition-all duration-300 ${cooldownCountdown > 0 ? 'border-emerald-400' : FACE_GLOWS[activeFace].border}`} />
                  <div className={`absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 -mt-1 -mr-1 rounded-tr-xl transition-all duration-300 ${cooldownCountdown > 0 ? 'border-emerald-400' : FACE_GLOWS[activeFace].border}`} />
                  <div className={`absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 -mb-1 -ml-1 rounded-bl-xl transition-all duration-300 ${cooldownCountdown > 0 ? 'border-emerald-400' : FACE_GLOWS[activeFace].border}`} />
                  <div className={`absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 -mb-1 -mr-1 rounded-br-xl transition-all duration-300 ${cooldownCountdown > 0 ? 'border-emerald-400' : FACE_GLOWS[activeFace].border}`} />
 
                  {/* Laser alignment ray shader scanning line */}
                  <div className={`absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent to-transparent shadow-[0_0_12px_rgba(34,211,238,0.8)] animate-scan-bounce ${
                    cooldownCountdown > 0 ? 'via-emerald-400 font-semibold' : FACE_GLOWS[activeFace].lightGlow
                  }`} />
 
                  {/* Inside active coordinates center targeting dot matrices */}
                  <div className="grid grid-cols-3 gap-0 w-full h-full p-2.5 opacity-60">
                    {Array(9).fill(0).map((_, i) => (
                      <div key={i} className="flex items-center justify-center">
                        <div className={`w-2 h-2 rounded-full border transition-all duration-300 ${
                          cooldownCountdown > 0 
                            ? 'bg-emerald-500 border-white animate-ping' 
                            : stabilityProgress > 70 
                            ? 'bg-cyan-400 border-white scale-125 shadow-[0_0_8px_rgba(34,211,238,0.8)]' 
                            : 'bg-white/20 border-white/40'
                        }`} />
                      </div>
                    ))}
                  </div>
 
                  {/* Ring stability indicator - visual feedback */}
                  {isAutoMode && !isCooldownActiveRef.current && stabilityProgress > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs rounded-2xl">
                      <div className="text-center space-y-1">
                        <div className="relative w-14 h-14 mx-auto flex items-center justify-center">
                          {/* Progress circular gauge */}
                          <svg className="absolute inset-0 w-full h-full -rotate-90">
                            <circle
                              cx="28"
                              cy="28"
                              r="24"
                              fill="transparent"
                              className="stroke-white/10"
                              strokeWidth="4"
                            />
                            <circle
                              cx="28"
                              cy="28"
                              r="24"
                              fill="transparent"
                              className="transition-all duration-100"
                              stroke={activeFace === 'U' ? '#e2e8f0' : activeFace === 'D' ? '#facc15' : activeFace === 'L' ? '#f97316' : activeFace === 'R' ? '#f43f5e' : activeFace === 'B' ? '#3b82f6' : '#10b981'}
                              strokeWidth="4"
                              strokeDasharray={2 * Math.PI * 24}
                              strokeDashoffset={2 * Math.PI * 24 * (1 - stabilityProgress / 100)}
                            />
                          </svg>
                          <span className={`text-xs font-mono font-extrabold ${FACE_GLOWS[activeFace].text}`}>{stabilityProgress}%</span>
                        </div>
                        <span className="text-[9px] font-bold text-slate-100 uppercase tracking-widest block animate-pulse">Giữ nguyên khối...</span>
                      </div>
                    </div>
                  )}

                  {/* Cooldown lock view screen helper */}
                  {cooldownCountdown > 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-950/85 backdrop-blur-sm rounded-2xl text-center p-4">
                      <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-md font-bold mb-1.5 animate-bounce border border-emerald-400/20">
                        ✓
                      </div>
                      <span className="text-xs font-black text-white uppercase tracking-widest block">Mặt thành công!</span>
                      <span className="text-[10px] text-emerald-200 mt-1 leading-normal">
                        Chuẩn bị xoay qua mặt tiếp theo ({cooldownCountdown}s)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Dynamic bottom live-view badges (Real-time classification helper) */}
              <div className="absolute bottom-4 left-4 right-4 bg-[#0a0c14]/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-white/5 flex items-center justify-between shadow-xl pointer-events-none">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Cảm biến màu:</span>
                </div>
                <div className="grid grid-cols-9 gap-1 h-5 w-44">
                  {detectedColors.map((col, idx) => (
                    <div
                      key={idx}
                      style={{ backgroundColor: COLORS[col] }}
                      className="h-full aspect-square rounded-sm border border-black/30 shadow-sm"
                    />
                  ))}
                </div>
              </div>

              {/* Status active state indicator */}
              <div className="absolute top-4 left-4 bg-emerald-500/10 backdrop-blur px-3 py-1 rounded-full border border-emerald-500/20 text-[9px] font-bold font-mono text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>CHẾ ĐỘ RẢNH TAY</span>
              </div>
            </div>
          )}
        </div>

        {/* Action button controls */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={toggleFacingMode}
              disabled={!!errorMessage}
              className="w-full sm:w-auto px-5 py-3.5 bg-[#121624] hover:bg-[#1a2034] disabled:opacity-50 text-slate-300 hover:text-white rounded-2xl text-xs font-extrabold border border-white/5 cursor-pointer flex items-center justify-center gap-2 transition duration-200"
            >
              <RefreshCw size={14} className="animate-spin-slow text-indigo-400" />
              <span>Đảo ống kính camera</span>
            </button>

            {/* Traditional manual trigger button */}
            <button
              onClick={captureActiveFace}
              disabled={!!errorMessage || !stream || cooldownCountdown > 0}
              className="flex-1 w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 disabled:from-neutral-900 disabled:to-neutral-900 disabled:opacity-40 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-blue-500/15 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer border border-blue-500/30"
            >
              <Check size={15} />
              <span>Ghi Màu Thủ Công ({FACE_LABELS[activeFace].split(' ')[1]})</span>
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Rubik Configuration Dashboard & Interactive Fix Palette (5 cols) */}
      <div className="col-span-12 lg:col-span-5 bg-[#090b11] flex flex-col justify-between p-4 sm:p-6 min-h-screen">
        
        <div className="space-y-6 flex-1">
          <div>
            <span className="text-[10px] text-blue-400 tracking-widest font-bold uppercase block">Quản lý tổng thể</span>
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest block border-b border-white/5 pb-2">
              📊 BẢN ĐỒ TIẾN ĐỘ THỰC TẾ
            </h3>
            <p className="text-[11px] text-neutral-400 mt-1.5">
              Để thuật toán giải hoạt động ổn định, 6 mặt Rubik cần lưu trữ đúng thông tin nhãn màu tương ứng.
            </p>
          </div>

          {/* Hexagonal selector list */}
          <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-2 gap-2">
            {(Object.keys(scannedCube) as FaceName[]).map((face) => {
              const faceColors = scannedCube[face];
              const isCaptured = scannedFacesInSession.has(face);
              const isActive = activeFace === face;

              return (
                <button
                  key={face}
                  onClick={() => {
                    triggerHaptic(5);
                    setActiveFace(face);
                  }}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition flex items-center justify-between group ${
                    isActive
                      ? 'bg-blue-600/15 border-blue-500 shadow-md shadow-blue-500/10'
                      : isCaptured
                      ? 'bg-emerald-950/10 border-emerald-500/20 hover:bg-emerald-950/20'
                      : 'bg-[#101524]/60 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="min-w-0">
                    <span className={`text-[10px] font-black block truncate transition-all ${isActive ? 'text-blue-400' : 'text-slate-200'}`}>
                      {FACE_LABELS[face].split(' ')[1]}
                    </span>
                    <span className="text-[9px] text-neutral-400 block truncate scale-95 origin-left">
                      {face === 'U' ? 'Mặt Trắng' : face === 'D' ? 'Mặt Vàng' : face === 'F' ? 'Mặt Lục' : face === 'B' ? 'Mặt Lam' : face === 'L' ? 'Mặt Cam' : 'Mặt Đỏ'}
                    </span>
                  </div>

                  {isCaptured ? (
                    <div className="w-4.5 h-4.5 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 border border-emerald-400/20 text-[8px] font-bold shrink-0">
                      ✓
                    </div>
                  ) : (
                    <div className="w-4.5 h-4.5 bg-neutral-900 rounded-full flex items-center justify-center text-neutral-500 text-[8px] font-bold border border-white/5 shrink-0">
                      ?
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active face inspection + manual paint fine-tuning */}
          <div className="bg-[#101420] p-4.5 rounded-2xl border border-white/5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={11} className="text-amber-400 animate-spin-slow" />
                <span>Hiệu chỉnh trực tiếp: {FACE_LABELS[activeFace]}</span>
              </span>
              <span className="text-[9px] font-mono text-neutral-400 animate-pulse">Chạm để sửa màu</span>
            </div>

            {/* Simulated 3x3 layout of active face */}
            <div className="flex flex-col items-center gap-4">
              <div className="grid grid-cols-3 gap-2 w-32 sm:w-36 aspect-square p-2 bg-neutral-950/80 rounded-2xl border border-white/10 shadow-inner">
                {scannedCube[activeFace].map((col, idx) => (
                  <div key={idx} className="relative group aspect-square">
                    {/* Select dropdown selection box over original color */}
                    <select
                      value={col}
                      onChange={(e) => handleModifySticker(idx, e.target.value as CubeColor)}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      title="Sửa màu gốc nhãn này"
                    >
                      <option value="white">Trắng (U - White)</option>
                      <option value="yellow">Vàng (D - Yellow)</option>
                      <option value="green">Lục (F - Green)</option>
                      <option value="blue">Lam (B - Blue)</option>
                      <option value="orange">Cam (L - Orange)</option>
                      <option value="red">Đỏ (R - Red)</option>
                    </select>
                    <div
                      style={{ backgroundColor: COLORS[col] }}
                      className="w-full h-full rounded-lg border border-neutral-950/45 duration-150 cursor-pointer shadow-subtle flex items-center justify-center text-[10px] font-mono font-bold text-black/55 select-none hover:scale-105 active:scale-95 group-hover:bg-slate-200"
                    >
                      {idx + 1}
                    </div>
                  </div>
                ))}
              </div>

              {/* Color instructions helper */}
              <div className="bg-[#121828] p-3 rounded-xl border border-white/5 text-[10px] text-center text-neutral-400 italic leading-relaxed">
                📌 <span className="font-bold text-neutral-300">Tính năng Sửa Màu Thông Minh:</span> Nhấp trực tiếp vào bất cứ ô vuông số 1-9 phía trên để tinh chỉnh ngay nếu máy ảnh chụp bị sai lệch màu do ảnh hưởng của môi trường ánh sáng phòng.
              </div>
            </div>
          </div>
        </div>

        {/* Action console bottom footer validation & trigger apply solver */}
        <div className="pt-4 border-t border-white/5 space-y-4 bg-[#090b11]">
          
          {/* Diagnostic banner */}
          <div className={`p-4 rounded-2xl border text-xs leading-relaxed flex items-start gap-3 transition-all ${
            validation.isValid
              ? 'bg-emerald-950/20 border-emerald-500/25 text-emerald-300'
              : 'bg-amber-950/20 border-amber-500/25 text-amber-300 font-medium'
          }`}>
            <AlertCircle size={16} className={`shrink-0 mt-0.5 ${validation.isValid ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span>{validation.text}</span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                triggerHaptic(10);
                stopCamera();
                onClose();
              }}
              className="px-4 py-3.5 bg-neutral-900 border border-white/5 hover:bg-neutral-800 text-slate-300 hover:text-white rounded-2xl text-xs font-bold transition flex-1 text-center cursor-pointer"
            >
              Quay lại
            </button>

            <button
              onClick={handleApplyCompletedScan}
              disabled={!allFacesCaptured}
              className={`flex-2 px-6 py-3.5 rounded-2xl text-xs font-extrabold uppercase tracking-widest text-white transition-all text-center border cursor-pointer ${
                allFacesCaptured
                  ? 'bg-blue-600 hover:bg-blue-500 border-blue-500 shadow-xl shadow-blue-500/10 active:scale-97'
                  : 'bg-neutral-900 text-neutral-500 border-transparent cursor-not-allowed'
              }`}
            >
              Xác Nhận & Giải Rubik
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
