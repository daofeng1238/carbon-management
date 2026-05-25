import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EntriesService } from './entries.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('entries')
@UseGuards(JwtAuthGuard)
export class EntriesController {
  constructor(private service: EntriesService) {}

  @Get('export')
  async export(@Query() query: any, @Res() res: any) {
    return this.service.exportEntries(query, res);
  }

  @Get('import/template')
  async template(@Res() res: any) {
    const ExcelJS = require('exceljs');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('导入模板');
    ws.addRow(['组织编码', '报告期(YYYY-MM)', '排放因子编码', '活动数据', '备注']);
    ws.addRow(['ZL-PWR-SH01', '2025-01', 'F001', '12000', '']);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=entry_template.xlsx');
    await wb.xlsx.write(res);
    res.end();
  }

  @Get()
  getList(@Query() query: any) {
    return this.service.getList(query);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Post()
  create(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.create(dto, user.id);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  import(@UploadedFile() file: Express.Multer.File, @Body() options: any, @CurrentUser() user: any) {
    return this.service.importEntries(file, options, user.id);
  }

  @Post(':id/submit')
  submit(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.submit(id, user.id);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.approve(id, user.id);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @Body() body: { reason: string }, @CurrentUser() user: any) {
    return this.service.reject(id, body.reason, user.id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: any) {
    return this.service.update(id, dto, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.remove(id, user.id);
  }
}
