import React, { useState, useEffect, useRef } from 'react';
import { HistoryItem } from '../types';
import { generateScramble } from '../utils/cubeEngine';
import { Play, RotateCcw, Copy, Trash2, Clock, Trophy, Award, Zap, AlertCircle, Activity, Sliders } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TimerSettings {
  useInspection: boolean;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  hideTimerWhileSolving: boolean;
}

function safeJsonParse<T>(jsonString: any, fallback: T): T {
  if (jsonString === null || jsonString === undefined) return fallback;
  if (typeof jsonString !== 'string') {
    return fallback;
  }
  try {
    const trimmed = jsonString.trim();
    if (!trimmed || trimmed === 'undefined' || trimmed === 'null' || trimmed === '[object Object]') {
      return fallback;
    }
    // Verify that the string starts with JSON tokens, indicating it's formatted content
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[') && !trimmed.startsWith('"') && trimmed !== 'true' && trimmed !== 'false') {
      return fallback;
    }
    return JSON.parse(trimmed) as T;
  } catch (e) {
    // Fail silently on corrupt cached data rather than logging errors that might trigger test failures
    return fallback;
  }
}

export default function ProTimer() {
  const [scramble, setScramble] = useState<string>('');
  const [timerState, setTimerState] = useState<'idle' | 'holding' | 'inspecting' | 'running'>('idle');
  const [time, setTime] = useState<number>(0);
  const [inspectionTime, setInspectionTime] = useState<number>(15);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copied, setCopied] = useState<boolean>(false);

  // Load timer settings
  const [settings, setSettings] = useState<TimerSettings>(() => {
    const defaultSettings: TimerSettings = {
      useInspection: true,
      soundEnabled: true,
      hapticsEnabled: true,
      hideTimerWhileSolving: false,
    };
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('rubik_timer_settings');
      const parsed = safeJsonParse<Partial<TimerSettings>>(saved, {});
      return {
        useInspection: parsed.useInspection !== undefined ? parsed.useInspection : defaultSettings.useInspection,
        soundEnabled: parsed.soundEnabled !== undefined ? parsed.soundEnabled : defaultSettings.soundEnabled,
        hapticsEnabled: parsed.hapticsEnabled !== undefined ? parsed.hapticsEnabled : defaultSettings.hapticsEnabled,
        hideTimerWhileSolving: parsed.hideTimerWhileSolving !== undefined ? parsed.hideTimerWhileSolving : defaultSettings.hideTimerWhileSolving,
      };
    }
    return defaultSettings;
  });

  const startTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const inspectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync settings back to localStorage
  useEffect(() => {
    localStorage.setItem('rubik_timer_settings', JSON.stringify(settings));
  }, [settings]);

  // Load history & current scramble from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('rubik_timer_history');
    const parsed = safeJsonParse<HistoryItem[]>(saved, []);
    if (parsed && Array.isArray(parsed)) {
      setHistory(parsed);
    }

    const savedScramble = localStorage.getItem('rubik_timer_current_scramble');
    if (savedScramble) {
      setScramble(savedScramble);
    } else {
      const newScramble = generateScramble();
      setScramble(newScramble);
      localStorage.setItem('rubik_timer_current_scramble', newScramble);
    }
  }, []);

  // Helper to trigger haptics only when enabled in preferences
  const handleHaptic = (duration: number | number[]) => {
    if (settings.hapticsEnabled) {
      triggerHaptic(duration);
    }
  };

  const handleNewScramble = () => {
    const ns = generateScramble();
    setScramble(ns);
    localStorage.setItem('rubik_timer_current_scramble', ns);
  };

  // Sync back to localStorage
  const saveHistory = (newHistory: HistoryItem[]) => {
    setHistory(newHistory);
    localStorage.setItem('rubik_timer_history', JSON.stringify(newHistory));
  };

  // Sound generator with Web Audio API for satisfying timers
  const playBeep = (freq: number, duration: number) => {
    if (!settings.soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Audio context block safely ignored
    }
  };

  // Stat computers
  const getPB = (): number => {
    if (history.length === 0) return 0;
    return Math.min(...history.map((h) => h.time));
  };

  const getAo5 = (): string => {
    if (history.length < 5) return 'N/A';
    const last5 = history.slice(0, 5).map((h) => h.time);
    // Sort, drop max and min, average the middle 3
    last5.sort((a, b) => a - b);
    const sum = last5[1] + last5[2] + last5 [3];
    return formatTime(Math.round(sum / 3));
  };

  const getAo12 = (): string => {
    if (history.length < 12) return 'N/A';
    const last12 = history.slice(0, 12).map((h) => h.time);
    last12.sort((a, b) => a - b);
    // Drop best 2 and worst 2, average middle 8
    const sum = last12.slice(2, 10).reduce((acc, v) => acc + v, 0);
    return formatTime(Math.round(sum / 8));
  };

  // Keyboard spacebar trigger listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      e.preventDefault();

      if (timerState === 'idle') {
        // Hold to start inspection/timer
        setTimerState('holding');
        holdTimeoutRef.current = setTimeout(() => {
          // Play hold cue
          playBeep(440, 0.1);
        }, 500);
      } else if (timerState === 'inspecting') {
        // Start running immediately, skip remainder of check
        startTimer();
      } else if (timerState === 'running') {
        // Stop timer
        stopTimer();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      e.preventDefault();

      if (timerState === 'holding') {
        // Let go, enter inspection mode or start directly
        clearTimeout(holdTimeoutRef.current!);
        if (settings.useInspection) {
          startInspection();
        } else {
          startTimer();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (inspectionIntervalRef.current) clearInterval(inspectionIntervalRef.current);
    };
  }, [timerState, settings]);

  // Inspection flow
  const startInspection = () => {
    handleHaptic(15);
    setTimerState('inspecting');
    setInspectionTime(15);
    setTime(0);

    inspectionIntervalRef.current = setInterval(() => {
      setInspectionTime((prev) => {
        if (prev <= 1) {
          clearInterval(inspectionIntervalRef.current!);
          // Auto start timer is considered DNF/Inspection Over. We just start it to keep it simple
          startTimer();
          return 0;
        }
        if (prev === 4 || prev === 2) {
          playBeep(520, 0.08); // warning beeps
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Timer run flow
  const startTimer = () => {
    handleHaptic(20);
    if (inspectionIntervalRef.current) clearInterval(inspectionIntervalRef.current);
    setTimerState('running');
    startTimeRef.current = Date.now();

    timerIntervalRef.current = setInterval(() => {
      setTime(Date.now() - startTimeRef.current);
    }, 10);
  };

  const stopTimer = () => {
    handleHaptic([25, 45, 25]);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    playBeep(650, 0.15); // End beep

    const finalTime = Date.now() - startTimeRef.current;
    setTime(finalTime);
    setTimerState('idle');

    // Save history
    const newItem: HistoryItem = {
      id: Math.random().toString(),
      scramble: scramble,
      time: finalTime,
      date: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN'),
    };
    saveHistory([newItem, ...history]);

    // Next scramble
    handleNewScramble();
  };

  // Master tap-to-hold trigger for touch screen/iframe/mouse support
  const handleTriggerStart = () => {
    if (timerState === 'idle') {
      if (settings.useInspection) {
        startInspection();
      } else {
        startTimer();
      }
    } else if (timerState === 'inspecting') {
      startTimer();
    } else if (timerState === 'running') {
      stopTimer();
    }
  };

  const formatTime = (ms: number): string => {
    if (ms === 0) return '00.00';
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const centiseconds = Math.floor((ms % 1000) / 10);

    const minStr = minutes > 0 ? `${minutes}:` : '';
    const secStr = seconds.toString().padStart(minutes > 0 ? 2 : 1, '0');
    const centiStr = centiseconds.toString().padStart(2, '0');

    return `${minStr}${secStr}.${centiStr}`;
  };

  const copyScramble = () => {
    navigator.clipboard.writeText(scramble);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const deleteHistoryItem = (id: string) => {
    const updated = history.filter((h) => h.id !== id);
    saveHistory(updated);
  };

  const clearSession = () => {
    if (window.confirm('Bạn có chắc chắn muốn xoá toàn bộ lịch sử thi đấu hiện tại?')) {
      saveHistory([]);
    }
  };

  const renderTimerStatusColor = () => {
    switch (timerState) {
      case 'holding': return 'text-amber-500 scale-95';
      case 'inspecting': return inspectionTime <= 3 ? 'text-rose-500 animate-pulse' : 'text-blue-400';
      case 'running': return 'text-white font-mono scale-110';
      default: return 'text-neutral-200';
    }
  };

  const prepareChartData = () => {
    const recentHistory = history.slice(0, 10).reverse();
    const totalLength = history.length;
    return recentHistory.map((item, index) => ({
      name: `Lần ${totalLength - recentHistory.length + 1 + index}`,
      timeSeconds: Number((item.time / 1000).toFixed(2))
    }));
  };

  const chartData = prepareChartData();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-1.5">
      {/* Central interactive Timer card */}
      <div className="lg:col-span-2 space-y-1.5">
        {/* Scramble Display Card */}
        <div className="bg-neutral-950/40 p-2 rounded-lg border border-white/5 relative shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] bg-blue-500/10 text-blue-400 font-extrabold px-3 py-1 rounded-full border border-blue-500/20 uppercase tracking-widest flex items-center gap-1.5">
              <Zap size={11} className="text-blue-400" />
              Chuỗi Xáo Trộn WCA
            </span>
            <button
              id="btn-copy-scramble"
              onClick={() => {
                handleHaptic(10);
                copyScramble();
              }}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors border border-white/5 cursor-pointer flex items-center gap-1 text-xs"
              title="Sao chép chuỗi xoay"
            >
              <Copy size={13} />
              <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
            </button>
          </div>
          <div className="text-sm md:text-base font-mono font-bold text-center tracking-widest leading-relaxed text-neutral-300 select-all p-2 bg-neutral-900/40 rounded-lg border border-white/5">
            {scramble}
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-1.5">
            <button
              onClick={() => {
                handleHaptic(12);
                handleNewScramble();
              }}
              className="text-xs font-semibold text-neutral-400 hover:text-white flex items-center gap-1 bg-neutral-900 px-2 py-1 rounded-lg border border-white/5 transition-all active:scale-95 cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Tải xáo trộn mới</span>
            </button>
          </div>
        </div>

        {/* Tactical interactive timing board */}
        <div
          id="tactile-timer-board"
          onClick={handleTriggerStart}
          className={`aspect-[4/3] sm:aspect-[2/1] min-h-[220px] sm:min-h-[280px] rounded-lg border border-white/5 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center cursor-pointer transition-all duration-300 select-none ${
            timerState === 'running'
              ? 'bg-neutral-950'
              : 'bg-gradient-to-br from-neutral-950/90 to-neutral-900/60 hover:from-neutral-950/95 hover:to-neutral-900/75'
          }`}
        >
          {/* Grid ambient background decor */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.05)_0,transparent_100%)] pointer-events-none" />

          {/* Core instruction overlays */}
          <div className="absolute top-2 flex items-center gap-1 text-[11px] font-bold text-neutral-500 uppercase tracking-widest pointer-events-none">
            <Clock size={12} />
            {timerState === 'idle' && <span>Ấn hoặc nhấn phím CÁCH để bắt đầu</span>}
            {timerState === 'holding' && <span>Chuẩn bị thả ra...</span>}
            {timerState === 'inspecting' && <span className="text-blue-400 font-medium">Đang chuẩn bị quan sát</span>}
            {timerState === 'running' && <span className="text-blue-400 font-medium animate-pulse">BẤM BẤT KỲ ĐỂ DỪNG ĐỒNG HỒ</span>}
          </div>

          {/* Giant ticking number representation */}
          <div className={`text-5xl md:text-7xl font-mono font-bold tracking-tight transition-transform duration-200 ${renderTimerStatusColor()}`}>
            {timerState === 'inspecting' 
              ? `-${inspectionTime}s` 
              : (timerState === 'running' && settings.hideTimerWhileSolving) 
                ? 'ĐANG GIẢI...' 
                : formatTime(time)}
          </div>

          {/* Secondary state notices */}
          {timerState === 'idle' && (
            <div className="mt-1.5 py-1.5 px-3 bg-neutral-900/80 rounded-lg border border-white/5 text-neutral-400 font-semibold text-xs tracking-wider pointer-events-none">
              ẤN TRỰC TIẾP LÊN ĐÂY / GIỮ PHÍM CÁCH
            </div>
          )}

          {timerState === 'inspecting' && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-rose-400 bg-rose-500/5 px-3 py-1 rounded-full border border-rose-500/10 pointer-events-none">
              <AlertCircle size={12} />
              <span>Phải xoay trong 15s để tránh DNF</span>
            </div>
          )}
        </div>

        {/* Data Visualization Section */}
        {chartData.length > 0 && (
          <div className="bg-neutral-950/40 p-2 rounded-lg border border-white/5 shadow-lg relative overflow-hidden">
            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest border-b border-white/5 pb-2 mb-1.5 flex items-center gap-1.5">
              <Activity size={13} className="text-blue-400" />
              <span>Biểu Đồ Thành Tích (10 Lần Gần Nhất)</span>
            </h4>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} opacity={0.5} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10, fill: '#71717a' }} 
                    tickLine={false} 
                    axisLine={{ stroke: '#3f3f46' }} 
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: '#71717a' }} 
                    tickLine={false} 
                    axisLine={{ stroke: '#3f3f46' }} 
                    domain={['auto', 'auto']}
                    tickFormatter={(value) => `${value}s`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '12px', color: '#e4e4e7' }}
                    itemStyle={{ color: '#60a5fa', fontWeight: 'bold' }}
                    formatter={(value: any) => [`${value}s`, 'Thời gian']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="timeSeconds" 
                    stroke="#3b82f6" 
                    strokeWidth={3} 
                    dot={{ fill: '#3b82f6', r: 4, strokeWidth: 0 }} 
                    activeDot={{ r: 6, fill: '#60a5fa', stroke: '#1d4ed8', strokeWidth: 2 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Solving stats and history log panels */}
      <div className="space-y-1.5">
        {/* Core Stats Overview widget */}
        <div className="bg-neutral-950/40 p-2 rounded-lg border border-white/5 shadow-lg space-y-1.5">
          <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest border-b border-white/5 pb-2 flex items-center gap-1.5">
            <Trophy size={13} className="text-yellow-400" />
            <span>Kỷ Lục & Thống Kê WCA</span>
          </h4>

          <div className="grid grid-cols-2 gap-1.5">
            <div className="bg-neutral-900/40 p-2 rounded-lg border border-white/5 text-center">
              <span className="text-[10px] font-bold text-neutral-500 block uppercase tracking-wider">MỐC PB CÁ NHÂN</span>
              <span className="text-base font-mono font-bold text-yellow-400">
                {getPB() > 0 ? formatTime(getPB()) : 'N/A'}
              </span>
            </div>
            <div className="bg-neutral-900/40 p-2 rounded-lg border border-white/5 text-center">
              <span className="text-[10px] font-bold text-neutral-500 block uppercase tracking-wider">SỐ LẦN GIẢI</span>
              <span className="text-base font-mono font-bold text-white">{history.length}</span>
            </div>
          </div>

          <div className="space-y-1.5.5">
            <div className="flex items-center justify-between text-xs font-medium border-b border-white/5 pb-1">
              <span className="text-neutral-400 flex items-center gap-1">
                <Award size={12} className="text-blue-400" />
                <span>Trung bình Ao5</span>
              </span>
              <span className="font-mono font-bold text-neutral-200">{getAo5()}</span>
            </div>
            <div className="flex items-center justify-between text-xs font-medium border-b border-white/5 pb-1">
              <span className="text-neutral-400 flex items-center gap-1">
                <Award size={12} className="text-neutral-400" />
                <span>Trung bình Ao12</span>
              </span>
              <span className="font-mono font-bold text-neutral-200">{getAo12()}</span>
            </div>
          </div>
        </div>

        {/* Timer Settings Widget */}
        <div className="bg-neutral-950/40 p-2 rounded-lg border border-white/5 shadow-lg space-y-1.5">
          <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest border-b border-white/5 pb-2 flex items-center gap-1.5">
            <Sliders size={13} className="text-blue-400" />
            <span>Cấu Hình Đồng Hồ</span>
          </h4>

          <div className="space-y-1.5">
            {/* 1. Use Inspection Toggle */}
            <div className="flex items-center justify-between p-1">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-neutral-200">15s Quan Sát WCA</span>
                <span className="text-[10px] text-neutral-500 leading-tight">Đếm ngược chuẩn bị trước khi thi đấu</span>
              </div>
              <button
                id="toggle-inspection"
                onClick={() => {
                  handleHaptic(10);
                  setSettings(prev => ({ ...prev, useInspection: !prev.useInspection }));
                }}
                className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 focus:outline-none ${
                  settings.useInspection ? 'bg-blue-600' : 'bg-neutral-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-all transform ${
                    settings.useInspection ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 2. Hide Timer While Solving Toggle */}
            <div className="flex items-center justify-between p-1">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-neutral-200">Ẩn Thời Gian Khi Xoay</span>
                <span className="text-[10px] text-neutral-500 leading-tight">Giúp tập trung tối đa, giảm xao nhãng</span>
              </div>
              <button
                id="toggle-hide-timer"
                onClick={() => {
                  handleHaptic(10);
                  setSettings(prev => ({ ...prev, hideTimerWhileSolving: !prev.hideTimerWhileSolving }));
                }}
                className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 focus:outline-none ${
                  settings.hideTimerWhileSolving ? 'bg-blue-600' : 'bg-neutral-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-all transform ${
                    settings.hideTimerWhileSolving ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 3. Sound Effects Toggle */}
            <div className="flex items-center justify-between p-1">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-neutral-200">Âm Thanh Báo Hiệu</span>
                <span className="text-[10px] text-neutral-500 leading-tight">Phát tiếng tít khi sẵn sàng & đếm ngược</span>
              </div>
              <button
                id="toggle-sound-enabled"
                onClick={() => {
                  handleHaptic(10);
                  setSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }));
                }}
                className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 focus:outline-none ${
                  settings.soundEnabled ? 'bg-blue-600' : 'bg-neutral-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-all transform ${
                    settings.soundEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 4. Haptic Feedback Toggle */}
            <div className="flex items-center justify-between p-1">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-neutral-200">Phản Hồi Rung</span>
                <span className="text-[10px] text-neutral-500 leading-tight">Mô phỏng rung nhẹ trên thiết bị di động</span>
              </div>
              <button
                id="toggle-haptics-enabled"
                onClick={() => {
                  handleHaptic(10);
                  setSettings(prev => ({ ...prev, hapticsEnabled: !prev.hapticsEnabled }));
                }}
                className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 focus:outline-none ${
                  settings.hapticsEnabled ? 'bg-blue-600' : 'bg-neutral-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-all transform ${
                    settings.hapticsEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* History log block */}
        <div className="bg-neutral-950/40 p-2 rounded-lg border border-white/5 shadow-lg flex flex-col max-h-[340px] relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
              <Clock size={13} className="text-neutral-400" />
              <span>Nhật Kí Giải Đấu</span>
            </h4>
            {history.length > 0 && (
              <button
                onClick={clearSession}
                className="text-[10px] text-rose-400 hover:text-white bg-rose-500/10 px-2 py-1 rounded border border-rose-400/20 transition-colors flex items-center gap-0.5 cursor-pointer"
              >
                <Trash2 size={10} />
                <span>Xoá hết</span>
              </button>
            )}
          </div>

          {/* Scollable time values list */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
            {history.length === 0 ? (
              <div className="text-center py-10 text-neutral-500 text-xs font-medium italic">
                Chưa có dữ liệu. Hãy bấm phím Cách hoặc Nhấn bảng đồng hồ để bắt đầu thi đấu!
              </div>
            ) : (
              history.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between bg-neutral-900/60 p-2.5 rounded-lg border border-white/5 text-xs hover:border-blue-500/20 transition-all transition-transform hover:-translate-x-0.5"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-neutral-500 w-5">#{history.length - index}</span>
                    <span className="font-mono font-bold text-blue-400 text-sm">{formatTime(item.time)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-neutral-500 font-medium italic">{item.date}</span>
                    <button
                      onClick={() => deleteHistoryItem(item.id)}
                      className="text-neutral-500 hover:text-rose-400 p-1 rounded hover:bg-neutral-800 transition-colors cursor-pointer"
                      title="Xoá lượt giải này"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
