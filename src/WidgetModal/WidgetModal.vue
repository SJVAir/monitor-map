<script setup lang="ts">
  import { computed, ref } from "vue";

  const { monitorId } = defineProps<{
    monitorId: string
  }>();

  const modalOpen = ref<boolean>(false);
  const copied = ref<boolean>(false);
  const iframeSrc = computed(() => {
    const baseURL = (import.meta.env.PROD)
      ? new URL(import.meta.url).origin
      : "http://localhost:8000";

    return `${ baseURL }/widget/#/${ monitorId }`
  });

  const widgetStyles = {
    overflow: "hidden",
    width: "290px",
    height: "390px"
  };

  const iframeCode = computed(() => {
    return `<iframe src="${ iframeSrc.value }" frameborder="0" allowtransparency="true" style="overflow: ${ widgetStyles.overflow }; width: ${ widgetStyles.width }; height: ${ widgetStyles.height };"></iframe>`;
  });

  function copyToClipboard() {
    console.log("clicked")
    navigator.clipboard.writeText(iframeCode.value);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 1000 * 2);
  }

  function openModal() {
    modalOpen.value = true;
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    modalOpen.value = false;
    document.body.style.overflow = "auto";
  }
</script>

<template>
  <div class="widget-modal">
    <button class="button is-small is-info" @click="openModal()">Get the widget!</button>

    <div class="modal-background" :class="{ visible: modalOpen}" @click.self="closeModal">
      <div class="my-modal">
        <span class="close-btn material-symbols-outlined" @click.self="closeModal">close</span>
        <iframe :src="iframeSrc" frameborder="0" allowtransparency="true" :style="widgetStyles"></iframe>
        <p class="has-text-centered">Copy the following code and paste it in your website</p>
        <div class="code">
          <code>
            {{ iframeCode }}
          </code>
          <span class="material-symbols-outlined" @click.self="copyToClipboard()">
            content_copy
          </span>
          <div class="copied-notice" :class="{ visible: copied }">
            Copied to clipboard!
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
  .widget-modal {
    user-select: none;

    .modal-background {
      display: flex;
      justify-content: center;
      align-items: center;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: -10;
      background-color: rgba(0, 0, 0, .5);
      -webkit-backdrop-filter: blur(9.9px);
      backdrop-filter: blur(9.9px);
      transition: 200ms;
      opacity: 0;

      &.visible {
        opacity: 1;
        z-index: 9999;
      }

      .my-modal {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        background-color: white;
        padding: 1rem;
        margin: 1rem;
        max-width: min(450px, calc(100vw - 2rem));
        border-radius: 4px;
        box-shadow: 0 4px 20px #333;
        position: relative;

        .close-btn {
          cursor: pointer;
          position: absolute;
          top: 5px;
          left: 93%;
        }

        p {
          margin-bottom: 1rem;
        }

        .code {
          background-color: #333;
          display: flex;
          align-items: center;
          position: relative;
          overflow: hidden;
          width: 100%;

          code {
            cursor: text;
            user-select: text;
            color: lightgrey;
            background-color: inherit;
            overflow-x: scroll;
          }

          &:hover {
            background-color: #444;

            span {
              visibility: visible;
            }
          }

          span {
            --top: calc(50% - 1.5rem);

            visibility: hidden;
            cursor: pointer;
            color: lightgrey;
            border-radius: 50%;
            position: absolute;
            left: calc(100% - 3rem);
            top: var(--top);
            transform-origin: center;
            transform: translateY(calc(0 - var(--top)));
            background-color: rgba(20, 20, 20, .8);
            padding: .5rem;
          }

          .copied-notice {
            width: 100%;
            height: 100%;
            position: absolute;
            top: 0;
            left: 120%;
            color: bulma.$white;
            text-shadow: 1px 2px 4px #333;
            background-color: #1fb9ef;
            /*
            background-color: #1c4482;
               */
            display: flex;
            justify-content: center;
            align-items: center;
            transition: 200ms;

            &.visible {
              left: 0;
            }
          }
        }
      }
    }
  }
</style>
