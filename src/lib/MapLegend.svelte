<script lang="ts">
	import MonitorMarkersLegend from "$lib/monitors/components/MonitorMarkersLegend.svelte";
	import HMSFireLegend from "$lib/hms/components/HMSFireLegend.svelte";
</script>

<!--
<div class="z-10 absolute bottom-6 left-6 w-1/2 lg:w-1/5">
	<MonitorMarkersLegend />
	<HMSFireLegend />
</div>
-->
<div class="pointer-events-none flex flex-col gap-1 pb-4 pl-4">
	<HMSFireLegend />
	<MonitorMarkersLegend />
</div>
