import Cube from 'cubejs';
Cube.initSolver();
const cube = Cube.fromString('UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB');
console.log('Solved empty string returns:', cube.solve());
const scramble = Cube.random();
console.log('Random solve returns:', scramble.solve());
