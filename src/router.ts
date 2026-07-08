import { createRouter } from "sv-router";
import { monitorMapRoutes } from "./lib";

export const { route, navigate, p, isActive } = createRouter(monitorMapRoutes);
