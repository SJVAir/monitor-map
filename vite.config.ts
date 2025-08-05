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
  content: [`./public/**/*.html`, `./src/**/*.vue`, `./src/**/*.ts`],
  defaultExtractor(content: any) {
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
    /^dp*/
  ]
}

const devConfig: UserConfig = {
  base: "/",
  build: {}
};

const prodConfig: UserConfig = {
  base: "/static/monitor-map/",
  build: {
    outDir: resolve(__dirname, "./dist"),
    rollupOptions: {
      input: {
        sjvairMonitorMap: resolve(__dirname, "./src/main.ts")
      },
      output: {
        entryFileNames: "[name].js",
        assetFileNames: "[name].[ext]"
      }
    }
  }
};

const devMode = process.env.PROD !== "true";

const { base, build }: UserConfig = devMode ? devConfig : prodConfig;

// https://vitejs.dev/config/
export default defineConfig({
  // Base directory compiled files will be served from
  base,
  build: {
    target: "esnext",
    sourcemap: devMode,
    minify: "terser",
    ...build
  },
  plugins: [
    htmlPurge(htmlPurgeOptions) as unknown as PluginOption,
    vue()
  ],
  esbuild: {
    target: "es2024"
  },
  worker: {
    format: "es",
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `
          $pantone-blue-light: #3549B6;
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
      },
      "/api/2.0": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: true,
      }
    }
  },
})
