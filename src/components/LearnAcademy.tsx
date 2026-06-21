import React, { useState } from 'react';
import { LearnLesson, CubeState } from '../types';
import { getSolvedState, applyMoves } from '../utils/cubeEngine';
import ThreeDCube from './ThreeDCube';
import { BookOpen, GraduationCap, ChevronLeft, ChevronRight, Play, Award, HelpCircle, Activity, RefreshCw } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

const LESSONS: LearnLesson[] = [
  {
    id: 'intro-cube',
    title: '1. Nhập môn Rubik & Cấu tạo 3x3',
    difficulty: 'Cơ bản',
    estimatedTime: '5 phút',
    description: 'Tìm hiểu tổng quan về khối Rubik, quy luật màu sắc và sự khác biệt cốt lõi giữa các bộ phận: Tâm, Cạnh và Góc.',
    steps: [
      {
        title: 'Quy luật màu sắc đối xứng',
        content: 'Một khối Rubik tiêu chuẩn luôn tuân theo hệ màu đối xứng không đổi: \n- Mặt Trắng đối diện màu Vàng \n- Mặt Xanh lá đối diện màu Xanh dương \n- Mặt Cam đối diện màu Đỏ.\nKhi giữ mặt Trắng ở U và Lục ở F, Đỏ sẽ nằm bên R và Cam nằm bên L.',
      },
      {
        title: '3 loại mảnh cấu tạo khối Rubik',
        content: 'Khối Rubik 3x3 được cấu thành bởi 3 loại mảnh có đặc tính chuyển động khác nhau:\n1. Mảnh Tâm (Center - 6 mảnh): Chỉ có 1 mặt màu, nằm ở giữa mỗi mặt và cố định hoàn toàn.\n2. Mảnh Cạnh (Edge - 12 mảnh): Có 2 mặt màu, nằm xen kẽ giữa các tâm.\n3. Mảnh Góc (Corner - 8 mảnh): Có 3 mặt màu, nằm ở các góc đỉnh của khối.',
      }
    ]
  },
  {
    id: 'notations',
    title: '2. Học thuộc Ký hiệu xoay WCA',
    difficulty: 'Cơ bản',
    estimatedTime: '8 phút',
    description: 'Học cách đọc ký hiệu quốc tế của WCA để giải quyết bất kỳ công thức Rubik nâng cao nào.',
    steps: [
      {
        title: 'Các chữ cái chỉ mặt xoay',
        content: 'Mỗi chữ cái viết hoa đại diện cho việc xoay MẶT TƯƠNG ỨNG 90 độ theo chiều Kim Đồng Hồ khi nhìn trực diện mặt đó:\n- **R (Right)**: Xoay mặt Phải lên trên.\n- **L (Left)**: Xoay mặt Trái xuống dưới.\n- **U (Up)**: Xoay mặt Trên sang trái.\n- **D (Down)**: Xoay mặt Dưới sang phải.\n- **F (Front)**: Xoay mặt Trước theo chiều kim đồng hồ.\n- **B (Back)**: Xoay mặt Sau theo chiều kim đồng hồ.',
      },
      {
        title: 'Ký hiệu có dấu nháy và số 2',
        content: 'Để xoay hướng khác:\n- **Dấu nháy (\')**: Xoay ngược chiều kim đồng hồ 90 độ. Ví dụ: **R\'** nghĩa là xoay mặt Phải ngược xuống đáy.\n- **Số 2 (ví dụ R2, U2)**: Xoay mặt đó 180 độ (hai lần xoay). Bạn xoay chiều nào cũng đều ra kết quả giống nhau!',
      }
    ]
  },
  {
    id: 'moves-sexy-sledge',
    title: '3. Hai Công thức "Kinh Điển" siêu cấp',
    difficulty: 'Trung bình',
    estimatedTime: '10 phút',
    description: 'Làm quen với Sexy Move và Sledgehammer - 2 tổ hợp chuyển động nền tảng áp dụng cho mọi bước giải.',
    steps: [
      {
        title: 'Sexy Move: (R U R\' U\')',
        content: 'Tổ hợp đỉnh cao dùng để đưa góc trắng vào vị trí hoặc lật góc vàng. \n- Cách làm: Xoay Phải Lên, Trên sang Trái, Phải Xuống, Trên sang Phải.\n*Mẹo bổ ích: Nếu bạn thực hiện Sexy Move liên tục 6 lần từ trạng thái hoàn thành, khối Rubik sẽ quay về trạng thái hoàn hảo ban đầu!*',
        algorithm: "R U R' U'",
      },
      {
        title: 'Sledgehammer: (R\' F R F\')',
        content: 'Một công thức siêu ngắn dùng để định hướng các viên cạnh và phá gỡ liên kết góc bất lợi.\n- Cách làm: Phải Xuống, Trước theo chiều kim, Phải Lên, Trước ngược chiều kim.',
        algorithm: "R' F R F'",
      }
    ]
  },
  {
    id: 'lbl-stages-cross',
    title: '4. Giải tầng 1 & Chữ Thập Trắng',
    difficulty: 'Trung bình',
    estimatedTime: '15 phút',
    description: 'Bản đồ thực hành giải tầng đầu tiên một cách mượt mà và trực quan.',
    steps: [
      {
        title: 'Làm chữ thập trắng ở đáy / đỉnh',
        content: 'Bước đầu tiên là tạo hình chữ thập màu trắng. Bạn cần đưa 4 viên cạnh Trắng-Lục, Trắng-Đỏ, Trắng-Lam, Trắng-Cam bao quanh tâm trắng. Chú ý các cạnh phải khớp màu với các tâm kề hông.',
        algorithm: 'F2 U L\' U',
      },
      {
        title: 'Giải góc tầng 1',
        content: 'Đặt viên góc trắng dưới đáy góc cần giải và dùng Sexy Move: (R U R\' U\') đến khi mặt Trắng hướng xuống đáy hoàn hảo. Lặp lại cho cả 4 góc của Tầng 1.',
        algorithm: "R U R' U'",
      }
    ]
  }
];

