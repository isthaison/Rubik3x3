import { CubeState, CubeColor, FaceName, SolverStep } from '../types';
import Cube from 'cubejs';

// Init solver in background
console.log('Cubejs module imported as:', Cube);
setTimeout(() => {
  try {
    Cube.initSolver();
  } catch(e) {
    console.error('Cubejs initSolver error:', e);
  }
}, 100);

// Standard colors
export const COLORS: { [key in CubeColor]: string } = {
  white: '#ffffff',
  yellow: '#facc15', // tailwind yellow-400
  green: '#22c55e',  // tailwind green-500
  blue: '#3b82f6',   // tailwind blue-500
  orange: '#f97316', // tailwind orange-500
  red: '#ef4444',    // tailwind red-500
};

// Initial solved state
export function getSolvedState(): CubeState {
  return {
    U: Array(9).fill('white'),
    D: Array(9).fill('yellow'),
    F: Array(9).fill('green'),
    B: Array(9).fill('blue'),
    L: Array(9).fill('orange'),
    R: Array(9).fill('red'),
  };
}

// Deep copy state
export function cloneState(state: CubeState): CubeState {
  return {
    U: [...state.U],
    D: [...state.D],
    F: [...state.F],
    B: [...state.B],
    L: [...state.L],
    R: [...state.R],
  };
}

// Face rotation matrixes for clockwise (CW) and counter-clockwise (CCW)
function rotateFaceCW(face: CubeColor[]): CubeColor[] {
  return [
    face[6], face[3], face[0],
    face[7], face[4], face[1],
    face[8], face[5], face[2]
  ];
}

function rotateFaceCCW(face: CubeColor[]): CubeColor[] {
  return [
    face[2], face[5], face[8],
    face[1], face[4], face[7],
    face[0], face[3], face[6]
  ];
}

function rotate180(face: CubeColor[]): CubeColor[] {
  return [
    face[8], face[7], face[6],
    face[5], face[4], face[3],
    face[2], face[1], face[0]
  ];
}

// List of all standard physical moves
export const MOVES_LIST = [
  'U', 'D', 'R', 'L', 'F', 'B', "U'", "D'", "R'", "L'", "F'", "B'", 'U2', 'D2', 'R2', 'L2', 'F2', 'B2',
  'r', "r'", 'r2', 'l', "l'", 'l2', 'u', "u'", 'u2', 'd', "d'", 'd2', 'f', "f'", 'f2', 'b', "b'", 'b2',
  'x', "x'", 'x2', 'y', "y'", 'y2', 'z', "z'", 'z2', 'M', "M'", 'M2', 'E', "E'", 'E2', 'S', "S'", 'S2'
];

