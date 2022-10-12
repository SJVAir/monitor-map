import type { Component } from "vue";

export function lazyLoad(): () => Component {
  return () => import("./MonitorDetails.vue");
}
