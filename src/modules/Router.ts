import { createRouter, createWebHashHistory } from "vue-router";
import MonitorMapVue from "../views/MonitorMap.vue";

// Lazy load MonitorDetailsVue
const MonitorDetailsVue = () => import("../views/MonitorDetails.vue");

export const RouterModule = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      name: "map",
      component: MonitorMapVue,
      children: [
        {
          path: '/monitor/:monitorID',
          name: 'details',
          component: MonitorDetailsVue,
          props: true,
        }
      ]
    },
  ]
});
