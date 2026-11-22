import { cameraAxes, type SceneMesh } from './floor-scene-3d.ts';
export interface FloorCamera {
  yaw: number;
  elevation: number;
  zoom: number;
  panX: number;
  panY: number;
}
export function floorProjection(mesh: SceneMesh, camera: FloorCamera, aspect: number) {
  const axes = cameraAxes(camera.yaw, camera.elevation);
  const radius = Math.hypot(mesh.width, mesh.depth, mesh.maxHeight) / 2;
  const span = Math.max(radius * 1.18, 0.5) / camera.zoom;
  return {
    ...axes,
    target: [mesh.width / 2, mesh.maxHeight / 3, mesh.depth / 2],
    spanX: span * Math.max(aspect, 1),
    spanY: span * Math.max(1 / aspect, 1)
  };
}
/** Screen-space barycentric picking uses the exact orthographic transform and mesh depth. */
export function pickFloorResource(
  mesh: SceneMesh,
  camera: FloorCamera,
  aspect: number,
  x: number,
  y: number
): number | null {
  const p = floorProjection(mesh, camera, aspect);
  let nearest = -Infinity,
    owner = 0;
  const project = (offset: number) => {
    const v = [
      mesh.vertices[offset] - p.target[0],
      mesh.vertices[offset + 1] - p.target[1],
      mesh.vertices[offset + 2] - p.target[2]
    ];
    const dot = (axis: number[]) => v[0] * axis[0] + v[1] * axis[1] + v[2] * axis[2];
    return [dot(p.right) / p.spanX + camera.panX, dot(p.up) / p.spanY + camera.panY, dot(p.eye)];
  };
  for (let i = 0; i < mesh.vertices.length; i += 27) {
    const a = project(i),
      b = project(i + 9),
      c = project(i + 18);
    if (
      x < Math.min(a[0], b[0], c[0]) ||
      x > Math.max(a[0], b[0], c[0]) ||
      y < Math.min(a[1], b[1], c[1]) ||
      y > Math.max(a[1], b[1], c[1])
    )
      continue;
    const denominator = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
    if (Math.abs(denominator) < 1e-12) continue;
    const u = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / denominator;
    const v = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / denominator;
    const w = 1 - u - v;
    if (u < -0.00001 || v < -0.00001 || w < -0.00001) continue;
    const depth = u * a[2] + v * b[2] + w * c[2];
    if (depth > nearest) {
      nearest = depth;
      owner = mesh.triangleResources?.[i / 27] ?? 0;
    }
  }
  return owner || null;
}
