import { initialize } from "./App";

if (window.location.pathname === "/widget/") {
  const searchParam = window.location.search.substring(0, 10);
  if (searchParam === "?monitors=" && window.location.search.length < 32) {
    throw new Error("Error initializing SJVAir widget, no monitor ID's provided.");
  }
}

initialize();
