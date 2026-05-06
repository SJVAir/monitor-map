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

<div class="relative w-full">
	{#if label}
		<p>{label}</p>
	{/if}
	<div
		bind:this={inner}
		class="relative flex justify-between px-[.5em] before:absolute before:top-[0.125em] before:bottom-[0.125em] before:left-0 before:z-0 before:w-(--highlight-width) before:translate-x-(--highlight-x-pos) before:rounded-md before:bg-[#5465FF] before:transition-transform before:duration-500 before:content-['']"
	>
		{#each options as { label, value } (value)}
			{@const inputId = `${value}-segmented-control-option`}
			<!--
			<input class="peer hidden" type="radio" id={inputId} name={label} {value} bind:group />
			<label
				for={inputId}
				class="peer-checked/text-white cursor-pointer whitespace-nowrap select-none"
			>
				{label}
			</label>
			<input type="radio" name={label} id={inputId} class="peer hidden" {value} bind:group />
			<label
				for={inputId}
				class="transition-all peer-checked:border-blue-600 peer-checked:bg-blue-600 peer-checked:text-white active:scale-95"
			>
				{label}
			</label>
      -->
			<!-- This is probably what we're using
			<label
				for={inputId}
				class="block cursor-pointer rounded-md border px-4 py-2 transition-all active:scale-95 has-[:checked]:border-green-600 has-[:checked]:bg-green-600 has-[:checked]:text-white"
			>
				<input type="radio" id={inputId} name={label} {value} bind:group class="hidden" />
				{label}
			</label>
      -->
			<label
				for={inputId}
				class="relative z-1 cursor-pointer text-center transition-all active:scale-95 has-[:checked]:text-white"
			>
				<input type="radio" id={inputId} name={label} {value} bind:group class="hidden" />
				{label}
			</label>
		{/each}
	</div>
</div>

<style>
	.controls-container {
		--highlight-width: auto;
		--highlight-x-pos: 0;

		display: flex;
	}

	.controls {
		display: inline-flex;
		justify-content: space-between;
		background: white;
		box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
		border-radius: 10px;
		max-width: 500px;
		padding: 12px;
		margin: auto;
		overflow: hidden;
		position: relative;
	}
</style>
