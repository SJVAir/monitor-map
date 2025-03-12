export const hasGeolocation = "geolocation" in navigator;

// Root Access
export const defaultCoordinates = {
  latitude: 36.76272911677402,
  longitude: -119.7989545249089,
};

export async function getCurrentPosition(
  options?: PositionOptions,
): Promise<GeolocationPosition> {
  return new Promise((resolve) => {
    if (hasGeolocation) {
      return navigator.geolocation.getCurrentPosition(resolve, console.error, options);
    }
    resolve({
      timestamp: Date.now(),
      coords: {
        accuracy: 0,
        altitude: 0,
        altitudeAccuracy: 0,
        heading: 0,
        speed: 0,
        ...defaultCoordinates,
      },
    });
  });
}
