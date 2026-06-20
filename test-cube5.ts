import Cube from 'cubejs';
Cube.initSolver();
const moves = 'R L U2 R L F2 R2 U2 R2 F2 R2 U2 F2 L2';
const c = new Cube();
c.move(moves);
console.log('Is solved after moves?', c.isSolved());
console.log('Resulting string:', c.asString());
