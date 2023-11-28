export interface Calibrator {
  id: string,
  reference_id: string,
  colocated_id: string,
  name: string,
  position: {
    type: string,
    coordinates: [number, number]
  }
}
