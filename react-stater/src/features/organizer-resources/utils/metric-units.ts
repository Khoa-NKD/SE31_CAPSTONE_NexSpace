/** Model pixels are independent of screen pixels and zoom. Keep this wire scale in sync with BE. */
export const MODEL_PIXELS_PER_METRE = 60;
export const pixelsToMetres = (pixels: number) => pixels / MODEL_PIXELS_PER_METRE;
export const metresToPixels = (metres: number) => Number((metres * MODEL_PIXELS_PER_METRE).toFixed(2));
export function geometryDisplay(value: string, metric: boolean, angle = false): string {
  return metric && !angle && value !== '' ? String(Number(pixelsToMetres(Number(value)).toFixed(4))) : value;
}
export function geometryInput(value: string, metric: boolean, angle = false): string {
  return metric && !angle && value !== '' ? String(metresToPixels(Number(value))) : value;
}
