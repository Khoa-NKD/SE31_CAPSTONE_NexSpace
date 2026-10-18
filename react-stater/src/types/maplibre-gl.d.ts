/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'maplibre-gl' {
  export type StyleSpecification = any;
  export interface Map {
    on: (event: string, callback: (...args: any[]) => void) => void;
    remove: () => void;
    setCenter: (center: [number, number]) => void;
    setZoom: (zoom: number) => void;
    setStyle: (style: any) => void;
    flyTo: (options: any) => void;
    [key: string]: any;
  }
  export const Map: {
    new (options: any): Map;
  };

  export interface Marker {
    setLngLat: (lngLat: [number, number]) => Marker;
    addTo: (map: Map) => Marker;
    remove: () => void;
    getLngLat: () => { lng: number; lat: number };
    [key: string]: any;
  }
  export const Marker: {
    new (options?: any): Marker;
  };

  export interface NavigationControl {
    [key: string]: any;
  }
  export const NavigationControl: {
    new (options?: any): NavigationControl;
  };

  export const setWorkerUrl: (url: string) => void;
  export type MapInstance = Map;
  export type MarkerInstance = Marker;
  export type MapMouseEvent = {
    lngLat: {
      lng: number;
      lat: number;
    };
    point: {
      x: number;
      y: number;
    };
  };

  const content: any;
  export default content;
}

declare module 'maplibre-gl/dist/maplibre-gl.css' {
  const content: any;
  export default content;
}

declare module 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url' {
  const content: string;
  export default content;
}
