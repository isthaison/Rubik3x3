import { getSolvedState, applyMoves, isSolved, cubeStateToFaceletString } from './src/utils/cubeEngine';

let state = getSolvedState();
const moves = 'R L U2 R L F2 R2 U2 R2 F2 R2 U2 F2 L2'.split(' ');
state = applyMoves(state, moves);
console.log('My engine isSolved?', isSolved(state));
console.log('My engine facelet?', cubeStateToFaceletString(state));