// Apply a single move to state
export function applyMove(state: CubeState, move: string): CubeState {
  const next = cloneState(state);

  switch (move) {
    case 'U': {
      next.U = rotateFaceCW(next.U);
      const temp = [...next.F.slice(0, 3)];
      next.F[0] = next.R[0]; next.F[1] = next.R[1]; next.F[2] = next.R[2];
      next.R[0] = next.B[0]; next.R[1] = next.B[1]; next.R[2] = next.B[2];
      next.B[0] = next.L[0]; next.B[1] = next.L[1]; next.B[2] = next.L[2];
      next.L[0] = temp[0];   next.L[1] = temp[1];   next.L[2] = temp[2];
      break;
    }
    case "U'": {
      next.U = rotateFaceCCW(next.U);
      const temp = [...next.F.slice(0, 3)];
      next.F[0] = next.L[0]; next.F[1] = next.L[1]; next.F[2] = next.L[2];
      next.L[0] = next.B[0]; next.L[1] = next.B[1]; next.L[2] = next.B[2];
      next.B[0] = next.R[0]; next.B[1] = next.R[1]; next.B[2] = next.R[2];
      next.R[0] = temp[0];   next.R[1] = temp[1];   next.R[2] = temp[2];
      break;
    }
    case 'U2':
      return applyMove(applyMove(state, 'U'), 'U');

    case 'D': {
      next.D = rotateFaceCW(next.D);
      const temp = [...next.F.slice(6, 9)];
      next.F[6] = next.L[6]; next.F[7] = next.L[7]; next.F[8] = next.L[8];
      next.L[6] = next.B[6]; next.L[7] = next.B[7]; next.L[8] = next.B[8];
      next.B[6] = next.R[6]; next.B[7] = next.R[7]; next.B[8] = next.R[8];
      next.R[6] = temp[0];   next.R[7] = temp[1];   next.R[8] = temp[2];
      break;
    }
    case "D'": {
      next.D = rotateFaceCCW(next.D);
      const temp = [...next.F.slice(6, 9)];
      next.F[6] = next.R[6]; next.F[7] = next.R[7]; next.F[8] = next.R[8];
      next.R[6] = next.B[6]; next.R[7] = next.B[7]; next.R[8] = next.B[8];
      next.B[6] = next.L[6]; next.B[7] = next.L[7]; next.B[8] = next.L[8];
      next.L[6] = temp[0];   next.L[7] = temp[1];   next.L[8] = temp[2];
      break;
    }
    case 'D2':
      return applyMove(applyMove(state, 'D'), 'D');

    case 'R': {
      next.R = rotateFaceCW(next.R);
      const temp = [next.U[2], next.U[5], next.U[8]];
      next.U[2] = next.F[2]; next.U[5] = next.F[5]; next.U[8] = next.F[8];
      next.F[2] = next.D[2]; next.F[5] = next.D[5]; next.F[8] = next.D[8];
      next.D[2] = next.B[6]; next.D[5] = next.B[3]; next.D[8] = next.B[0];
      next.B[6] = temp[0];   next.B[3] = temp[1];   next.B[0] = temp[2];
      break;
    }
    case "R'": {
      next.R = rotateFaceCCW(next.R);
      const temp = [next.U[2], next.U[5], next.U[8]];
      next.U[2] = next.B[6]; next.U[5] = next.B[3]; next.U[8] = next.B[0];
      next.B[6] = next.D[2]; next.B[3] = next.D[5]; next.B[0] = next.D[8];
      next.D[2] = next.F[2]; next.D[5] = next.F[5]; next.D[8] = next.F[8];
      next.F[2] = temp[0];   next.F[5] = temp[1];   next.F[8] = temp[2];
      break;
    }
    case 'R2':
      return applyMove(applyMove(state, 'R'), 'R');

    case 'L': {
      next.L = rotateFaceCW(next.L);
      const temp = [next.U[0], next.U[3], next.U[6]];
      next.U[0] = next.B[8]; next.U[3] = next.B[5]; next.U[6] = next.B[2];
      next.B[8] = next.D[0]; next.B[5] = next.D[3]; next.B[2] = next.D[6];
      next.D[0] = next.F[0]; next.D[3] = next.F[3]; next.D[6] = next.F[6];
      next.F[0] = temp[0];   next.F[3] = temp[1];   next.F[6] = temp[2];
      break;
    }
    case "L'": {
      next.L = rotateFaceCCW(next.L);
      const temp = [next.U[0], next.U[3], next.U[6]];
      next.U[0] = next.F[0]; next.U[3] = next.F[3]; next.U[6] = next.F[6];
      next.F[0] = next.D[0]; next.F[3] = next.D[3]; next.F[6] = next.D[6];
      next.D[0] = next.B[8]; next.D[3] = next.B[5]; next.D[6] = next.B[2];
      next.B[8] = temp[0];   next.B[5] = temp[1];   next.B[2] = temp[2];
      break;
    }
    case 'L2':
      return applyMove(applyMove(state, 'L'), 'L');

    case 'F': {
      next.F = rotateFaceCW(next.F);
      const temp = [next.U[6], next.U[7], next.U[8]];
      next.U[6] = next.L[8]; next.U[7] = next.L[5]; next.U[8] = next.L[2];
      next.L[8] = next.D[2]; next.L[5] = next.D[1]; next.L[2] = next.D[0];
      next.D[2] = next.R[0]; next.D[1] = next.R[3]; next.D[0] = next.R[6];
      next.R[0] = temp[0];   next.R[3] = temp[1];   next.R[6] = temp[2];
      break;
    }
    case "F'": {
      next.F = rotateFaceCCW(next.F);
      const temp = [next.U[6], next.U[7], next.U[8]];
      next.U[6] = next.R[0]; next.U[7] = next.R[3]; next.U[8] = next.R[6];
      next.R[0] = next.D[2]; next.R[3] = next.D[1]; next.R[6] = next.D[0];
      next.D[2] = next.L[8]; next.D[1] = next.L[5]; next.D[0] = next.L[2];
      next.L[8] = temp[0];   next.L[5] = temp[1];   next.L[2] = temp[2];
      break;
    }
    case 'F2':
      return applyMove(applyMove(state, 'F'), 'F');

    case 'B': {
      next.B = rotateFaceCW(next.B);
      const temp = [next.U[0], next.U[1], next.U[2]];
      next.U[0] = next.R[2]; next.U[1] = next.R[5]; next.U[2] = next.R[8];
      next.R[2] = next.D[8]; next.R[5] = next.D[7]; next.R[8] = next.D[6];
      next.D[8] = next.L[6]; next.D[7] = next.L[3]; next.D[6] = next.L[0];
      next.L[6] = temp[0];   next.L[3] = temp[1];   next.L[0] = temp[2];
      break;
    }
    case "B'": {
      next.B = rotateFaceCCW(next.B);
      const temp = [next.U[0], next.U[1], next.U[2]];
      next.U[0] = next.L[6]; next.U[1] = next.L[3]; next.U[2] = next.L[0];
      next.L[6] = next.D[8]; next.L[3] = next.D[7]; next.L[0] = next.D[6];
      next.D[8] = next.R[2]; next.D[7] = next.R[5]; next.D[6] = next.R[8];
      next.R[2] = temp[0];   next.R[5] = temp[1];   next.R[8] = temp[2];
      break;
    }
    case 'B2':
      return applyMove(applyMove(state, 'B'), 'B');

    // Cube rotations
    case 'x':
      next.R = rotateFaceCW(state.R);
      next.L = rotateFaceCCW(state.L);
      next.U = [...state.F];
      next.B = rotate180(state.U);
      next.D = rotate180(state.B);
      next.F = [...state.D];
      break;
    case "x'":
      next.R = rotateFaceCCW(state.R);
      next.L = rotateFaceCW(state.L);
      next.U = rotate180(state.B);
      next.B = rotate180(state.D);
      next.D = [...state.F];
      next.F = [...state.U];
      break;
    case 'x2':
      return applyMove(applyMove(state, 'x'), 'x');
    case 'y':
      next.U = rotateFaceCW(state.U);
      next.D = rotateFaceCCW(state.D);
      next.F = [...state.R];
      next.L = [...state.F];
      next.B = [...state.L];
      next.R = [...state.B];
      break;
    case "y'":
      next.U = rotateFaceCCW(state.U);
      next.D = rotateFaceCW(state.D);
      next.F = [...state.L];
      next.R = [...state.F];
      next.B = [...state.R];
      next.L = [...state.B];
      break;
    case 'y2':
      return applyMove(applyMove(state, 'y'), 'y');
    case 'z':
      next.F = rotateFaceCW(state.F);
      next.B = rotateFaceCCW(state.B);
      next.U = rotateFaceCW(state.L);
      next.R = rotateFaceCW(state.U);
      next.D = rotateFaceCW(state.R);
      next.L = rotateFaceCW(state.D);
      break;
    case "z'":
      next.F = rotateFaceCCW(state.F);
      next.B = rotateFaceCW(state.B);
      next.U = rotateFaceCCW(state.R);
      next.L = rotateFaceCCW(state.U);
      next.D = rotateFaceCCW(state.L);
      next.R = rotateFaceCCW(state.D);
      break;
    case 'z2':
      return applyMove(applyMove(state, 'z'), 'z');

    // Wide moves
    case 'r': return applyMove(applyMove(state, 'x'), "L'");
    case "r'": return applyMove(applyMove(state, "x'"), 'L');
    case 'r2': return applyMove(applyMove(state, 'r'), 'r');
    case 'l': return applyMove(applyMove(state, "x'"), "R'");
    case "l'": return applyMove(applyMove(state, 'x'), 'R');
    case 'l2': return applyMove(applyMove(state, 'l'), 'l');
    case 'u': return applyMove(applyMove(state, 'y'), "D'");
    case "u'": return applyMove(applyMove(state, "y'"), 'D');
    case 'u2': return applyMove(applyMove(state, 'u'), 'u');
    case 'd': return applyMove(applyMove(state, "y'"), "U'");
    case "d'": return applyMove(applyMove(state, 'y'), 'U');
    case 'd2': return applyMove(applyMove(state, 'd'), 'd');
    case 'f': return applyMove(applyMove(state, 'z'), "B'");
    case "f'": return applyMove(applyMove(state, "z'"), 'B');
    case 'f2': return applyMove(applyMove(state, 'f'), 'f');
    case 'b': return applyMove(applyMove(state, "z'"), "F'");
    case "b'": return applyMove(applyMove(state, 'z'), 'F');
    case 'b2': return applyMove(applyMove(state, 'b'), 'b');

    // Slice moves
    // M follows L direction. So M = x' R L'
    case 'M': return applyMoves(state, ["x'", "R", "L'"]);
    case "M'": return applyMoves(state, ["x", "R'", "L"]);
    case 'M2': return applyMove(applyMove(state, 'M'), 'M');
    // E follows D direction. E = y' U D'
    case 'E': return applyMoves(state, ["y'", "U", "D'"]);
    case "E'": return applyMoves(state, ["y", "U'", "D"]);
    case 'E2': return applyMove(applyMove(state, 'E'), 'E');
    // S follows F direction. S = z B F'
    case 'S': return applyMoves(state, ["z", "B", "F'"]);
    case "S'": return applyMoves(state, ["z'", "B'", "F"]);
    case 'S2': return applyMove(applyMove(state, 'S'), 'S');
  }

  return next;
}

