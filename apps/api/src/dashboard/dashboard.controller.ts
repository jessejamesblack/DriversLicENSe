import { Controller, Get } from "@nestjs/common";
import { DocumentsService } from "../documents/documents.service";

@Controller("dashboard")
export class DashboardController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get("summary")
  async summary() {
    return this.documentsService.dashboardSummary();
  }
}

