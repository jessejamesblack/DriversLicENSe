const TEXTRACT_SAFE_IMAGE_BYTES = 9 * 1024 * 1024;
const MAX_TEXTRACT_IMAGE_SIDE = 3000;
const JPEG_QUALITIES = [0.86, 0.8, 0.74, 0.68, 0.62];

export async function prepareDocumentFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  if (!canPrepareImages()) {
    return file;
  }

  const bitmap = await createImageBitmap(file);

  try {
    const scale = Math.min(1, MAX_TEXTRACT_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
    const needsResize = scale < 1;
    const needsCompression = file.size > TEXTRACT_SAFE_IMAGE_BYTES || file.type !== "image/jpeg";

    if (!needsResize && !needsCompression) {
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");

    if (!context) {
      return file;
    }

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    for (const quality of JPEG_QUALITIES) {
      const blob = await canvasToBlob(canvas, quality);

      if (blob.size <= TEXTRACT_SAFE_IMAGE_BYTES || quality === JPEG_QUALITIES[JPEG_QUALITIES.length - 1]) {
        return new File([blob], normalizedJpegName(file.name), {
          type: "image/jpeg",
          lastModified: file.lastModified
        });
      }
    }

    return file;
  } finally {
    bitmap.close?.();
  }
}

function canPrepareImages(): boolean {
  return typeof document !== "undefined" && typeof createImageBitmap === "function";
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error("Unable to prepare image for upload."));
      },
      "image/jpeg",
      quality
    );
  });
}

function normalizedJpegName(filename: string): string {
  return filename.replace(/\.(png|webp|heic|heif|jpeg|jpg)$/i, ".jpg") || "license-photo.jpg";
}
