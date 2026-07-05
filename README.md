# PolicyLens

PolicyLens is a harness-engineering experimentation project for insurance document ingestion and data quality monitoring. It covers the full loop from messy uploaded document to OCR text, structured JSON, Zod validation, persisted raw plus normalized data, and dashboard analytics.

It is intentionally local-first. The workflow works without AWS, Snowflake, Bedrock, OpenAI credentials, IAM, or live cloud services.

The harness-engineering approach follows the ideas in OpenAI's article on agent-first software work: keep repository knowledge local and structured, make the application legible to agents, encode architecture constraints mechanically, and build feedback loops that agents can run directly.

## Architecture

```text
User Upload
  -> SvelteKit UI
  -> NestJS API / API Gateway
  -> Local Storage or S3
  -> Mock OCR or Amazon Textract
  -> Deterministic Structured Extraction Adapter
  -> Zod Validation
  -> Local JSON Store or DynamoDB
  -> Dashboard API
  -> SvelteKit Analytics Dashboard
  -> Optional Snowflake Warehouse Export
```

## Local Setup

Use Node.js 22 or newer. On this Windows machine, use `npm.cmd` because PowerShell may block the `npm` script shim.

```powershell
npm.cmd install
Copy-Item .env.example .env
npm.cmd run build
npm.cmd run check:architecture
npm.cmd test
npm.cmd run harness
```

## Run The Backend

```powershell
npm.cmd run dev:api
```

The API runs on `http://localhost:3000`.

## Run The Frontend

In a second terminal:

```powershell
npm.cmd run dev:web
```

The SvelteKit app runs on `http://127.0.0.1:5173`.

## Process A Sample Document

1. Start the API and web app.
2. Open the SvelteKit URL.
3. Upload one of the synthetic text files in `samples/documents`.
4. Choose the matching document type.
5. Submit the upload.
6. Review normalized fields, raw JSON, validation warnings, and dashboard metrics.

The local mock OCR adapter also handles binary PDFs by falling back to synthetic content based on the filename, which keeps the experiment repeatable.

## API

- `POST /documents/upload`
- `POST /documents/:id/process`
- `GET /documents`
- `GET /documents/:id`
- `GET /dashboard/summary`

## Environment Variables

Defaults:

```text
APP_MODE=local
OCR_ADAPTER=mock
EXTRACTION_ADAPTER=deterministic
STORAGE_ADAPTER=local
DB_ADAPTER=local
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

AWS-only:

```text
AWS_REGION=us-east-2
DOCUMENT_BUCKET_NAME=
DOCUMENT_TABLE_NAME=
```

## AWS Setup

The CDK stack creates:

- S3 bucket for uploaded documents.
- DynamoDB table for document records.
- Lambda-hosted NestJS API.
- HTTP API Gateway.
- Textract permissions for synchronous OCR on tiny sample documents.
- S3 bucket for the SvelteKit static build.
- CloudFront distribution for the external website.

Before deploying, set an AWS Budget alert and keep usage tiny.

```powershell
npm.cmd run cdk:synth
npm.cmd run deploy --workspace @policylens/cdk
```

The deploy output includes:

- `WebsiteUrl`: the public CloudFront site URL.
- `ApiEndpoint`: the direct API Gateway URL.

The hosted SvelteKit build calls the API through the same CloudFront hostname, so no browser-side cloud credentials are needed.

GitHub Actions deployment and local AWS CLI setup are documented in `docs/AWS_DEPLOYMENT.md`.

Tear down after testing:

```powershell
npm.cmd run destroy --workspace @policylens/cdk
```

## Snowflake Model

The `snowflake` folder contains:

- `schema.sql` for `DOCUMENT_EXTRACTIONS`.
- `analytics.sql` for dashboard-style warehouse queries.
- `README.md` describing the raw-plus-normalized storage model.

DynamoDB is useful for app workflow state. Snowflake is the better fit for analytics, portfolio reporting, warning trends, and low-confidence extraction monitoring.

## Eval Harness

The harness is the quality loop for the project:

```powershell
npm.cmd run harness
```

It checks golden synthetic samples, expected structured fields, validation statuses, warning categories, and dashboard totals. This is the OpenAI-style engineering layer: a repeatable way to catch extraction regressions.

The broader harness-engineering layer is documented in `docs/HARNESS_ENGINEERING.md`. It includes repo-local knowledge docs, architecture checks, and quality commands designed to make the system easier for coding agents to inspect, change, and verify.

## Tradeoffs

- Mock mode keeps the local workflow repeatable; live AWS is optional.
- Raw JSON supports auditability; normalized fields support analytics and workflows.
- Deterministic parsing is predictable for synthetic samples; an AI extraction adapter could be added for messier real documents.
- Backend validation is the source of truth; frontend validation only improves UX.
- Synchronous processing is fine for this prototype; production should use async processing with retries and dead-letter queues.
- DynamoDB works for app state; Snowflake is better for analytical reporting.

## Productionization Ideas

- Add authentication and RBAC.
- Add field-level confidence.
- Add a human review queue for low-confidence fields.
- Add logs, tracing, metrics, alarms, and dashboards.
- Add retry and dead-letter queue handling.
- Move large document processing to an async queue.
- Add PII redaction.
- Add schema versioning for extracted JSON.
- Add Snowflake ingestion pipeline.
- Add dashboard filters by date, document type, state, and line of business.
- Add cost controls and budgets for cloud services.

## Project Framing

PolicyLens is scoped around the shape of the system and the quality loop:

- Adapter boundaries for OCR, structured extraction, storage, and persistence.
- Validation after extraction rather than trusting generated or parsed output blindly.
- Raw-plus-normalized storage for auditability and analytics.
- A repeatable harness that checks golden samples, warnings, and aggregate metrics.
- Mechanical architecture checks that prevent cross-layer drift.
- A Snowflake-ready data model for downstream reporting.

The project is not trying to be a full production platform. It is a compact experimentation surface for document ingestion, validation guardrails, and harness-driven extraction quality.
