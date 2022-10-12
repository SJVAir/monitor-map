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
  safelist: [
    /-(leave|enter|appear)(|-(to|from|active))$/,
    /^(?!(|.*?:)cursor-move).+-move$/,
    /^router-link(|-exact)-active$/,
    /data-v-.*/,
    /leaflet-*/,
    /uplot*/,
    /^u-*/,
    /^dp__*/
  ]
}

const standAloneBuildOptions: UserConfig["build"] = {};

const libBuildOptions: UserConfig["build"] = {
  outDir: resolve(__dirname, "./lib"),
  lib: {
    entry: resolve(__dirname, "./src/main.ts"),
    name: "sjvairMonitorMap",
    fileName: "sjvairMonitorMap"
  }
};

const buildOptions: UserConfig["build"] = (process.env.VITE_BUILD_MODE === "lib")
  ? libBuildOptions
  : standAloneBuildOptions;

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    minify: "terser",
    ...buildOptions
  },
  plugins: [
    htmlPurge(htmlPurgeOptions) as PluginOption,
    vue()
  ],
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "bulma/bulma";`
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
  }
})
