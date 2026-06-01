import { mount } from "svelte";
import App from "./App.svelte";
import { setOrigin } from "@sjvair/sdk/http";

if (import.meta.env.PROD) {
	setOrigin(window.location.origin);
} else if (import.meta.env.DEV) {
	setOrigin("http://localhost:8000");
}

mount(App, { target: document.getElementById("SJVAirMonitorMap")! });
