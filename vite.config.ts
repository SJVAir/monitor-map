import { resolve } from "node:path";
import { defineConfig, PluginOption } from 'vite'
import htmlPurge from 'vite-plugin-purgecss'
import vue from '@vitejs/plugin-vue'
import type { UserConfig } from 'vite';

// Node DNS prefers ipv6, this messes with the proxy server.
// workaround: change dns to prefer ipv4
import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

const htmlPurgeOptions = {
  content: [ `./public/**/*.html`, `./src/**/*.vue`, `./src/**/*.ts` ],
  defaultExtractor (content: any) {
    const contentWithoutStyleBlocks = content.replace(/<style[^]+?<\/style>/gi, '')
    return contentWithoutStyleBlocks.match(/[A-Za-z0-9-_/:]*[A-Za-z0-9-_/]+/g) || []
  },
  safelist: [
    /-(leave|enter|appear)(|-(to|from|active))$/,
    /^(?!(|.*?:)cursor-move).+-move$/,
    /^router-link(|-exact)-active$/,
    /data-v-.*/,
    /leaflet-*/,
    /marker-cluster*/,
    /uplot*/,
    /^u-*/,
    /^dp__*/
  ]
}

const devConfig: UserConfig = {
  base: "/",
  build: {}
};

const rollupOptions: UserConfig["build"]["rollupOptions"] = {
  input: {
    sjvairMonitorMap: resolve(__dirname, "./src/main.ts")
  },
  output: {
    entryFileNames: "[name].js",
    assetFileNames: "[name].[ext]"
  }
};

const widgetConfig: UserConfig = {
  base: "/static/widget/",
  build: {
    outDir: resolve(__dirname, "./dist/widget"),
    rollupOptions
  }
};

const moduleConfig: UserConfig = {
  base: "/static/monitor-map/",
  build: {
    outDir: resolve(__dirname, "./dist/monitor-map"),
    rollupOptions
  }
};

const pagesConfig: UserConfig = {
  base: "/monitor-map/",
  build: {
    outDir: resolve(__dirname, "./pages")
  }
};

const devMode = (process.env.VITE_BUILD_MODE === "development");
const modMode = (process.env.VITE_BUILD_MODE === "mod");
const ghpages = (process.env.VITE_BUILD_MODE === "ghp");

const config: UserConfig = devMode ? devConfig
  : modMode ? moduleConfig
    : ghpages ? pagesConfig
      : widgetConfig;

// https://vitejs.dev/config/
export default defineConfig({
  // Base directory compiled files will be served from
  base: config.base,
  build: {
    sourcemap: devMode,
    minify: "terser",
    ...config.build
  },
  plugins: [
    htmlPurge(htmlPurgeOptions) as PluginOption,
    vue()
  ],
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `
          $sjvair-main: rgb(62, 142, 208);
          @use "bulma/bulma";
        `
      },
    }
  },
  server: {
    proxy: {
      "/api/1.0": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: true,
      }
    }
  },
  worker: {
    format: "es"
  }
})
