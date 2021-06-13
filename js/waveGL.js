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
var gl = twgl.getContext(canvas, { depth: false, antialiasing: false });
if (!gl) {
    alert("no web gl for me");
}

//Creat the program object 
const programInit = twgl.createProgramInfo(gl, [waveVert, initFrag]);
const programCompute = twgl.createProgramInfo(gl, [waveVert, computeFrag2]);
const programVisualize = twgl.createProgramInfo(gl, [waveVert, visualizeFrag]);
const programCopy = twgl.createProgramInfo(gl, [waveVert, copyFrag2]);

//get the frame buffer so we can compute without drawing
//magic line to get it to work
const attachments = [{ internalFormat:gl.RGBA32F, minMag: gl.LINEAR, wrap: gl.CLAMP_TO_EDGE }];
let fb1 = twgl.createFramebufferInfo(gl,attachments);
let fb2 = twgl.createFramebufferInfo(gl,attachments);

const positionObject = { position: { data: [1, 1, 1, -1, -1, -1, -1, 1], numComponents: 2 } };
const positionBuffer = twgl.createBufferInfoFromArrays(gl, positionObject);

/// make the initial texture
const c = document.createElement("canvas")
var ctx = c.getContext("2d");
ctx.canvas.width = gl.canvas.width;
ctx.canvas.height = gl.canvas.height;
ctx.fillStyle = "#800000";
ctx.fillRect(0, 0, gl.canvas.width, gl.canvas.height);
ctx.fillStyle = "#000000";
ctx.fillRect(200, 200, 40, 40);
ctx.fillStyle = "#FF0000";
ctx.fillRect(210, 210, 20, 20);
const initTexture =  twgl.createTexture(gl, {src: ctx.canvas});

//do the initilization
gl.useProgram(programInit.program);
twgl.setBuffersAndAttributes(gl, programInit, positionBuffer);
twgl.setUniforms(programInit, {
  resolution: [gl.canvas.width, gl.canvas.height],
  waveStart: initTexture,
})
//bind a frame buffer to prevent the render
twgl.bindFramebufferInfo(gl, fb1);
twgl.drawBufferInfo(gl, positionBuffer, gl.TRIANGLE_FAN);

/// make the speed map with just 1s
const d = document.createElement("canvas")
var ctx = d.getContext("2d");
ctx.canvas.width = gl.canvas.width;
ctx.canvas.height = gl.canvas.height;
ctx.fillStyle = "#320000";
ctx.fillRect(0, 0, gl.canvas.width, gl.canvas.height);
ctx.fillStyle = "#FF0000";
ctx.fillRect(0, 0, 100, 100);

const speedTexture =  twgl.createTexture(gl, {src: ctx.canvas});



let dt;
let prevTime;
let pingpong = 2;
let b = 0.999999
let diff =[Math.pow(1/gl.canvas.width,2), Math.pow(1/gl.canvas.height,2)];
let vals;
// diff = [0.0005,0.0005];

function draw(time){
  vals = new Float32Array(gl.canvas.width*gl.canvas.height*4);
  twgl.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  dt = (prevTime) ? time - prevTime : 0;
  dt = Math.min(0.0005, dt);
  dt = 0.0005

  prevTime = time;

  function coeff(val){
    return (val/Math.pow(dt,2)) +(b/dt)
  }
  //do the physics
  gl.useProgram(programCompute.program);
  twgl.setBuffersAndAttributes(gl, programCompute, positionBuffer);
  //now the million uniforms
  twgl.setUniforms(programCompute,{
    waveTexture: fb1.attachments[0],
    speedTexture: speedTexture,
    diff: diff,
    dtSqared: Math.pow(dt,2),
    b: b,
    coeff1: coeff(1),
    coeff2: coeff(2),
    resolution: [gl.canvas.width, gl.canvas.height],
  });
  twgl.bindFramebufferInfo(gl, fb2);
  twgl.drawBufferInfo(gl, positionBuffer, gl.TRIANGLE_FAN);
  //this reads the pixels to cpu so we can "look" at them
  // gl.readPixels(0, 0, gl.canvas.width, gl.canvas.height, gl.RGBA, gl.FLOAT, vals);

  //now onto the render
  gl.useProgram(programVisualize.program);
  twgl.setBuffersAndAttributes(gl, programVisualize, positionBuffer);
  //pass the framebuffer uniform
  twgl.setUniforms(programVisualize,{
    resolution: [gl.canvas.width, gl.canvas.height],
    pingpong: pingpong,
    waveTexture: fb2.attachments[0],
  });
  //let it draw to the screen
  twgl.bindFramebufferInfo(gl,null);
  twgl.drawBufferInfo(gl, positionBuffer, gl.TRIANGLE_FAN);

  gl.useProgram(programCopy.program);
  twgl.setBuffersAndAttributes(gl, programCopy, positionBuffer);
  twgl.setUniforms(programCopy,{
    waveTexture: fb2.attachments[0],
    resolution: [gl.canvas.width, gl.canvas.height],
  });
  twgl.bindFramebufferInfo(gl,fb1);
  twgl.drawBufferInfo(gl, positionBuffer, gl.TRIANGLE_FAN);

  // console.log(Math.max(vals));
}



(function animate(now){
  draw(now/1000);
  requestAnimationFrame(animate);
})(0);






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