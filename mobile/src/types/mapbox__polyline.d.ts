declare module "@mapbox/polyline" {
  export type LatLngTuple = [number, number];

  export interface PolylineModule {
    decode(encoded: string, precision?: number): LatLngTuple[];
    encode(coordinates: LatLngTuple[], precision?: number): string;
  }

  const polyline: PolylineModule;

  export default polyline;
  export const decode: PolylineModule["decode"];
  export const encode: PolylineModule["encode"];
}
