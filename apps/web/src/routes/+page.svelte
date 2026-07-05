<script lang="ts">
  import { onDestroy, tick } from "svelte";
  import { goto } from "$app/navigation";
  import AlertCircle from "@lucide/svelte/icons/alert-circle";
  import Camera from "@lucide/svelte/icons/camera";
  import FileSearch from "@lucide/svelte/icons/file-search";
  import FileText from "@lucide/svelte/icons/file-text";
  import ScanLine from "@lucide/svelte/icons/scan-line";
  import Upload from "@lucide/svelte/icons/upload";
  import type { DocumentType } from "@driverslicense/domain";
  import { getDocument, processDocument, uploadDocument } from "$lib/api";

  const DOCUMENT_TYPE_OPTIONS: DocumentType[] = ["LicenseFront", "LicenseBack", "TemporaryLicense", "LearnerPermit"];

  let selectedFile: File | null = null;
  let documentType: DocumentType = "LicenseFront";
  let isSubmitting = false;
  let isCameraOpen = false;
  let cameraStream: MediaStream | null = null;
  let videoElement: HTMLVideoElement | null = null;
  let errorMessage = "";

  function handleFileChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    selectedFile = input.files?.[0] ?? null;
    errorMessage = "";
  }

  async function submit() {
    if (!selectedFile) {
      errorMessage = "Choose a license image or take a photo first.";
      return;
    }

    isSubmitting = true;
    errorMessage = "";

    try {
      const upload = await uploadDocument(selectedFile, documentType);
      await processDocument(upload.documentId);
      await waitForProcessing(upload.documentId);
      await goto(`/documents/${upload.documentId}`);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Upload failed.";
    } finally {
      isSubmitting = false;
    }
  }

  function formatDocumentType(type: DocumentType): string {
    return type.replace(/([a-z])([A-Z])/g, "$1 $2");
  }

  async function openCamera() {
    errorMessage = "";

    if (!navigator.mediaDevices?.getUserMedia) {
      errorMessage = "This browser does not support camera capture.";
      return;
    }

    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {
            ideal: "environment"
          }
        },
        audio: false
      });
      isCameraOpen = true;
      await tickVideo();
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Camera could not be opened.";
    }
  }

  async function tickVideo() {
    await tick();

    if (videoElement && cameraStream) {
      videoElement.srcObject = cameraStream;
      await videoElement.play();
    }
  }

  function capturePhoto() {
    if (!videoElement) {
      errorMessage = "Camera preview is not ready yet.";
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = videoElement.videoWidth || 1280;
    canvas.height = videoElement.videoHeight || 720;
    const context = canvas.getContext("2d");

    if (!context) {
      errorMessage = "Photo capture failed.";
      return;
    }

    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        errorMessage = "Photo capture failed.";
        return;
      }

      selectedFile = new File([blob], `license-photo-${Date.now()}.jpg`, { type: "image/jpeg" });
      closeCamera();
    }, "image/jpeg", 0.92);
  }

  function closeCamera() {
    cameraStream?.getTracks().forEach((track) => track.stop());
    cameraStream = null;
    isCameraOpen = false;
  }

  async function waitForProcessing(documentId: string) {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const record = await getDocument(documentId);

      if (record.status === "PROCESSED") {
        return;
      }

      if (record.status === "FAILED" || record.status === "DEAD_LETTER") {
        throw new Error(record.errorMessage ?? "Processing failed.");
      }

      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    throw new Error("Processing is taking longer than expected. Try refreshing the documents page.");
  }

  onDestroy(closeCamera);
</script>

<section class="page">
  <div class="page-header">
    <div>
      <p class="eyebrow">License capture</p>
      <h1>Scan a driver license</h1>
      <p>Drop in a test license scan or snap a quick photo, then check what the app was able to read.</p>
    </div>
  </div>

  <section class="workflow-card" aria-label="Capture workflow">
    <div class="workflow-header">
      <div>
        <p class="eyebrow">Step 1 of 2</p>
        <h2>Capture workflow</h2>
      </div>
      <span>0 / 1 uploaded</span>
    </div>
    <div class="workflow-steps">
      <div class="workflow-step active">
        <span><ScanLine size={17} /></span>
        <strong>Upload</strong>
      </div>
      <div class="workflow-step">
        <span><FileSearch size={17} /></span>
        <strong>Extract</strong>
      </div>
    </div>
  </section>

  <div class="grid upload-grid">
    <section class="panel">
      <div class="panel-header">
        <h2>License upload</h2>
        <FileText size={20} class="muted" />
      </div>
      <div class="panel-body grid">
        {#if errorMessage}
          <div class="error"><AlertCircle size={17} /> {errorMessage}</div>
        {/if}

        <div class="field">
          <label for="documentType">Document type</label>
          <select id="documentType" bind:value={documentType}>
            {#each DOCUMENT_TYPE_OPTIONS as type}
              <option value={type}>{formatDocumentType(type)}</option>
            {/each}
          </select>
        </div>

        <div class="field">
          <label for="file">Document</label>
          <input
            id="file"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.txt,text/plain,application/pdf,image/*"
            on:change={handleFileChange}
          />
          {#if selectedFile}
            <p class="field-hint">{selectedFile.name}</p>
          {/if}
        </div>

        <div class="camera-actions">
          <button class="secondary" type="button" on:click={openCamera}>
            <Camera size={17} />
            Take a photo
          </button>
          {#if selectedFile}
            <span class="muted">Ready to upload</span>
          {/if}
        </div>

        <button class="primary" disabled={isSubmitting} on:click={submit}>
          <Upload size={18} />
          {isSubmitting ? "Extracting" : "Upload and extract"}
        </button>
      </div>
    </section>
  </div>

  {#if isCameraOpen}
    <div class="modal-backdrop" role="presentation">
      <section class="camera-modal" aria-label="Camera capture">
        <div class="panel-header">
          <h2>Take a license photo</h2>
          <button class="secondary" type="button" on:click={closeCamera}>Close</button>
        </div>
        <video bind:this={videoElement} playsinline muted></video>
        <div class="camera-actions">
          <button class="primary" type="button" on:click={capturePhoto}>
            <Camera size={17} />
            Use this photo
          </button>
        </div>
      </section>
    </div>
  {/if}
</section>
