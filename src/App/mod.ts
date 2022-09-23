const RootElementID: string = "SJVAirMonitorMap" as const;

export function initialize(): Promise<HTMLElement> {
  return new Promise<HTMLElement>( (resolve) => {
    const mountPoint = document.getElementById(RootElementID);

    if (!mountPoint) {
      throw new Error(`Unable to find mount point with id "${ mountPoint }"`);

    } else {
      resolve(mountPoint);
    }
  });
};

