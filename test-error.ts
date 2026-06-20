import { getSolvedState, applyMoves, getSolutionSteps, cubeStateToFaceletString } from './src/utils/cubeEngine.ts';
import Cube from 'cubejs';

Cube.initSolver();
let state = getSolvedState();
state = applyMoves(state, ['R', 'U', "R'", "U'"]);
const str = cubeStateToFaceletString(state);
const c = Cube.fromString(str);
console.log(c.solve());