// Apply multiple moves
export function applyMoves(state: CubeState, moves: string[]): CubeState {
  let current = state;
  for (const move of moves) {
    if (move.trim()) {
      current = applyMove(current, move.trim());
    }
  }
  return current;
}

// Generate an elegant, mathematically valid scramble
export function generateScramble(): string {
  const steps = 18 + Math.floor(Math.random() * 5); // 18-22 moves
  const scramble: string[] = [];
  let lastAxis = -1;

  // Let's divide moves into axes: 0=U/D, 1=R/L, 2=F/B
  const axes = [
    ['U', "U'", 'U2', 'D', "D'", 'D2'],
    ['R', "R'", 'R2', 'L', "L'", 'L2'],
    ['F', "F'", 'F2', 'B', "B'", 'B2'],
  ];

  for (let i = 0; i < steps; i++) {
    let axis = Math.floor(Math.random() * 3);
    while (axis === lastAxis) {
      axis = Math.floor(Math.random() * 3);
    }
    const moveSet = axes[axis];
    const move = moveSet[Math.floor(Math.random() * moveSet.length)];
    scramble.push(move);
    lastAxis = axis;
  }

  return scramble.join(' ');
}

// Check if a state is already fully solved
export function isSolved(state: CubeState): boolean {
  const faces: FaceName[] = ['U', 'D', 'F', 'B', 'L', 'R'];
  for (const f of faces) {
    const center = state[f][4];
    if (state[f].some(val => val !== center)) {
      return false;
    }
  }
  return true;
}

