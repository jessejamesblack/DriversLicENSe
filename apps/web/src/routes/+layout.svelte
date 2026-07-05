<script lang="ts">
  import { BarChart3, FileUp, ShieldCheck } from "@lucide/svelte";
  import "../app.css";
</script>

<div class="app-shell">
  <header class="topbar">
    <a class="brand" href="/">
      <span class="brand-mark"><ShieldCheck size={21} /></span>
      <span class="brand-text">
        <strong>PolicyLens</strong>
        <span>Document intelligence</span>
      </span>
    </a>
    <nav class="nav" aria-label="Primary">
      <a href="/"><FileUp size={17} /> Upload</a>
      <a href="/dashboard"><BarChart3 size={17} /> Dashboard</a>
    </nav>
  </header>

  <main>
    <slot />
  </main>
</div>
