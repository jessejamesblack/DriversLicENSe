import { afterEach, describe, expect, it, vi } from "vitest";
import { prepareDocumentFile } from "./uploadPreparation";

describe("prepareDocumentFile", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("leaves non-image uploads unchanged", async () => {
    const file = new File(["sample"], "license.txt", { type: "text/plain" });

    await expect(prepareDocumentFile(file)).resolves.toBe(file);
  });

  it("compresses oversized images before upload", async () => {
    const close = vi.fn();
    const drawImage = vi.fn();
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({ drawImage })),
      toBlob: vi.fn((callback: BlobCallback, type: string) => {
        callback(new Blob([new Uint8Array(1024)], { type }));
      })
    };

    vi.stubGlobal("createImageBitmap", vi.fn(() => Promise.resolve({ width: 4200, height: 2800, close })));
    vi.stubGlobal("document", {
      createElement: vi.fn(() => canvas)
    });

    const file = new File([new Uint8Array(12 * 1024 * 1024)], "phone-photo.jpeg", {
      type: "image/jpeg",
      lastModified: 123
    });

    const prepared = await prepareDocumentFile(file);

    expect(prepared).not.toBe(file);
    expect(prepared.name).toBe("phone-photo.jpg");
    expect(prepared.type).toBe("image/jpeg");
    expect(prepared.size).toBe(1024);
    expect(canvas.width).toBe(3000);
    expect(canvas.height).toBe(2000);
    expect(drawImage).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
  });
});
