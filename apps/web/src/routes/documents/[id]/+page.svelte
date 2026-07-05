<script lang="ts">
  import { page } from "$app/stores";
  import AlertCircle from "@lucide/svelte/icons/alert-circle";
  import CheckCircle2 from "@lucide/svelte/icons/check-circle-2";
  import FileSearch from "@lucide/svelte/icons/file-search";
  import RefreshCw from "@lucide/svelte/icons/refresh-cw";
  import Save from "@lucide/svelte/icons/save";
  import ScanLine from "@lucide/svelte/icons/scan-line";
  import type { DocumentRecord, LicenseFieldName, StructuredLicenseExtraction } from "@driverslicense/domain";
  import { adjudicateDocument, getDocument, processDocument } from "$lib/api";
  import { percent } from "$lib/chartData";

  let documentRecord: DocumentRecord | null = null;
  let isLoading = true;
  let isProcessing = false;
  let isAdjudicating = false;
  let errorMessage = "";
  let adjudicationField: LicenseFieldName = "licenseNumber";
  let adjudicationValue = "";
  let adjudicationNote = "";

  $: extraction = documentRecord?.extraction as StructuredLicenseExtraction | null | undefined;
  $: lowConfidenceFields = extraction?.fieldConfidences.filter((item) => item.needsAdjudication) ?? [];
  $: if (lowConfidenceFields.length && !lowConfidenceFields.some((item) => item.field === adjudicationField)) {
    adjudicationField = lowConfidenceFields[0].field;
    adjudicationValue = formatRawValue(extraction?.[adjudicationField]);
  }

  async function loadDocument() {
    isLoading = true;
    errorMessage = "";

    try {
      documentRecord = await getDocument($page.params.id);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Document could not be loaded.";
    } finally {
      isLoading = false;
    }
  }

  async function reprocess() {
    isProcessing = true;
    errorMessage = "";

    try {
      await processDocument($page.params.id);
      await waitForProcessing($page.params.id);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Processing failed.";
    } finally {
      isProcessing = false;
    }
  }

  function formatBoolean(value: boolean | null | undefined): string {
    if (value === true) {
      return "Yes";
    }

    if (value === false) {
      return "No";
    }

    return "Missing";
  }

  function formatList(values: string[]): string {
    return values.length ? values.join(", ") : "None";
  }

  function formatRawValue(value: unknown): string {
    if (Array.isArray(value)) {
      return value.join(", ");
    }

    if (value === null || value === undefined) {
      return "";
    }

    return String(value);
  }

  function fieldConfidence(field: LicenseFieldName): string {
    const match = extraction?.fieldConfidences.find((item) => item.field === field);
    return match ? `${percent(match.confidence)} (${match.source})` : "N/A";
  }

  async function saveAdjudication() {
    isAdjudicating = true;
    errorMessage = "";

    try {
      documentRecord = await adjudicateDocument({
        documentId: $page.params.id,
        field: adjudicationField,
        value: normalizeAdjudicatedValue(adjudicationField, adjudicationValue),
        note: adjudicationNote
      });
      adjudicationNote = "";
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Correction could not be saved.";
    } finally {
      isAdjudicating = false;
    }
  }

  function normalizeAdjudicatedValue(field: LicenseFieldName, value: string): unknown {
    if (field === "endorsements" || field === "restrictions") {
      return value.split(",").map((item) => item.trim()).filter(Boolean);
    }

    if (["organDonor", "veteran", "realId", "isExpired"].includes(field)) {
      return /^(yes|true|1)$/i.test(value);
    }

    if (field === "ageAtScan") {
      return value ? Number(value) : null;
    }

    return value.trim() || null;
  }

  async function waitForProcessing(documentId: string) {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      documentRecord = await getDocument(documentId);

      if (documentRecord.status === "PROCESSED" || documentRecord.status === "FAILED" || documentRecord.status === "DEAD_LETTER") {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    await loadDocument();
  }

  $: if ($page.params.id) {
    loadDocument();
  }
</script>

<section class="page">
  <div class="page-header">
    <div>
      <h1>{documentRecord?.filename ?? "Extraction detail"}</h1>
      {#if documentRecord}
        <p>{documentRecord.documentType} saved {new Date(documentRecord.createdAt).toLocaleString()}</p>
      {/if}
    </div>
    {#if documentRecord}
      <button class="secondary" disabled={isProcessing} on:click={reprocess}>
        <RefreshCw size={17} />
        {isProcessing ? "Extracting" : "Re-extract"}
      </button>
    {/if}
  </div>

  {#if documentRecord}
    <section class="workflow-card" aria-label="Capture workflow">
      <div class="workflow-header">
        <div>
          <p class="eyebrow">Step {extraction ? "2" : "1"} of 2</p>
          <h2>Capture workflow</h2>
        </div>
        <span>1 / 1 uploaded</span>
      </div>
      <div class="workflow-steps">
        <div class="workflow-step active">
          <span><ScanLine size={17} /></span>
          <strong>Upload</strong>
        </div>
        <div class={`workflow-step ${extraction ? "active" : ""}`}>
          <span><FileSearch size={17} /></span>
          <strong>Extract</strong>
        </div>
      </div>
    </section>
  {/if}

  {#if errorMessage}
    <div class="error"><AlertCircle size={17} /> {errorMessage}</div>
  {:else if isLoading}
    <div class="panel"><div class="panel-body muted">Loading document...</div></div>
  {:else if documentRecord}
    <div class="grid two">
      <section class="panel">
        <div class="panel-header">
          <h2>Normalized fields</h2>
          <span class={`status ${(documentRecord.validationStatus ?? documentRecord.status).toLowerCase()}`}>
            {documentRecord.validationStatus ?? documentRecord.status}
          </span>
        </div>
        <div class="panel-body">
          {#if extraction}
            <div class="details-grid">
              <div class="detail-item"><span>Full name</span><strong>{extraction.fullName ?? "Missing"}</strong></div>
              <div class="detail-item"><span>License number</span><strong>{extraction.licenseNumber ?? "Missing"}</strong></div>
              <div class="detail-item"><span>Issuing state</span><strong>{extraction.issuingState ?? "Missing"}</strong></div>
              <div class="detail-item"><span>Date of birth</span><strong>{extraction.dateOfBirth ?? "Missing"}</strong></div>
              <div class="detail-item"><span>Issue date</span><strong>{extraction.issueDate ?? "Missing"}</strong></div>
              <div class="detail-item"><span>Expiration date</span><strong>{extraction.expirationDate ?? "Missing"}</strong></div>
              <div class="detail-item"><span>Address</span><strong>{extraction.address ?? "Missing"}</strong></div>
              <div class="detail-item"><span>Class</span><strong>{extraction.licenseClass ?? "Missing"}</strong></div>
              <div class="detail-item"><span>Endorsements</span><strong>{formatList(extraction.endorsements)}</strong></div>
              <div class="detail-item"><span>Restrictions</span><strong>{formatList(extraction.restrictions)}</strong></div>
              <div class="detail-item"><span>Sex</span><strong>{extraction.sex ?? "Missing"}</strong></div>
              <div class="detail-item"><span>Height</span><strong>{extraction.height ?? "Missing"}</strong></div>
              <div class="detail-item"><span>Weight</span><strong>{extraction.weight ?? "Missing"}</strong></div>
              <div class="detail-item"><span>Eye color</span><strong>{extraction.eyeColor ?? "Missing"}</strong></div>
              <div class="detail-item"><span>Hair color</span><strong>{extraction.hairColor ?? "Missing"}</strong></div>
              <div class="detail-item"><span>Organ donor</span><strong>{formatBoolean(extraction.organDonor)}</strong></div>
              <div class="detail-item"><span>Veteran</span><strong>{formatBoolean(extraction.veteran)}</strong></div>
              <div class="detail-item"><span>REAL ID</span><strong>{formatBoolean(extraction.realId)}</strong></div>
              <div class="detail-item"><span>Under 21 until</span><strong>{extraction.under21Until ?? "N/A"}</strong></div>
              <div class="detail-item"><span>Age at scan</span><strong>{extraction.ageAtScan ?? "Missing"}</strong></div>
              <div class="detail-item"><span>Expired</span><strong>{formatBoolean(extraction.isExpired)}</strong></div>
              <div class="detail-item"><span>Confidence</span><strong>{percent(extraction.confidenceScore)}</strong></div>
            </div>
          {:else}
            <p class="muted">No extraction has been stored for this document.</p>
          {/if}
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>Quality warnings</h2>
          {#if extraction?.warnings.length === 0}
            <CheckCircle2 size={19} class="muted" />
          {/if}
        </div>
        <div class="panel-body">
          {#if extraction?.warnings.length}
            <ul class="warning-list">
              {#each extraction.warnings as warning}
                <li>
                  <strong>{warning.category}</strong>
                  <span class="muted">{warning.field}: {warning.message}</span>
                </li>
              {/each}
            </ul>
          {:else}
            <p class="muted">No quality warnings.</p>
          {/if}
        </div>
      </section>
    </div>

    {#if extraction}
      <div class="grid two" style="margin-top: 1rem;">
        <section class="panel">
          <div class="panel-header">
            <h2>Field confidence</h2>
            <span class="status">{extraction.schemaVersion}</span>
          </div>
          <div class="panel-body">
            <div class="details-grid">
              <div class="detail-item"><span>Full name</span><strong>{fieldConfidence("fullName")}</strong></div>
              <div class="detail-item"><span>License number</span><strong>{fieldConfidence("licenseNumber")}</strong></div>
              <div class="detail-item"><span>Issuing state</span><strong>{fieldConfidence("issuingState")}</strong></div>
              <div class="detail-item"><span>Date of birth</span><strong>{fieldConfidence("dateOfBirth")}</strong></div>
              <div class="detail-item"><span>Expiration date</span><strong>{fieldConfidence("expirationDate")}</strong></div>
              <div class="detail-item"><span>Address</span><strong>{fieldConfidence("address")}</strong></div>
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="panel-header">
            <h2>Human check</h2>
            <span class="status">{lowConfidenceFields.length} fields</span>
          </div>
          <div class="panel-body grid">
            {#if lowConfidenceFields.length}
              <div class="field">
                <label for="adjudicationField">Field</label>
                <select
                  id="adjudicationField"
                  bind:value={adjudicationField}
                  on:change={() => (adjudicationValue = formatRawValue(extraction?.[adjudicationField]))}
                >
                  {#each lowConfidenceFields as field}
                    <option value={field.field}>{field.field}</option>
                  {/each}
                </select>
              </div>
              <div class="field">
                <label for="adjudicationValue">Correct value</label>
                <input id="adjudicationValue" bind:value={adjudicationValue} />
              </div>
              <div class="field">
                <label for="adjudicationNote">Note</label>
                <input id="adjudicationNote" bind:value={adjudicationNote} placeholder="Optional" />
              </div>
              <button class="primary" type="button" disabled={isAdjudicating} on:click={saveAdjudication}>
                <Save size={17} />
                {isAdjudicating ? "Saving" : "Save correction"}
              </button>
            {:else}
              <p class="muted">No fields currently need a manual check.</p>
            {/if}
          </div>
        </section>
      </div>

      <div class="grid two" style="margin-top: 1rem;">
        <section class="panel">
          <div class="panel-header">
            <h2>Barcode</h2>
            <span class="status">{documentRecord.barcode?.format ?? "NONE"}</span>
          </div>
          <div class="panel-body">
            {#if documentRecord.barcode?.parsed}
              <div class="details-grid">
                <div class="detail-item"><span>License number</span><strong>{documentRecord.barcode.parsed.licenseNumber ?? "Missing"}</strong></div>
                <div class="detail-item"><span>Issuing state</span><strong>{documentRecord.barcode.parsed.issuingState ?? "Missing"}</strong></div>
                <div class="detail-item"><span>Date of birth</span><strong>{documentRecord.barcode.parsed.dateOfBirth ?? "Missing"}</strong></div>
                <div class="detail-item"><span>Confidence</span><strong>{percent(documentRecord.barcode.confidenceScore)}</strong></div>
              </div>
            {:else}
              <p class="muted">No PDF417 barcode payload was found in this scan.</p>
            {/if}
          </div>
        </section>

        <section class="panel">
          <div class="panel-header">
            <h2>Privacy</h2>
          </div>
          <div class="panel-body">
            <div class="details-grid">
              <div class="detail-item"><span>Redacted copy</span><strong>{documentRecord.redaction?.redactedStorageKey ? "Created" : "Missing"}</strong></div>
              <div class="detail-item"><span>Raw OCR retained</span><strong>{formatBoolean(documentRecord.redaction?.retainedRawOcr)}</strong></div>
              <div class="detail-item"><span>Raw extraction retained</span><strong>{formatBoolean(documentRecord.redaction?.retainedRawExtraction)}</strong></div>
              <div class="detail-item"><span>Raw retention days</span><strong>{documentRecord.piiRetention.rawRetentionDays}</strong></div>
            </div>
          </div>
        </section>
      </div>
    {/if}

    <section class="panel" style="margin-top: 1rem;">
      <div class="panel-header">
        <h2>Raw extracted JSON</h2>
      </div>
      <div class="panel-body">
        <pre>{JSON.stringify({ rawOcr: documentRecord.rawOcr, rawExtraction: documentRecord.rawExtraction }, null, 2)}</pre>
      </div>
    </section>
  {/if}
</section>
