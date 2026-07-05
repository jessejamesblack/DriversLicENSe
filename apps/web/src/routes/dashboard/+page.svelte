<script lang="ts">
  import { onMount } from "svelte";
  import AlertCircle from "@lucide/svelte/icons/alert-circle";
  import RefreshCw from "@lucide/svelte/icons/refresh-cw";
  import type { DashboardFilters, DashboardSummary, DocumentType, ValidationStatus } from "@driverslicense/domain";
  import ChartCanvas from "$lib/ChartCanvas.svelte";
  import { getDashboardSummary } from "$lib/api";
  import {
    confidenceByDocumentTypeChart,
    documentsByIssuingStateChart,
    documentsByStatusChart,
    expirationBucketChart,
    percent
  } from "$lib/chartData";

  let summary: DashboardSummary | null = null;
  let isLoading = true;
  let errorMessage = "";
  let filters: DashboardFilters = {
    issuingState: null,
    documentType: null,
    validationStatus: null,
    expirationBucket: null
  };
  const DOCUMENT_TYPE_OPTIONS: DocumentType[] = ["LicenseFront", "LicenseBack", "TemporaryLicense", "LearnerPermit"];
  const VALIDATION_STATUS_OPTIONS: ValidationStatus[] = ["VALID", "WARNING", "FAILED"];

  async function loadSummary() {
    isLoading = true;
    errorMessage = "";

    try {
      summary = await getDashboardSummary(filters);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Dashboard could not be loaded.";
    } finally {
      isLoading = false;
    }
  }

  onMount(loadSummary);

  function clearFilters() {
    filters = {
      issuingState: null,
      documentType: null,
      validationStatus: null,
      expirationBucket: null
    };
    void loadSummary();
  }
</script>

<section class="page">
  <div class="page-header">
    <div>
      <h1>Data quality dashboard</h1>
      <p>A quick look at what the app has read so far and which scans need another look.</p>
    </div>
    <button class="secondary" on:click={loadSummary} disabled={isLoading}>
      <RefreshCw size={17} />
      Refresh
    </button>
  </div>

  {#if errorMessage}
    <div class="error"><AlertCircle size={17} /> {errorMessage}</div>
  {:else if isLoading}
    <div class="panel"><div class="panel-body muted">Loading dashboard...</div></div>
  {:else if summary}
    <section class="panel filter-panel">
      <div class="panel-header">
        <h2>Filters</h2>
        <button class="secondary" type="button" on:click={clearFilters}>Clear</button>
      </div>
      <div class="panel-body filter-grid">
        <div class="field">
          <label for="stateFilter">Issuing state</label>
          <input
            id="stateFilter"
            maxlength="2"
            placeholder="Any"
            bind:value={filters.issuingState}
            on:change={loadSummary}
          />
        </div>
        <div class="field">
          <label for="documentTypeFilter">Document type</label>
          <select id="documentTypeFilter" bind:value={filters.documentType} on:change={loadSummary}>
            <option value="">Any</option>
            {#each DOCUMENT_TYPE_OPTIONS as type}
              <option value={type}>{type.replace(/([a-z])([A-Z])/g, "$1 $2")}</option>
            {/each}
          </select>
        </div>
        <div class="field">
          <label for="statusFilter">Quality status</label>
          <select id="statusFilter" bind:value={filters.validationStatus} on:change={loadSummary}>
            <option value="">Any</option>
            {#each VALIDATION_STATUS_OPTIONS as status}
              <option value={status}>{status}</option>
            {/each}
          </select>
        </div>
        <div class="field">
          <label for="expirationFilter">Expiration bucket</label>
          <select id="expirationFilter" bind:value={filters.expirationBucket} on:change={loadSummary}>
            <option value="">Any</option>
            <option value="Expired">Expired</option>
            <option value="Expires within 30 days">Expires within 30 days</option>
            <option value="Expires within 6 months">Expires within 6 months</option>
            <option value="Valid over 6 months">Valid over 6 months</option>
            <option value="Missing expiration">Missing expiration</option>
          </select>
        </div>
      </div>
    </section>

    <div class="metric-grid" style="margin-bottom: 1rem;">
      <div class="metric"><span>Documents processed</span><strong>{summary.documentsProcessed}</strong></div>
      <div class="metric"><span>Average confidence</span><strong>{percent(summary.averageConfidence)}</strong></div>
      <div class="metric"><span>Quality warnings</span><strong>{summary.warningCount}</strong></div>
      <div class="metric"><span>REAL ID</span><strong>{summary.realIdCount}</strong></div>
      <div class="metric"><span>Organ donor</span><strong>{summary.organDonorCount}</strong></div>
      <div class="metric"><span>Veteran</span><strong>{summary.veteranCount}</strong></div>
      <div class="metric"><span>Expired</span><strong>{summary.expiredCount}</strong></div>
      <div class="metric"><span>Under 21</span><strong>{summary.under21Count}</strong></div>
      <div class="metric"><span>Average age</span><strong>{summary.averageAge}</strong></div>
    </div>

    <div class="chart-grid">
      <section class="chart-card">
        <h2>Documents by issuing state</h2>
        <ChartCanvas type="bar" data={documentsByIssuingStateChart(summary)} />
      </section>
      <section class="chart-card">
        <h2>Documents by quality status</h2>
        <ChartCanvas type="doughnut" data={documentsByStatusChart(summary)} />
      </section>
      <section class="chart-card">
        <h2>Expiration buckets</h2>
        <ChartCanvas type="bar" data={expirationBucketChart(summary)} />
      </section>
      <section class="chart-card">
        <h2>Average confidence by document type</h2>
        <ChartCanvas
          type="bar"
          data={confidenceByDocumentTypeChart(summary)}
          options={{
            scales: {
              y: {
                min: 0,
                max: 1
              }
            }
          }}
        />
      </section>
      <section class="chart-card">
        <h2>Warning categories</h2>
        {#if summary.warningCountByCategory.length}
          <ul class="warning-list">
            {#each summary.warningCountByCategory as warning}
              <li>
                <strong>{warning.category}</strong>
                <span class="muted">{warning.count} documents or fields</span>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="muted">No warning categories recorded.</p>
        {/if}
      </section>
    </div>
  {/if}
</section>
