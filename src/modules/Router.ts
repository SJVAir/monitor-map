import { createRouter, createWebHistory } from "vue-router";
import { lazyLoad } from "../MonitorDetails";
import MonitorMapVue from "../views/MonitorMap.vue";

const MonitorDetailsVue = lazyLoad();

const rootAlias = import.meta.env.VITE_BUILD_MODE === "ghp"
  ? "/monitor-map"
  : "/widget";

export const RouterModule = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      alias: rootAlias,
      name: "map",
      component: MonitorMapVue,
      children: [
        {
          path: '/monitor/:monitorId',
          name: 'details',
          component: MonitorDetailsVue,
          props: true,
        }
      ]
    },
  ]
});
