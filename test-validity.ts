import { getSolvedState, applyMoves, getSolutionSteps, cubeStateToFaceletString } from './src/utils/cubeEngine.ts';
import Cube from 'cubejs';
Cube.initSolver();

let state = getSolvedState();
const seq = ['R', 'U', "R'", "U'"];
for (const m of seq) {
  state = applyMoves(state, [m]);
  const str = cubeStateToFaceletString(state);
  try {
     const c = Cube.fromString(str);
     c.solve();
     console.log(`After ${m}: OK`);
  } catch(e) {
     console.log(`After ${m}: ERROR`, e.message);
  }
}
