const twgl = require("twgl.js");
const html2canvas = require("html2canvas");


// the slow part is getting the canvas...
// will upgrade later to default to a map of 1s and then update to the actual vals when we have them
function getCanvas() {
  html2canvas(document.getElementById("web-template")).then(function (canvas) {
    let ctx = canvas.getContext("2d");
    // ctx.fillStyle = "#FF0000";
    // ctx.fillRect(120, 120, 1000, 1000);
    ctx.width = 640;
    ctx.height = 480;
    document.body.appendChild(ctx.canvas);
    make_render(ctx.canvas);
  });
}


// generate the webGL environment
function makeContext(canvasID){
  var canvas = document.getElementById(canvasID);
  var gl = twgl.getContext(canvas, { depth: false, antialiasing: false });
  console.log(gl)
  if (!gl) {
      alert("no web gl for me");
  }
  return gl;
}

var gl = makeContext("glCanvas");

// generate an object of porgrams with all the same vertex shader. 
// fragList is a object with keys for names of programs and values of the fragSahders
//returns an object of programs under the keys given in fragList
function bindPrograms(gl, vertexProgram, fragList){
  let programs = new Object();
  for (let fragProgramName in fragList){
    var fragProgram = fragList[fragProgramName];
    programs[fragProgramName] = twgl.createProgramInfo(gl, [vertexProgram, fragProgram]);
  }
  return programs
}

programs = bindPrograms(gl,waveVert, {fullFrag: fullFrag,
                                    displayFrag: displayFrag});


// makes various frame buffers
// if use == "math" then will make a framebuffer which admits negative floats
function makeFramebuffer(gl,use){
  if (use == "math"){
    const attachments = [{ internalFormat:gl.RGBA32F, minMag: gl.NEAREST, wrap: gl.CLAMP_TO_EDGE }];
    return twgl.createFramebufferInfo(gl,attachments);
  } else {
    const attachments = [{ internalFormat:gl.RGBA, minMag: gl.LINEAR, wrap: gl.CLAMP_TO_EDGE }];
    return twgl.createFramebufferInfo(gl,attachments);
  }
}
let fb1 = makeFramebuffer(gl,"math");
let fb2 = makeFramebuffer(gl, "math");


// this is for the vertex
const positionObject = { position: { data: [1, 1, 1, -1, -1, -1, -1, 1], numComponents: 2 } };
const positionBuffer = twgl.createBufferInfoFromArrays(gl, positionObject);

/// make the initial texture
function makeInitTexture(gl){
  const c = document.createElement("canvas")
  var ctx = c.getContext("2d");
  ctx.canvas.width = gl.canvas.width;
  ctx.canvas.height = gl.canvas.height;
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, gl.canvas.width, gl.canvas.height);
  ctx.fillStyle = "#FFFF00";
  ctx.fillRect(200, 200, 25, 25);
  // ctx.fillStyle = "#FF0000";
  // ctx.fillRect(210, 210, 20, 20);
  return twgl.createTexture(gl, {src: ctx.canvas, internalFormat: gl.RGBA32F});
}
const initTexture = makeInitTexture(gl);


/// make the speed map with just 1s
function makeSpeedTexture(gl){
  const d = document.createElement("canvas")
  var ctx = d.getContext("2d");
  ctx.canvas.width = gl.canvas.width;
  ctx.canvas.height = gl.canvas.height;
  ctx.fillStyle = "#FF0000";
  ctx.fillRect(0, 0, gl.canvas.width, gl.canvas.height);
  ctx.fillStyle = "#640000";
  ctx.fillRect(0, 0, 100, 100);
  return twgl.createTexture(gl, {src: ctx.canvas});
}
const boundaryTexture =  makeSpeedTexture(gl);



let dt;
let prevTime;
let b = 0.9;
let discoverSpeed = 1.0;
let hideSpeed = 1.0;
let c = 1.0;

//need to do 1 by hand step to fill the frame buffer
gl.useProgram(programs.fullFrag.program);
twgl.setBuffersAndAttributes(gl,programs.fullFrag, positionBuffer);
twgl.setUniforms(programs.fullFrag,{
  memoryTexture: initTexture,
  boundaryTexture: boundaryTexture,
  b: 0.0,
  dt:0.0,
  c: c,
  resolution: [gl.canvas.width, gl.canvas.height],
  discoverSpeed: 0.0,
  hideSpeed: 0.0,
});
twgl.bindFramebufferInfo(gl, fb2);
twgl.drawBufferInfo(gl, positionBuffer, gl.TRIANGLE_FAN);



function draw(time){
  twgl.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  dt = (prevTime) ? time - prevTime : 0;
  prevTime = time;

  gl.useProgram(programs.fullFrag.program);
  twgl.setBuffersAndAttributes(gl,programs.fullFrag, positionBuffer);
  twgl.setUniforms(programs.fullFrag,{
    memoryTexture: fb2.attachments[0],
    boundaryTexture: boundaryTexture,
    b: b,
    dt:dt,
    c: c,
    resolution: [gl.canvas.width, gl.canvas.height],
    discoverSpeed: discoverSpeed,
    hideSpeed: hideSpeed,
  });
  twgl.bindFramebufferInfo(gl, fb1);
  twgl.drawBufferInfo(gl, positionBuffer, gl.TRIANGLE_FAN);

  //now call renderer
  gl.useProgram(programs.displayFrag.program);
  twgl.setBuffersAndAttributes(gl, programs.displayFrag, positionBuffer);
  twgl.setUniforms(programs.displayFrag,{
    memoryTexture: fb1.attachments[0],
    boundaryTexture: boundaryTexture,
    resolution: [gl.canvas.width, gl.canvas.height],
  });

  //let it draw to the screen
  twgl.bindFramebufferInfo(gl,null);
  twgl.drawBufferInfo(gl, positionBuffer, gl.TRIANGLE_FAN);

  //pingpong the frame buffers
  temp = fb1;
  fb1 = fb2;
  fb2 = temp;

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

  const textures =  twgl.createTexture(gl, {src: canvas, min: gl.LINEAR, mag:gl.NEAREST,});

  const arrays = {
    position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0],
  };
  const bufferInfo =  twgl.createBufferInfoFromArrays(gl, arrays);

  function render(time) {
    twgl.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    const uniforms = {
      resolution: [gl.canvas.width, gl.canvas.height],
      u_texture: textures,
    };

    gl.useProgram(programInfo.program);
    twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
    twgl.setUniforms(programInfo, uniforms);
    twgl.drawBufferInfo(gl, bufferInfo);

    requestAnimationFrame(render);
  }
  console.log("hey")
  requestAnimationFrame(render);
}