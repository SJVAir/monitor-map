<script setup lang="ts">
  import { computed, toRefs } from "vue";
  import type { Monitor } from "../Monitors";

  const props = defineProps<{ monitor: Monitor | undefined }>();
  const { monitor } = toRefs(props);

  const location = computed(() => {
    if (monitor.value) {
      return monitor.value.data.location[0].toUpperCase() + monitor.value.data.location.slice(1).toLowerCase();
    }
    return "";
  })
</script>

<template>
  <div v-if="monitor" class="monitor-header is-flex is-justify-content-space-evenly is-align-items-center is-flex-direction-column box mb-0">
    <p translate="no" class="monitor-name is-flex-grow-1 is-size-2 has-text-centered mt-3" v-html="monitor.data.name"></p>
    <ul class="is-flex is-flex-wrap-wrap is-justify-content-space-evenly is-align-items-center my-2">
      <li v-if="monitor.data.is_sjvair">
        <span class="tag is-info is-light">
          <span class="icon lungs-svg"></span>
          <span translate="no">SJVAir</span>
        </span>
      </li>
      <li>
        <span class="tag is-light">
          <span class="icon">
            <span translate="no" class="material-symbols-outlined has-text-grey">rss_feed</span>
          </span>
          <a :href="monitor.data.data_source.url" target="_blank" translate="no">{{ monitor.data.data_source.name }}</a>
        </span>
      </li>
      <li>
        <span class="tag is-light">
          <span class="icon">
            <span translate="no" class="material-symbols-outlined has-text-grey">router</span>
          </span>
          <span translate="no">{{ monitor.data.device }}</span>
        </span>
      </li>
      <li v-if="monitor.data.county">
        <span class="tag is-light">
          <span class="icon">
            <span translate="no" class="material-symbols-outlined has-text-grey">location_on</span>
          </span>
          <span>{{ monitor.data.county }}</span>
        </span>
      </li>
      <li>
        <span class="tag is-light">
          <span class="icon">
            <span translate="no" class="material-symbols-outlined has-text-grey is-slze-7">location_searching</span>
          </span>
          <span>{{ location }}</span>
        </span>
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
  .monitor-header {
    padding: bulma.$column-gap;
    width: 100%;

    .monitor-name {
      font-weight: bold;
    }

    ul {
      width: 90%;
      margin: .2rem 0 .5rem 0;
      gap: 1rem;

      li {

        .tag {
          border: 1px solid bulma.$grey-light;
        }

        .icon {

          &.lungs-svg {
            background-color: bulma.$info;
            -webkit-mask: url(../assets/lungs.svg) center/1rem 1rem no-repeat;
            mask: url(../assets/lungs.svg) center/1rem 1rem no-repeat;
            width: 18px;
            height: 18px;
          }
          
          span {
            font-size: 1rem;
          }
        }
      }
    }
  }

</style>
