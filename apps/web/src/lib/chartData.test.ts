import { describe, expect, it } from "vitest";
import type { DashboardSummary } from "@policylens/domain";
import { currency, premiumByLineChart } from "./chartData";

describe("chartData", () => {
  it("formats metrics and builds stable chart labels", () => {
    const summary: DashboardSummary = {
      documentsProcessed: 1,
      totalPremium: 125000,
      averageConfidence: 0.91,
      warningCount: 0,
      premiumByLineOfBusiness: [
        { lineOfBusiness: "General Liability", premium: 125000, documentCount: 1 }
      ],
      documentsByStatus: [{ status: "VALID", count: 1 }],
      averageConfidenceByDocumentType: [
        { documentType: "Policy", averageConfidence: 0.91, documentCount: 1 }
      ],
      warningCountByCategory: []
    };

    expect(currency(summary.totalPremium)).toBe("$125,000");
    expect(premiumByLineChart(summary).labels).toEqual(["General Liability"]);
  });
});

