import { resolve } from "node:path";
import { defineConfig, PluginOption } from 'vite'
import htmlPurge from 'vite-plugin-purgecss'
import vue from '@vitejs/plugin-vue'
import type { UserConfig } from 'vite';

// Node DNS prefers ipv6, this messes with the proxy server.
// workaround: change dns to prefer ipv4
import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

const libMode = (process.env.VITE_BUILD_MODE === "lib");
const ghpages = (process.env.VITE_BUILD_MODE === "ghp");

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

const standAloneBuildOptions: UserConfig["build"] = {
  outDir: resolve(__dirname, "./dist/standalone")
};

const pagesBuildOptions: UserConfig["build"] = {
  outDir: resolve(__dirname, "./dist/pages")
};

const libBuildOptions: UserConfig["build"] = {
  outDir: resolve(__dirname, "./dist/module"),
  rollupOptions: {
    input: {
      sjvairMonitorMap: resolve(__dirname, "./src/sjvairMonitorMap.ts")
    },
    output: {
      entryFileNames: "[name].js",
      assetFileNames: "[name].[ext]"
    }
  }
};

const buildOptions: UserConfig["build"] = libMode
  ? libBuildOptions
  : ghpages ? pagesBuildOptions : standAloneBuildOptions;

const base = libMode
  ? "/static/monitor-map/"
  : ghpages ? "/monitor-map/" : "/";

// https://vitejs.dev/config/
export default defineConfig({
  // Base directory compiled files will be served from
  base,
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
