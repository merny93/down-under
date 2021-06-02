const twgl = require("twgl.js");
const html2canvas = require("html2canvas");

function getCanvas() {
  html2canvas(document.getElementById("web-template")).then(function (canvas) {
    let ctx = canvas.getContext("2d");
    // ctx.fillStyle = "#FF0000";
    // ctx.fillRect(120, 120, 1000, 1000);
    document.body.appendChild(ctx.canvas);
    make_render(ctx.canvas);
  });
}

var canvas = document.getElementById("glCanvas");
var gl = canvas.getContext("webgl");
if (!gl) {
    alert("no web gl for me");
}
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