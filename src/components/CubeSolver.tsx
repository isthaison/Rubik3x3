import React, { useState, useEffect, useRef } from 'react';
import { CubeState, CubeColor, FaceName, SolverStep } from '../types';
import { getSolvedState, applyMove, applyMoves, getSolutionSteps, COLORS, generateScramble, isSolved } from '../utils/cubeEngine';
import ThreeDCube from './ThreeDCube';
import { HelpCircle, RefreshCw, Sparkles, CheckCircle2, ChevronLeft, ChevronRight, Play, Eye, Sliders, Palette, Video, Pause, Maximize, X } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

// Utility helper to convert Rubik's moves to descriptive Vietnamese captions
const getMoveCaption = (move: string): string => {
  if (!move) return "Hoàn thành bước này! Hãy bấm 'Giải Bước Kế' để tiếp tục.";
  const base = move.charAt(0).toUpperCase();
  const isPrime = move.includes("'");
  const isDouble = move.includes("2");

  let faceName = "";
  let direction = "";

  switch (base) {
    case 'U':
      faceName = "Mặt TRÊN (U - Trắng)";
      direction = isPrime ? "ngược chiều kim đồng hồ (xoay sang bên phải)" : "xuôi chiều kim đồng hồ (xoay sang bên trái)";
      break;
    case 'D':
      faceName = "Mặt DƯỚI (D - Vàng)";
      direction = isPrime ? "ngược chiều kim đồng hồ (xoay sang bên trái)" : "xuôi chiều kim đồng hồ (xoay sang bên phải)";
      break;
    case 'F':
      faceName = "Mặt TRƯỚC (F - Lục)";
      direction = isPrime ? "ngược chiều kim đồng hồ (lên sang trái)" : "xuôi chiều kim đồng hồ (xuống sang phải)";
      break;
    case 'B':
      faceName = "Mặt SAU (B - Lam)";
      direction = isPrime ? "ngược chiều kim đồng hồ" : "xuôi chiều kim đồng hồ";
      break;
    case 'L':
      faceName = "Mặt TRÁI (L - Cam)";
      direction = isPrime ? "ngược chiều kim đồng hồ (xoay lên phía xa)" : "xuôi chiều kim đồng hồ (xoay xuống gần bạn)";
      break;
    case 'R':
      faceName = "Mặt PHẢI (R - Đỏ)";
      direction = isPrime ? "ngược chiều kim đồng hồ (xoay xuống gần bạn)" : "xuôi chiều kim đồng hồ (xoay lên phía xa)";
      break;
    default:
      return `Xoay mặt đại diện: ${move}`;
  }

  if (isDouble) {
    return `${faceName}: Xoay liền 2 lần (180 độ) về bất kỳ hướng nào`;
  }
  return `${faceName}: Xoay 90 độ ${direction}`;
};

