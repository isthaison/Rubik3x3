import Cube from 'cubejs';
Cube.initSolver();
const c = new Cube();
console.log('c.isSolved()?', c.isSolved());
console.log('c.solve()?', c.solve());
