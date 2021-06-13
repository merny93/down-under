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

const computeFrag = `
//set precision
precision highp float;

//channel 0,1,2 contain time "t-1" and "t" and "t+1" respectivly
uniform sampler2D waveTexture;

//assign read places
const int tPlus1 = 2 ;
const int tNow = 1;
const int tMinus1 = 0;

//speedmap
uniform sampler2D speedTexture;

//to get the uv coords
uniform vec2 resolution;

//this is dx,dy
uniform vec2 diff;
float dxSqared = diff.x;
vec2 dxV = vec2(1.0/resolution.x,0.0);
float dySquared = diff.y;
vec2 dyV = vec2(0.0,1.0/resolution.y);
float del = (1.0/dxSqared) + (1.0/dySquared);
//dunno but we probs want dx to be give or take less than 1/numPixels

//this is dt
uniform float dtSqared;
// float dtSqared = pow(dt, 2.0);

//this is the damping coeff
uniform float b;

//this is (1/dt^2 +b/dt)
uniform float coeff1;
//this is (2/dt^2 +b/dt)
uniform float coeff2;


highp vec4 partial(vec2 pos, sampler2D wave){
  vec4 res;
  res = (texture2D(wave, pos+dxV) + texture2D(wave, pos -dxV))/dxSqared + 
        (texture2D(wave, pos+dyV) + texture2D(wave, pos -dyV))/dySquared;
  return res;
}

void main(){
  //get the uv cords
  vec2 uv = gl_FragCoord.xy / resolution;

  highp float cSqared = pow(1.5*texture2D(speedTexture, uv).r,2.0);
  highp float parts = partial(uv, waveTexture)[tNow];
  highp vec2 waveHere = texture2D(waveTexture, uv).rg;
  highp float currentWave = waveHere[tNow];
  highp float prevWave = waveHere[tMinus1];
  
  //first set the old
  gl_FragColor = vec4(waveHere.rg, 0.0,1.0);

  gl_FragColor[tPlus1] = (cSqared*dtSqared)*parts + 2.0*currentWave*(1.0 - (del*cSqared*dtSqared)) - prevWave;
  // gl_FragColor[tPlus1] = (1.0/coeff1)*(cSqared*(parts - 2.0*del*currentWave) + coeff2*currentWave -(prevWave/dtSqared));

}
`;

const visualizeFrag = `
//This visualizes the wave:
precision mediump float;
//get the wave info
uniform sampler2D waveTexture;
//same info as above

const int pingpong = 1;
//read form the pingpong channel of waveTexture

//to get the uv coords
uniform vec2 resolution;

void main(){
  vec2 uv = gl_FragCoord.xy / resolution;
  //draw in the red channal
  float col = texture2D(waveTexture, uv)[pingpong];
  gl_FragColor = vec4(-col, 0.0,col,1.0);
}
`;


const initFrag = `
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

const computeFrag2 = `
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


highp float partial(vec2 pos, sampler2D wave){
  vec4 res;
  res = (texture2D(wave, pos+dxV) + texture2D(wave, pos -dxV) + 
        texture2D(wave, pos+dyV) + texture2D(wave, pos -dyV));
  return res[pInd]*0.25;
}

void main(){
  //get the uv cords
  vec2 uv = gl_FragCoord.xy / resolution;

  //sample the speed texture 
  highp float medium = 1.5*texture2D(speedTexture, uv).r;

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
  newPos = wavePosition + newVel;

  //finally update the map
  gl_FragColor = vec4(1.0,1.0,1.0,1.0); //fill with defualt for good practice
  gl_FragColor[pInd] = newPos;
  gl_FragColor[vInd] = newVel;
}

`;