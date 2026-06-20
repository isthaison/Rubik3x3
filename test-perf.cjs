const Cube = require('cubejs');
const start = Date.now();
Cube.initSolver();
console.log("Init time:", Date.now() - start, "ms");
