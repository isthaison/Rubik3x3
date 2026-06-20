import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { CubeState, CubeColor, FaceName } from '../types';
import { COLORS } from '../utils/cubeEngine';
import { RotateCw, RotateCcw, ZoomIn, ZoomOut, Maximize2, RefreshCw, Sparkles } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import {
  CUBIES,
  CUBIE_FACE_CONFIGS,
  QUICK_MOVES,
  getFaceLabel,
  getCubieColors,
  getCubieStickerMap,
  getMoveFrom3DSwipe
} from '../utils/cube3dMath';

interface ThreeDCubeProps {
  state: CubeState;
  onMove?: (move: string) => void;
  interactive?: boolean;
  onStickerClick?: (face: FaceName, index: number) => void;
  selectedColor?: CubeColor;
  highlightedIndices?: { face: FaceName; indices: number[] };
  minimal?: boolean;
}

export interface ThreeDCubeRef {
  performAnimatedMove: (move: string) => void;
  resetCamera: () => void;
}

const ThreeDCube = forwardRef<ThreeDCubeRef, ThreeDCubeProps>(({
  state,
  onMove,
  interactive = true,
  onStickerClick,
  selectedColor,
  highlightedIndices,
  minimal = false
}, ref) => {
  // Rotate settings (arbitrary angles representing a pro 3D isometric view)
  const [rotateX, setRotateX] = useState<number>(-25);
  const [rotateY, setRotateY] = useState<number>(45);
  const [zoom, setZoom] = useState<number>(1.1);
  const [activeFaceOnly, setActiveFaceOnly] = useState<boolean>(false);
  const [sensitivity, setSensitivity] = useState<number>(0.6);
  const [animatingFace, setAnimatingFace] = useState<{
    face: FaceName;
    angle: number;
  } | null>(null);

  const [dragRotation, setDragRotation] = useState<{
    face: FaceName;
    angle: number;
  } | null>(null);

  const activeDragMove = useRef<string | null>(null);

  const handlePerformMove = (move: string, startAngle?: number) => {
    if (!onMove) return;

    const face = move[0] as FaceName;
    const isPrime = move.includes("'");
    const isDouble = move.includes("2");

    let angle = 90;
    if (isPrime) angle = -90;
    if (isDouble) angle = 180;

    // First frame: activate the transition with startAngle or 0 to ensure it registers
    setAnimatingFace({ face, angle: startAngle !== undefined ? startAngle : 0 });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAnimatingFace({ face, angle });
      });
    });

    setTimeout(() => {
      onMove(move);
      setAnimatingFace(null);
    }, 280);
  };

  useImperativeHandle(ref, () => ({
    performAnimatedMove: (move: string) => {
      handlePerformMove(move);
    },
    resetCamera: () => {
      setRotateX(-25);
      setRotateY(45);
      setZoom(1.1);
    }
  }));

  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<boolean>(false);
  const prevMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const isSwipingFace = useRef<boolean>(false);
  const swipeStartFace = useRef<FaceName | null>(null);
  const swipeStartStickerIdx = useRef<number | null>(null);
  const swipeStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const didPerformStickerSwipe = useRef<boolean>(false);
  const didRotateCamera = useRef<boolean>(false);

  const performStickerDrag = (deltaX: number, deltaY: number) => {
    if (!isSwipingFace.current || !swipeStartFace.current || swipeStartStickerIdx.current === null || !interactive || !onMove) return;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > 5) {
      if (!activeDragMove.current) {
        const move = getMoveFrom3DSwipe(swipeStartFace.current, swipeStartStickerIdx.current, deltaX, deltaY, rotateX, rotateY);
        if (move) {
          activeDragMove.current = move;
          triggerHaptic(10);
        }
      }

      if (activeDragMove.current) {
        const currentMove = getMoveFrom3DSwipe(swipeStartFace.current, swipeStartStickerIdx.current, deltaX, deltaY, rotateX, rotateY);
        const face = activeDragMove.current[0] as FaceName;
        const isPrime = activeDragMove.current.includes("'");
        
        let targetAngle = 90;
        if (isPrime) targetAngle = -90;

        const SWIPE_LIMIT = 80;
        let progress = Math.min(1.2, distance / SWIPE_LIMIT);

        if (currentMove && currentMove[0] === face && currentMove !== activeDragMove.current) {
          progress = -progress;
        }

        const angle = progress * targetAngle;
        setDragRotation({ face, angle });
        didPerformStickerSwipe.current = true;
      }
    }
  };

  const handleStickerSwipeEnd = () => {
    if (!isSwipingFace.current) return;
    isSwipingFace.current = false;
    swipeStartFace.current = null;
    swipeStartStickerIdx.current = null;

    if (dragRotation && activeDragMove.current) {
      const face = dragRotation.face;
      const angle = dragRotation.angle;
      const absAngle = Math.abs(angle);

      if (absAngle > 30) {
        // Complete the move
        const isPrime = activeDragMove.current.includes("'");
        let targetAngle = 90;
        if (isPrime) targetAngle = -90;

        const isPositiveMove = (angle > 0) === (targetAngle > 0);

        const finalMove = isPositiveMove
          ? activeDragMove.current
          : (activeDragMove.current.endsWith("'") ? activeDragMove.current.slice(0, -1) : activeDragMove.current + "'");

        triggerHaptic(20);
        
        setDragRotation(null);
        handlePerformMove(finalMove, angle);
      } else {
        // Snap back to 0 smoothly
        setDragRotation(null);
        setAnimatingFace({ face, angle });
        
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setAnimatingFace({ face, angle: 0 });
          });
        });

        triggerHaptic(10);
        setTimeout(() => {
          setAnimatingFace(null);
        }, 280);
      }
    }
    activeDragMove.current = null;
  };

  const handleStickerTouchStart = (e: React.TouchEvent, face: FaceName, stickerIdx: number) => {
    if (!interactive) return;
    isSwipingFace.current = false;
    swipeStartFace.current = face;
    swipeStartStickerIdx.current = stickerIdx;
    didPerformStickerSwipe.current = false;
    const touch = e.touches[0];
    swipeStartPos.current = { x: touch.clientX, y: touch.clientY };
    activeDragMove.current = null;
    setDragRotation(null);
  };

  const handleStickerTouchMove = (e: React.TouchEvent) => {
    if (!isSwipingFace.current) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - swipeStartPos.current.x;
    const deltaY = touch.clientY - swipeStartPos.current.y;
    performStickerDrag(deltaX, deltaY);
  };

  const handleStickerMouseDown = (e: React.MouseEvent, face: FaceName, stickerIdx: number) => {
    if (!interactive) return;
    isSwipingFace.current = false;
    swipeStartFace.current = face;
    swipeStartStickerIdx.current = stickerIdx;
    didPerformStickerSwipe.current = false;
    swipeStartPos.current = { x: e.clientX, y: e.clientY };
    activeDragMove.current = null;
    setDragRotation(null);
  };

  const handleStickerMouseMove = (e: React.MouseEvent) => {
    if (!isSwipingFace.current) return;
    const deltaX = e.clientX - swipeStartPos.current.x;
    const deltaY = e.clientY - swipeStartPos.current.y;
    performStickerDrag(deltaX, deltaY);
  };

  const processSwipeEnd = (clientX: number, clientY: number) => {
    if (!interactive || !onMove) return;
    if (didPerformStickerSwipe.current || didRotateCamera.current) return;
    const deltaX = clientX - touchStartPos.current.x;
    const deltaY = clientY - touchStartPos.current.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > 30) {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const startRelX = touchStartPos.current.x - rect.left;
        const startRelY = touchStartPos.current.y - rect.top;
        const width = rect.width;
        const height = rect.height;

        let move = '';
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          // Horizontal swipe
          if (startRelY < height / 2) {
            move = deltaX < 0 ? 'U' : "U'";
          } else {
            move = deltaX < 0 ? 'D' : "D'";
          }
        } else {
          // Vertical swipe
          if (startRelX < width / 2) {
            move = deltaY < 0 ? "L'" : 'L';
          } else {
            move = deltaY < 0 ? 'R' : "R'";
          }
        }

        if (move) {
          triggerHaptic(18);
          handlePerformMove(move);
        }
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!interactive) return;
    isDragging.current = true;
    didPerformStickerSwipe.current = false;
    didRotateCamera.current = false;
    prevMousePos.current = { x: e.clientX, y: e.clientY };
    touchStartPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !interactive) return;

    const deltaX = e.clientX - touchStartPos.current.x;
    const deltaY = e.clientY - touchStartPos.current.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (swipeStartFace.current !== null && !isSwipingFace.current && !didRotateCamera.current) {
      if (distance >= 8) {
        const move = getMoveFrom3DSwipe(
          swipeStartFace.current,
          swipeStartStickerIdx.current!,
          deltaX,
          deltaY,
          rotateX,
          rotateY
        );

        if (move) {
          isSwipingFace.current = true;
          activeDragMove.current = move;
          triggerHaptic(10);
        } else {
          didRotateCamera.current = true;
        }
      }
    } else if (swipeStartFace.current === null && !didRotateCamera.current) {
      if (distance >= 3) {
        didRotateCamera.current = true;
      }
    }

    if (isSwipingFace.current) {
      performStickerDrag(deltaX, deltaY);
    } else if (didRotateCamera.current) {
      const stepX = e.clientX - prevMousePos.current.x;
      const stepY = e.clientY - prevMousePos.current.y;
      
      setRotateY((prev) => prev + stepX * sensitivity);
      setRotateX((prev) => Math.max(-85, Math.min(85, prev - stepY * sensitivity)));
    }

    prevMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUpOrLeave = (e: React.MouseEvent) => {
    if (isSwipingFace.current) {
      handleStickerSwipeEnd();
    } else {
      processSwipeEnd(e.clientX, e.clientY);
    }
    isDragging.current = false;
    isSwipingFace.current = false;
    swipeStartFace.current = null;
    swipeStartStickerIdx.current = null;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!interactive) return;
    isDragging.current = true;
    didPerformStickerSwipe.current = false;
    didRotateCamera.current = false;
    const touch = e.touches[0];
    prevMousePos.current = { x: touch.clientX, y: touch.clientY };
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || !interactive) return;
    const touch = e.touches[0];

    const deltaX = touch.clientX - touchStartPos.current.x;
    const deltaY = touch.clientY - touchStartPos.current.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (swipeStartFace.current !== null && !isSwipingFace.current && !didRotateCamera.current) {
      if (distance >= 8) {
        const move = getMoveFrom3DSwipe(
          swipeStartFace.current,
          swipeStartStickerIdx.current!,
          deltaX,
          deltaY,
          rotateX,
          rotateY
        );

        if (move) {
          isSwipingFace.current = true;
          activeDragMove.current = move;
          triggerHaptic(10);
        } else {
          didRotateCamera.current = true;
        }
      }
    } else if (swipeStartFace.current === null && !didRotateCamera.current) {
      if (distance >= 3) {
        didRotateCamera.current = true;
      }
    }

    if (isSwipingFace.current) {
      performStickerDrag(deltaX, deltaY);
    } else if (didRotateCamera.current) {
      const stepX = touch.clientX - prevMousePos.current.x;
      const stepY = touch.clientY - prevMousePos.current.y;

      if (Math.abs(stepX) > 10 || Math.abs(stepY) > 10) {
        triggerHaptic(5);
      }

      setRotateY((prev) => prev + stepX * sensitivity);
      setRotateX((prev) => Math.max(-85, Math.min(85, prev - stepY * sensitivity)));
    }

    prevMousePos.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = () => {
    if (isSwipingFace.current) {
      handleStickerSwipeEnd();
    } else {
      processSwipeEnd(prevMousePos.current.x, prevMousePos.current.y);
    }
    isDragging.current = false;
    isSwipingFace.current = false;
    swipeStartFace.current = null;
    swipeStartStickerIdx.current = null;
  };

  const cubies = CUBIES;
  const cubieFaceConfigs = CUBIE_FACE_CONFIGS;
  const quickMoves = QUICK_MOVES;

  return (
    <div className="flex flex-col items-center justify-center p-3 sm:p-4 bg-neutral-900/40 rounded-2xl sm:rounded-3xl border border-white/5 shadow-2xl backdrop-blur-md w-full max-w-[340px] xs:max-w-[380px] sm:max-w-none">
      {/* 3D Cube Stage Container */}
      <div className="relative w-full aspect-square max-w-[260px] xs:max-w-[280px] sm:max-w-[360px] md:max-w-[400px] flex items-center justify-center overflow-hidden py-4 sm:py-8 select-none">
        {/* Interaction helper text overlay */}
        {interactive && (
          <div className="absolute top-1.5 left-2 flex items-center gap-1 text-[10px] sm:text-xs text-neutral-400 font-medium pointer-events-none">
            <RefreshCw size={11} className="animate-spin-slow text-blue-500" />
            <span>Vuốt xoay 3D</span>
          </div>
        )}

        {/* 3D Scene viewport */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            perspective: '1000px',
            cursor: isDragging.current ? 'grabbing' : 'grab',
          }}
          className="w-full h-full flex items-center justify-center touch-none scale-90 sm:scale-100"
        >
          {/* Animated Cube skeleton */}
          <div
            style={{
              transform: `scale(${zoom}) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
              transformStyle: 'preserve-3d',
              transition: isDragging.current ? 'none' : 'transform 0.1s ease-out',
            }}
            className="w-48 h-48 relative transition-transform duration-300"
          >
            {/* 26 Individual cubies styled via absolute 3D position */}
            {cubies.map(({ cx, cy, cz }) => {
              const colors = getCubieColors(cx, cy, cz, state);
              const stickerMap = getCubieStickerMap(cx, cy, cz);

              const baseTranslate = `translate3d(${cx * 44}px, ${cy * 44}px, ${cz * 44}px)`;
              let transformStr = baseTranslate;
              let isTransitioning = false;

              if (animatingFace) {
                const { face, angle } = animatingFace;
                let matches = false;
                let rotateStr = '';

                if (face === 'U' && cy === -1) { matches = true; rotateStr = `rotateY(${-angle}deg)`; }
                else if (face === 'D' && cy === 1) { matches = true; rotateStr = `rotateY(${angle}deg)`; }
                else if (face === 'L' && cx === -1) { matches = true; rotateStr = `rotateX(${-angle}deg)`; }
                else if (face === 'R' && cx === 1) { matches = true; rotateStr = `rotateX(${angle}deg)`; }
                else if (face === 'F' && cz === 1) { matches = true; rotateStr = `rotateZ(${angle}deg)`; }
                else if (face === 'B' && cz === -1) { matches = true; rotateStr = `rotateZ(${-angle}deg)`; }

                if (matches) {
                  transformStr = `${rotateStr} ${baseTranslate}`;
                  isTransitioning = true;
                }
              } else if (dragRotation) {
                const { face, angle } = dragRotation;
                let matches = false;
                let rotateStr = '';

                if (face === 'U' && cy === -1) { matches = true; rotateStr = `rotateY(${-angle}deg)`; }
                else if (face === 'D' && cy === 1) { matches = true; rotateStr = `rotateY(${angle}deg)`; }
                else if (face === 'L' && cx === -1) { matches = true; rotateStr = `rotateX(${-angle}deg)`; }
                else if (face === 'R' && cx === 1) { matches = true; rotateStr = `rotateX(${angle}deg)`; }
                else if (face === 'F' && cz === 1) { matches = true; rotateStr = `rotateZ(${angle}deg)`; }
                else if (face === 'B' && cz === -1) { matches = true; rotateStr = `rotateZ(${-angle}deg)`; }

                if (matches) {
                  transformStr = `${rotateStr} ${baseTranslate}`;
                  isTransitioning = false; // Disable transition for 1:1 finger tracing
                }
              }

              return (
                <div
                  key={`${cx}-${cy}-${cz}`}
                  style={{
                    transform: transformStr,
                    transformStyle: 'preserve-3d',
                    transition: isTransitioning ? 'transform 250ms cubic-bezier(0.25, 1, 0.5, 1)' : 'none',
                    width: '42px',
                    height: '42px',
                    marginLeft: '-21px',
                    marginTop: '-21px',
                  }}
                  className="absolute left-1/2 top-1/2"
                >
                  {cubieFaceConfigs.map(({ dir, transform: faceTransform, faceName }) => {
                    const color = colors[faceName];
                    const stickerIdx = stickerMap[faceName];
                    const isHighlighted = highlightedIndices && highlightedIndices.face === faceName && stickerIdx !== undefined && highlightedIndices.indices.includes(stickerIdx);
                    const isOuterFace = color !== undefined;

                    return (
                      <div
                        key={dir}
                        onMouseDown={(e) => {
                          if (interactive && isOuterFace && stickerIdx !== undefined) {
                            handleStickerMouseDown(e, faceName, stickerIdx);
                          }
                        }}
                        onTouchStart={(e) => {
                          if (interactive && isOuterFace && stickerIdx !== undefined) {
                            handleStickerTouchStart(e, faceName, stickerIdx);
                          }
                        }}
                        style={{
                          transform: faceTransform,
                          transformStyle: 'preserve-3d',
                          backgroundColor: '#0d1117',
                          boxShadow: isOuterFace ? '0 0 0 1px #050505' : 'none',
                          width: '42px',
                          height: '42px',
                        }}
                        className="absolute inset-0 rounded-[4px] flex items-center justify-center backface-hidden border border-neutral-900/60"
                      >
                        {isOuterFace && color && (
                          <button
                            onClick={() => {
                              triggerHaptic(10);
                              if (onStickerClick && stickerIdx !== undefined) {
                                onStickerClick(faceName, stickerIdx);
                              }
                            }}
                            style={{
                              backgroundColor: color,
                              boxShadow: isHighlighted ? 'inset 0 0 0 3px #3b82f6, 0 0 8px 1px #3b82f6' : 'inset 0 0 1px 1px rgba(0,0,0,0.15)',
                            }}
                            className={`w-[88%] h-[88%] rounded-[5px] transition-transform duration-200 cursor-pointer ${
                              onStickerClick || onMove ? 'hover:scale-95 active:scale-90 touch-none border border-neutral-900/20' : 'border border-neutral-900/40'
                            }`}
                            title={`Mặt ${faceName} ô số ${(stickerIdx ?? 0) + 1}`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Camera Position Controls & Display Mode */}
      {!minimal && (
        <div className="flex flex-wrap items-center gap-3 w-full justify-between mt-3 border-t border-white/5 pt-3">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              id="btn-zoom-in"
              className="p-1 px-1.5 sm:p-1.5 text-neutral-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors border border-white/5"
              onClick={() => {
                triggerHaptic(8);
                setZoom((z) => Math.min(1.8, z + 0.1));
              }}
              title="Phóng to"
            >
              <ZoomIn size={15} />
            </button>
            <button
              id="btn-zoom-out"
              className="p-1 px-1.5 sm:p-1.5 text-neutral-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors border border-white/5"
              onClick={() => {
                triggerHaptic(8);
                setZoom((z) => Math.max(0.7, z - 0.1));
              }}
              title="Thu nhỏ"
            >
              <ZoomOut size={15} />
            </button>
            <button
              id="btn-reset-ortho"
              className="p-1 px-2 sm:p-1.5 text-neutral-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors border border-white/5 text-[11px] sm:text-xs font-semibold flex items-center gap-1"
              onClick={() => {
                triggerHaptic(12);
                setRotateX(-25);
                setRotateY(45);
                setZoom(1.1);
              }}
              title="Định dạng góc nhìn chuẩn"
            >
              <Maximize2 size={12} />
              <span className="hidden xs:inline">Tiêu chuẩn</span>
            </button>
          </div>

          <div className="flex flex-1 sm:flex-none justify-end sm:justify-start items-center gap-2 ml-auto sm:ml-0">
            <span className="text-[10px] text-neutral-400 font-medium whitespace-nowrap">Độ nhạy:</span>
            <input 
              type="range" 
              min="0.2" 
              max="2.0" 
              step="0.1" 
              value={sensitivity} 
              onChange={(e) => setSensitivity(parseFloat(e.target.value))}
              className="w-16 sm:w-20 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:rounded-full"
            />
          </div>

          <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider hidden sm:inline-block">
            X: {Math.round(rotateX)}° | Y: {Math.round(rotateY)}°
          </span>
        </div>
      )}

      {/* Hybrid Smart Gesture tip overlay */}
      {!minimal && interactive && onMove && (
        <div className="w-full mt-3 bg-neutral-950/40 p-2.5 sm:p-3 rounded-2xl border border-white/5 space-y-1 text-left">
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400">
            <Sparkles size={13} className="animate-pulse" />
            <span>Cảm ứng 3D thông minh tích hợp:</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            • <strong className="text-zinc-200">Vuốt trực tiếp trên màu Rubik</strong> để tự động xoay chuyển các lớp màu theo chiều ngón tay.<br />
            • <strong className="text-zinc-200">Kéo chéo hoặc kéo ngoài khoảng trống</strong> để xoay đổi góc nhìn 3D đa chiều cực kỳ mượt mà.
          </p>
        </div>
      )}

      {/* Quick turn buttons for direct Virtual Cube manipulations */}
      {!minimal && onMove && (
        <div className="w-full mt-3 bg-neutral-950/60 p-2.5 sm:p-3.5 rounded-2xl border border-white/5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] sm:text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Xoay Khối Ảo Nhanh:</span>
            <span className="text-[9px] font-mono text-amber-400/80 italic hidden xs:inline sm:inline">Dấu (') là xoay ngược chiều</span>
          </div>
          <div className="grid grid-cols-6 gap-1 sm:gap-1.5">
            {quickMoves.map((m) => (
              <button
                key={m}
                id={`btn-move-${m.replace("'", 'prime')}`}
                onClick={() => {
                  triggerHaptic(15);
                  handlePerformMove(m);
                }}
                className="py-1 sm:py-1.5 text-[11px] sm:text-xs font-mono font-bold bg-neutral-800 text-white hover:bg-blue-600 hover:text-white rounded-lg border border-white/5 active:scale-95 transition-all text-center cursor-pointer"
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default ThreeDCube;
