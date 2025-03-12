import { DirectiveBinding } from "vue";

type ClickOutsideEventHandler = (event: MouseEvent) => void;

interface ClickOutsideTarget extends HTMLElement {
  clickOutsideEvent(event: MouseEvent): void;
}

export const vClickOutside = {
  mounted(
    el: ClickOutsideTarget,
    binding: DirectiveBinding<ClickOutsideEventHandler>,
  ) {
    el.clickOutsideEvent = function (event: MouseEvent) {
      if (!(el === event.target || el.contains(event.target as Node))) {
        binding.value(event);
      }
    };
    document.body.addEventListener("click", el.clickOutsideEvent);
  },
  unmounted(el: any) {
    document.body.removeEventListener("click", el.clickOutsideEvent);
  },
};
