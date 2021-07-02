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

programs = bindPrograms(gl,waveVert, {initWave:initWave, 
                                    computePhysics:computePhysics, 
                                    visualize:visualize,
                                    combinePage: combinePage,});


// makes various frame buffers
// if use == "math" then will make a framebuffer which admits negative floats
function makeFramebuffer(gl,use){
  if (use == "math"){
    const attachments = [{ internalFormat:gl.RGBA32F, minMag: gl.LINEAR, wrap: gl.CLAMP_TO_EDGE }];
    return twgl.createFramebufferInfo(gl,attachments);
  } else {
    const attachments = [{ internalFormat:gl.RGBA, minMag: gl.LINEAR, wrap: gl.CLAMP_TO_EDGE }];
    return twgl.createFramebufferInfo(gl,attachments);
  }
}
let fb1 = makeFramebuffer(gl,"math");
let fb2 = makeFramebuffer(gl, "math");

//make frame buffer to store the state of pixels
let fbVis1 = makeFramebuffer(gl, "not math");
let fbVis2 = makeFramebuffer(gl, "not math");

// this is for the vertex
const positionObject = { position: { data: [1, 1, 1, -1, -1, -1, -1, 1], numComponents: 2 } };
const positionBuffer = twgl.createBufferInfoFromArrays(gl, positionObject);

/// make the initial texture
function makeInitTexture(gl){
  const c = document.createElement("canvas")
  var ctx = c.getContext("2d");
  ctx.canvas.width = gl.canvas.width;
  ctx.canvas.height = gl.canvas.height;
  ctx.fillStyle = "#800000";
  ctx.fillRect(0, 0, gl.canvas.width, gl.canvas.height);
  ctx.fillStyle = "#000000";
  ctx.fillRect(200, 200, 40, 40);
  // ctx.fillStyle = "#FF0000";
  // ctx.fillRect(210, 210, 20, 20);
  return twgl.createTexture(gl, {src: ctx.canvas});
}
const initTexture = makeInitTexture(gl);

//do the initilization
gl.useProgram(programs.initWave.program);
twgl.setBuffersAndAttributes(gl, programs.initWave, positionBuffer);
twgl.setUniforms(programs.initWave, {
  resolution: [gl.canvas.width, gl.canvas.height],
  waveStart: initTexture,
})
//bind a frame buffer to prevent the render
twgl.bindFramebufferInfo(gl, fb1);
twgl.drawBufferInfo(gl, positionBuffer, gl.TRIANGLE_FAN);

/// make the speed map with just 1s
function makeSpeedTexture(gl){
  const d = document.createElement("canvas")
  var ctx = d.getContext("2d");
  ctx.canvas.width = gl.canvas.width;
  ctx.canvas.height = gl.canvas.height;
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, gl.canvas.width, gl.canvas.height);
  ctx.fillStyle = "#FF0000";
  ctx.fillRect(0, 0, 100, 100);
  return twgl.createTexture(gl, {src: ctx.canvas});
}
const speedTexture =  makeSpeedTexture(gl);



let dt;
let prevTime;
let b = 0.999;
let vals;
// diff = [0.0005,0.0005];

function draw(time){
  vals = new Float32Array(gl.canvas.width*gl.canvas.height*4);
  twgl.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  dt = (prevTime) ? time - prevTime : 0;
  // console.log(dt);
  dt = Math.min(0.0005, dt);
  dt = 0.0005

  prevTime = time;

  //do the physics
  gl.useProgram(programs.computePhysics.program);
  twgl.setBuffersAndAttributes(gl, programs.computePhysics, positionBuffer);
  //now the million uniforms
  twgl.setUniforms(programs.computePhysics,{
    waveTexture: fb1.attachments[0],
    speedTexture: speedTexture,
    b: b,
    resolution: [gl.canvas.width, gl.canvas.height],
  });
  twgl.bindFramebufferInfo(gl, fb2);
  twgl.drawBufferInfo(gl, positionBuffer, gl.TRIANGLE_FAN);


  // did the wavesolve, now we need to visualize
  gl.useProgram(programs.combinePage.program);
  twgl.setBuffersAndAttributes(gl, programs.combinePage, positionBuffer);
  twgl.setUniforms(programs.combinePage,{
    waveTexture:fb2.attachments[0],
    visabilityTexture: fbVis1.attachments[0],
    speedTexture: speedTexture,
    resolution: [gl.canvas.width, gl.canvas.height],
  });
  twgl.bindFramebufferInfo(gl,fbVis2);
  twgl.drawBufferInfo(gl, positionBuffer, gl.TRIANGLE_FAN);


  //now onto the render
  gl.useProgram(programs.visualize.program);
  twgl.setBuffersAndAttributes(gl, programs.visualize, positionBuffer);
  //pass the framebuffer uniform
  twgl.setUniforms(programs.visualize,{
    resolution: [gl.canvas.width, gl.canvas.height],
    waveTexture: fb2.attachments[0],
    visabilityTexture: fbVis2.attachments[0],
  });
  //let it draw to the screen
  twgl.bindFramebufferInfo(gl,null);
  twgl.drawBufferInfo(gl, positionBuffer, gl.TRIANGLE_FAN);

  //pingpong the frame buffers
  temp = fb1;
  fb1 = fb2;
  fb2 = temp;

  temp = fbVis1;
  fbVis1 = fbVis2;
  fbVis2 = temp;

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