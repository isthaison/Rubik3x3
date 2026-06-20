import { FaceName, CubeColor, CubeState } from '../types';
import { COLORS } from './cubeEngine';

export const CUBIES: { cx: number; cy: number; cz: number }[] = [];
for (let cx = -1; cx <= 1; cx++) {
  for (let cy = -1; cy <= 1; cy++) {
    for (let cz = -1; cz <= 1; cz++) {
      if (cx === 0 && cy === 0 && cz === 0) continue;
      CUBIES.push({ cx, cy, cz });
    }
  }
}

export const CUBIE_FACE_CONFIGS: { dir: string; transform: string; faceName: FaceName }[] = [
  { dir: 'U', transform: 'rotateX(90deg) translateZ(21px)', faceName: 'U' },
  { dir: 'D', transform: 'rotateX(-90deg) translateZ(21px)', faceName: 'D' },
  { dir: 'F', transform: 'rotateY(0deg) translateZ(21px)', faceName: 'F' },
  { dir: 'B', transform: 'rotateY(180deg) translateZ(21px)', faceName: 'B' },
  { dir: 'L', transform: 'rotateY(-90deg) translateZ(21px)', faceName: 'L' },
  { dir: 'R', transform: 'rotateY(90deg) translateZ(21px)', faceName: 'R' },
];

export const QUICK_MOVES = ['R', "R'", 'U', "U'", 'F', "F'", 'L', "L'", 'D', "D'", 'B', "B'"];

export const getFaceLabel = (face: FaceName): string => {
  switch (face) {
    case 'U': return 'Trên (U - Trắng)';
    case 'D': return 'Dưới (D - Vàng)';
    case 'F': return 'Trước (F - Lục)';
    case 'B': return 'Sau (B - Lam)';
    case 'L': return 'Trái (L - Cam)';
    case 'R': return 'Phải (R - Đỏ)';
  }
};

export const getCubieColors = (cx: number, cy: number, cz: number, cubeState: CubeState) => {
  const colors: { [key in FaceName]?: string } = {};

  // U Face (cy === -1)
  if (cy === -1) {
    let idx = 0;
    if (cz === -1) idx = cx === -1 ? 0 : cx === 0 ? 1 : 2;
    else if (cz === 0) idx = cx === -1 ? 3 : cx === 0 ? 4 : 5;
    else if (cz === 1) idx = cx === -1 ? 6 : cx === 0 ? 7 : 8;
    colors.U = COLORS[cubeState.U[idx]];
  }

  // D Face (cy === 1)
  if (cy === 1) {
    let idx = 0;
    if (cz === 1) idx = cx === -1 ? 0 : cx === 0 ? 1 : 2;
    else if (cz === 0) idx = cx === -1 ? 3 : cx === 0 ? 4 : 5;
    else if (cz === -1) idx = cx === -1 ? 6 : cx === 0 ? 7 : 8;
    colors.D = COLORS[cubeState.D[idx]];
  }

  // F Face (cz === 1)
  if (cz === 1) {
    let idx = 0;
    if (cy === -1) idx = cx === -1 ? 0 : cx === 0 ? 1 : 2;
    else if (cy === 0) idx = cx === -1 ? 3 : cx === 0 ? 4 : 5;
    else if (cy === 1) idx = cx === -1 ? 6 : cx === 0 ? 7 : 8;
    colors.F = COLORS[cubeState.F[idx]];
  }

  // B Face (cz === -1)
  if (cz === -1) {
    let idx = 0;
    if (cy === -1) idx = cx === 1 ? 0 : cx === 0 ? 1 : 2;
    else if (cy === 0) idx = cx === 1 ? 3 : cx === 0 ? 4 : 5;
    else if (cy === 1) idx = cx === 1 ? 6 : cx === 0 ? 7 : 8;
    colors.B = COLORS[cubeState.B[idx]];
  }

  // L Face (cx === -1)
  if (cx === -1) {
    let idx = 0;
    if (cy === -1) idx = cz === -1 ? 0 : cz === 0 ? 1 : 2;
    else if (cy === 0) idx = cz === -1 ? 3 : cz === 0 ? 4 : 5;
    else if (cy === 1) idx = cz === -1 ? 6 : cz === 0 ? 7 : 8;
    colors.L = COLORS[cubeState.L[idx]];
  }

  // R Face (cx === 1)
  if (cx === 1) {
    let idx = 0;
    if (cy === -1) idx = cz === 1 ? 0 : cz === 0 ? 1 : 2;
    else if (cy === 0) idx = cz === 1 ? 3 : cz === 0 ? 4 : 5;
    else if (cy === 1) idx = cz === 1 ? 6 : cz === 0 ? 7 : 8;
    colors.R = COLORS[cubeState.R[idx]];
  }

  return colors;
};

