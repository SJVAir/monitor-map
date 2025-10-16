<script lang="ts">
	import "../app.css";
	let { children } = $props();
</script>

<svelte:head>
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
	/>
	<script>
		// Hack to force load Material Symbols early
		document.fonts.load('10pt "Material Symbols Outlined"');
	</script>
</svelte:head>

{@render children()}
