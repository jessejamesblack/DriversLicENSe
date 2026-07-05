<script lang="ts">
  import { onMount } from "svelte";
  import { BarChart3, FileUp, Moon, ShieldCheck, Sun } from "@lucide/svelte";
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
    localStorage.setItem("policylens-theme", nextTheme);
  }

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }
</script>

<div class="app-shell">
  <header class="topbar">
    <a class="brand" href="/">
      <span class="brand-mark"><ShieldCheck size={21} /></span>
      <span class="brand-text">
        <strong>PolicyLens</strong>
        <span>License intelligence</span>
      </span>
    </a>
    <div class="topbar-actions">
      <nav class="nav" aria-label="Primary">
        <a href="/"><FileUp size={17} /> Upload</a>
        <a href="/dashboard"><BarChart3 size={17} /> Dashboard</a>
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
  </header>

  <main>
    <slot />
  </main>
</div>
