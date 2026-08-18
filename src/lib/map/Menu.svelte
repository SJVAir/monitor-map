<script lang="ts">
	import type { Attachment } from "svelte/attachments";
	import { SlidersHorizontalIcon } from "@lucide/svelte";

	let { children } = $props();
	let isOpen: boolean = $state(false);

	function open() {
		if (!isOpen) {
			isOpen = true;
		}
	}

	function close() {
		if (isOpen) {
			isOpen = false;
		}
	}

	const hasTarget = (target: EventTarget | null): target is HTMLElement => target !== null;

	const displayOptionsToggle: Attachment<HTMLDivElement> = (target: HTMLDivElement) => {
		function toggle(e: PointerEvent) {
			if (hasTarget(e.target) && target.contains(e.target)) {
				return "trigger" in e.target.dataset ? close() : open();
			} else {
				close();
			}
		}
		document.body.addEventListener("click", toggle);

		return () => document.body.removeEventListener("click", toggle);
	};
</script>

<div
	{@attach displayOptionsToggle}
	data-trigger
	class:rounded-full={!isOpen}
	class:delay-100={!isOpen}
	class="relative top-0 left-0 flex items-center justify-center overflow-hidden rounded bg-white p-1 shadow transition-all duration-0 select-none"
>
	<button
		class:w-0={isOpen}
		class:h-0={isOpen}
		class:opacity-0={isOpen}
		class="relative flex size-10 items-center justify-center transition-all"
		aria-label="Display Options"
	>
		<SlidersHorizontalIcon size="24" />
	</button>
	<div
		class={[
			"relative flex max-w-[90vw] items-center justify-center overflow-x-hidden overflow-y-scroll transition-all duration-250",
			isOpen ? "h-55 w-135" : "h-0 w-0"
		]}
	>
		<div
			data-trigger
			class="xs:justify-between absolute top-0 left-0 flex h-fit w-full flex-wrap items-start gap-2 p-2 sm:justify-evenly md:justify-between md:gap-4"
		>
			{@render children?.()}
		</div>
	</div>
</div>
