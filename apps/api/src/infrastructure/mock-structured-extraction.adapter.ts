import {
  StructuredExtractionAdapter,
  StructuredExtractionInput,
  StructuredPolicyExtraction
} from "@policylens/domain";
import { DeterministicStructuredExtractionAdapter } from "./deterministic-structured-extraction.adapter";

export class MockStructuredExtractionAdapter implements StructuredExtractionAdapter {
  private readonly deterministic = new DeterministicStructuredExtractionAdapter();

  async extractFields(input: StructuredExtractionInput): Promise<StructuredPolicyExtraction> {
    return this.deterministic.extractFields(input);
  }
}

