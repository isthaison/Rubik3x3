import React, { useState, useEffect, useRef } from 'react';
import { FaceName, CubeColor, CubeState } from '../types';
import { COLORS, cloneState } from '../utils/cubeEngine';
import { Camera, RefreshCw, Check, X, AlertCircle, Sparkles, HelpCircle, Info, Zap, Settings, ShieldCheck, HelpCircle as HelpIcon, ArrowRight, CornerDownRight, ZapOff } from 'lucide-react';
import { CubeScannerDetector } from '../utils/cubeScannerDetector';
import { triggerHaptic } from '../utils/haptics';

interface CubeCameraScannerProps {
  onClose: () => void;
  onApplyScan: (scannedState: CubeState) => void;
  currentState: CubeState;
}

// Convert native color string to Vietnamese label with custom hex displays
const FACE_LABELS: Record<FaceName, string> = {
  U: 'Mặt Trên (Trắng)',
  L: 'Mặt Trái (Cam)',
  F: 'Mặt Trước (Lục)',
  R: 'Mặt Phải (Đỏ)',
  B: 'Mặt Sau (Lam)',
  D: 'Mặt Dưới (Vàng)',
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

// Target original defined colors for center of each face to guarantee physical correctness
const STANDARD_FACE_CENTERS: Record<FaceName, CubeColor> = {
  U: 'white',
  L: 'orange',
  F: 'green',
  R: 'red',
  B: 'blue',
  D: 'yellow',
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

import { useCubeScanner } from './useCubeScanner';

export default function CubeCameraScanner({ onClose, onApplyScan, currentState }: CubeCameraScannerProps) {
  const {
    stream,
    errorMessage,
    activeFace,
    setActiveFace,
    scannedCube,
    cameraActive,
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
  } = useCubeScanner({ currentState, onApplyScan, onClose });

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#0c0e14] font-sans text-slate-100 overflow-hidden">
      {/* Top Header Bar */}
      <div className="w-full flex items-center justify-between px-4 py-3 bg-[#090b11] border-b border-white/5 shrink-0 z-30">
        <div className="flex items-center gap-1.5">
          <Camera className="text-slate-400" size={16} />
          <span className="text-xs sm:text-sm font-semibold text-slate-200">Quét màu Rubik</span>
        </div>
        
        <button
          onClick={() => {
            triggerHaptic(10);
            stopCamera();
            onClose();
          }}
          className="p-1.5 sm:p-2 bg-neutral-900 border border-white/10 hover:bg-neutral-800 rounded-lg text-neutral-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-bold active:scale-95"
        >
          <X size={15} />
          <span>Đóng</span>
        </button>
      </div>

      {/* Main split dashboard workspace */}
      <div className="flex-1 w-full overflow-y-auto lg:grid lg:grid-cols-12 scrollbar-hide bg-[#0c0e14]">
        {/* LEFT COLUMN: Camera Scanner & Visual Target System (7 cols) */}
        <div className="col-span-12 lg:col-span-7 flex flex-col justify-center items-center border-r border-white/5 p-2 sm:p-3 min-h-[300px] lg:min-h-[400px] bg-[#0c0e14]">
        
        <div className="w-full flex justify-between items-center mb-1.5 px-2">
          <h2 className="text-xl font-bold text-white">
            {FACE_LABELS[activeFace]}
          </h2>
          <span className="text-sm font-semibold text-neutral-400">
             <strong className="text-emerald-400">{scannedFacesInSession.size}</strong>/6
          </span>
        </div>

        {/* Live video viewport workspace */}
        <div className="flex-1 flex flex-col items-center justify-center my-2 relative">
          
          {errorMessage ? (
            <div className="max-w-md p-2 bg-red-950/20 border border-red-500/20 rounded-lg text-center space-y-1.5 shadow-xl">
              <AlertCircle size={38} className="text-red-500 mx-auto animate-bounce" />
              <p className="text-xs text-red-100 font-medium leading-relaxed">{errorMessage}</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={startCamera}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Nhàp Thử Lại
                </button>
              </div>
            </div>
          ) : (
            <div className="relative w-full max-w-[420px] aspect-[4/3] rounded-lg overflow-hidden border-2 border-white/10 shadow-2xl bg-[#090b11]">
              
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

              {/* Real-time precheck status indicator badges */}
              {isCubeFaceDetected ? (
                <div className="absolute top-2.5 left-2.5 bg-emerald-500/95 border border-emerald-400 text-white px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1.5 z-20 shadow-md backdrop-blur-md animate-pulse">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                  <span>ĐÃ PHÁT HIỆN MẶT RUBIK ({detectionConfidence}%)</span>
                </div>
              ) : (
                <div className="absolute top-2.5 left-2.5 bg-amber-500/90 border border-amber-400/30 text-slate-900 px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1.5 z-20 shadow-md backdrop-blur-md">
                  <span className="w-1.5 h-1.5 bg-slate-905 rounded-full animate-ping text-slate-900" />
                  <span>CĂN CHỈNH GIỜ MẶT RUBIK... ({detectionConfidence}%)</span>
                </div>
              )}

              {/* Visual guidance wireframes (Dây định khung nhịp 3x3) */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`relative w-[52%] aspect-square border-2 rounded-lg flex items-center justify-center transition-all duration-300 ${
                  cooldownCountdown > 0 
                    ? 'border-emerald-400 scale-102 bg-emerald-500/10 shadow-[0_0_50px_rgba(16,185,129,0.3)]' 
                    : isCubeFaceDetected
                    ? `${FACE_GLOWS[activeFace].border} ${FACE_GLOWS[activeFace].bg} ${FACE_GLOWS[activeFace].shadow}`
                    : 'border-amber-500/30 bg-black/30'
                }`}>
                  
                  {/* Glowing dynamic brackets for visual look */}
                  <div className={`absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 -mt-1 -ml-1 rounded-tl-xl transition-all duration-300 ${cooldownCountdown > 0 ? 'border-emerald-400' : isCubeFaceDetected ? FACE_GLOWS[activeFace].border : 'border-amber-500/40'}`} />
                  <div className={`absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 -mt-1 -mr-1 rounded-tr-xl transition-all duration-300 ${cooldownCountdown > 0 ? 'border-emerald-400' : isCubeFaceDetected ? FACE_GLOWS[activeFace].border : 'border-amber-500/40'}`} />
                  <div className={`absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 -mb-1 -ml-1 rounded-bl-xl transition-all duration-300 ${cooldownCountdown > 0 ? 'border-emerald-400' : isCubeFaceDetected ? FACE_GLOWS[activeFace].border : 'border-amber-500/40'}`} />
                  <div className={`absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 -mb-1 -mr-1 rounded-br-xl transition-all duration-300 ${cooldownCountdown > 0 ? 'border-emerald-400' : isCubeFaceDetected ? FACE_GLOWS[activeFace].border : 'border-amber-500/40'}`} />
 
                  {/* Laser alignment ray shader scanning line */}
                  <div className={`absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent to-transparent shadow-[0_0_12px_rgba(34,211,238,0.8)] animate-scan-bounce ${
                    cooldownCountdown > 0 ? 'via-emerald-400 font-semibold' : isCubeFaceDetected ? FACE_GLOWS[activeFace].lightGlow : 'via-amber-400/30'
                  }`} />
 
                  {/* Inside active coordinates center targeting AR indicators */}
                  <div className="grid grid-cols-3 gap-1.5 w-full h-full p-1.5 opacity-90">
                    {Array(9).fill(0).map((_, i) => {
                      const detectedColor = detectedColors[i] || 'white';
                      const colorHex = isCubeFaceDetected ? COLORS[detectedColor] : '#475569';
                      return (
                        <div key={i} className="flex flex-col items-center justify-center relative w-full h-full">
                          {/* AR Sticker Border Frame */}
                          <div
                            style={{ borderColor: colorHex }}
                            className={`w-full h-full border rounded-md transition-all duration-300 flex flex-col items-center justify-center relative ${
                              cooldownCountdown > 0
                                ? 'bg-emerald-500/10 border-emerald-400 scale-102 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                                : isCubeFaceDetected && stabilityProgress > 70
                                ? 'scale-105 shadow-[0_0_12px_rgba(34,211,238,0.5)] bg-slate-900/40'
                                : 'bg-black/30'
                            }`}
                          >
                            {/* Inside Dot */}
                            <div
                              style={{ backgroundColor: colorHex }}
                              className={`w-2 h-2 rounded-full border border-black/40 transition-all duration-300 ${
                                cooldownCountdown > 0
                                  ? 'bg-emerald-400 scale-125 animate-ping'
                                  : isCubeFaceDetected && stabilityProgress > 70
                                  ? 'scale-110 shadow-lg'
                                  : 'animate-pulse opacity-40'
                              }`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
 
                  {/* Ring stability indicator - simplified to a subtle glow on the frame instead of a full screen overlay */}

                  {/* Cooldown lock view screen helper */}
                  {cooldownCountdown > 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-950/85 backdrop-blur-sm rounded-lg text-center p-2">
                      <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-md font-bold animate-bounce border border-emerald-400/20">
                        ✓
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Toggle camera facing mode action */}
              <button
                onClick={toggleFacingMode}
                disabled={!!errorMessage}
                className="absolute top-2 right-4 bg-black/40 backdrop-blur-md border border-white/10 hover:bg-white/20 text-white w-9 h-9 flex items-center justify-center rounded-full z-20 transition shadow-lg cursor-pointer disabled:opacity-50 active:scale-90"
                title="Đảo ống kính camera"
              >
                <RefreshCw size={14} className="text-white" />
              </button>


            </div>
          )}

          {/* Quick controls console beneath video box */}
          <div className="w-full max-w-[420px] mt-2 bg-[#0c0e14] z-10 px-2">
            {/* Manual scan target snapshot button */}
            <button
              onClick={handleManualCapture}
              disabled={cooldownCountdown > 0 || !isCubeFaceDetected}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:border-slate-800/40 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold rounded-lg text-xs tracking-wider shadow-md shadow-emerald-600/10 transition-all cursor-pointer flex items-center justify-center gap-2 border border-emerald-500/30 active:scale-[0.98]"
            >
              <Camera size={14} />
              <span>{isCubeFaceDetected ? 'Chụp lại mặt này' : 'Hãy giữ vững Rubik để nhận diện'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Rubik Configuration Dashboard & Interactive Fix Palette (5 cols) */}
      <div className="col-span-12 lg:col-span-5 bg-[#090b11] flex flex-col justify-between p-3 sm:p-4 h-auto lg:min-h-screen overflow-y-auto">
        
        <div className="space-y-4 flex-1">
          {/* Bảng báo cáo chi tiết độ hoàn thành & tính lực học màu */}
          <div className="p-3 bg-[#111625] rounded-xl border border-white/5 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                Bộ Đối Soát Màu & Tiến Độ
              </h3>
              {scannedFacesInSession.size === 6 && Object.values(colorCounts).every(c => c === 9) ? (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  <ShieldCheck size={11} /> Đã kiểm chứng
                </span>
              ) : (
                <span className="text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  Đang đối soát...
                </span>
              )}
            </div>

            {/* Tiến độ mặt */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Độ phủ mặt Rubik:</span>
                <span className={`font-mono font-bold ${scannedFacesInSession.size === 6 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {scannedFacesInSession.size} / 6 mặt {scannedFacesInSession.size === 6 ? '✓' : ''}
                </span>
              </div>
              <div className="w-full bg-neutral-950 h-1.5 rounded-full overflow-hidden border border-white/5">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${
                    scannedFacesInSession.size === 6 ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.round((scannedFacesInSession.size / 6) * 100)}%` }}
                />
              </div>
            </div>

            {/* Chi tiết phân bổ màu sắc */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-medium text-slate-400 block uppercase tracking-wider">
                Số lượng ô của từng màu (Chuẩn chỉnh = 9 ô):
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(colorCounts) as CubeColor[]).map((col) => {
                  const count = colorCounts[col];
                  const isCorrect = count === 9;
                  const COLOR_NAMES_VI: Record<CubeColor, string> = {
                    white: 'Trắng',
                    yellow: 'Vàng',
                    green: 'Lục',
                    blue: 'Lam',
                    orange: 'Cam',
                    red: 'Đỏ',
                  };
                  return (
                    <div 
                      key={col} 
                      className={`p-1 rounded-md border text-center flex flex-col items-center justify-center transition-all ${
                        isCorrect 
                          ? 'bg-neutral-900/50 border-emerald-500/15 text-slate-300' 
                          : scannedFacesInSession.size === 6 
                          ? 'bg-red-950/25 border-red-500/25 text-red-200 animate-pulse' 
                          : 'bg-neutral-900 border-white/5 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-1 mb-0.5 justify-center">
                        <span 
                          className="w-2.5 h-2.5 rounded-full border border-black/30 block shrink-0"
                          style={{ backgroundColor: COLORS[col] }}
                        />
                        <span className="text-[9px] font-medium leading-none">{COLOR_NAMES_VI[col]}</span>
                      </div>
                      <span className={`text-xs font-bold font-mono leading-none ${
                        isCorrect ? 'text-emerald-400' : count > 9 ? 'text-red-400' : 'text-amber-400'
                      }`}>
                        {count}/9
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Diagnoses Message Banner */}
            <div className={`p-2 rounded-lg border text-[11px] leading-relaxed flex items-start gap-1.5 ${
              scannedFacesInSession.size < 6 
                ? 'bg-amber-950/15 border-amber-500/15 text-amber-300' 
                : !Object.values(colorCounts).every(c => c === 9)
                ? 'bg-red-950/20 border-red-500/20 text-red-300' 
                : 'bg-emerald-950/15 border-emerald-500/15 text-emerald-300'
            }`}>
              <Info size={13} className={`shrink-0 mt-0.5 ${
                scannedFacesInSession.size < 6 ? 'text-amber-400' : !Object.values(colorCounts).every(c => c === 9) ? 'text-red-400' : 'text-emerald-400'
              }`} />
              <div>
                {scannedFacesInSession.size < 6 ? (
                  <span>Hãy chụp đủ 6 mặt. Máy ảnh đang chờ đối soát màu tổng thể toàn bộ khối Rubik ({scannedFacesInSession.size}/6).</span>
                ) : !Object.values(colorCounts).every(c => c === 9) ? (
                  <span>
                    <strong>Cấu trúc màu chưa chuẩn:</strong> Lệch số o màu ở các góc/cạnh (phải đủ 9 ô mỗi màu). 
                    Hãy chọn mặt ở danh mục dưới và sửa ô màu lỗi trên bảng lưới 3x3.
                  </span>
                ) : (
                  <span><strong>✓ Đủ mặt & Đủ màu:</strong> Cấu trúc màu hợp lệ tuyệt đối! Khối Rubik an toàn và sẵn sàng giải được.</span>
                )}
              </div>
            </div>
          </div>

          {/* Hexagonal selector list */}
          <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-2 gap-1.5">
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
                  className={`p-2.5 rounded-lg border text-left cursor-pointer transition flex items-center justify-between group ${
                    isActive
                      ? 'bg-blue-600/15 border-blue-500 shadow-md shadow-blue-500/10'
                      : isCaptured
                      ? 'bg-emerald-950/10 border-emerald-500/20 hover:bg-emerald-950/20'
                      : 'bg-[#101524]/60 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="min-w-0">
                    <span className={`text-[10px] sm:text-xs font-black block truncate transition-all ${isActive ? 'text-blue-400' : 'text-slate-200'}`}>
                      {FACE_LABELS[face]}
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
          <div className="bg-[#101420] p-2.5 rounded-lg border border-white/5 shadow-xl flex justify-center items-center">
            {/* Simulated 3x3 layout of active face */}
            <div className="grid grid-cols-3 gap-1.5 w-32 sm:w-36 aspect-square p-2 bg-neutral-950/80 rounded-lg border border-white/10 shadow-inner">
                {scannedCube[activeFace].map((col, idx) => (
                  <div key={idx} className="relative group aspect-square">
                    {/* Select dropdown selection box over original color */}
                      <select
                        value={col}
                        onChange={(e) => handleModifySticker(idx, e.target.value as CubeColor)}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        title="Sửa màu"
                      >
                        <option value="white">Trắng</option>
                        <option value="yellow">Vàng</option>
                        <option value="green">Lục</option>
                        <option value="blue">Lam</option>
                        <option value="orange">Cam</option>
                        <option value="red">Đỏ</option>
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
          </div>
        </div>

        {/* Action console bottom footer validation & trigger apply solver */}
        <div className="pt-2 border-t border-white/5 space-y-1.5 bg-[#090b11]">
          
          <div className="flex gap-1.5">
            <button
              onClick={handleApplyCompletedScan}
              disabled={!allFacesCaptured}
              className={`w-full px-2 py-2 rounded-lg text-sm font-bold uppercase text-white transition-all text-center border cursor-pointer flex items-center justify-center gap-1.5 ${
                allFacesCaptured
                  ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500 shadow-xl shadow-emerald-500/20 active:scale-95'
                  : 'bg-neutral-800 text-neutral-500 border-transparent cursor-not-allowed'
              }`}
            >
              <Check size={18} />
              Giải Thử Ngay
            </button>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
