import {
  parseInsuranceDocumentText,
  StructuredExtractionAdapter,
  StructuredExtractionInput,
  StructuredPolicyExtraction
} from "@policylens/domain";

export class DeterministicStructuredExtractionAdapter implements StructuredExtractionAdapter {
  async extractFields(input: StructuredExtractionInput): Promise<StructuredPolicyExtraction> {
    return parseInsuranceDocumentText({
      text: input.ocrText,
      documentType: input.documentType,
      ocrResult: input.ocrResult
    });
  }
}

