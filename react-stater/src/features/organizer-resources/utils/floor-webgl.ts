import { cameraAxes, type SceneMesh } from './floor-scene-3d';

const VERTEX = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec3 aColor;
uniform vec3 uTarget;
uniform vec3 uRight;
uniform vec3 uUp;
uniform vec3 uEye;
uniform vec3 uSpan;
uniform vec2 uPan;
varying vec3 vColor;
void main() {
  vec3 p = aPosition - uTarget;
  gl_Position = vec4(dot(p,uRight)/uSpan.x, dot(p,uUp)/uSpan.y, -dot(p,uEye)/uSpan.z, 1.0);
  gl_Position.xy += uPan;
  float light = 0.66 + 0.34 * max(0.0, dot(normalize(aNormal), normalize(vec3(-0.4,1.0,0.6))));
  vColor = aColor * light;
}`;
const FRAGMENT = `
precision mediump float;
varying vec3 vColor;
void main() { gl_FragColor = vec4(vColor,1.0); }
`;

/** One GPU buffer, depth-tested orthographic projection, and no picking or mutation interface. */
export function createFloorRenderer(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl', {
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: false
  });
  if (!gl) throw new Error('WEBGL_UNAVAILABLE');
  const shaders: WebGLShader[] = [];
  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;
  function dispose() {
    if (buffer) gl!.deleteBuffer(buffer);
    if (program) gl!.deleteProgram(program);
    shaders.forEach((shader) => gl!.deleteShader(shader));
  }
  try {
    for (const [type, source] of [
      [gl.VERTEX_SHADER, VERTEX],
      [gl.FRAGMENT_SHADER, FRAGMENT]
    ] as const) {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('SHADER_UNAVAILABLE');
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw new Error('SHADER_COMPILE_FAILED');
    }
    program = gl.createProgram();
    if (!program) throw new Error('PROGRAM_UNAVAILABLE');
    shaders.forEach((shader) => gl.attachShader(program!, shader));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('PROGRAM_LINK_FAILED');
    gl.useProgram(program);
    buffer = gl.createBuffer();
    if (!buffer) throw new Error('BUFFER_UNAVAILABLE');
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    for (const [name, offset] of [
      ['aPosition', 0],
      ['aNormal', 3],
      ['aColor', 6]
    ] as const) {
      const location = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 36, offset * 4);
    }
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);
    const uniform = (name: string) => gl.getUniformLocation(program!, name);
    const target = uniform('uTarget'),
      right = uniform('uRight'),
      up = uniform('uUp'),
      eye = uniform('uEye'),
      span = uniform('uSpan'),
      pan = uniform('uPan');
    let mesh: SceneMesh | undefined;
    return {
      upload(value: SceneMesh) {
        mesh = value;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, value.vertices, gl.STATIC_DRAW);
      },
      draw(yaw: number, elevation: number, zoom: number, panX = 0, panY = 0) {
        if (!mesh || gl.isContextLost()) return;
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.max(1, Math.round(canvas.clientWidth * pixelRatio)),
          h = Math.max(1, Math.round(canvas.clientHeight * pixelRatio));
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
        gl.viewport(0, 0, w, h);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(program);
        const axes = cameraAxes(yaw, elevation);
        const radius = Math.hypot(mesh.width, mesh.depth, mesh.maxHeight) / 2;
        const halfSpan = Math.max(radius * 1.18, 0.5) / zoom;
        const aspect = w / h;
        gl.uniform3f(target, mesh.width / 2, mesh.maxHeight / 3, mesh.depth / 2);
        gl.uniform3fv(right, axes.right);
        gl.uniform3fv(up, axes.up);
        gl.uniform3fv(eye, axes.eye);
        gl.uniform2f(pan, panX, panY);
        gl.uniform3f(
          span,
          halfSpan * Math.max(aspect, 1),
          halfSpan * Math.max(1 / aspect, 1),
          Math.max(radius * 3, 3)
        );
        gl.drawArrays(gl.TRIANGLES, 0, mesh.vertices.length / 9);
      },
      dispose
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
