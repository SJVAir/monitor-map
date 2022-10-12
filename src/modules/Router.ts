import { createRouter, createWebHashHistory } from "vue-router";
import { lazyLoad } from "../MonitorDetails";
import MonitorMapVue from "../views/MonitorMap.vue";

const MonitorDetailsVue = lazyLoad();

export const RouterModule = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
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
