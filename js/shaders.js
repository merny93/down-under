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
precision mediump float;

//channel 0,1,2 contain time "t" and "t-1". ping pong betweem the 3 as we go
uniform sampler2D waveTexture;

//pingpong to decide where to read/write
uniform int pingpong;
int tPlus1 = pingpong;
int tNow = mod(pingpong-1,3);
int tMinus1 = mod(pingpong-2,3);

//speedmap
uniform sampler2D speedTexture;

//this is dx,dy
uniform vec2 diff;
float dx = diff.x;
vec2 dxV = vec2(dx,0);
float dy = diff.y;
vec2 dyV = vec2(0,dy);
//dunno but we probs want dx to be give or take less than 1/numPixels

//this is dt
uniform float dt;

//this is the damping coeff
uniform float b;

//this is (1/dt^2 +b/dt)
uniform float coeff1;
//this is (2/dt^2 +b/dt)
uniform float coeff2;

//to get the uv coords
uniform vec2 resolution;

vec4 laplace(vec2 pos, sampler2D wave){
  float res;
  res = (texture2D(wave, pos+dxV) - 2*texture2D(wave, pos) + texture2D(wave, pos -dxV))/pow(dx, 2) + 
        (texture2D(wave, pos+dyV) - 2*texture2D(wave, pos) + texture2D(wave, pos -dyV))/pow(dy, 2);
  return res
}

void main(){
  //get the uv cords
  vec2 uv = gl_FragCoord.xy / resolution;
  gl_FragColor = texture2D(waveTexture,uv);
  gl_FragColor[tPlus1] = (1/coeff1)*(pow(texture2D(speedTexture, uv),2)*laplace(uv, waveTexture)[tNow] + 
                                    coeff2*texture2D(waveTexture, uv)[tNow] - 
                                    (1/pow(dt,2))*texture2D(waveTexture, uv)[tMinus1]);
}
`;

const visualizeFrag = `
//This visualizes the wave:

//get the wave info
uniform sampler2D waveTexture;
//same info as above

uniform int pingpong;
//read form the pingpong channel of waveTexture

//to get the uv coords
uniform vec2 resolution;

void main(){
  vec2 uv = gl_FragCoord.xy / resolution;
  //draw in the red channal
  gl_FragColor = vec4(texture2D(waveTexture, uv)[pingpong], 0.0,0.0,1.0);
}
`;