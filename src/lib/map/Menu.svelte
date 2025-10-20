<script lang="ts">
	import type { Attachment } from "svelte/attachments";

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
				"trigger" in e.target.dataset ? close() : open();
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
	class="absolute top-0 left-0 flex items-center justify-center overflow-hidden rounded bg-white p-1 shadow transition-all duration-0 select-none"
>
	<button
		class:w-0={isOpen}
		class:h-0={isOpen}
		class:opacity-0={isOpen}
		class="relative size-8 transition-all"
		aria-label="Display Options"
	>
		<enhanced:img
			src="$lib/assets/icons/adjustment-horizontal.svg"
			alt="SJVAir Icon"
			class="size-8"
		/>
	</button>
	<div
		class:h-55={isOpen}
		class:w-115={isOpen}
		class="relative flex h-0 w-0 items-center justify-center overflow-hidden transition-all duration-250"
	>
		<div
			data-trigger
			class="absolute top-0 left-0 flex h-fit w-fit items-start justify-center gap-2 p-2"
		>
			{@render children?.()}
		</div>
	</div>
</div>
