import {
  StructuredExtractionAdapter,
  StructuredExtractionInput,
  StructuredPolicyExtraction
} from "@policylens/domain";

export class BedrockStructuredExtractionAdapter implements StructuredExtractionAdapter {
  async extractFields(_input: StructuredExtractionInput): Promise<StructuredPolicyExtraction> {
    throw new Error(
      "Bedrock structured extraction is intentionally stubbed for the MVP. Use EXTRACTION_ADAPTER=deterministic for the reliable local workflow."
    );
  }
}
