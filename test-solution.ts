import { getSolvedState, applyMoves, getSolutionSteps, cubeStateToFaceletString } from './src/utils/cubeEngine.ts';

let state = getSolvedState();
state = applyMoves(state, ['R', 'U', "R'", "U'"]);
console.log("Scrambled state facelet:", cubeStateToFaceletString(state));
const steps = getSolutionSteps(state);
console.log("Solution steps:", JSON.stringify(steps));

let testState = state;
for (const step of steps) {
   testState = applyMoves(testState, step.moves);
}
import { isSolved } from './src/utils/cubeEngine.ts';
console.log("Is it solved after applying:", isSolved(testState));
