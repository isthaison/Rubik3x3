export type FaceName = 'U' | 'D' | 'F' | 'B' | 'L' | 'R';

export type CubeColor = 'white' | 'yellow' | 'green' | 'blue' | 'orange' | 'red';

export type CubeState = {
  [key in FaceName]: CubeColor[];
};

export interface SolverStep {
  stepIndex: number;
  title: string;
  subtitle: string;
  description: string;
  moves: string[];
  explanation: string;
  visualHighlight?: string; // e.g. "cross", "corners", "f2l", "oll", "pll"
}

export interface HistoryItem {
  id: string;
  scramble: string;
  time: number; // in ms
  date: string;
  plusTwo?: boolean;
  dnf?: boolean;
}

export interface LearnLesson {
  id: string;
  title: string;
  difficulty: 'Cơ bản' | 'Trung bình' | 'Nâng cao';
  estimatedTime: string;
  description: string;
  steps: {
    title: string;
    content: string;
    algorithm?: string;
    diagramCubeState?: Partial<CubeState> | 'sexy' | 'sledge' | 'none';
  }[];
}
