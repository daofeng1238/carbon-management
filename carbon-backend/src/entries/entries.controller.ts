import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EntriesService } from './entries.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('entries')
@UseGuards(JwtAuthGuard)
export class EntriesController {
  constructor(private service: EntriesService) {}

  @Get('summary')
  getSummary(@Query() query: any) {
    return this.service.getSummary(query);
  }

  @Get('export')
  async export(@Query() query: any, @Res() res: any) {
    return this.service.exportEntries(query, res);
  }

  @Get('import/template')
  async template(@Query('industry') industry: string, @Res() res: any) {
    const ExcelJS = require('exceljs');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('导入模板');
    ws.addRow(['组织编码', '报告期(YYYY-MM)', '排放因子编码', '活动数据', '备注']);
    ws.addRow(['ZL-PWR-SH01', '2025-01', 'F001', '12000', '']);

    // If industry specified, add industry-specific factors as reference sheet
    if (industry) {
      const factors = await this.service.getFactorsByIndustry(industry);
      if (factors.length > 0) {
        const refSheet = wb.addWorksheet('行业因子参考');
        refSheet.addRow(['因子编码', '因子名称', '单位', '因子值', '类别']);
        factors.forEach((f: any) => {
          refSheet.addRow([f.id, f.name, f.unit, f.value, f.categoryCode]);
        });
      }
    }

    const filename = industry ? `entry_template_${industry}.xlsx` : 'entry_template.xlsx';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
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
