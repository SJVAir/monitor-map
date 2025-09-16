import { setOrigin } from "@sjvair/sdk/http";

const location = (typeof window !== "undefined")
  ? window.location
  : self.location;

setOrigin(location.origin);

export * from "@sjvair/sdk";
