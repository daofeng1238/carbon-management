import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private service: OrganizationsService) {}

  @Get('tree')
  getTree(@Query('depthLimit') depthLimit?: number) {
    return this.service.getTree(depthLimit ? +depthLimit : 4);
  }

  @Get()
  getList(@Query() query: any) {
    return this.service.getList(query);
  }

  @Get(':id/descendants')
  getDescendants(@Param('id') id: string) {
    return this.service.getDescendants(id);
  }

  @Get(':id/children')
  getChildren(@Param('id') id: string) {
    return this.service.getChildren(id);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Post()
  create(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.create(dto, user.id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: any) {
    return this.service.update(id, dto, user.id);
  }

  @Patch(':id/move')
  move(@Param('id') id: string, @Body() body: { newParentId: string }, @CurrentUser() user: any) {
    return this.service.moveOrg(id, body.newParentId, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('cascade') cascade: string, @CurrentUser() user: any) {
    return this.service.remove(id, cascade === 'true', user.id);
  }
}
