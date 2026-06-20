import Cube from 'cubejs';
Cube.initSolver();
const c = Cube.fromString("UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB");
console.log(c.isSolved());
