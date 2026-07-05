import { Module } from "@nestjs/common";
import { DashboardController } from "./dashboard/dashboard.controller";
import { DocumentsController } from "./documents/documents.controller";
import { DocumentsService } from "./documents/documents.service";
import {
  DOCUMENT_REPOSITORY,
  DOCUMENT_STORAGE,
  OCR_ADAPTER,
  STRUCTURED_EXTRACTION_ADAPTER
} from "./tokens";
import { BedrockStructuredExtractionAdapter } from "./infrastructure/bedrock-structured-extraction.adapter";
import { DeterministicStructuredExtractionAdapter } from "./infrastructure/deterministic-structured-extraction.adapter";
import { DynamoDocumentRepository } from "./infrastructure/dynamodb-document-repository";
import { LocalDocumentRepository } from "./infrastructure/local-document-repository";
import { LocalDocumentStorageAdapter } from "./infrastructure/local-document-storage.adapter";
import { MockOcrAdapter } from "./infrastructure/mock-ocr.adapter";
import { MockStructuredExtractionAdapter } from "./infrastructure/mock-structured-extraction.adapter";
import { S3DocumentStorageAdapter } from "./infrastructure/s3-document-storage.adapter";
import { TextractOcrAdapter } from "./infrastructure/textract-ocr.adapter";

@Module({
  controllers: [DocumentsController, DashboardController],
  providers: [
    DocumentsService,
    {
      provide: DOCUMENT_STORAGE,
      useFactory: () => {
        if (process.env.STORAGE_ADAPTER === "s3") {
          return new S3DocumentStorageAdapter();
        }

        return new LocalDocumentStorageAdapter();
      }
    },
    {
      provide: DOCUMENT_REPOSITORY,
      useFactory: () => {
        if (process.env.DB_ADAPTER === "dynamodb") {
          return new DynamoDocumentRepository();
        }

        return new LocalDocumentRepository();
      }
    },
    {
      provide: OCR_ADAPTER,
      useFactory: () => {
        if (process.env.OCR_ADAPTER === "textract") {
          return new TextractOcrAdapter();
        }

        return new MockOcrAdapter();
      }
    },
    {
      provide: STRUCTURED_EXTRACTION_ADAPTER,
      useFactory: () => {
        if (process.env.EXTRACTION_ADAPTER === "bedrock") {
          return new BedrockStructuredExtractionAdapter();
        }

        if (process.env.EXTRACTION_ADAPTER === "mock") {
          return new MockStructuredExtractionAdapter();
        }

        return new DeterministicStructuredExtractionAdapter();
      }
    }
  ]
})
export class AppModule {}

