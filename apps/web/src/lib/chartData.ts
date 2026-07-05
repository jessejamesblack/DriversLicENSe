import type { ChartData } from "chart.js";
import type { DashboardSummary } from "@policylens/domain";

const palette = ["#117c73", "#3568a6", "#a66f00", "#6b7280", "#b23b3b"];

export function currency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

export function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function premiumByLineChart(summary: DashboardSummary): ChartData<"bar"> {
  return {
    labels: summary.premiumByLineOfBusiness.map((item) => item.lineOfBusiness),
    datasets: [
      {
        label: "Premium",
        data: summary.premiumByLineOfBusiness.map((item) => item.premium),
        backgroundColor: palette[0]
      }
    ]
  };
}

export function documentsByStatusChart(summary: DashboardSummary): ChartData<"doughnut"> {
  return {
    labels: summary.documentsByStatus.map((item) => item.status),
    datasets: [
      {
        label: "Documents",
        data: summary.documentsByStatus.map((item) => item.count),
        backgroundColor: palette
      }
    ]
  };
}

export function confidenceByDocumentTypeChart(summary: DashboardSummary): ChartData<"bar"> {
  return {
    labels: summary.averageConfidenceByDocumentType.map((item) => item.documentType),
    datasets: [
      {
        label: "Average confidence",
        data: summary.averageConfidenceByDocumentType.map((item) => item.averageConfidence),
        backgroundColor: palette[1]
      }
    ]
  };
}