export default function CubeSolver() {
  const [cubeState, setCubeState] = useState<CubeState>(getSolvedState());
  const [paintColor, setPaintColor] = useState<CubeColor>('white');
  const [interactiveMode, setInteractiveMode] = useState<'paint' | 'play'>('paint');

  // Solver states
  const [solution, setSolution] = useState<SolverStep[] | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [interactiveStepState, setInteractiveStepState] = useState<CubeState>(getSolvedState());

  // Interactive step-by-step submoves player
  const [submovePointer, setSubmovePointer] = useState<number>(0);

  // Auto playback simulation mechanics
  const [isPlayingAuto, setIsPlayingAuto] = useState<boolean>(false);
  const [autoPlaySpeed, setAutoPlaySpeed] = useState<number>(1200); // speed delay in ms
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  const visualizerCubeRef = useRef<any>(null);
  const fullScreenCubeRef = useRef<any>(null);
  const lastAutomatedMoveRef = useRef<string | null>(null);

  // Track recalculated banner state or status message to show the user
  const [recalculatedNotification, setRecalculatedNotification] = useState<string | null>(null);

  // Fade out notice automatically after 5.5 seconds
  useEffect(() => {
    if (recalculatedNotification) {
      const timer = setTimeout(() => {
        setRecalculatedNotification(null);
      }, 5500);
      return () => clearTimeout(timer);
    }
  }, [recalculatedNotification]);

  const executeNextMoveTargetingCubeRef = () => {
    if (!solution) return;
    const currentStep = solution[currentStepIndex];
    if (submovePointer < currentStep.moves.length) {
      triggerHaptic(12);
      const currentMove = currentStep.moves[submovePointer];
      
      lastAutomatedMoveRef.current = currentMove;

      const activeRef = isFullScreen ? fullScreenCubeRef.current : visualizerCubeRef.current;

      if (activeRef) {
        activeRef.performAnimatedMove(currentMove);
      } else {
        setInteractiveStepState((prev) => applyMove(prev, currentMove));
      }
      setSubmovePointer((p) => p + 1);
    }
  };

  const handleSolverInteractiveMove = (move: string) => {
    if (!solution) return;

    // Check if this move was triggered automatically/via tutorial buttons
    if (lastAutomatedMoveRef.current === move) {
      lastAutomatedMoveRef.current = null;
      setInteractiveStepState((prev) => applyMove(prev, move));
      return;
    }

    // Stop auto play simulation immediately if user manually turns the cube
    setIsPlayingAuto(false);

    // Calculate next state
    const nextState = applyMove(interactiveStepState, move);
    
    // Check if the cube is fully solved after this move
    if (isSolved(nextState)) {
      triggerHaptic([30, 30, 30, 50, 200]); // Success pattern
      setCubeState(cloneState(nextState));
      setInteractiveStepState(cloneState(nextState));
      const solvedSteps = getSolutionSteps(nextState);
      setSolution(solvedSteps);
      setCurrentStepIndex(0);
      setSubmovePointer(0);
      setRecalculatedNotification("Tuyệt vời! Bạn đã hoàn thành giải khối Rubik thành công!");
      return;
    }

    // Check if this manual move aligns with the expected solution move at current pointer
    const currentStep = solution[currentStepIndex];
    if (currentStep) {
      const expectedMove = currentStep.moves[submovePointer];
      if (submovePointer < currentStep.moves.length && move === expectedMove) {
        // Correct manual rotation! Keep current path & advance pointer
        triggerHaptic(15);
        setInteractiveStepState(nextState);
        setSubmovePointer((p) => p + 1);
      } else {
        // Incorrect manual rotation (xoay sai)!
        triggerHaptic([25, 45, 25]);

        try {
          const stepsList = getSolutionSteps(nextState);
          
          setCubeState(cloneState(nextState));
          setInteractiveStepState(cloneState(nextState));
          setSolution(stepsList);
          setCurrentStepIndex(0);
          setSubmovePointer(0);

          if (stepsList[0] && stepsList[0].title === 'Lỗi Cấu Trúc Khối') {
            setRecalculatedNotification(
              `Bạn xoay nhầm [ ${move} ]. Trạng thái Rubik không hợp lệ để giải! Vui lòng xoay lại hoặc kiểm tra mặt nháp.`
            );
          } else {
            setRecalculatedNotification(
              `Bạn vừa xoay [ ${move} ] (khác với hướng dẫn). Hệ thống đã tự động tính toán lại hướng giải mới nhất từ trạng thái này!`
            );
          }
        } catch (err) {
          console.error("Failed to solve from this invalid state", err);
          setInteractiveStepState(nextState);
          setRecalculatedNotification(
            `Bạn vừa xoay [ ${move} ] tạo cấu trúc mới. Không thể đồng bộ thuật giải, hãy thử xoay lại.`
          );
        }
      }
    }
  };

  // Autoplay simulation side-effect loop
  useEffect(() => {
    let timerID: NodeJS.Timeout | null = null;
    if (isPlayingAuto && solution) {
      const currentStep = solution[currentStepIndex];
      if (submovePointer < currentStep.moves.length) {
        timerID = setTimeout(() => {
          executeNextMoveTargetingCubeRef();
        }, autoPlaySpeed);
      } else {
        // Halt at end of steps
        setIsPlayingAuto(false);
      }
    }
    return () => {
      if (timerID) clearTimeout(timerID);
    };
  }, [isPlayingAuto, submovePointer, currentStepIndex, solution, autoPlaySpeed, isFullScreen]);

  // Unfolded net coordinates mapping for manual palette painter
  // Laid out as a standard cross net:
  //      [U]
  //   [L][F][R][B]
  //      [D]
  const renderFlatFacePalette = (face: FaceName) => {
    return (
      <div className="flex flex-col items-center gap-1 sm:gap-1.5 p-2 sm:p-3.5 bg-neutral-950/80 rounded-xl sm:rounded-2xl border border-white/5 shadow-inner w-full max-w-[124px] sm:max-w-none">
        <span className="text-[9px] sm:text-[10px] font-bold text-neutral-400 block uppercase tracking-wider text-center">
          {face} ({face === 'U' ? 'Trên' : face === 'D' ? 'Dưới' : face === 'F' ? 'Trước' : face === 'B' ? 'Sau' : face === 'L' ? 'Trái' : 'Phải'})
        </span>
        <div className="grid grid-cols-3 gap-0.5 sm:gap-1 w-20 sm:w-24 aspect-square">
          {cubeState[face].map((color, idx) => {
            const hexColor = COLORS[color];
            return (
              <button
                key={idx}
                id={`paint-${face}-${idx}`}
                onClick={() => handlePaintSticker(face, idx)}
                style={{ backgroundColor: hexColor }}
                className="w-full aspect-square rounded-sm border border-neutral-950/50 hover:opacity-80 active:scale-90 transition-transform cursor-pointer"
                title="Bấm để tô màu"
              />
            );
          })}
        </div>
      </div>
    );
  };

  const handlePaintSticker = (face: FaceName, index: number) => {
    // Centers of standard Rubik (index 4) should remain fixed representing standard core,
    // to preserve mechanical solvability orientation
    if (index === 4) {
      triggerHaptic([50, 50, 50]);
      alert('Không nên sơn đè lên ô tâm giữa để giữ đúng định hướng của khối Rubik!');
      return;
    }

    triggerHaptic(10);
    setCubeState((prev) => {
      const nextFaceState = [...prev[face]];
      nextFaceState[index] = paintColor;
      return {
        ...prev,
        [face]: nextFaceState,
      };
    });
  };

  const handleRandomScrambleManualInput = () => {
    triggerHaptic(20);
    let result = getSolvedState();
    const scrambleStr = generateScramble();
    const scrambleMoves = scrambleStr.split(' ').filter((v) => v.trim());
    result = applyMoves(result, scrambleMoves);
    setCubeState(result);
    setSolution(null);
  };

  // Launch solver engine
  const solveCubeState = () => {
    triggerHaptic(25);
    const stepsList = getSolutionSteps(cubeState);
    setSolution(stepsList);
    setCurrentStepIndex(0);
    setInteractiveStepState(cloneState(cubeState));
    setSubmovePointer(0);
  };

  const cloneState = (state: CubeState): CubeState => {
    if (!state) return getSolvedState();
    return {
      U: [...(state.U || [])],
      D: [...(state.D || [])],
      F: [...(state.F || [])],
      B: [...(state.B || [])],
      L: [...(state.L || [])],
      R: [...(state.R || [])],
    };
  };

  const resetCurrentStepToBeginning = () => {
    if (!solution) return;
    setSubmovePointer(0);
    let base = cloneState(cubeState);
    for (let i = 0; i < currentStepIndex; i++) {
      base = applyMoves(base, solution[i].moves);
    }
    setInteractiveStepState(base);
    setIsPlayingAuto(false);
  };

  const handleSubmoveNext = () => {
    if (!solution) return;
    const currentStep = solution[currentStepIndex];
    if (submovePointer < currentStep.moves.length) {
      executeNextMoveTargetingCubeRef();
    }
  };

  const handleSubmovePrev = () => {
    if (!solution || submovePointer <= 0) return;
    triggerHaptic(12);
    const currentStep = solution[currentStepIndex];
    // To reverse a move, we reset state to the start of the step and replay moves up to pointer-1
    const resetState = applyPreviousAccumulatedSteps();
    let replayed = cloneState(resetState);
    for (let i = 0; i < submovePointer - 1; i++) {
      replayed = applyMove(replayed, currentStep.moves[i]);
    }
    setInteractiveStepState(replayed);
    setSubmovePointer((p) => p - 1);
  };

  const applyPreviousAccumulatedSteps = (): CubeState => {
    let base = cloneState(cubeState);
    if (!solution) return base;
    // Accumulate all moves from step 0 to step currentStepIndex - 1
    for (let i = 0; i < currentStepIndex; i++) {
      base = applyMoves(base, solution[i].moves);
    }
    return base;
  };

  const handleStepIndexChange = (index: number) => {
    if (!solution) return;
    triggerHaptic(15);
    setIsPlayingAuto(false);
    setCurrentStepIndex(index);
    setSubmovePointer(0);

    // Set interactive state to the beginning of this stage
    let base = cloneState(cubeState);
    for (let i = 0; i < index; i++) {
      base = applyMoves(base, solution[i].moves);
    }
    setInteractiveStepState(base);
  };

  const handleResetSolver = () => {
    triggerHaptic(20);
    setSolution(null);
    setCubeState(getSolvedState());
  };

  return (
    <div className="space-y-6">
      {/* Top Header Selector tabs */}
      {!solution ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Input workspace left: manual palette */}
            <div className="lg:col-span-8 bg-neutral-950/30 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/5 shadow-xl space-y-6">
              {/* Manual paint brush panel */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Palette className="text-blue-400" size={20} />
                    <span>Chọn màu & Sơn lên lưới phẳng</span>
                  </h3>
                    <p className="text-xs text-neutral-400 mt-1">
                      Bấm vào các khay cọ màu phía dưới, sau đó click chọn các ô vuông tương ứng trên sơ đồ dẹt 2D để khớp hoàn toàn với khối Rubik thật ngoài đời của bạn.
                    </p>
                  </div>

                  {/* Paint Brush Selector */}
                  <div className="bg-neutral-900/60 p-4 rounded-2xl border border-white/5">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-2.5">
                      Chọn Màu Cọ (Brush Color):
                    </span>
                    <div className="flex flex-wrap items-center gap-3.5">
                      {(Object.keys(COLORS) as CubeColor[]).map((col) => (
                        <button
                          key={col}
                          id={`brush-${col}`}
                          onClick={() => setPaintColor(col)}
                          style={{ backgroundColor: COLORS[col] }}
                          className={`w-10 h-10 rounded-xl relative transition-transform cursor-pointer hover:scale-105 active:scale-90 border-2 ${
                            paintColor === col ? 'border-blue-500 scale-110 shadow-lg shadow-blue-500/15' : 'border-neutral-950/45'
                          }`}
                          title={`Tô màu ${col}`}
                        >
                          {paintColor === col && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl">
                              <span className="text-xs text-white font-bold font-mono">✓</span>
                            </div>
                          )}
                        </button>
                      ))}
                      <div className="text-xs font-semibold text-neutral-400 ml-2">
                        Đang tô: <span className="text-blue-400 font-bold uppercase">{paintColor}</span>
                      </div>
                    </div>
                  </div>

                  {/* 2D Flat Unfolded Net Layout */}
                  <div className="space-y-4">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block text-center">
                      Bản đồ dẹt 2D Rubik Net layout (Phần móng vẽ màu rộng rãi)
                    </span>
                    <div className="flex flex-col items-center gap-3">
                      {/* Top Row: U */}
                      <div className="flex justify-center">
                        {renderFlatFacePalette('U')}
                      </div>

                      {/* Middle Row: L, F, R, B */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 w-full justify-items-center">
                        {renderFlatFacePalette('L')}
                        {renderFlatFacePalette('F')}
                        {renderFlatFacePalette('R')}
                        {renderFlatFacePalette('B')}
                      </div>

                      {/* Bottom Row: D */}
                      <div className="flex justify-center">
                        {renderFlatFacePalette('D')}
                      </div>
                    </div>
                  </div>
                </div>

              {/* Launcher bar buttons */}
              <div className="flex flex-col md:flex-row items-center gap-3.5 pt-4 border-t border-white/5 justify-between">
                <button
                  id="btn-scramble-paint"
                  onClick={handleRandomScrambleManualInput}
                  className="w-full md:w-auto px-4 py-2 text-xs font-bold text-neutral-300 hover:text-white bg-neutral-900 rounded-xl border border-white/10 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw size={13} />
                  <span>Xáo trộn ngẫu nhiên</span>
                </button>

                <button
                  id="btn-solve-now"
                  onClick={solveCubeState}
                  className="w-full md:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl text-xs uppercase tracking-widest shadow-xl shadow-blue-600/10 transition-all hover:scale-102 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={14} />
                  <span>Giải mã khối Rubik ngay</span>
                </button>
              </div>
            </div>

            {/* Layout right display: shows current 3D cube state */}
            <div className="lg:col-span-4 bg-neutral-950/30 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-white/5 text-center flex flex-col items-center">
              <span className="text-xs font-extrabold text-neutral-400 block uppercase tracking-wide mb-3">Mô Hình 3D Hiện Tại</span>
              
              {/* Toggle Mode Segmented Control */}
              <div className="flex bg-neutral-900/80 p-1 rounded-xl border border-white/5 mb-4 shadow-inner">
                <button
                  onClick={() => {
                    triggerHaptic(8);
                    setInteractiveMode('paint');
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    interactiveMode === 'paint'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Palette size={12} />
                  <span>Sơn tô màu</span>
                </button>
                <button
                  onClick={() => {
                    triggerHaptic(8);
                    setInteractiveMode('play');
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    interactiveMode === 'play'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Play size={12} />
                  <span>Xoay tập thử</span>
                </button>
              </div>

              <ThreeDCube 
                state={cubeState} 
                interactive={true} 
                onStickerClick={interactiveMode === 'paint' ? handlePaintSticker : undefined}
                onMove={interactiveMode === 'play' ? (move) => setCubeState((prev) => applyMove(prev, move)) : undefined}
              />
              <button
                onClick={() => setCubeState(getSolvedState())}
                className="mt-4 text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 bg-rose-500/5 px-3 py-1.5 rounded-lg border border-rose-500/10 transition-all cursor-pointer"
              >
                <span>Xoá khôi phục gốc</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        // ACTIVE SOLVER STEP LAYOUT SCREEN
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <button
              onClick={handleResetSolver}
              className="px-4 py-1.5 bg-neutral-800 text-zinc-300 hover:text-white rounded-xl border border-white/10 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
            >
              <ChevronLeft size={14} />
              <span>Nhập lại trạng thái mới</span>
            </button>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">LỘ TRÌNH TỐI ƯU</span>
              <span className="text-xs font-semibold text-blue-400">7 bước Layer-by-layer CFOP dễ hiểu</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Active Stage tutorial text info */}
            <div className="lg:col-span-7 bg-neutral-950/40 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/5 shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <span className="text-xs font-bold text-neutral-400 bg-neutral-900 border border-white/5 px-3.5 py-1 rounded-full uppercase tracking-widest">
                  KOCIEMBA SOLVER
                </span>
                <span className="text-xs font-mono text-neutral-500">{solution[currentStepIndex].moves.length} Bước</span>
              </div>

              {/* Recalculated notification banner */}
              {recalculatedNotification && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-300 font-medium flex items-start gap-2.5 transition-all duration-300">
                  <Sparkles size={14} className="text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 block mb-0.5">Xoay khác hướng dẫn - Cập nhật tự động:</span>
                    <span>{recalculatedNotification}</span>
                  </div>
                </div>
              )}

              {/* Core Step values */}
              <div className="space-y-3.5">
                <h3 className="text-lg font-bold text-white border-l-4 border-blue-500 pl-3">
                  {solution[currentStepIndex].title}
                </h3>
                <p className="text-xs font-semibold text-zinc-400 italic">
                  {solution[currentStepIndex].subtitle}
                </p>
                <div className="p-4 bg-neutral-900/60 border border-white/5 rounded-2xl text-neutral-300 text-sm leading-relaxed">
                  {solution[currentStepIndex].description}
                </div>
              </div>

              {/* Step algorithms and action player */}
              {solution[currentStepIndex].moves.length > 0 ? (
                <div className="bg-blue-950/20 p-5 rounded-2xl border border-blue-500/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">Công thức thao tác:</span>
                    <span className="text-[10px] font-mono text-zinc-500">Mảnh đang thực thi {submovePointer}/{solution[currentStepIndex].moves.length}</span>
                  </div>

                  {/* Connected moves road-map chain like: R -> L -> U' */}
                  <div className="bg-[#0b0f17]/80 p-3.5 rounded-xl border border-white/5">
                    <span className="text-[10px] text-zinc-500 uppercase font-black tracking-wider block mb-2">Lộ trình giải thuật:</span>
                    <div className="flex flex-wrap items-center gap-1.5 font-mono">
                      {solution[currentStepIndex].moves.map((mv, idx) => (
                        <React.Fragment key={idx}>
                          <span
                            className={`px-2.5 py-1 font-mono font-extrabold text-xs sm:text-sm rounded-lg border transition-all ${
                              idx === submovePointer
                                ? 'bg-blue-600 text-white border-blue-400 scale-110 shadow-lg shadow-blue-500/30'
                                : idx < submovePointer
                                ? 'bg-neutral-900 text-neutral-500 border-neutral-850 line-through'
                                : 'bg-neutral-950 text-neutral-300 border-white/5'
                            }`}
                          >
                            {mv}
                          </span>
                          {idx < solution[currentStepIndex].moves.length - 1 && (
                            <span className={`text-[11px] font-bold ${idx < submovePointer ? 'text-zinc-700' : 'text-blue-500/60'}`}>
                              ➔
                            </span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  {/* REAL-TIME SOLUTION CAPTIONS SUBTITLES DISPLAY */}
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-300 font-medium flex items-start gap-2.5">
                    <Sparkles size={14} className="text-blue-400 shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400 block mb-0.5">Hướng dẫn xoay real-time:</span>
                      <span>
                        {submovePointer < solution[currentStepIndex].moves.length 
                          ? `Ở lượt này, xoay ký tự [ ${solution[currentStepIndex].moves[submovePointer]} ]: ${getMoveCaption(solution[currentStepIndex].moves[submovePointer])}`
                          : "Chúc mừng! Bạn đã hoàn thành tất cả các lượt xoay của bước giải thuật hiện tại."}
                      </span>
                    </div>
                  </div>

                  {/* Interactive Submove controller & Autoplay Simulation Dashboard */}
                  <div className="space-y-3.5 pt-3.5 border-t border-blue-500/10">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            triggerHaptic(15);
                            if (submovePointer >= solution[currentStepIndex].moves.length) {
                              // Auto reset to begin first
                              resetCurrentStepToBeginning();
                            }
                            setIsPlayingAuto(!isPlayingAuto);
                          }}
                          className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            isPlayingAuto
                              ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-md animate-pulse'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                          }`}
                        >
                          {isPlayingAuto ? <Pause size={13} /> : <Play size={13} />}
                          <span>{isPlayingAuto ? 'Tạm Dừng' : 'Mô Phỏng 3D Tự Động'}</span>
                        </button>

                        <button
                          onClick={() => {
                            triggerHaptic(10);
                            resetCurrentStepToBeginning();
                          }}
                          className="py-1.5 px-3 bg-neutral-900 border border-white/5 hover:border-white/10 text-xs font-semibold text-neutral-400 rounded-xl transition"
                        >
                          Reset bước xoay
                        </button>
                      </div>

                      {/* Speed selector controls */}
                      <div className="flex items-center gap-1 bg-neutral-900/80 p-0.5 rounded-lg border border-white/5 self-end">
                        <button
                          onClick={() => { triggerHaptic(8); setAutoPlaySpeed(1800); }}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded ${autoPlaySpeed === 1800 ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:text-white'}`}
                          title="Tốc độ chậm để dễ bắt chước"
                        >
                          Chậm
                        </button>
                        <button
                          onClick={() => { triggerHaptic(8); setAutoPlaySpeed(1200); }}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded ${autoPlaySpeed === 1200 ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:text-white'}`}
                          title="Tốc độ tiêu chuẩn"
                        >
                          Vừa
                        </button>
                        <button
                          onClick={() => { triggerHaptic(8); setAutoPlaySpeed(600); }}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded ${autoPlaySpeed === 600 ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:text-white'}`}
                          title="Tốc độ nhanh"
                        >
                          Nhanh
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                      <button
                        onClick={handleSubmovePrev}
                        disabled={submovePointer === 0 || isPlayingAuto}
                        className="py-1.5 px-3 bg-[#0D1117] hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-40 text-xs font-semibold rounded-lg text-slate-300 border border-slate-800 cursor-pointer flex items-center gap-1"
                      >
                        <span>Lùi 1 lượt xoay</span>
                      </button>
                      <button
                        onClick={handleSubmoveNext}
                        disabled={submovePointer >= solution[currentStepIndex].moves.length || isPlayingAuto}
                        className="py-1.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:pointer-events-none text-xs font-bold rounded-lg text-white shadow-md cursor-pointer flex items-center gap-1"
                      >
                        <span>Xoay nháp tiếp</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-neutral-900 text-center rounded-xl border border-white/5 text-xs font-medium text-emerald-400">
                  Bước này đã được tối ưu hóa sẵn từ khâu phân tích! Hãy nhấn nút Tiếp theo.
                </div>
              )}

              {/* Explanatory notes */}
              <div className="text-xs text-neutral-400 leading-relaxed bg-neutral-900/30 p-4 rounded-xl border border-white/5">
                <span className="font-bold block mb-1 text-neutral-300">💡 Hướng dẫn chi tiết:</span>
                {solution[currentStepIndex].explanation}
              </div>

              {/* Slide controls footer */}
              <div className="flex items-center justify-between border-t border-white/5 pt-4">
                <button
                  onClick={() => handleStepIndexChange(currentStepIndex - 1)}
                  disabled={currentStepIndex === 0}
                  className="flex items-center gap-2 py-2 px-4 text-xs font-semibold bg-neutral-800 text-white disabled:pointer-events-none disabled:opacity-40 rounded-xl hover:bg-neutral-700 transition"
                >
                  <ChevronLeft size={14} />
                  <span>Bước Trước</span>
                </button>

                {currentStepIndex < solution.length - 1 ? (
                  <button
                    onClick={() => handleStepIndexChange(currentStepIndex + 1)}
                    className="flex items-center gap-2 py-2 px-4 text-xs font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition cursor-pointer"
                  >
                    <span>Giải Bước Kế</span>
                    <ChevronRight size={14} />
                  </button>
                ) : (
                  <button
                    onClick={handleResetSolver}
                    className="flex items-center gap-2 py-2 px-4 text-xs font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition cursor-pointer"
                  >
                    <CheckCircle2 size={14} />
                    <span>Xong (Giải lại)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Target 3D Cube visualizer display right side */}
            <div className="lg:col-span-5 bg-neutral-950/40 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-white/5 flex flex-col items-center w-full">
              <div className="w-full flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest block text-left">Mô phỏng 3D bước giải</span>
                
                {/* Full Screen mode trigger */}
                <button
                  onClick={() => {
                    triggerHaptic(20);
                    setIsFullScreen(true);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition"
                >
                  <Maximize size={12} />
                  <span>Toàn màn hình</span>
                </button>
              </div>

              <ThreeDCube 
                ref={visualizerCubeRef}
                state={interactiveStepState} 
                interactive={true} 
                onMove={(move) => handleSolverInteractiveMove(move)}
                minimal={true}
              />
              <div className="mt-4 p-4 rounded-2xl bg-neutral-900/60 border border-white/5 text-xs text-neutral-400 text-center max-w-xs leading-relaxed">
                Bạn có thể tự do vuốt để ngắm góc rẽ hoặc kích hoạt <strong>"Mô Phỏng 3D Tự Động"</strong> ở mục bên để chạy hoạt cảnh chuyển động.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN REAL-TIME 3D SIMULATOR PORTAL */}
      {isFullScreen && solution && (
        <div className="fixed inset-0 bg-[#06080C] bg-opacity-98 backdrop-blur-xl z-[9999] flex flex-col items-center justify-between p-4 sm:p-6 text-white select-none">
          {/* Top minimal header */}
          <div className="w-full flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest font-mono bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">3D REAL-TIME</span>
              <span className="text-xs text-neutral-400 font-bold">
                Bước {currentStepIndex + 1}/7: {solution[currentStepIndex].title}
              </span>
            </div>
            
            <button
              onClick={() => {
                triggerHaptic(20);
                setIsFullScreen(false);
              }}
              className="p-1 px-3 bg-neutral-900 border border-white/10 hover:border-white/20 hover:text-white text-neutral-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <X size={14} />
              <span>Đóng</span>
            </button>
          </div>

          {/* Central stage area: Dedicated to the giant 3D clean cube */}
          <div className="flex-1 w-full flex flex-col items-center justify-center p-4 relative">
            <div className="scale-110 xs:scale-120 sm:scale-135 md:scale-150 lg:scale-160 transition-transform duration-300">
              <ThreeDCube 
                ref={fullScreenCubeRef}
                state={interactiveStepState} 
                interactive={true} 
                onMove={(move) => handleSolverInteractiveMove(move)}
                minimal={true}
              />
            </div>
          </div>

          {/* Bottom consolidated overlay: Translucent high-contrast real-time subtitle card + control keys */}
          <div className="w-full max-w-2xl bg-neutral-950/80 backdrop-blur-md rounded-2xl border border-white/10 p-4 sm:p-5 space-y-4 shadow-2xl">
            {/* Recalculated notification banner inside FullScreen */}
            {recalculatedNotification && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-300 font-medium flex items-start gap-2 transition-all">
                <Sparkles size={13} className="text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                <div className="text-left">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 block mb-0.5">Xoay khác hướng dẫn - Cập nhật tự động:</span>
                  <span>{recalculatedNotification}</span>
                </div>
              </div>
            )}

            {/* Giant real-time subtitle caption display */}
            <div className="flex items-center gap-4 border-b border-white/5 pb-3">
              {solution[currentStepIndex].moves[submovePointer] ? (
                <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center font-mono font-black text-2xl text-white shadow-xl shrink-0 animate-bounce animate-duration-1000">
                  {solution[currentStepIndex].moves[submovePointer]}
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-lg text-white shadow-xl shrink-0">
                  ✓
                </div>
              )}
              
              <div className="min-w-0 flex-1">
                <p className="text-sm sm:text-base font-extrabold text-white leading-snug">
                  {submovePointer < solution[currentStepIndex].moves.length 
                    ? getMoveCaption(solution[currentStepIndex].moves[submovePointer])
                    : "Đã hoàn thành tất cả lượt xoay của bước giải thuật hiện tại!"}
                </p>
              </div>
            </div>

            {/* Real-time sequential formula progress chain (e.g. R -> L -> U) */}
            <div className="bg-neutral-900/60 p-3 rounded-xl border border-white/5">
              <div className="flex flex-wrap items-center gap-1.5 font-mono justify-center sm:justify-start">
                {solution[currentStepIndex].moves.map((mv, idx) => (
                  <React.Fragment key={idx}>
                    <span
                      className={`px-2 py-0.5 font-mono font-extrabold text-xs sm:text-sm rounded-md border transition-all ${
                        idx === submovePointer
                          ? 'bg-blue-600 text-white border-blue-400 scale-110 shadow-md ring-2 ring-blue-500/25'
                          : idx < submovePointer
                          ? 'bg-neutral-950 text-neutral-500 border-neutral-900 line-through'
                          : 'bg-neutral-950 text-neutral-300 border-white/5'
                      }`}
                    >
                      {mv}
                    </span>
                    {idx < solution[currentStepIndex].moves.length - 1 && (
                      <span className={`text-[10px] font-bold ${idx < submovePointer ? 'text-zinc-650' : 'text-blue-500/50'}`}>
                        ➔
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Quick compact control dashboard inside full screen */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              {/* Simulation Playback buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    triggerHaptic(15);
                    if (submovePointer >= solution[currentStepIndex].moves.length) {
                      resetCurrentStepToBeginning();
                    }
                    setIsPlayingAuto(!isPlayingAuto);
                  }}
                  className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isPlayingAuto
                      ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-md animate-pulse'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                  }`}
                >
                  {isPlayingAuto ? <Pause size={13} /> : <Play size={13} />}
                  <span>{isPlayingAuto ? 'Tạm Dừng' : 'Mô Phỏng Tự Động'}</span>
                </button>

                <button
                  onClick={() => {
                    triggerHaptic(10);
                    resetCurrentStepToBeginning();
                  }}
                  className="py-2 px-3 bg-neutral-900 border border-white/5 hover:border-white/10 text-xs font-semibold text-neutral-400 rounded-xl transition cursor-pointer"
                >
                  Reset lượt
                </button>
              </div>

              {/* Progress Formula bar indicator & step navigation */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={handleSubmovePrev}
                  disabled={submovePointer === 0 || isPlayingAuto}
                  className="p-2 bg-neutral-900 border border-white/5 disabled:opacity-30 disabled:pointer-events-none hover:bg-neutral-800 rounded-xl text-xs font-bold text-neutral-400 transition cursor-pointer"
                  title="Lùi 1 lượt"
                >
                  Lùi lượt
                </button>

                {/* Counter indicator */}
                <span className="text-xs font-mono font-bold text-neutral-400 px-2.5">
                  Lượt {submovePointer} / {solution[currentStepIndex].moves.length}
                </span>

                <button
                  onClick={handleSubmoveNext}
                  disabled={submovePointer >= solution[currentStepIndex].moves.length || isPlayingAuto}
                  className="p-3 py-2 px-4 bg-blue-600 disabled:bg-neutral-900 disabled:text-neutral-600 disabled:border-transparent disabled:pointer-events-none hover:bg-blue-500 rounded-xl text-xs font-extrabold text-white shadow transition cursor-pointer"
                  title="Xoay lượt tiếp"
                >
                  Xoay tiếp
                </button>
              </div>
            </div>

            {/* Stepper Navigation to jump through algorithm chapters */}
            <div className="flex items-center justify-between border-t border-white/5 pt-3">
              <button
                onClick={() => handleStepIndexChange(currentStepIndex - 1)}
                disabled={currentStepIndex === 0}
                className="flex items-center gap-1.5 py-1.5 px-3.5 text-xs font-bold bg-neutral-900 border border-white/5 hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none rounded-xl text-neutral-300 transition cursor-pointer"
              >
                <ChevronLeft size={13} />
                <span>Bước Trước</span>
              </button>

              {currentStepIndex < solution.length - 1 ? (
                <button
                  onClick={() => handleStepIndexChange(currentStepIndex + 1)}
                  className="flex items-center gap-1.5 py-1.5 px-3.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition cursor-pointer"
                >
                  <span>Mở Bước Tiếp</span>
                  <ChevronRight size={13} />
                </button>
              ) : (
                <button
                  onClick={() => {
                    triggerHaptic(20);
                    setIsFullScreen(false);
                    handleResetSolver();
                  }}
                  className="flex items-center gap-1.5 py-1.5 px-3.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition cursor-pointer"
                >
                  <CheckCircle2 size={13} />
                  <span>Hoàn Tất Giải</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
