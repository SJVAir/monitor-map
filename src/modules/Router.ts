import { createRouter, createWebHistory } from "vue-router";
import { lazyLoad } from "../MonitorDetails";
import MonitorMapVue from "../views/MonitorMap.vue";

const MonitorDetailsVue = lazyLoad();

export const RouterModule = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      alias: "/widget",
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
