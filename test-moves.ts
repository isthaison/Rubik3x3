import { getSolvedState, applyMoves, getSolutionSteps, cubeStateToFaceletString } from './src/utils/cubeEngine.ts';

let state = getSolvedState();
state = applyMoves(state, ['R']);
console.log("After R:");
console.log("L face:", state.L);
state = applyMoves(state, ['U']);
console.log("After R U:");
console.log("L face:", state.L);
