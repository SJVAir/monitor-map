import { createApp } from "vue";
import { AppVue, initialize } from "./App";
import { RouterModule } from "./modules/Router";
import "./styles.scss";

initialize()
  .then(mountPoint => {
    const app = createApp(AppVue);

    app.use(RouterModule);
    app.mount(mountPoint);
  })
  .catch(console.error);
