const { RubiksCube, Solver, algorithmShortener } = require('rubiks-cube-solver');

try {
  let cubeState = [
    'front',
    'right',
    'up',
    'down',
    'left',
    'back'
  ].reduce((acc, face) => {
     // I need to find the expected input format. 
     return acc;
  }, {});

  const cube = new RubiksCube();
  console.log("Default cube:", cube);
  
} catch(e) {
  console.log(e);
}
