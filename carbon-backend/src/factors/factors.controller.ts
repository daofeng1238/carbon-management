import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FactorsService } from './factors.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseInterceptor } from '../common/interceptors/response.interceptor';

@Controller('factors')
@UseGuards(JwtAuthGuard)
export class FactorsController {
  constructor(private service: FactorsService) {}

  @Get('recommended')
  getRecommended(@Query() query: any) {
    return this.service.getRecommended(query);
  }

  @Get('export')
  async export(@Query() query: any, @Res() res: any) {
    return this.service.exportFactors(query, res);
  }

  @Get('template')
  async template(@Res() res: any) {
    const ExcelJS = require('exceljs');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('模板');
    ws.addRow(['因子名称', '类别编码', '因子值', '单位', '数据来源', '版本号', '生效日期(YYYY-MM-DD)']);
    ws.addRow(['天然气燃烧(示例)', 'FUEL', 21.622, 'tCO2e/万Nm³', '省级温室气体清单编制指南', 'v3.0', '2024-01-01']);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=factor_template.xlsx');
    await wb.xlsx.write(res);
    res.end();
  }

  @Get()
  getList(@Query() query: any) {
    return this.service.getList(query);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string) {
    return this.service.getHistory(id);
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
  importFactors(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: any) {
    return this.service.importFactors(file, user.id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: any) {
    return this.service.update(id, dto, user.id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: string }, @CurrentUser() user: any) {
    return this.service.updateStatus(id, body.status, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
