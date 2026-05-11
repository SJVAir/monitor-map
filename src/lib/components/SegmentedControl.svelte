<script lang="ts">
	//import type { Attachment } from "svelte/attachments";

	interface SegmentedControlProps {
		segmentLabel?: string;
		options: Array<{ label: string; value: string }>;
		group: string;
	}

	let { segmentLabel: label, options, group = $bindable() }: SegmentedControlProps = $props();

	//const animationTrigger: Attachment<HTMLDivElement> = (element) => {

	//};
	let inner: HTMLDivElement | undefined = $state();

	$effect(() => {
		void group;
		if (!inner) return;

		const checked = inner.querySelector<HTMLInputElement>("input:checked");
		if (!checked) return;

		const fontSize = parseFloat(getComputedStyle(inner).fontSize);
		const padding = fontSize; // 1em
		const label = checked.closest("label") as HTMLLabelElement;
		const innerRect = inner.getBoundingClientRect();
		const labelRect = label.getBoundingClientRect();

		inner.style.setProperty("--highlight-width", `${labelRect.width + padding}px`);
		inner.style.setProperty(
			"--highlight-x-pos",
			`${labelRect.left - innerRect.left - padding / 2}px`
		);
	});
</script>

<div class="relative">
	{#if label}
		<p>{label}</p>
	{/if}
	<div
		bind:this={inner}
		class="relative flex gap-4 px-[.5em] before:absolute before:top-[0.125em] before:bottom-[0.125em] before:left-0 before:z-0 before:w-(--highlight-width) before:translate-x-(--highlight-x-pos) before:rounded-md before:bg-[#5465FF] before:transition-transform before:duration-500 before:content-['']"
	>
		{#each options as { label, value } (value)}
			{@const inputId = `${value}-segmented-control-option`}
			<label
				for={inputId}
				class="relative z-1 cursor-pointer text-center transition-all duration-750 active:scale-95 has-checked:text-white"
			>
				<input type="radio" id={inputId} name={label} {value} bind:group class="hidden" />
				{label}
			</label>
		{/each}
	</div>
</div>