export const getCubieStickerMap = (cx: number, cy: number, cz: number) => {
  const map: { [key in FaceName]?: number } = {};

  // U Face (cy === -1)
  if (cy === -1) {
    let idx = 0;
    if (cz === -1) idx = cx === -1 ? 0 : cx === 0 ? 1 : 2;
    else if (cz === 0) idx = cx === -1 ? 3 : cx === 0 ? 4 : 5;
    else if (cz === 1) idx = cx === -1 ? 6 : cx === 0 ? 7 : 8;
    map.U = idx;
  }

  // D Face (cy === 1)
  if (cy === 1) {
    let idx = 0;
    if (cz === 1) idx = cx === -1 ? 0 : cx === 0 ? 1 : 2;
    else if (cz === 0) idx = cx === -1 ? 3 : cx === 0 ? 4 : 5;
    else if (cz === -1) idx = cx === -1 ? 6 : cx === 0 ? 7 : 8;
    map.D = idx;
  }

  // F Face (cz === 1)
  if (cz === 1) {
    let idx = 0;
    if (cy === -1) idx = cx === -1 ? 0 : cx === 0 ? 1 : 2;
    else if (cy === 0) idx = cx === -1 ? 3 : cx === 0 ? 4 : 5;
    else if (cy === 1) idx = cx === -1 ? 6 : cx === 0 ? 7 : 8;
    map.F = idx;
  }

  // B Face (cz === -1)
  if (cz === -1) {
    let idx = 0;
    if (cy === -1) idx = cx === 1 ? 0 : cx === 0 ? 1 : 2;
    else if (cy === 0) idx = cx === 1 ? 3 : cx === 0 ? 4 : 5;
    else if (cy === 1) idx = cx === 1 ? 6 : cx === 0 ? 7 : 8;
    map.B = idx;
  }

  // L Face (cx === -1)
  if (cx === -1) {
    let idx = 0;
    if (cy === -1) idx = cz === -1 ? 0 : cz === 0 ? 1 : 2;
    else if (cy === 0) idx = cz === -1 ? 3 : cz === 0 ? 4 : 5;
    else if (cy === 1) idx = cz === -1 ? 6 : cz === 0 ? 7 : 8;
    map.L = idx;
  }

  // R Face (cx === 1)
  if (cx === 1) {
    let idx = 0;
    if (cy === -1) idx = cz === 1 ? 0 : cz === 0 ? 1 : 2;
    else if (cy === 0) idx = cz === 1 ? 3 : cz === 0 ? 4 : 5;
    else if (cy === 1) idx = cz === 1 ? 6 : cz === 0 ? 7 : 8;
    map.R = idx;
  }

  return map;
};

