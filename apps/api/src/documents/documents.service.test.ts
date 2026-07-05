import { describe, expect, it } from "vitest";
import {
  DocumentRecord,
  DocumentRepository,
  DocumentStorageAdapter,
  parseInsuranceDocumentText
} from "@policylens/domain";
import { DocumentsService } from "./documents.service";
import { MockOcrAdapter } from "../infrastructure/mock-ocr.adapter";
import { DeterministicStructuredExtractionAdapter } from "../infrastructure/deterministic-structured-extraction.adapter";

class MemoryStorage implements DocumentStorageAdapter {
  private readonly files = new Map<string, Uint8Array>();

  async save(input: { documentId: string; filename: string; contentType: string; bytes: Uint8Array }) {
    this.files.set(input.documentId, input.bytes);
    return { storageKey: input.documentId };
  }

  async read(storageKey: string) {
    const bytes = this.files.get(storageKey);

    if (!bytes) {
      throw new Error("Missing test file.");
    }

    return bytes;
  }
}

class MemoryRepository implements DocumentRepository {
  private readonly records = new Map<string, DocumentRecord>();

  async create(record: DocumentRecord) {
    this.records.set(record.id, record);
    return record;
  }

  async update(record: DocumentRecord) {
    this.records.set(record.id, record);
    return record;
  }

  async list() {
    return [...this.records.values()];
  }

  async get(documentId: string) {
    return this.records.get(documentId) ?? null;
  }
}

describe("DocumentsService", () => {
  it("uploads, processes, stores extraction, and builds dashboard metrics", async () => {
    const service = new DocumentsService(
      new MemoryStorage(),
      new MemoryRepository(),
      new MockOcrAdapter(),
      new DeterministicStructuredExtractionAdapter()
    );

    const upload = await service.upload({
      filename: "general-liability-policy.txt",
      documentType: "Policy",
      contentType: "text/plain",
      bytes: Buffer.from(`Named Insured: Acme Logistics LLC
Policy Number: GL-123456
Line of Business: General Liability
Risk State: IN
Effective Date: 2026-07-01
Expiration Date: 2027-07-01
Total Premium: $125,000
Per Occurrence Limit: $1,000,000
Aggregate Limit: $2,000,000
Confidence: 0.91`)
    });

    const processed = await service.process(upload.id);
    const summary = await service.dashboardSummary();

    expect(processed.status).toBe("PROCESSED");
    expect(processed.validationStatus).toBe("VALID");
    expect(processed.extraction?.premium).toBe(125000);
    expect(summary.documentsProcessed).toBe(1);
    expect(summary.totalPremium).toBe(125000);
  });

  it("keeps deterministic extraction behavior available for the harness", () => {
    const extraction = parseInsuranceDocumentText({
      documentType: "Submission",
      text: "Applicant: Blue Harbor Payments\nLine of Business: Cyber\nPrimary State: NY\nConfidence: 0.84"
    });

    expect(extraction.policyNumber).toBeNull();
    expect(extraction.lineOfBusiness).toBe("Cyber");
  });
});

