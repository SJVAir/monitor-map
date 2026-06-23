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
<div class="flex flex-col gap-1 pointer-events-none pl-4 pb-4">
	<HMSFireLegend />
	<MonitorMarkersLegend />
</div>
