const glsl = x => x[0]; //to do syntax highliting with glsl-literal


const waveVert = glsl`
#version 300 es
// this vertex code will run for everyone

in vec4 position;

void main(){
  gl_Position = position;
}
`;



const fullFrag = glsl`
#version 300 es
precision mediump float;

out vec4 fragColor;

//channel 1 contains position, channel 0 contains speed, channel 3 contains discovered locations 
uniform sampler2D memoryTexture;
//speedmap channel 0 contains speed, channel 1 contains hard BC channel 2 contains damping coef
uniform sampler2D boundaryTexture;

//set index accordingly
const int velocityInd = 0 ; //velocity Index
const int positionInd = 1 ; //position Index
const int discoveredInd = 2; //discovered Index
const int hardBoundaryInd = 1; //hard bc index
const int dampingInd = 2; // damping index

//to get the uv coords
uniform vec2 resolution;

//get the offsets
ivec2 dxV = ivec2(1,0);
ivec2 dyV = ivec2(0,1);

//this is the global damping coeff
uniform float b;
// set max speed
uniform float c;

// set time step
uniform float dt;

//set visibility settings 
uniform float discoverSpeed;
uniform float hideSpeed;



float laplace(ivec2 pos, sampler2D wave){
  //compute the laplacian
  float res;
  res = texelFetch(wave, pos+dxV,0)[positionInd] + texelFetch(wave, pos -dxV,0)[positionInd] + 
        texelFetch(wave, pos+dyV,0)[positionInd] + texelFetch(wave, pos -dyV,0)[positionInd] -
        4.0*texelFetch(wave, pos,0)[positionInd];
  return res;
}

void main(){
  //get the uv cords
  vec2 uv = gl_FragCoord.xy / resolution;
  ivec2 pixelPosition = ivec2(gl_FragCoord.xy);

  //sample the wave velovity and position now
  vec4 fullInfoHere = texelFetch(memoryTexture, pixelPosition,0);
  //sample Boundary info now
  vec4 boundaryInfoHere = texture(boundaryTexture, uv);

  //split into component
  float wavePosition = fullInfoHere[positionInd];
  float waveVelocity = fullInfoHere[velocityInd];
  float currentVisibility = fullInfoHere[discoveredInd];
  float mediumVelocity = c*boundaryInfoHere[velocityInd]; ///multiply by max speed
  float boundaryCondition = boundaryInfoHere[hardBoundaryInd]; // 1 if bc 0 otherwise
  float dampingCoef = max(1.0 - boundaryInfoHere[dampingInd] - b,0.0) ; //0 for no damping 1 for max damping
  dampingCoef = b;
  
  //for now 
  float b = 0.0;
  float dt = 4e-3;
  float dx = 2.0/450.0;
  
  //integrate the new velocity
  float newVel;
  newVel = waveVelocity + (dt/(2.0*dx*dx) * laplace(pixelPosition, memoryTexture));

  //apply the damping as
  float avgForce;
  avgForce =  - 0.5*(waveVelocity + newVel)*b;
  // integrate force
  // newVel = newVel + (avgForce *dt);


  //now advect the position
  float newPos;
  newPos = wavePosition + newVel*dt; //*mediumVelocity;

  // if (boundaryCondition > 0.5){
  //   newPos = 0.0;
  // }
  //now for visibility
  //starts at zero and add as it goes 

  float newVisibility;
  newVisibility = currentVisibility + discoverSpeed*abs(newPos) - dt*hideSpeed;

  // gl_FragColor = vec4(1.0,1.0,1.0,1.0); //fill with defualt for good practice
  fragColor[positionInd] = newPos;
  fragColor[velocityInd] = newVel;
  fragColor[discoveredInd] = newVisibility;
  //and leave the other channel to do it's thing
}
`;

const displayFrag = glsl`
#version 300 es
precision mediump float;

out vec4 fragColor;


//This visualizes the wave:


//channel 1 contains position, channel 0 contains speed, channel 3 contains discovered locations 
uniform sampler2D memoryTexture;
//speedmap channel 0 contains speed, channel 1 contains hard BC channel 2 contains damping coef
uniform sampler2D boundaryTexture;

//set index accordingly
const int velocityInd = 0 ; //velocity Index
const int positionInd = 1 ; //position Index
const int discoveredInd = 2; //discovered Index
const int hardBoundaryInd = 1; //hard bc index
const int dampingInd = 2; // damping index

//to get the uv coords
uniform vec2 resolution;

void main(){
  vec2 uv = gl_FragCoord.xy / resolution;
  vec4 waveInfo = texture(memoryTexture,uv);
  vec4 boundaryInfo = texture(boundaryTexture,uv);

  float wavePosition = waveInfo[positionInd];
  float waveVelocity = waveInfo[velocityInd];
  float currentVisibility = waveInfo[discoveredInd];
  float boundaryCondition = boundaryInfo[hardBoundaryInd]; // 1 if bc 0 otherwise

  //goes to zero if a boundary is there or if current visibility goes to 1
  float visibility = max(0.0, 1.0 - boundaryCondition - currentVisibility);
  float wave = 0.5 + wavePosition;
  fragColor = vec4(0, -wavePosition, wavePosition,1.0);
}
`