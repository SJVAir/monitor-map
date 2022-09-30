import { defineConfig, PluginOption } from 'vite'
import htmlPurge from 'vite-plugin-purgecss'
import vue from '@vitejs/plugin-vue'

const htmlPurgeOptions = {
  safelist: [
    /-(leave|enter|appear)(|-(to|from|active))$/,
    /^(?!(|.*?:)cursor-move).+-move$/,
    /^router-link(|-exact)-active$/,
    /data-v-.*/,
    /leaflet-*/
  ]
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    htmlPurge(htmlPurgeOptions) as PluginOption,
    vue()
  ],
  build: {
    minify: "terser"
  },
  css: {
  preprocessorOptions: {
    scss: {
      additionalData: `@use "bulma/bulma";`
    },
  }
},
})
