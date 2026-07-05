<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import Chart from "chart.js/auto";
  import type { ChartData, ChartOptions, ChartType } from "chart.js";

  export let type: ChartType = "bar";
  export let data: ChartData;
  export let options: ChartOptions = {};

  let canvas: HTMLCanvasElement;
  let chart: Chart | null = null;
  let themeObserver: MutationObserver | null = null;

  $: if (chart && data) {
    chart.data = data;
    chart.options = buildOptions();
    chart.update();
  }

  onMount(() => {
    chart = new Chart(canvas, {
      type,
      data,
      options: buildOptions()
    });

    themeObserver = new MutationObserver(() => {
      if (!chart) {
        return;
      }

      chart.options = buildOptions();
      chart.update();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  });

  onDestroy(() => {
    themeObserver?.disconnect();
    chart?.destroy();
  });

  function buildOptions(): ChartOptions {
    const styles = getComputedStyle(document.documentElement);
    const textColor = styles.getPropertyValue("--chart-text").trim() || "#5f6c67";
    const gridColor = styles.getPropertyValue("--chart-grid").trim() || "#d8ded8";
    const themedOptions: ChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: textColor
          }
        }
      }
    };

    if (type !== "doughnut" && type !== "pie") {
      themedOptions.scales = {
        x: {
          ticks: {
            color: textColor
          },
          grid: {
            color: gridColor
          }
        },
        y: {
          ticks: {
            color: textColor
          },
          grid: {
            color: gridColor
          }
        }
      };
    }

    return mergeOptions(themedOptions, options);
  }

  function mergeOptions(baseOptions: ChartOptions, overrideOptions: ChartOptions): ChartOptions {
    return {
      ...baseOptions,
      ...overrideOptions,
      plugins: {
        ...baseOptions.plugins,
        ...overrideOptions.plugins,
        legend: {
          ...baseOptions.plugins?.legend,
          ...overrideOptions.plugins?.legend,
          labels: {
            ...baseOptions.plugins?.legend?.labels,
            ...overrideOptions.plugins?.legend?.labels
          }
        }
      },
      scales: {
        ...baseOptions.scales,
        ...overrideOptions.scales
      }
    };
  }
</script>

<div class="chart-frame">
  <canvas bind:this={canvas}></canvas>
</div>
