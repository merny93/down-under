const twgl = require("twgl.js");
const html2canvas = require("html2canvas");


// the slow part is getting the canvas...
// will upgrade later to default to a map of 1s and then update to the actual vals when we have them
function getCanvas() {
  html2canvas(document.getElementById("web-template")).then(function (canvas) {
    let ctx = canvas.getContext("2d");
    // ctx.fillStyle = "#FF0000";
    // ctx.fillRect(120, 120, 1000, 1000);
    document.body.appendChild(ctx.canvas);
    make_render(ctx.canvas);
  });
}

// generate the webGL environment
var canvas = document.getElementById("glCanvas");
var gl = canvas.getContext("webgl");
if (!gl) {
    alert("no web gl for me");
}

//Creat the program object 
const programInit = twgl.createProgramInfo(gl, [waveVert, initFrag]);
const programCompute = twgl.createProgramInfo(gl, [waveVert, computeFrag]);
const programVisualize = twgl.createProgramInfo(gl, [waveVert, visualizeFrag]);

//get the frame buffer so we can compute without drawing
let fb1 = twgl.createFrameBufferInfo(gl);
let fb2 = twgl.createFrameBufferInfo(gl);

const positionObject = { position: { data: [1, 1, 1, -1, -1, -1, -1, 1], numComponents: 2 } };
const positionBuffer = twgl.createBufferInfoFromArrays(gl, positionObject);


//do the initilization
gl.useProgram(programInit.program);
twgl.setBuffersAndAttributes(gl, programInit, positionBuffer);
//bind a frame buffer to prevent the render
twgl.bindFrameBufferInfo(gl, fb1);
twgl.drawBufferInfo(gl, positionBuffer, gl.TRIANGLE_FAN);

let dt;
let prevTime;
let pingpong = 2;
let b = 0.05
let diff =[1/gl.canvas.width, 1/gl.canvas.height];
let tempFrameBuffer;


function draw(time){
  dt = (prevTime) ? time - prevTime : 0;
  prevTime = time;

  function coeff(val){
    return (1/pow(dt,2)) +(b/dt)
  }
  //do the physics
  gl.useProgram(programCompute.program);
  twgl.setBuffersAndAttributes(gl, programCompute, positionBuffer);
  //now the million uniforms
  twgl.setUniforms(programCompute,{
    waveTexture: fb1.attachments[0],
    speedTexture: TODO,
    pingpong: pingpong,
    diff: diff,
    dt: dt,
    b: 0.05,
    coeff1: coeff(1),
    coeff2: coeff(2),
    resolution: [gl.canvas.width, gl.canvas.height],
  });
  twgl.bindFrameBufferInfo(gl, fb2);
  twgl.drawBufferInfo(gl, positionBuffer, gl.TRIANGLE_FAN);

  //now onto the render
  gl.useProgram(programVisualize);
  twgl.setBuffersAndAttributes(gl, programVisualize, positionBuffer);
  //pass the framebuffer uniform
  twgl.setUniforms(programVisualize,{
    resolution: [gl.canvas.width, gl.canvas.height],
    pingpong: pingpong,
    waveTexture: fb2.attachments[0],
  });
}










//create the render 
// called when the canvas image is ready!
//test code from earlier
function make_render(canvas){
  const programInfo = twgl.createProgramInfo(gl, [vertexShader, fragSahder]);

  const textures =  twgl.createTexture(gl, {src: canvas});

  const arrays = {
    position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0],
  };
  const bufferInfo =  twgl.createBufferInfoFromArrays(gl, arrays);

  function render(time) {
    twgl.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    const uniforms = {
      time: time * 0.001,
      resolution: [gl.canvas.width, gl.canvas.height],
      u_texture: textures,
    };

    gl.useProgram(programInfo.program);
    twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
    twgl.setUniforms(programInfo, uniforms);
    twgl.drawBufferInfo(gl, bufferInfo);

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}