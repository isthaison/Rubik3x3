import React, { useState, useEffect, useRef } from 'react';
import { CubeState, CubeColor, FaceName, SolverStep } from '../types';
import { getSolvedState, applyMove, applyMoves, getSolutionSteps, COLORS, generateScramble, isSolved } from '../utils/cubeEngine';
import ThreeDCube from './ThreeDCube';
import { HelpCircle, RefreshCw, Sparkles, CheckCircle2, ChevronLeft, ChevronRight, Play, Eye, Sliders, Palette, Video, Pause, Maximize, X, RotateCcw } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import CubeCameraScanner from './CubeCameraScanner';

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
      direction = isPrime ? "ngược chiều kim đồng hồ (xoay lớp trên cùng sang bên phải)" : "xuôi chiều kim đồng hồ (xoay lớp trên cùng sang bên trái)";
      break;
    case 'D':
      faceName = "Mặt DƯỚI (D - Vàng)";
      direction = isPrime ? "ngược chiều kim đồng hồ (xoay lớp dưới cùng sang bên trái)" : "xuôi chiều kim đồng hồ (xoay lớp dưới cùng sang bên phải)";
      break;
    case 'F':
      faceName = "Mặt TRƯỚC (F - Lục)";
      direction = isPrime ? "ngược chiều kim đồng hồ (xoay mặt trước sang bên trái ở phía trên)" : "xuôi chiều kim đồng hồ (xoay mặt trước sang bên phải ở phía trên)";
      break;
    case 'B':
      faceName = "Mặt SAU (B - Lam)";
      direction = isPrime ? "ngược chiều kim đồng hồ (xoay mặt sau sang bên phải ở phía trên khi nhìn từ mặt trước)" : "xuôi chiều kim đồng hồ (xoay mặt sau sang bên trái ở phía trên khi nhìn từ mặt trước)";
      break;
    case 'L':
      faceName = "Mặt TRÁI (L - Cam)";
      direction = isPrime ? "ngược chiều kim đồng hồ (xoay lớp bên trái lên phía xa bạn)" : "xuôi chiều kim đồng hồ (xoay lớp bên trái xuống phía gần bạn)";
      break;
    case 'R':
      faceName = "Mặt PHẢI (R - Đỏ)";
      direction = isPrime ? "ngược chiều kim đồng hồ (xoay lớp bên phải xuống phía gần bạn)" : "xuôi chiều kim đồng hồ (xoay lớp bên phải lên phía xa bạn)";
      break;
    default:
      return `Xoay mặt đại diện: ${move}`;
  }

  if (isDouble) {
    return `${faceName}: Xoay liền 2 lần (180 độ) theo bất kỳ chiều nào`;
  }
  return `${faceName}: Xoay 90 độ ${direction}`;
};

