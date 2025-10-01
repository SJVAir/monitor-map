<script lang="ts">
	import Map from "$lib/map/Map.svelte";
	import LoadingScreen from "$lib/load-screen/LoadScreen.svelte";
</script>

<main>
	<LoadingScreen />
	<Map />
</main>

<style>
	main {
		width: 100vw;
		height: 100vh;
	}
</style>