export const getMoveFrom3DSwipe = (
  face: FaceName,
  stickerIdx: number,
  dx: number,
  dy: number,
  rotX: number,
  rotY: number
) => {
  // 1. Get sticker coordinates
  let cx = 0, cy = 0, cz = 0;
  const row = Math.floor(stickerIdx / 3) - 1; // -1, 0, 1
  const col = (stickerIdx % 3) - 1; // -1, 0, 1

  let tX: [number, number, number] = [0, 0, 0];
  let tY: [number, number, number] = [0, 0, 0];
  let normal: [number, number, number] = [0, 0, 0];

  switch (face) {
    case 'F': cz = 1; cx = col; cy = row; normal = [0, 0, 1]; tX = [1, 0, 0]; tY = [0, 1, 0]; break;
    case 'B': cz = -1; cx = -col; cy = row; normal = [0, 0, -1]; tX = [-1, 0, 0]; tY = [0, 1, 0]; break;
    case 'L': cx = -1; cz = col; cy = row; normal = [-1, 0, 0]; tX = [0, 0, 1]; tY = [0, 1, 0]; break;
    case 'R': cx = 1; cz = -col; cy = row; normal = [1, 0, 0]; tX = [0, 0, -1]; tY = [0, 1, 0]; break;
    case 'U': cy = -1; cx = col; cz = row; normal = [0, -1, 0]; tX = [1, 0, 0]; tY = [0, 0, 1]; break;
    case 'D': cy = 1; cx = col; cz = -row; normal = [0, 1, 0]; tX = [1, 0, 0]; tY = [0, 0, -1]; break;
  }

  // 2. Project local tangents to screen space
  const rx = rotX * Math.PI / 180;
  const ry = rotY * Math.PI / 180;
  const rcx = Math.cos(rx), rsx = Math.sin(rx);
  const rcy = Math.cos(ry), rsy = Math.sin(ry);

  const projectToScreen = (x: number, y: number, z: number) => {
    const x1 = x * rcy + z * rsy;
    const y1 = y;
    const z1 = -x * rsy + z * rcy;
    return {
      x: x1,
      y: y1 * rcx - z1 * rsx
    };
  };

  const screenX = projectToScreen(tX[0], tX[1], tX[2]);
  const screenY = projectToScreen(tY[0], tY[1], tY[2]);

  // 3. Dot product with swipe vector
  const dotX = dx * screenX.x + dy * screenX.y;
  const dotY = dx * screenY.x + dy * screenY.y;

  let v: [number, number, number] = [0, 0, 0];
  if (Math.abs(dotX) > Math.abs(dotY)) {
    const sign = dotX > 0 ? 1 : -1;
    v = [tX[0] * sign, tX[1] * sign, tX[2] * sign];
  } else {
    const sign = dotY > 0 ? 1 : -1;
    v = [tY[0] * sign, tY[1] * sign, tY[2] * sign];
  }

  // 4. Test all 6 standard rotations
  const P = [cx, cy, cz];
  const rotations: { face: FaceName; axis: [number, number, number]; sliceCoord: number; target: number }[] = [
    { face: 'U', axis: [0, -1, 0], sliceCoord: 1, target: -1 },
    { face: 'D', axis: [0, 1, 0], sliceCoord: 1, target: 1 },
    { face: 'L', axis: [-1, 0, 0], sliceCoord: 0, target: -1 },
    { face: 'R', axis: [1, 0, 0], sliceCoord: 0, target: 1 },
    { face: 'F', axis: [0, 0, 1], sliceCoord: 2, target: 1 },
    { face: 'B', axis: [0, 0, -1], sliceCoord: 2, target: -1 },
  ];

  let bestMove: string | null = null;
  let maxDot = 0;

  for (const rot of rotations) {
    // Must be perpendicular to the touched face to be a valid swipe
    const dotNormal = rot.axis[0] * normal[0] + rot.axis[1] * normal[1] + rot.axis[2] * normal[2];
    if (dotNormal !== 0) continue;

    // Must be on the correct slice
    if (P[rot.sliceCoord] !== rot.target) continue;

    // Calculate A x P
    const axp = [
      rot.axis[1] * P[2] - rot.axis[2] * P[1],
      rot.axis[2] * P[0] - rot.axis[0] * P[2],
      rot.axis[0] * P[1] - rot.axis[1] * P[0]
    ];

    const moveDot = v[0] * axp[0] + v[1] * axp[1] + v[2] * axp[2];

    if (Math.abs(moveDot) > maxDot) {
      maxDot = Math.abs(moveDot);
      bestMove = moveDot > 0 ? rot.face : rot.face + "'";
    }
  }

  return bestMove;
};
