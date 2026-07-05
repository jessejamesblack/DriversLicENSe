<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import BarChart3 from "@lucide/svelte/icons/bar-chart-3";
  import FileUp from "@lucide/svelte/icons/file-up";
  import Moon from "@lucide/svelte/icons/moon";
  import Sun from "@lucide/svelte/icons/sun";
  import "../app.css";

  type Theme = "light" | "dark";

  let theme: Theme = "light";

  onMount(() => {
    const currentTheme = document.documentElement.dataset.theme;
    theme = currentTheme === "dark" ? "dark" : "light";
  });

  function setTheme(nextTheme: Theme) {
    theme = nextTheme;
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem("driverslicense-theme", nextTheme);
  }

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }
</script>

<div class="app-shell">
  <aside class="topbar">
    <a class="brand" href="/">
      <img class="brand-logo" src="/brand/driverslicense-logo.png" alt="DriversLicENSe" />
    </a>
    <div class="topbar-actions">
      <nav class="nav" aria-label="Primary">
        <a href="/" aria-current={$page.url.pathname === "/" ? "page" : undefined}><FileUp size={17} /> Upload</a>
        <a href="/dashboard" aria-current={$page.url.pathname.startsWith("/dashboard") ? "page" : undefined}
          ><BarChart3 size={17} /> Dashboard</a
        >
      </nav>
      <button
        class="theme-toggle"
        type="button"
        aria-label={theme === "dark" ? "Use light mode" : "Use dark mode"}
        title={theme === "dark" ? "Use light mode" : "Use dark mode"}
        on:click={toggleTheme}
      >
        {#if theme === "dark"}
          <Sun size={18} />
        {:else}
          <Moon size={18} />
        {/if}
      </button>
    </div>
  </aside>

  <main class="main-shell">
    <slot />
  </main>
</div>
