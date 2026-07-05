import { DocumentOcrAdapter, ExtractTextInput, OcrResult } from "@policylens/domain";

export class MockOcrAdapter implements DocumentOcrAdapter {
  async extractText(input: ExtractTextInput): Promise<OcrResult> {
    const decodedText = input.bytes ? Buffer.from(input.bytes).toString("utf8") : "";
    const text = looksLikePlainText(decodedText) ? decodedText : fallbackText(input);
    const lines = text.split(/\r?\n/).filter(Boolean);

    return {
      text,
      confidenceScore: inferConfidence(text),
      raw: {
        adapter: "mock",
        filename: input.filename,
        lineCount: lines.length,
        blocks: lines.map((line, index) => ({
          blockType: "LINE",
          text: line,
          confidence: 95 - index * 0.25
        }))
      }
    };
  }
}

function looksLikePlainText(text: string): boolean {
  const trimmed = text.trim();

  if (!trimmed || trimmed.startsWith("%PDF")) {
    return false;
  }

  const printable = trimmed.replace(/[^\x20-\x7E\r\n\t]/g, "");
  return printable.length / trimmed.length > 0.85;
}

function inferConfidence(text: string): number {
  const match = text.match(/Confidence\s*[:\-]\s*(0?\.\d+|1(?:\.0)?|\d{1,3}%)/i);

  if (!match?.[1]) {
    return 0.86;
  }

  if (match[1].endsWith("%")) {
    return Number(match[1].replace("%", "")) / 100;
  }

  return Number(match[1]);
}

function fallbackText(input: ExtractTextInput): string {
  const filename = input.filename.toLowerCase();

  if (filename.includes("cyber")) {
    return `Applicant: Blue Harbor Payments
Line of Business: Cyber
Primary State: NY
Effective Date: 2026-10-01
Expiration Date: 2027-10-01
Estimated Premium: $86,000
Per Occurrence Limit: $1,000,000
Aggregate Limit: $3,000,000
Confidence: 0.84`;
  }

  if (filename.includes("workers") || filename.includes("wc")) {
    return `Named Insured: Granite Peak Manufacturing
Policy Number: WC-220011
Line of Business: Workers Comp
Risk State: PA
Effective Date: 2026-11-01
Expiration Date: 2027-11-01
Total Premium: $129,000
Per Occurrence Limit: $500,000
Aggregate Limit: $1,000,000
Confidence: 0.62`;
  }

  if (filename.includes("property")) {
    return `Applicant: Northstar Warehousing Inc
Policy Number: PROP-778899
Line of Business: Property
Primary State: OH
Effective Date: 2026-08-15
Expiration Date: 2027-08-15
Estimated Premium: $310,000
Per Occurrence Limit: $2,500,000
Aggregate Limit: $5,000,000
Confidence: 0.88`;
  }

  if (filename.includes("auto")) {
    return `Named Insured: Meridian Fleet Services
Policy Number: AUTO-445566
Line of Business: Commercial Auto
Risk State: IL
Effective Date: 2026-09-01
Expiration Date: 2027-09-01
Total Premium: $192,000
Per Occurrence Limit: $1,000,000
Aggregate Limit: $1,000,000
Confidence: 0.9`;
  }

  return `Named Insured: Acme Logistics LLC
Policy Number: GL-123456
Line of Business: General Liability
Risk State: IN
Effective Date: 2026-07-01
Expiration Date: 2027-07-01
Total Premium: $125,000
Per Occurrence Limit: $1,000,000
Aggregate Limit: $2,000,000
Confidence: 0.91`;
}

