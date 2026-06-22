import React, { useState } from 'react';
import CubeSolver from './components/CubeSolver';
import ProTimer from './components/ProTimer';
import LearnAcademy from './components/LearnAcademy';
import { HelpCircle, Trophy, GraduationCap, Sparkles, Code, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type TabName = 'solver' | 'timer' | 'academy';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabName>('solver');

  // Set the visual metadata in code safely
  return (
    <div className="min-h-screen bg-[#0A0C10] text-slate-200 flex flex-col font-sans transition-all selection:bg-blue-500/30 selection:text-blue-300">
      
      {/* Upper Brand Header - Optimized & highly compact space saving design */}
      <header className="border-b border-slate-800 bg-[#0D1117] backdrop-blur-md sticky top-0 z-50 py-1.5 sm:py-2">
        <div className="max-w-5xl mx-auto px-3 sm:px-2 flex flex-col md:flex-row items-center justify-between gap-1.5.5">
          <div className="flex items-center justify-between w-full md:w-auto gap-1.5.5 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              {/* Extremely compact vector Rubik Core Logo */}
              <div className="w-6 h-6 sm:w-7 sm:h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded flex items-center justify-center font-bold text-white shadow-md relative shrink-0">
                <div className="grid grid-cols-2 gap-0.5 w-4 aspect-square font-bold text-white text-[7px] sm:text-[8px] leading-none text-center">
                  <span className="p-0 bg-black/40 rounded-xs flex items-center justify-center">R</span>
                  <span className="p-0 bg-black/40 rounded-xs flex items-center justify-center">U</span>
                  <span className="p-0 bg-black/40 rounded-xs flex items-center justify-center">B</span>
                  <span className="p-0 bg-black/40 rounded-xs flex items-center justify-center">X</span>
                </div>
              </div>
              
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-white flex items-center gap-1 leading-none">
                  <span>Rubik Master</span>
                  <span className="text-blue-500 font-black text-xs sm:text-sm">PRO</span>
                </h1>
                <p className="text-[9px] text-slate-400 truncate hidden sm:block mt-0.5">Hệ thống giải mã & huấn luyện 3x3</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[7.5px] font-mono font-bold bg-blue-500/15 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">v2.4</span>
            </div>
          </div>

          {/* Compact tab controllers laid out in a slim single bar */}
          <div className="flex items-center gap-1.5 overflow-hidden w-full md:w-auto">
            <nav className="flex items-center gap-0.5 bg-[#0A0C10] p-0.5 rounded-lg border border-slate-800/80 overflow-x-auto scrollbar-none flex-nowrap w-full md:w-auto">
              <button
                id="tab-btn-solver"
                onClick={() => setActiveTab('solver')}
                className={`flex-1 md:flex-none flex items-center justify-center gap-1 px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'solver'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Cpu size={12} className="shrink-0" />
                <span className="block sm:hidden">Giải 3D</span>
                <span className="hidden sm:block">Giải Mã 3D</span>
              </button>

              <button
                id="tab-btn-timer"
                onClick={() => setActiveTab('timer')}
                className={`flex-1 md:flex-none flex items-center justify-center gap-1 px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'timer'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Trophy size={11} className="shrink-0" />
                <span className="block sm:hidden">Time</span>
                <span className="hidden sm:block">Bấm Giờ</span>
              </button>

              <button
                id="tab-btn-academy"
                onClick={() => setActiveTab('academy')}
                className={`flex-1 md:flex-none flex items-center justify-center gap-1 px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'academy'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <GraduationCap size={12} className="shrink-0" />
                <span className="block sm:hidden">Học</span>
                <span className="hidden sm:block">Học Viện</span>
              </button>
            </nav>

            <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 bg-blue-900/10 border border-blue-500/20 rounded-lg shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
              <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">3D ENGINE</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Core View Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-2 sm:px-3 py-2 sm:py-2 overflow-hidden">
        
        {/* Dynamic active tab routing display rendered with premium fade/slide animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }} // Elegant easeOutQuint
          >
            {activeTab === 'solver' && <CubeSolver />}
            {activeTab === 'timer' && <ProTimer />}
            {activeTab === 'academy' && <LearnAcademy />}
          </motion.div>
        </AnimatePresence>

      </main>

      {/* Bottom Footer */}
      <footer className="border-t border-slate-900 bg-[#0A0C10] py-3 mt-auto">
        <div className="max-w-5xl mx-auto px-2 flex flex-col sm:flex-row items-center justify-between gap-1.5 text-xs text-slate-500 font-medium">
          <span>Giải pháp xoay Rubik 3D chuyên nghiệp</span>
          <span className="font-bold text-slate-400">© 2026 Rubik Master Pro</span>
        </div>
      </footer>
    </div>
  );
}
