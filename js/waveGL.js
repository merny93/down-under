const twgl = require("twgl.js");
const html2canvas = require("html2canvas");

let mouseX = 0;
let mouseY = 0;

function getRelativeMousePosition(event, target) {
  target = target || event.target;
  var rect = target.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
}

// assumes target or event.target is canvas
function getNoPaddingNoBorderCanvasRelativeMousePosition(event, target) {
  target = target || event.target;
  var pos = getRelativeMousePosition(event, target);

  pos.x = pos.x * target.width  / target.clientWidth;
  pos.y = pos.y * target.height / target.clientHeight;

  return pos;  
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

window.addEventListener('mousemove', e => {
  const pos = getNoPaddingNoBorderCanvasRelativeMousePosition(e, gl.canvas);
  // pos is in pixel coordinates for the canvas.
  mouseX = pos.x;
  mouseY = gl.canvas.height - pos.y;
})

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
  ctx.fillStyle = "rgb(0,0,0)";
  ctx.fillRect(0, 0, gl.canvas.width, gl.canvas.height);
  // ctx.fillStyle = "rgb(255,255,0)";
  // ctx.fillRect(200, 200, 25, 25);
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
  ctx.fillStyle = "rgb(100,0,0)";
  ctx.fillRect(0, 0, gl.canvas.width, gl.canvas.height);
  ctx.fillStyle = "rgb(255,0,0)";
  ctx.fillRect(0, 0, 150, 150);
  return twgl.createTexture(gl, {src: ctx.canvas});
}
let boundaryTexture =  makeSpeedTexture(gl);



let dt;
let prevTime;
let b = 0.5;
let discoverSpeed = 10.2;
let hideSpeed = 0.25;
let c = 1.0;
let wavePeriod = 2.0;
//need to do 1 by hand step to fill the frame buffer
gl.useProgram(programs.fullFrag.program);
twgl.setBuffersAndAttributes(gl,programs.fullFrag, positionBuffer);
twgl.setUniforms(programs.fullFrag,{
  memoryTexture: initTexture,
  boundaryTexture: boundaryTexture,
  b: 0.0,
  dt:1.0,
  dx:1.0,
  c: c,
  resolution: [gl.canvas.width, gl.canvas.height],
  discoverSpeed: 0.0,
  hideSpeed: 0.0,
  mousePos: [0,0],
  pulse: false,
});
twgl.bindFramebufferInfo(gl, fb2);
twgl.drawBufferInfo(gl, positionBuffer, gl.TRIANGLE_FAN);

let lastPulse = 0.0;
function draw(time){
  twgl.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  dt = (prevTime) ? time - prevTime : 0.0001;
  prevTime = time;
  if (lastPulse > wavePeriod){
    pulse = true
    lastPulse = 0.0
  } else {
    pulse = false
    lastPulse += dt
  }
  gl.useProgram(programs.fullFrag.program);
  twgl.setBuffersAndAttributes(gl,programs.fullFrag, positionBuffer);
  twgl.setUniforms(programs.fullFrag,{
    memoryTexture: fb2.attachments[0],
    boundaryTexture: boundaryTexture,
    b: b,
    dt:dt,
    dx: dt/0.75, //CFL condition
    c: c,
    resolution: [gl.canvas.width, gl.canvas.height],
    discoverSpeed: discoverSpeed,
    hideSpeed: hideSpeed,
    mousePos: [mouseX,mouseY],
    pulse: pulse,
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



// the slow part is getting the canvas...
// will upgrade later to default to a map of 1s and then update to the actual vals when we have them
async function getCanvas() {
  let ctx = await html2canvas(document.getElementById("web-template")).then(function (canvas) {
    let ctx = canvas.getContext("2d");
    // ctx.fillStyle = "#FF0000";
    // ctx.fillRect(120, 120, 1000, 1000);
    ctx.width = gl.canvas.width;
    ctx.height = gl.canvas.height;
    // document.body.appendChild(ctx.canvas);
    return ctx
    
    

  });
  console.log(ctx)
  
  let tempCanvas = document.createElement("canvas"),
    tempCtx = tempCanvas.getContext("2d");
  tempCanvas.width =  ctx.canvas.width;
  tempCanvas.height = ctx.canvas.height;
  tempCtx.drawImage(ctx.canvas,0,0, ctx.canvas.width, ctx.canvas.height);

  ctx.fillStyle = "#000";
  ctx.fillRect(0,0,ctx.canvas.width, ctx.canvas.height);

  // ctx.save();
  ctx.scale(1,-1);
  ctx.translate(0,-ctx.canvas.height);
  ctx.drawImage(tempCanvas,0,0, ctx.canvas.width, ctx.canvas.height);
  // ctx.restore();

  let imgData = ctx.getImageData(0,0,ctx.canvas.width, ctx.canvas.height);
  console.log(imgData)
  let pixels = imgData.data;
  for (var i = 0; i < pixels.length; i += 4) {

    let lightness = parseInt((pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3);

    pixels[i] = Math.max(lightness, 150);
    pixels[i + 1] = 0;
    pixels[i + 2] = 0;
  }
  ctx.putImageData(imgData, 0, 0);
  // document.body.appendChild(ctx.canvas);
  boundaryTexture =  twgl.createTexture(gl, {src: ctx.canvas})
  
}