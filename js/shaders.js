const vertexShader = `
// an attribute will receive data from a buffer
attribute vec4 position;


// all shaders have a main function
void main() {
  gl_Position = position;
}
`;

const fragSahder = `
// fragment shaders don't have a default precision so we need
// to pick one. mediump is a good default
precision mediump float;

// uniform float time;
uniform sampler2D u_texture;
uniform vec2 resolution;


void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  gl_FragColor = vec4(texture2D(u_texture, vec2(uv.x, 1.0 -uv.y)).rgb,1.0);
  // gl_FragColor = vec4(uv.y,0.0,0.0,1.0);
}
`;

const waveVert = `
// this vertex code will run for everyone
attribute vec4 position;

void main(){
  gl_Position = position;
}
`;

const combinePage =  `
precision mediump float;

//take the existing revealed parts of the page
// take the wave texture and reveal what it shows

uniform sampler2D waveTexture;
uniform sampler2D visabilityTexture;
uniform sampler2D speedTexture;

const int posChannel = 1;
uniform vec2 resolution;

void main(){
  vec2 uv = gl_FragCoord.xy / resolution;

  float currentVisibility = texture2D(visabilityTexture, uv).r;
  float currentWave = texture2D(waveTexture, uv)[posChannel];
  float maxVals = texture2D(speedTexture, uv).r;
  gl_FragColor = vec4(min(maxVals, currentVisibility + 0.1*abs(currentWave)), 0.0,0.0,1.0);
}

`

const visualize = `
//This visualizes the wave:
precision mediump float;
//get the wave info
uniform sampler2D waveTexture;

//get the visability texture
uniform sampler2D visabilityTexture;

//get previous state
//same info as above

const int posChannel = 1;
//read form the pingpong channel of waveTexture

//to get the uv coords
uniform vec2 resolution;

void main(){
  vec2 uv = gl_FragCoord.xy / resolution;
  //draw in the red channal
  float col = texture2D(waveTexture, uv)[posChannel];
  float vis = texture2D(visabilityTexture, uv).r;
  gl_FragColor = vec4(vis, 0.0 + vis,-5.0*col + vis,1.0);
}
`;


const initWave = `
precision mediump float;
uniform vec2 resolution;
uniform sampler2D waveStart;
void main(){
  vec2 uv = gl_FragCoord.xy / resolution;
  gl_FragColor = vec4(0.0,(texture2D(waveStart, uv).r-0.5),0.0,1.0);
}
`;

const copyFrag = `
//this code will transfer data into the past
precision highp float;
uniform sampler2D waveTexture;
uniform vec2 resolution;

void main(){
  vec2 uv = gl_FragCoord.xy / resolution;
  highp vec4 vals = texture2D(waveTexture, uv);
  gl_FragColor = vec4(vals.g, vals.b, 0.0, vals.a);
  }
`;

const copyFrag2 = `
//this code will transfer data into the past
precision highp float;
uniform sampler2D waveTexture;
uniform vec2 resolution;

void main(){
  vec2 uv = gl_FragCoord.xy / resolution;
  highp vec4 vals = texture2D(waveTexture, uv);
  gl_FragColor = vals;
  }
`;

const computePhysics = `
//try two with the more classical approach

//set precision
precision highp float;

//channel 0 contains speed, channel 1 contains position
uniform sampler2D waveTexture;

//assign read places
const int vInd = 0 ; //velocityIndex
const int  pInd = 1; //positionIndex


//speedmap
uniform sampler2D speedTexture;

//to get the uv coords
uniform vec2 resolution;

//get the offsets
vec2 dxV = vec2(1.0/resolution.x,0.0);
vec2 dyV = vec2(0.0,1.0/resolution.y);

//this is the damping coeff
uniform float b;

vec2 safeSample(vec2 x){
  vec2 res = 2.0 * abs(x/2.0 - floor(x/2.0 + 0.5));
  return res;
}

highp float partial(vec2 pos, sampler2D wave){
  highp vec4 res;
  res = (texture2D(wave, safeSample(pos+dxV)) + texture2D(wave, safeSample(pos -dxV)) + 
        texture2D(wave, safeSample(pos+dyV)) + texture2D(wave, safeSample(pos -dyV)));
  return res[pInd]*0.25;
}

void main(){
  //get the uv cords
  vec2 uv = gl_FragCoord.xy / resolution;

  //sample the speed texture 
  highp float medium = 1.0 + texture2D(speedTexture, uv).r;

  //get the equilibirum position to get force
  //this is just the average position of the neigbors
  highp float equil = partial(uv, waveTexture);

  //sample the wave velovity and position now
  highp vec2 waveHere = texture2D(waveTexture, uv).rg;

  //split into component
  highp float wavePosition = waveHere[pInd];
  highp float waveVelocity = waveHere[vInd];

  //compute new velocity as k/m(dx) + oldVel *b
  //as damping only applies to the old now
  highp float newVel;
  newVel = b*waveVelocity; //damp
  newVel += medium*(equil - wavePosition); //apply force

  //now advect the velocity
  highp float newPos;
  newPos = b*wavePosition + newVel;

  //finally update the map
  gl_FragColor = vec4(1.0,1.0,1.0,1.0); //fill with defualt for good practice
  gl_FragColor[pInd] = newPos;
  gl_FragColor[vInd] = newVel;
}

`;