import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private service: DashboardService) {}

  @Get('overview')
  getOverview(@Query() query: any) {
    return this.service.getOverview(query);
  }

  @Get('trend')
  getTrend(@Query() query: any) {
    return this.service.getTrend(query);
  }
}
