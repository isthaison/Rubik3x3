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

// Translate standard face abbreviations to clean local titles
const FACE_LABELS: Record<FaceName, string> = {
  U: 'Mặt Trên',
  L: 'Mặt Trái',
  F: 'Mặt Trước',
  R: 'Mặt Phải',
  B: 'Mặt Sau',
  D: 'Mặt Dưới',
};

// Compact labels without redundant color text or long sentences for 6-button list
const COMPACT_FACE_LABELS: Record<FaceName, string> = {
  U: 'Trên',
  L: 'Trái',
  F: 'Trước',
  R: 'Phải',
  B: 'Sau',
  D: 'Dưới',
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
    handleSimulateScan,
    handleClearAllScans,
    skipCooldown,
    colorCounts,
    allFacesCaptured,
    validation,
  } = useCubeScanner({ currentState, onApplyScan, onClose });

  const [selectedInk, setSelectedInk] = useState<CubeColor>('white');

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
            <div className="max-w-md p-4 bg-slate-900 border border-white/5 rounded-xl text-center space-y-3.5 shadow-2xl">
              <AlertCircle size={36} className="text-yellow-500 mx-auto animate-pulse" />
              <div className="space-y-1">
                <p className="text-xs text-slate-200 font-bold leading-relaxed">Không Thể Khởi Chạy Camera</p>
                <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">{errorMessage}</p>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={startCamera}
                  className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 bg-gradient-to-r from-zinc-800 to-zinc-700 border border-zinc-700/50 active:scale-95"
                >
                  <RefreshCw size={12} />
                  <span>Nạp Thử Lại</span>
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
                <div className="absolute top-2.5 left-2.5 bg-emerald-500/95 border border-emerald-400 text-white px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase flex items-center gap-1 z-20 shadow-md backdrop-blur-md">
                  <span className="w-1 h-1 bg-white rounded-full animate-ping" />
                  <span>ĐÃ NHẬN DIỆN ({detectionConfidence}%)</span>
                </div>
              ) : (
                <div className="absolute top-2.5 left-2.5 bg-zinc-800/90 border border-white/5 text-slate-300 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase flex items-center gap-1 z-20 shadow-md backdrop-blur-md">
                  <span>CĂN CHỈNH KHỐI ({detectionConfidence}%)</span>
                </div>
              )}

              {/* Visual guidance wireframes (Hệ thống định vị thông minh Border-less & Anchor Points) */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`relative w-[54%] aspect-square flex items-center justify-center transition-all duration-300 ${
                  cooldownCountdown > 0 
                    ? 'scale-102 shadow-[0_0_60px_rgba(16,185,129,0.15)] bg-emerald-500/5' 
                    : isCubeFaceDetected
                    ? `${FACE_GLOWS[activeFace].bg} ${FACE_GLOWS[activeFace].shadow}`
                    : 'bg-black/10'
                }`}>
                  
                  {/* High-tech, ultra-fine corner anchor points with dynamic coloring */}
                  <div className={`absolute top-0 left-0 w-4 h-4 border-t-[1.5px] border-l-[1.5px] -mt-0.5 -ml-0.5 rounded-tl-sm transition-all duration-305 ${cooldownCountdown > 0 ? 'border-emerald-400 shadow-[0_0_8px_#10b981]' : isCubeFaceDetected ? 'border-sky-400 shadow-[0_0_8px_#38bdf8]' : 'border-white/30'}`} />
                  <div className={`absolute top-0 right-0 w-4 h-4 border-t-[1.5px] border-r-[1.5px] -mt-0.5 -mr-0.5 rounded-tr-sm transition-all duration-305 ${cooldownCountdown > 0 ? 'border-emerald-400 shadow-[0_0_8px_#10b981]' : isCubeFaceDetected ? 'border-sky-400 shadow-[0_0_8px_#38bdf8]' : 'border-white/30'}`} />
                  <div className={`absolute bottom-0 left-0 w-4 h-4 border-b-[1.5px] border-l-[1.5px] -mb-0.5 -ml-0.5 rounded-bl-sm transition-all duration-305 ${cooldownCountdown > 0 ? 'border-emerald-400 shadow-[0_0_8px_#10b981]' : isCubeFaceDetected ? 'border-sky-400 shadow-[0_0_8px_#38bdf8]' : 'border-white/30'}`} />
                  <div className={`absolute bottom-0 right-0 w-4 h-4 border-b-[1.5px] border-r-[1.5px] -mb-0.5 -mr-0.5 rounded-br-sm transition-all duration-305 ${cooldownCountdown > 0 ? 'border-emerald-400 shadow-[0_0_8px_#10b981]' : isCubeFaceDetected ? 'border-sky-400 shadow-[0_0_8px_#38bdf8]' : 'border-white/30'}`} />
 
                  {/* Laser alignment ray shader scanning line (sleek teal gradient line) */}
                  <div className={`absolute left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_rgba(34,211,238,0.9)] animate-scan-bounce transition-all duration-500 ${
                    cooldownCountdown > 0 ? 'via-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.9)]' : isCubeFaceDetected ? FACE_GLOWS[activeFace].lightGlow : 'via-amber-400/20'
                  }`} />
 
                  {/* Active coordinates center targeting AR indicators */}
                  <div className="grid grid-cols-3 gap-2 w-full h-full p-2 opacity-95">
                    {Array(9).fill(0).map((_, i) => {
                      const detectedColor = detectedColors[i] || 'white';
                      const colorHex = isCubeFaceDetected ? COLORS[detectedColor] : '#4b5563';
                      
                      return (
                        <div key={i} className="flex items-center justify-center relative w-full h-full">
                          {/* Anchor point target indicator */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            {/* Fine corner marks for a micro-lens alignment look */}
                            <div className="absolute w-1.5 h-1.5 top-0.5 left-0.5 border-t border-l border-white/10" />
                            <div className="absolute w-1.5 h-1.5 top-0.5 right-0.5 border-t border-r border-white/10" />
                            <div className="absolute w-1.5 h-1.5 bottom-0.5 left-0.5 border-b border-l border-white/10" />
                            <div className="absolute w-1.5 h-1.5 bottom-0.5 right-0.5 border-b border-r border-white/10" />
                          </div>
                          
                          {/* Outer dotted tactile circle anchor ring */}
                          <div 
                            style={{ 
                              borderColor: isCubeFaceDetected ? `${colorHex}66` : 'rgba(255, 255, 255, 0.12)',
                              boxShadow: isCubeFaceDetected ? `0 0 12px ${colorHex}15` : 'none'
                            }}
                            className={`w-9 h-9 rounded-full border border-dashed flex items-center justify-center transition-all duration-300 ${
                              cooldownCountdown > 0 
                                ? 'border-emerald-400/60 scale-105 bg-emerald-500/5' 
                                : isCubeFaceDetected && stabilityProgress > 70 
                                ? 'scale-110 bg-slate-900/30' 
                                : 'bg-transparent'
                            }`}
                          >
                            {/* Inner active solid color anchor point indicator */}
                            <div
                              style={{ 
                                backgroundColor: colorHex,
                                boxShadow: isCubeFaceDetected ? `0 0 10px ${colorHex}` : 'none' 
                              }}
                              className={`w-3.5 h-3.5 rounded-full border border-black/40 transition-all duration-300 ${
                                cooldownCountdown > 0
                                  ? 'bg-white scale-125 animate-ping'
                                  : isCubeFaceDetected
                                  ? 'scale-100 hover:scale-115'
                                  : 'scale-75 opacity-25 animate-pulse'
                              }`}
                            />
                            
                            {/* Micro secondary target ring for precise styling details */}
                            <div className={`absolute w-11 h-11 rounded-full border border-white/5 transition-opacity duration-305 ${isCubeFaceDetected ? 'opacity-80' : 'opacity-0'}`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
 
                  {/* Cooldown lock view screen helper with bypass skip button */}
                  {cooldownCountdown > 0 && (
                    <div className="absolute inset-x-0 bottom-4 mx-auto w-[90%] flex flex-col items-center justify-center bg-[#090b11]/95 border border-emerald-500/30 backdrop-blur-md rounded-xl text-center py-3 px-4 z-30 select-none shadow-xl">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center text-[10px] font-bold border border-emerald-400/20">
                          ✓
                        </div>
                        <span className="text-xs font-bold text-slate-200">
                          Đã lưu Mặt {FACE_LABELS[activeFace]}!
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-400 mt-0.5 block font-mono">Đóng băng trong {cooldownCountdown}s</span>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          skipCooldown();
                        }}
                        className="mt-2 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-md text-[9px] uppercase tracking-wider shadow-md hover:scale-102 active:scale-95 transition pointer-events-auto cursor-pointer"
                      >
                        Tiếp tục ngay
                      </button>
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

          {/* Real-time hold stability progress loader */}
          {isCubeFaceDetected && (
            <div className="w-full max-w-[420px] mt-2 px-3">
              <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping shrink-0" />
                  Giữ khối ổn định để quét tự động...
                </span>
                <span className="font-mono font-black text-cyan-400">{stabilityProgress}%</span>
              </div>
              <div className="w-full bg-neutral-900/80 h-1 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 transition-all duration-100 rounded-full"
                  style={{ width: `${stabilityProgress}%` }}
                />
              </div>
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
              <span>{isCubeFaceDetected ? 'Chụp Mặt Hiện Tại' : 'Chưa Nhận Diện Được...'}</span>
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

            {/* Chi tiết phân bổ màu sắc - Tinh chỉnh siêu gọn gàng */}
            <div className="space-y-1 bg-black/20 p-2 rounded-lg border border-white/5">
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
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
                    <div key={col} className="flex items-center gap-1 text-[11px] font-medium">
                      <span 
                        className="w-2.5 h-2.5 rounded-full border border-black/45 block shrink-0"
                        style={{ backgroundColor: COLORS[col] }}
                      />
                      <span className="text-neutral-400 text-[10px]">{COLOR_NAMES_VI[col]}:</span>
                      <span className={`font-mono font-extrabold ${
                        isCorrect ? 'text-emerald-400' : count > 9 ? 'text-rose-400' : 'text-amber-400'
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
                  <span>Hãy quét đủ 6 mặt để đối soát màu ({scannedFacesInSession.size}/6).</span>
                ) : !Object.values(colorCounts).every(c => c === 9) ? (
                  <span>
                    <strong>Thiếu hoặc thừa màu:</strong> Khối Rubik phải có đúng 9 ô cho mỗi màu. Vui lòng quét lại các mặt bị nhận diện lệch.
                  </span>
                ) : (
                  <span><strong>Khối hợp lệ:</strong> Các màu đã chuẩn chỉ! Khối Rubik đã sẵn sàng để giải.</span>
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
                    <span className={`text-[10px] sm:text-xs font-black block truncate transition-all flex items-center gap-1.5 ${isActive ? 'text-blue-400' : 'text-slate-200'}`}>
                      <span 
                        className="w-2.5 h-2.5 rounded-full border border-black/40 block shrink-0"
                        style={{ backgroundColor: COLORS[STANDARD_FACE_CENTERS[face]] }}
                      />
                      <span>{COMPACT_FACE_LABELS[face]}</span>
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


        </div>

        {/* Action console bottom footer validation & trigger apply solver */}
        <div className="pt-2 border-t border-white/5 space-y-1.5 bg-[#090b11]">
          
          {/* Quick utility controllers for resetting */}
          <div className="mt-0.5 shrink-0 pb-1">
            <button
              onClick={handleClearAllScans}
              className="w-full px-2.5 py-2 bg-neutral-900 hover:bg-rose-950/20 border border-red-500/15 rounded-lg text-red-400 hover:text-red-300 transition cursor-pointer flex items-center justify-center gap-1.5 text-xs font-black active:scale-95"
              title="Xóa trống toàn bộ tiến trình và vẽ lại từ đầu"
            >
              <X size={12} />
              <span>Xoá Tiến Trình Đã Quét</span>
            </button>
          </div>

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
