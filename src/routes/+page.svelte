<script lang="ts">
	import Map from "$lib/map/Map.svelte";
	import Menu from "$lib/map/Menu.svelte";
	import LoadingScreen from "$lib/loading/screen/LoadScreen.svelte";
</script>

<main>
	<LoadingScreen />
	<Map />
	<div class="absolute top-0 left-0 z-10 m-4">
		<Menu />
	</div>
</main>

<style>
	main {
		width: 100vw;
		height: 100vh;
	}
</style>