// Convert internal state schema to standard Kociemba Facelet String (URFDLB format)
export function cubeStateToFaceletString(state: CubeState): string {
  const colorToFace = {
    [state.U[4]]: 'U',
    [state.R[4]]: 'R',
    [state.F[4]]: 'F',
    [state.D[4]]: 'D',
    [state.L[4]]: 'L',
    [state.B[4]]: 'B',
  } as Record<CubeColor, string>;

  let str = "";
  for (let i = 0; i < 9; i++) str += colorToFace[state.U[i]];
  for (let i = 0; i < 9; i++) str += colorToFace[state.R[i]];
  for (let i = 0; i < 9; i++) str += colorToFace[state.F[i]];
  for (let i = 0; i < 9; i++) str += colorToFace[state.D[i]];
  for (let i = 0; i < 9; i++) str += colorToFace[state.L[i]];
  for (let i = 0; i < 9; i++) str += colorToFace[state.B[i]];
  return str;
}

// Compute actual solution steps dynamically strictly from the entered face layers mapping
export function getSolutionSteps(scrambledState: CubeState): SolverStep[] {
  const steps: SolverStep[] = [];
  let tempState = cloneState(scrambledState);

  // If already solved
  if (isSolved(tempState)) {
    return [
      {
        stepIndex: 0,
        title: 'Đã hoàn thành!',
        subtitle: 'Khối Rubik đã được giải',
        description: 'Khối Rubik hiện tại của bạn đã ở trạng thái hoàn thành hoàn hảo.',
        moves: [],
        explanation: 'Chúc mừng! Không cần thực hiện thêm bước xoay nào.',
        visualHighlight: 'none',
      },
    ];
  }

  try {
    const str = cubeStateToFaceletString(scrambledState);
    const cube = Cube.fromString(str);
    const solutionStr = cube.solve();
    const moves = solutionStr.split(' ').filter((v: string) => v.trim());

    return [
      {
        stepIndex: 1,
        title: 'Giải theo Thuật toán Kociemba',
        subtitle: 'Giải thuật tối ưu 2-Phase (dưới 22 bước)',
        description: 'Thuật toán Kociemba đã phân tích thành công. Hệ thống áp dụng cách giải ngắn nhất để đưa khối Rubik về nguyên trạng.',
        moves: moves,
        explanation: `Đã tìm thấy cách giải phóng khối thành công trong ${moves.length} bước. Hãy thực hiện chi tiết từng thao tác theo trình mô phỏng thực tế.`,
        visualHighlight: 'none'
      }
    ];
  } catch (kociembaErr) {
    // Fallback if cube state is invalid or impossible to solve
    return [
      {
        stepIndex: 1,
        title: 'Lỗi Cấu Trúc Khối',
        subtitle: 'Trạng thái Rubik không hợp lệ (Không thể giải)',
        description: 'Hệ thống Kociemba đã phân tích nhưng phát hiện khối Rubik này bất khả thi để giải (có thể do nhập sai mặt, sai màu, lật góc thủ công hoặc khối Rubik bị lắp ráp sai mảnh).',
        moves: [],
        explanation: 'Vui lòng kiểm tra lại các mặt đã thiết lập và chỉnh sửa cho đúng cấu trúc Rubik 3x3x3.',
        visualHighlight: 'none'
      }
    ];
  }
}
