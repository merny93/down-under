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