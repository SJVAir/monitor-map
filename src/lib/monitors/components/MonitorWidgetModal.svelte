<script lang="ts">
	import { portal } from "$lib/actions";
	import { SquareX } from "@lucide/svelte";

	interface MonitorWidgetModalProps {
		monitorId: string;
	}

	const widgetStyles = {
		overflow: "hidden",
		width: "290px",
		height: "390px"
	};

	const { monitorId }: MonitorWidgetModalProps = $props();

	let modalOpen = $state(false);
	let copied = $state(false);

	const iframeSrc = $derived.by(() => {
		const baseURL = import.meta.env.PROD ? window.location.origin : "https://www.sjvair.com";
		return `${baseURL}/widget/#/${monitorId}`;
	});

	const iframeCode = $derived.by(() => {
		return `<iframe src="${iframeSrc}" frameborder="0" allowtransparency="true" style="overflow: ${widgetStyles.overflow}; width: ${widgetStyles.width}; height: ${widgetStyles.height};"></iframe>`;
	});

	function copyToClipboard() {
		navigator.clipboard.writeText(iframeCode);
		copied = true;
		setTimeout(() => {
			copied = false;
		}, 1000 * 2);
	}

	function openModal() {
		modalOpen = true;
		document.body.style.overflow = "hidden";
	}

	function closeModal() {
		modalOpen = false;
		document.body.style.overflow = "auto";
	}
</script>

<div class="select-none">
	<button
		class="cursor-pointer rounded border border-blue-400 bg-blue-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-600"
		onclick={openModal}>Get the widget!</button
	>

	<div
		use:portal
		class={[
			"fixed inset-0 z-9999 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-all duration-200",
			modalOpen ? "visible" : "collapse"
		]}
	>
		<div
			class="m-4 flex max-w-[min(450px,calc(100vw-2rem))] flex-col items-center justify-center rounded bg-white p-4 shadow-lg"
		>
			<button translate="no" class="cursor-pointer self-end" onclick={closeModal}>
				<SquareX />
			</button>

			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			<div translate="no">{@html iframeCode}</div>

			<p class="mb-4 text-center">Copy the following code and paste it in your website</p>

			<div
				class="group relative flex w-full items-center overflow-hidden bg-neutral-800 hover:bg-neutral-600"
			>
				<code class="cursor-text overflow-x-scroll bg-inherit text-gray-300 select-text">
					{iframeCode}
				</code>
				<div
					class="invisible absolute top-1/2 left-[calc(100%-3rem)] flex -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/80 p-2 group-hover:visible"
				>
					<button
						aria-label="Copy"
						translate="no"
						class="svg-icon content-copy cursor-pointer bg-gray-300"
						onclick={copyToClipboard}
					></button>
				</div>
				<div
					class={[
						"absolute flex h-full w-full items-center justify-center bg-[#1fb9ef] text-white transition-all duration-200 [text-shadow:1px_2px_4px_#333]",
						copied ? "left-0" : "left-[120%]"
					]}
				>
					Copied to clipboard!
				</div>
			</div>
		</div>
	</div>
</div>