export default function CubeSolver() {
  const [cubeState, setCubeState] = useState<CubeState>(getSolvedState());
  const [paintColor, setPaintColor] = useState<CubeColor>('white');
  const [interactiveMode, setInteractiveMode] = useState<'paint' | 'play'>('play');
  const [showCameraScanner, setShowCameraScanner] = useState<boolean>(false);

  // Solver states
  const [solution, setSolution] = useState<SolverStep[] | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [interactiveStepState, setInteractiveStepState] = useState<CubeState>(getSolvedState());

  // Interactive step-by-step submoves player
  const [submovePointer, setSubmovePointer] = useState<number>(0);
  const [pendingDoubleMove, setPendingDoubleMove] = useState<string | null>(null);

  // Auto playback simulation mechanics
  const [isPlayingAuto, setIsPlayingAuto] = useState<boolean>(false);
  const [autoPlaySpeed, setAutoPlaySpeed] = useState<number>(1200); // speed delay in ms
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  const visualizerCubeRef = useRef<any>(null);
  const fullScreenCubeRef = useRef<any>(null);
  const lastAutomatedMoveRef = useRef<string | null>(null);

  // Track recalculated banner state or status message to show the user
  const [recalculatedNotification, setRecalculatedNotification] = useState<string | null>(null);

  // Find current move to execute in visual steps (to trigger 3D highlight)
  const currentMoveToExecute = solution && solution[currentStepIndex]
    ? solution[currentStepIndex].moves[submovePointer]
    : undefined;

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
      setPendingDoubleMove(null);
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
      setPendingDoubleMove(null);
      setRecalculatedNotification("Tuyệt vời! Bạn đã hoàn thành giải khối Rubik thành công!");
      return;
    }

    // Check if this manual move aligns with the expected solution move at current pointer
    const currentStep = solution[currentStepIndex];
    if (currentStep) {
      const expectedMove = currentStep.moves[submovePointer];
      if (expectedMove) {
        const isDouble = expectedMove.endsWith('2') && expectedMove.length === 2;
        const baseFace = isDouble ? expectedMove[0] : null;

        if (isDouble && baseFace) {
          if (pendingDoubleMove !== null) {
            if (move === pendingDoubleMove) {
              // Completed second half!
              triggerHaptic(15);
              setInteractiveStepState(nextState);
              setSubmovePointer((p) => p + 1);
              setPendingDoubleMove(null);
            } else {
              handleIncorrectMove(move, nextState);
            }
          } else {
            // First half of double move!
            if (move === baseFace || move === baseFace + "'") {
              triggerHaptic(15);
              setInteractiveStepState(nextState);
              setPendingDoubleMove(move);
            } else {
              handleIncorrectMove(move, nextState);
            }
          }
        } else {
          // Normal move
          setPendingDoubleMove(null);
          if (submovePointer < currentStep.moves.length && move === expectedMove) {
            triggerHaptic(15);
            setInteractiveStepState(nextState);
            setSubmovePointer((p) => p + 1);
          } else {
            handleIncorrectMove(move, nextState);
          }
        }
      }
    }
  };

  const handleIncorrectMove = (move: string, nextState: CubeState) => {
    triggerHaptic([25, 45, 25]);
    setPendingDoubleMove(null);

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

  // Auto transition to the next step when the current step is completed
  useEffect(() => {
    if (!solution || !solution[currentStepIndex]) return;
    const totalMoves = solution[currentStepIndex].moves.length;
    
    if (totalMoves > 0 && submovePointer === totalMoves) {
      if (currentStepIndex < solution.length - 1) {
        const nextIndex = currentStepIndex + 1;
        const timer = setTimeout(() => {
          handleStepIndexChange(nextIndex);
          setRecalculatedNotification(`Tuyệt vời! Đã hoàn thành Bước ${currentStepIndex + 1}. Tự động chuyển sang Bước ${nextIndex + 1}: ${solution[nextIndex].title}`);
          triggerHaptic([15, 10, 15]);
        }, 1200);
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => {
          setRecalculatedNotification("Chúc mừng! Bạn đã hoàn thành tất cả các bước giải xuất sắc!");
          triggerHaptic([30, 30, 30, 50, 100]);
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [submovePointer, currentStepIndex, solution]);

  // Unfolded net coordinates mapping for manual palette painter
  // Laid out as a standard cross net:
  //      [U]
  //   [L][F][R][B]
  //      [D]
  const renderFlatFacePalette = (face: FaceName) => {
    return (
      <div className="flex flex-col items-center gap-1 sm:gap-1.5 p-2 sm:p-2 bg-neutral-950/80 rounded-lg sm:rounded-lg border border-white/5 shadow-inner w-full max-w-[124px] sm:max-w-none">
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
    setPendingDoubleMove(null);
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
    setPendingDoubleMove(null);
    let base = cloneState(cubeState);
    for (let i = 0; i < currentStepIndex; i++) {
      base = applyMoves(base, solution[i].moves);
    }
    setInteractiveStepState(base);
    setIsPlayingAuto(false);
  };

  const handleSubmoveNext = () => {
    if (!solution) return;
    setPendingDoubleMove(null);
    const currentStep = solution[currentStepIndex];
    if (submovePointer < currentStep.moves.length) {
      executeNextMoveTargetingCubeRef();
    }
  };

  const handleSubmovePrev = () => {
    if (!solution || submovePointer <= 0) return;
    setPendingDoubleMove(null);
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
    setPendingDoubleMove(null);

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
    <div className="space-y-1.5">
      {/* Top Header Selector tabs */}
      {!solution ? (
        <div className="space-y-1.5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-1.5 items-start">
            {/* Input workspace left: Rubik Controller */}
            <div className="lg:col-span-5 bg-neutral-950/30 p-3 sm:p-4 rounded-lg border border-white/5 shadow-xl space-y-3">
              <div className="border-b border-white/5 pb-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sliders className="text-blue-400" size={16} />
                  <span>Thiết Lập Trạng Thái</span>
                </h3>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Chọn phương thức thiết lập hoặc xáo trộn khối Rubik của bạn.
                </p>
              </div>

              {/* Method 1: Camera Scanner */}
              <div className="bg-neutral-900/40 p-2.5 rounded-lg border border-white/5 space-y-2">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
                  Phương án 1: Nhận diện tự động
                </span>
                <p className="text-[11px] text-neutral-300">
                  Sử dụng camera điện thoại/máy tính quét nhanh 6 mặt để tự động nhập màu sắc.
                </p>
                <button
                  onClick={() => {
                    triggerHaptic(15);
                    setShowCameraScanner(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs uppercase tracking-wide transition-all cursor-pointer border border-blue-500/20 active:scale-[0.98]"
                >
                  <Video size={14} className="animate-pulse" />
                  <span>Camera Quét Khối</span>
                </button>
              </div>

              {/* Method 2: Manual Interactive Model */}
              <div className="bg-neutral-900/40 p-2.5 rounded-lg border border-white/5 space-y-2">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                  Phương án 2: Xoay khối 3D mô phỏng
                </span>
                <p className="text-[11px] text-neutral-300">
                  Dùng chuột kéo xoay trực tiếp các mặt trên mô hình &amp; khung bên phải để tạo trạng thái Rubik tùy ý.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleRandomScrambleManualInput}
                    className="flex-1 px-3 py-2 text-xs font-bold text-neutral-200 hover:text-white bg-neutral-900 rounded-lg border border-white/10 transition-all cursor-pointer flex items-center justify-center gap-1.5 hover:bg-neutral-800"
                  >
                    <RefreshCw size={13} />
                    <span>Xáo Trộn</span>
                  </button>
                  <button
                    onClick={() => {
                      triggerHaptic(10);
                      setCubeState(getSolvedState());
                    }}
                    className="flex-1 px-3 py-2 text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-950/10 rounded-lg border border-rose-500/10 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw size={13} />
                    <span>Khôi Phục Gốc</span>
                  </button>
                </div>
              </div>

              {/* Launcher bar buttons */}
              <div className="pt-2">
                <button
                  id="btn-solve-now"
                  onClick={solveCubeState}
                  className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-lg text-xs uppercase tracking-wider shadow-xl shadow-emerald-600/10 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center justify-center gap-2 border border-emerald-500/50"
                >
                  <CheckCircle2 size={16} />
                  <span>Giải mã Rubik ngay</span>
                </button>
              </div>
            </div>

            {/* Layout right display: shows current 3D cube state */}
            <div className="lg:col-span-7 bg-neutral-950/30 p-3 sm:p-4 rounded-lg border border-white/5 text-center flex flex-col items-center min-h-[300px] sm:min-h-[350px] lg:min-h-[400px] justify-center">
              <span className="text-xs font-extrabold text-neutral-400 block uppercase tracking-wide mb-3">Mô Hình 3D Hiện Tại</span>
              
              <ThreeDCube 
                state={cubeState} 
                interactive={true} 
                onStickerClick={undefined}
                onMove={(move) => setCubeState((prev) => applyMove(prev, move))}
              />

              <div className="text-xs text-neutral-400 mt-3 font-semibold">
                Xoay vuốt trực tiếp trên khối Rubik 3D để tập quay
              </div>
            </div>
          </div>
        </div>
      ) : (
        // ACTIVE SOLVER STEP LAYOUT SCREEN
        <div className="space-y-1.5">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <button
              onClick={handleResetSolver}
              className="px-3 py-1 bg-neutral-800 text-zinc-300 hover:text-white rounded-lg border border-white/10 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ChevronLeft size={14} />
              <span>Nhập trạng thái mới</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-1.5 items-start">
            {/* Active Stage tutorial text info */}
            <div className="lg:col-span-4 bg-neutral-950/40 p-2 rounded-lg border border-white/5 shadow-2xl space-y-1.5">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-[10px] font-bold text-neutral-400 bg-neutral-900 border border-white/5 px-2.5 py-1 rounded-full uppercase tracking-widest">
                  GIAI ĐOẠN {currentStepIndex + 1}
                </span>
                <span className="text-[11px] font-mono font-bold text-neutral-500">{solution[currentStepIndex].moves.length} Bước</span>
              </div>

              {/* Recalculated notification banner */}
              {recalculatedNotification && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 text-[11px] text-amber-300 font-medium flex items-start gap-1.5.5 transition-all duration-300">
                  <Sparkles size={14} className="text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 block mb-0.5">Xoay khác hướng dẫn - Cập nhật tự động:</span>
                    <span>{recalculatedNotification}</span>
                  </div>
                </div>
              )}

              {/* Core Step values */}
              <div className="space-y-1.5 text-left">
                <h3 className="text-sm font-extrabold text-white border-l-2 border-blue-500 pl-2">
                  {solution[currentStepIndex].title}
                </h3>
              </div>

              {/* Step algorithms and action player */}
              {solution[currentStepIndex].moves.length > 0 ? (
                <div className="bg-blue-950/20 p-2 rounded-lg border border-blue-500/10 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">Công thức thao tác:</span>
                    <span className="text-[10px] font-mono text-zinc-500">Mảnh đang thực thi {submovePointer}/{solution[currentStepIndex].moves.length}</span>
                  </div>

                  {/* Connected moves road-map chain like: R -> L -> U' */}
                  <div className="bg-[#0b0f17]/80 p-2 rounded-lg border border-white/5">
                    <span className="text-[10px] text-zinc-500 uppercase font-black tracking-wider block mb-1.5">Lộ trình giải thuật:</span>
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
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 text-xs text-blue-300 font-medium flex items-start gap-1.5.5">
                    <Sparkles size={14} className="text-blue-400 shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400 block mb-0.5">Hướng dẫn xoay real-time:</span>
                      <span>
                        {pendingDoubleMove && currentMoveToExecute ? (
                          <span className="text-amber-300 font-semibold animate-pulse">
                            Gần xong! Hãy xoay thêm 1 lượt <strong className="text-white bg-amber-600/50 px-1 rounded">[ {pendingDoubleMove} ]</strong> nữa để hoàn tất bước xoay kép <strong className="text-white bg-blue-600/50 px-1 rounded">[ {currentMoveToExecute} ]</strong>.
                          </span>
                        ) : currentMoveToExecute ? (
                          `Ở lượt này, xoay ký tự [ ${currentMoveToExecute} ]: ${getMoveCaption(currentMoveToExecute)}`
                        ) : (
                          "Chúc mừng! Bạn đã hoàn thành tất cả các lượt xoay của bước giải thuật hiện tại."
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Interactive Submove controller & Autoplay Simulation Dashboard */}
                  <div className="space-y-1.5 pt-3 border-t border-blue-500/10">
                    <div className="flex flex-col gap-1.5">
                      {/* Central Playback Controls */}
                      <div className="flex items-center justify-between bg-neutral-900/50 p-1.5 rounded-lg border border-white/5">
                        <button
                          onClick={handleSubmovePrev}
                          disabled={submovePointer === 0 || isPlayingAuto}
                          className="p-2 bg-transparent hover:bg-white/5 disabled:pointer-events-none disabled:opacity-30 text-neutral-400 hover:text-white transition-colors cursor-pointer rounded-lg flex items-center justify-center shrink-0"
                          title="Lùi 1 lượt xoay"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        
                        <button
                          onClick={() => {
                            triggerHaptic(15);
                            if (submovePointer >= solution[currentStepIndex].moves.length) {
                              resetCurrentStepToBeginning();
                            }
                            setIsPlayingAuto(!isPlayingAuto);
                          }}
                          className={`flex-1 py-2 px-2 mx-2 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            isPlayingAuto
                              ? 'bg-amber-600/20 hover:bg-amber-600/30 text-amber-500 shadow-md animate-pulse border border-amber-600/50'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                          }`}
                        >
                          {isPlayingAuto ? <Pause size={16} /> : <Play fill="currentColor" size={16} />}
                          <span>{isPlayingAuto ? 'Tạm Dừng' : 'Mô Phỏng 3D Tự Động'}</span>
                        </button>

                        <button
                          onClick={handleSubmoveNext}
                          disabled={submovePointer >= solution[currentStepIndex].moves.length || isPlayingAuto}
                          className="p-2 bg-transparent hover:bg-white/5 disabled:pointer-events-none disabled:opacity-30 text-neutral-400 hover:text-white transition-colors cursor-pointer rounded-lg flex items-center justify-center shrink-0"
                          title="Xoay nháp tiếp"
                        >
                          <ChevronRight size={20} />
                        </button>
                      </div>

                      {/* Secondary Helpers: Reset & Speed */}
                      <div className="flex items-center justify-between px-1">
                        <button
                          onClick={() => {
                            triggerHaptic(10);
                            resetCurrentStepToBeginning();
                          }}
                          className="text-xs font-semibold text-neutral-500 hover:text-neutral-300 transition flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw size={12} />
                          <span>Chơi lại bước này</span>
                        </button>

                        {/* Speed selector controls */}
                        <div className="flex items-center gap-1 bg-neutral-900/60 p-0.5 rounded-lg border border-white/5">
                          <button
                            onClick={() => { triggerHaptic(8); setAutoPlaySpeed(1800); }}
                            className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${autoPlaySpeed === 1800 ? 'bg-blue-600 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                            title="Tốc độ chậm để dễ bắt chước"
                          >
                            Chậm
                          </button>
                          <button
                            onClick={() => { triggerHaptic(8); setAutoPlaySpeed(1200); }}
                            className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${autoPlaySpeed === 1200 ? 'bg-blue-600 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                            title="Tốc độ tiêu chuẩn"
                          >
                            Vừa
                          </button>
                          <button
                            onClick={() => { triggerHaptic(8); setAutoPlaySpeed(600); }}
                            className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${autoPlaySpeed === 600 ? 'bg-blue-600 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                            title="Tốc độ nhanh"
                          >
                            Nhanh
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-2 bg-neutral-900 text-center rounded-lg border border-white/10 text-xs font-semibold text-emerald-400">
                  Bước này đã được tối ưu hóa sẵn từ khâu phân tích!
                </div>
              )}

              {/* Slide controls footer */}
              <div className="flex items-center justify-between border-t border-white/5 pt-2">
                <button
                  onClick={() => handleStepIndexChange(currentStepIndex - 1)}
                  disabled={currentStepIndex === 0}
                  className="flex items-center gap-1.5 py-2 px-2 text-xs font-semibold bg-neutral-800 text-white disabled:pointer-events-none disabled:opacity-40 rounded-lg hover:bg-neutral-700 transition"
                >
                  <ChevronLeft size={14} />
                  <span>Bước Trước</span>
                </button>

                {currentStepIndex < solution.length - 1 ? (
                  submovePointer < solution[currentStepIndex].moves.length ? (
                    <div className="text-xs text-neutral-400 font-medium italic animate-pulse">
                      Xoay hết các lượt để hoàn thành bước...
                    </div>
                  ) : (
                    <div className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 animate-bounce">
                      <Sparkles size={13} className="text-emerald-400" />
                      <span>Tự động chuyển bước kế tiếp...</span>
                    </div>
                  )
                ) : (
                  <button
                    onClick={handleResetSolver}
                    className="flex items-center gap-1.5 py-2 px-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition cursor-pointer"
                  >
                    <CheckCircle2 size={14} />
                    <span>Xong (Giải lại)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Target 3D Cube visualizer display right side */}
            <div className="lg:col-span-8 bg-neutral-950/40 p-2 sm:p-2 rounded-lg sm:rounded-lg border border-white/5 flex flex-col items-center w-full min-h-[350px] sm:min-h-[450px] lg:min-h-[500px]">
              <div className="w-full flex items-end justify-end mb-1.5">
                {/* Full Screen mode trigger */}
                <button
                  onClick={() => {
                    triggerHaptic(20);
                    setIsFullScreen(true);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg border border-blue-500/20 transition cursor-pointer"
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
                currentMoveToExecute={currentMoveToExecute}
                hideStepOverlay={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN REAL-TIME 3D SIMULATOR PORTAL */}
      {isFullScreen && solution && (
        <div className="fixed inset-0 bg-[#06080C] bg-opacity-98 backdrop-blur-xl z-[9999] flex flex-col items-center justify-between p-2 sm:p-2 text-white select-none">
          {/* Top minimal header */}
          <div className="w-full flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-1.5">
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
              className="p-1 px-3 bg-neutral-900 border border-white/10 hover:border-white/20 hover:text-white text-neutral-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <X size={14} />
              <span>Đóng</span>
            </button>
          </div>

          {/* Central stage area: Dedicated to the giant 3D clean cube */}
          <div className="flex-1 w-full flex flex-col items-center justify-center p-2 relative">
            <div className="scale-110 xs:scale-120 sm:scale-135 md:scale-150 lg:scale-160 transition-transform duration-300">
              <ThreeDCube 
                ref={fullScreenCubeRef}
                state={interactiveStepState} 
                interactive={true} 
                onMove={(move) => handleSolverInteractiveMove(move)}
                minimal={true}
                currentMoveToExecute={currentMoveToExecute}
                hideStepOverlay={true}
              />
            </div>
          </div>

          {/* Bottom consolidated overlay: Translucent high-contrast real-time subtitle card + control keys */}
          <div className="w-full max-w-xl bg-neutral-950/80 backdrop-blur-md rounded-lg border border-white/10 p-2.5 space-y-1.5 shadow-2xl">
            {/* Recalculated notification banner inside FullScreen */}
            {recalculatedNotification && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 text-[10px] text-amber-300 font-medium flex items-start gap-1.5 transition-all">
                <Sparkles size={12} className="text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                <div className="text-left">
                  <span className="uppercase font-bold tracking-wider text-amber-400 block">Xoay khác hướng dẫn - Cập nhật tự động:</span>
                  <span>{recalculatedNotification}</span>
                </div>
              </div>
            )}

            {/* Giant real-time subtitle caption display */}
            <div className="flex items-center gap-1.5 border-b border-white/5 pb-2">
              {pendingDoubleMove && currentMoveToExecute ? (
                <div className="w-10 h-10 rounded-lg bg-amber-600 flex items-center justify-center font-mono font-black text-xl text-white shadow-lg shrink-0 animate-pulse">
                  {pendingDoubleMove}
                </div>
              ) : currentMoveToExecute ? (
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center font-mono font-black text-xl text-white shadow-lg shrink-0 animate-bounce animate-duration-1000">
                  {currentMoveToExecute}
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-base text-white shadow-lg shrink-0">
                  ✓
                </div>
              )}
              
              <div className="min-w-0 flex-1 text-left">
                <p className="text-xs sm:text-sm font-extrabold text-white leading-snug">
                  {pendingDoubleMove && currentMoveToExecute ? (
                    <span className="text-amber-300">
                      Gần xong! Hãy xoay thêm 1 lượt <strong>[ {pendingDoubleMove} ]</strong> để hoàn thành xoay kép [ {currentMoveToExecute} ]
                    </span>
                  ) : currentMoveToExecute ? (
                    getMoveCaption(currentMoveToExecute)
                  ) : (
                    "Đã hoàn thành tất cả lượt xoay của bước giải thuật hiện tại!"
                  )}
                </p>
              </div>
            </div>

            {/* Quick compact control dashboard inside full screen */}
            <div className="flex flex-col items-center justify-center pt-1">
              <div className="flex items-center justify-center bg-[#0d1117] p-1.5 rounded-lg border border-white/5 w-full max-w-sm shrink-0 shadow-2xl">
                <button
                  onClick={handleSubmovePrev}
                  disabled={submovePointer === 0 || isPlayingAuto}
                  className="p-2 bg-transparent hover:bg-white/5 disabled:pointer-events-none disabled:opacity-30 text-neutral-400 hover:text-white transition-colors cursor-pointer rounded-lg flex items-center justify-center shrink-0"
                  title="Lùi 1 lượt xoay"
                >
                  <ChevronLeft size={24} />
                </button>
                
                <button
                  onClick={() => {
                    triggerHaptic(15);
                    if (submovePointer >= solution[currentStepIndex].moves.length) {
                      resetCurrentStepToBeginning();
                    }
                    setIsPlayingAuto(!isPlayingAuto);
                  }}
                  className={`flex-1 py-3 px-2 mx-3 rounded-lg text-sm font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    isPlayingAuto
                      ? 'bg-amber-600/20 hover:bg-amber-600/30 text-amber-500 shadow-md animate-pulse border border-amber-600/50'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                  }`}
                >
                  {isPlayingAuto ? <Pause size={18} /> : <Play fill="currentColor" size={18} />}
                  <span>{isPlayingAuto ? 'Tạm Dừng' : 'Mô Phỏng Tự Động'}</span>
                </button>

                <button
                  onClick={handleSubmoveNext}
                  disabled={submovePointer >= solution[currentStepIndex].moves.length || isPlayingAuto}
                  className="p-2 bg-transparent hover:bg-white/5 disabled:pointer-events-none disabled:opacity-30 text-neutral-400 hover:text-white transition-colors cursor-pointer rounded-lg flex items-center justify-center shrink-0"
                  title="Xoay nháp tiếp"
                >
                  <ChevronRight size={24} />
                </button>
              </div>

              <div className="flex items-center justify-between w-full max-w-sm px-2 pt-3">
                <button
                  onClick={() => {
                    triggerHaptic(10);
                    resetCurrentStepToBeginning();
                  }}
                  className="text-[11px] font-semibold text-neutral-500 hover:text-neutral-300 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>Chơi lại bước</span>
                </button>

                {/* Counter indicator */}
                <span className="text-[11px] font-mono font-bold text-neutral-500 bg-black/50 px-2 py-0.5 rounded border border-white/5">
                  Lượt {submovePointer} / {solution[currentStepIndex].moves.length}
                </span>
              </div>
            </div>

            {/* Stepper Navigation to jump through algorithm chapters */}
            <div className="flex items-center justify-between border-t border-white/5 pt-3">
              <button
                onClick={() => handleStepIndexChange(currentStepIndex - 1)}
                disabled={currentStepIndex === 0}
                className="flex items-center gap-1.5 py-1.5 px-3.5 text-xs font-bold bg-neutral-900 border border-white/5 hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none rounded-lg text-neutral-300 transition cursor-pointer"
              >
                <ChevronLeft size={13} />
                <span>Bước Trước</span>
              </button>

              {currentStepIndex < solution.length - 1 ? (
                submovePointer < solution[currentStepIndex].moves.length ? (
                  <div className="text-xs text-neutral-400 font-medium italic animate-pulse">
                    Xoay hết các lượt để hoàn thành bước...
                  </div>
                ) : (
                  <div className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 animate-bounce">
                    <Sparkles size={13} className="text-emerald-400" />
                    <span>Tự động chuyển bước...</span>
                  </div>
                )
              ) : (
                <button
                  onClick={() => {
                    triggerHaptic(20);
                    setIsFullScreen(false);
                    handleResetSolver();
                  }}
                  className="flex items-center gap-1.5 py-1.5 px-3.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition cursor-pointer"
                >
                  <CheckCircle2 size={13} />
                  <span>Hoàn Tất Giải</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showCameraScanner && (
        <CubeCameraScanner
          currentState={cubeState}
          onClose={() => setShowCameraScanner(false)}
          onApplyScan={(scannedState) => {
            setCubeState(scannedState);
          }}
        />
      )}
    </div>
  );
}
