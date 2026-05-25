import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards, Res } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Post('preview')
  preview(@Body() config: any) {
    return this.service.preview(config);
  }

  @Post()
  create(@Body() config: any, @CurrentUser() user: any) {
    return this.service.create(config, user.id);
  }

  @Get()
  getList(@Query() query: any) {
    return this.service.getList(query);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Get(':id/pdf')
  async getPdf(@Param('id') id: string, @Res() res: any) {
    res.status(501).json({ code: 50001, message: 'PDF 生成需在服务器部署后启用 Puppeteer', data: null });
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
