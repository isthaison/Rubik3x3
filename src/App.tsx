import React, { useState } from 'react';
import CubeSolver from './components/CubeSolver';
import ProTimer from './components/ProTimer';
import LearnAcademy from './components/LearnAcademy';
import AICoach from './components/AICoach';
import { HelpCircle, Trophy, GraduationCap, Sparkles, MessageSquare, Code, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type TabName = 'solver' | 'timer' | 'academy' | 'coach';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabName>('solver');

  // Set the visual metadata in code safely
  return (
    <div className="min-h-screen bg-[#0A0C10] text-slate-200 flex flex-col font-sans transition-all selection:bg-blue-500/30 selection:text-blue-300">
      
      {/* Upper Brand Header */}
      <header className="border-b border-slate-800 bg-[#0D1117] backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 w-full lg:w-auto">
            {/* Real aesthetic vector Rubik Core Logo */}
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded flex items-center justify-center font-bold text-white shadow-lg relative shrink-0">
              <div className="grid grid-cols-2 gap-0.5 w-5 aspect-square font-bold text-white text-[8px] leading-none text-center">
                <span className="p-0.5 bg-black/40 rounded-xs">R</span>
                <span className="p-0.5 bg-black/40 rounded-xs">U</span>
                <span className="p-0.5 bg-black/40 rounded-xs">B</span>
                <span className="p-0.5 bg-black/40 rounded-xs">X</span>
              </div>
            </div>
            
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-1.5 leading-tight">
                <span>Rubik Master</span>
                <span className="text-blue-500 font-extrabold uppercase">PRO</span>
                <span className="text-[9px] font-mono font-bold bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20">v2.4</span>
              </h1>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate">Hệ thống giải mã chuyên nghiệp & huấn luyện speedcubing 3x3 Việt Nam</p>
            </div>
          </div>

          {/* Quick tab controllers */}
          <div className="flex items-center gap-3 w-full lg:w-auto overflow-hidden">
            <nav className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-lg border border-slate-800 overflow-x-auto scrollbar-none w-full lg:w-auto flex-nowrap">
              <button
                id="tab-btn-solver"
                onClick={() => setActiveTab('solver')}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'solver'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Cpu size={14} />
                <span>Giải Mã 3D</span>
              </button>

              <button
                id="tab-btn-timer"
                onClick={() => setActiveTab('timer')}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'timer'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Trophy size={14} />
                <span>Bấm Giờ</span>
              </button>

              <button
                id="tab-btn-academy"
                onClick={() => setActiveTab('academy')}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'academy'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <GraduationCap size={14} />
                <span>Học Viện</span>
              </button>

              <button
                id="tab-btn-coach"
                onClick={() => setActiveTab('coach')}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'coach'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquare size={14} />
                <span>AI Coach</span>
              </button>
            </nav>

            <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-blue-900/20 border border-blue-500/30 rounded-full shrink-0">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
              <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">AR Camera Ready</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Core View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-8 overflow-hidden">
        
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
            {activeTab === 'coach' && <AICoach />}
          </motion.div>
        </AnimatePresence>

      </main>

      {/* Bottom Footer */}
      <footer className="border-t border-slate-900 bg-[#0A0C10] py-5 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
          <span>Giải pháp xoay Rubik 3D chuyên nghiệp</span>
          <span className="font-bold text-slate-400">© 2026 Rubik Master Pro</span>
        </div>
      </footer>
    </div>
  );
}
