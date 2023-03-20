import { ref } from "vue";
import { useRoute } from "vue-router";
import { asyncInitializer } from "./asyncInitializer";
import type { Ref } from "vue";
import type { MonitorId } from "../types";

interface WidgetModeModule {
  widgetMode: Ref<boolean>;
  widgetSubList: Ref<Array<MonitorId>>;
}

export const useWidgetMode = asyncInitializer<WidgetModeModule>(async (resolve) => {
  const route = useRoute();
  const widgetMode = ref(false);
  const widgetSubList = ref<Array<MonitorId>>([]);

  if (route.path === "/widget/") {
    if (!route.query.monitors?.length) {
      throw new Error("No monitor ID's provided for widget");
    }
    widgetMode.value = true;
    widgetSubList.value = (route.query.monitors! as string).split(",");
  }

  resolve({
    widgetMode,
    widgetSubList
  });
});