export default function LearnAcademy() {
  const [selectedLesson, setSelectedLesson] = useState<LearnLesson | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [academyCubeState, setAcademyCubeState] = useState<CubeState>(getSolvedState());

  const startLesson = (lesson: LearnLesson) => {
    triggerHaptic(20);
    setSelectedLesson(lesson);
    setCurrentStepIndex(0);
    // Initialize training cube
    let initialCube = getSolvedState();
    const firstStepAlg = lesson.steps[0].algorithm;
    if (firstStepAlg) {
      initialCube = applyMoves(initialCube, firstStepAlg.split(' '));
    }
    setAcademyCubeState(initialCube);
  };

  const handleStepChange = (index: number) => {
    if (!selectedLesson) return;
    triggerHaptic(15);
    setCurrentStepIndex(index);
    const step = selectedLesson.steps[index];
    if (step.algorithm) {
      // Apply the algorithm on a solved cube to display the target lesson scenario
      const preppedCube = applyMoves(getSolvedState(), step.algorithm.split(' '));
      setAcademyCubeState(preppedCube);
    } else {
      setAcademyCubeState(getSolvedState());
    }
  };

  const handleInteractiveMove = (move: string) => {
    triggerHaptic(12);
    setAcademyCubeState(prev => applyMoves(prev, [move]));
  };

  return (
    <div className="space-y-6">
      {/* Academy Title and Intro */}
      {!selectedLesson ? (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-600/20 to-neutral-900/40 p-6 rounded-3xl border border-blue-500/20 shadow-xl relative overflow-hidden">
            <div className="absolute -right-12 -top-12 opacity-10 blur-sm pointer-events-none">
              <GraduationCap size={240} className="text-blue-500" />
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-500/20 text-blue-400 rounded-2xl border border-blue-400/30">
                <GraduationCap size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white leading-tight">Học viện Rubik Pro (Academy)</h2>
                <p className="text-neutral-400 text-sm mt-1">
                  Đã chia nhỏ thành các bài học trực quan sinh động nhất. Lựa chọn bài học ngay để thành thục kỹ năng giải Rubik và nắm chắc từng ký hiệu chuẩn giải đấu.
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex items-center gap-1 text-[11px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-400/20">
                <Activity size={12} />
                Chế độ tự luyện
              </span>
              <span className="flex items-center gap-1 text-[11px] font-mono text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-400/20">
                <BookOpen size={12} />
                Minh họa 3D trực quan
              </span>
            </div>
          </div>

          {/* Lessons Grid list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {LESSONS.map((lesson) => (
              <div
                key={lesson.id}
                onClick={() => startLesson(lesson)}
                className="group p-5 bg-neutral-950/40 hover:bg-neutral-950/80 rounded-2xl border border-white/5 hover:border-blue-500/30 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between cursor-pointer shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${
                      lesson.difficulty === 'Cơ bản'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                    }`}>
                      {lesson.difficulty}
                    </span>
                    <span className="text-xs text-neutral-500 font-mono">{lesson.estimatedTime} học</span>
                  </div>
                  <h3 className="text-base font-bold text-neutral-200 group-hover:text-blue-400 transition-colors">
                    {lesson.title}
                  </h3>
                  <p className="text-neutral-400 text-xs mt-2 line-clamp-3 leading-relaxed">
                    {lesson.description}
                  </p>
                </div>
                <button className="mt-4 py-2 flex items-center justify-center gap-2 bg-neutral-800 text-white group-hover:bg-blue-600 group-hover:text-white rounded-xl border border-white/5 group-hover:border-blue-500 text-xs font-semibold tracking-wide transition-all pointer-events-none">
                  <Play size={12} fill="currentColor" />
                  <span>Bắt đầu học</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Active Lesson View Screen
        <div className="space-y-6">
          {/* Breadcrumb back header */}
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <button
              onClick={() => setSelectedLesson(null)}
              className="flex items-center gap-1 text-sm font-semibold text-neutral-400 hover:text-white transition-colors cursor-pointer bg-neutral-800/40 px-3 py-1.5 rounded-xl border border-white/5"
            >
              <ChevronLeft size={16} />
              <span>Quay lại hộc viện</span>
            </button>
            <div className="text-right">
              <span className="text-[11px] font-mono text-neutral-400 font-bold uppercase tracking-wider block">
                BÀI HỌC:
              </span>
              <span className="text-xs font-semibold text-blue-400">
                {selectedLesson.title}
              </span>
            </div>
          </div>

          {/* Combined Lesson screen with dynamic visualizer layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Lesson details container */}
            <div className="lg:col-span-5 space-y-5 bg-neutral-950/30 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-white/5 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest bg-neutral-900 border border-white/5 px-2.5 py-1 rounded-full">
                  Phần {currentStepIndex + 1} / {selectedLesson.steps.length}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full transition-all duration-300"
                  style={{ width: `${((currentStepIndex + 1) / selectedLesson.steps.length) * 100}%` }}
                />
              </div>

              {/* Step info text */}
              <div className="space-y-3">
                <h4 className="text-lg font-bold text-white border-l-4 border-blue-500 pl-3">
                  {selectedLesson.steps[currentStepIndex].title}
                </h4>
                <div className="text-neutral-300 text-sm leading-relaxed whitespace-pre-wrap font-sans bg-neutral-900/40 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-white/5">
                  {selectedLesson.steps[currentStepIndex].content}
                </div>
              </div>

              {/* Dynamic Algorithm Showcase inside the tutorial if any */}
              {selectedLesson.steps[currentStepIndex].algorithm && (
                <div className="bg-blue-950/20 p-4 rounded-2xl border border-blue-500/20 space-y-2">
                  <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest block">Tổ hợp thao tác (Algorithm):</span>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-mono font-bold text-blue-300 block tracking-wider bg-neutral-950/40 px-3 py-1.5 rounded-lg border border-blue-500/30">
                      {selectedLesson.steps[currentStepIndex].algorithm}
                    </span>
                    <button
                      onClick={() => handleStepChange(currentStepIndex)}
                      className="text-xs text-blue-400 hover:text-white bg-blue-500/10 px-3 py-1 rounded-lg hover:bg-blue-600 transition-all border border-blue-400/20 active:scale-95 cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw size={12} className="animate-spin-slow" />
                      <span>Xoay lại demo mẫu</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Steps control footer */}
              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <button
                  onClick={() => handleStepChange(currentStepIndex - 1)}
                  disabled={currentStepIndex === 0}
                  className="flex items-center gap-2 py-2 px-4 text-xs font-semibold tracking-wide bg-neutral-800 text-white disabled:pointer-events-none disabled:opacity-40 hover:bg-neutral-700 active:scale-95 transition-all rounded-xl border border-white/5 cursor-pointer"
                >
                  <ChevronLeft size={14} />
                  <span>Bước Trước</span>
                </button>

                {currentStepIndex < selectedLesson.steps.length - 1 ? (
                  <button
                    onClick={() => handleStepChange(currentStepIndex + 1)}
                    className="flex items-center gap-2 py-2 px-4 text-xs font-semibold tracking-wide bg-blue-600 text-white hover:bg-blue-500 active:scale-95 transition-all rounded-xl shadow-md cursor-pointer"
                  >
                    <span>Tiếp Theo</span>
                    <ChevronRight size={14} />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      triggerHaptic(25);
                      setSelectedLesson(null);
                    }}
                    className="flex items-center gap-2 py-2 px-4 text-xs font-semibold tracking-wide bg-blue-600 text-white hover:bg-blue-500 active:scale-95 transition-all rounded-xl shadow-md cursor-pointer"
                  >
                    <Award size={14} />
                    <span>Hoàn thành bài học</span>
                  </button>
                )}
              </div>
            </div>

            {/* Simulated 3D sandbox right side */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-neutral-950/30 p-4 rounded-3xl border border-white/5 flex flex-col items-center min-h-[350px] sm:min-h-[400px] lg:min-h-[480px]">
                <ThreeDCube
                  state={academyCubeState}
                  onMove={handleInteractiveMove}
                  interactive={true}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
