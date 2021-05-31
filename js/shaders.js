const vertexShader = `
// an attribute will receive data from a buffer
attribute vec4 position;

// all shaders have a main function
void main() {

  // gl_Position is a special variable a vertex shader
  // is responsible for setting
  gl_Position = position;
}
`;

const fragSahder = `
// fragment shaders don't have a default precision so we need
// to pick one. mediump is a good default
precision mediump float;

void main() {
  // gl_FragColor is a special variable a fragment shader
  // is responsible for setting
  gl_FragColor = vec4(1, 1, 0.5, 1); // return reddish-purple
}
`;