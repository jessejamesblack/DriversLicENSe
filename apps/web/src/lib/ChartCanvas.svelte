<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import Chart from "chart.js/auto";
  import type { ChartData, ChartOptions, ChartType } from "chart.js";

  export let type: ChartType = "bar";
  export let data: ChartData;
  export let options: ChartOptions = {};

  let canvas: HTMLCanvasElement;
  let chart: Chart | null = null;

  $: if (chart && data) {
    chart.data = data;
    chart.update();
  }

  onMount(() => {
    chart = new Chart(canvas, {
      type,
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom"
          }
        },
        ...options
      }
    });
  });

  onDestroy(() => {
    chart?.destroy();
  });
</script>

<div class="chart-frame">
  <canvas bind:this={canvas}></canvas>
</div>

