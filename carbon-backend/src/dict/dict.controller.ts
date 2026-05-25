import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const INDUSTRIES = [
  { code: 'POWER', name: '电力（发电）', guide: '《中国发电企业温室气体排放核算方法与报告指南（2022年修订版）》' },
  { code: 'STEEL', name: '钢铁生产', guide: '《中国钢铁生产企业温室气体排放核算方法与报告指南》' },
  { code: 'CHEMICAL', name: '化工生产', guide: '《中国化工生产企业温室气体排放核算方法与报告指南》' },
  { code: 'CEMENT', name: '建材-水泥', guide: '《中国水泥生产企业温室气体排放核算方法与报告指南》' },
  { code: 'ALUMINUM', name: '电解铝', guide: '《中国铝冶炼企业温室气体排放核算方法与报告指南》' },
  { code: 'PAPER', name: '造纸和纸制品', guide: '《中国造纸和纸制品生产企业温室气体排放核算方法与报告指南》' },
  { code: 'TEXTILE', name: '纺织服装', guide: '《中国纺织服装企业温室气体排放核算方法与报告指南》' },
  { code: 'AVIATION', name: '民用航空', guide: '《中国民用航空业温室气体排放核算方法与报告指南》' },
  { code: 'PETRO', name: '石油天然气生产', guide: '《石油和天然气生产企业温室气体排放核算方法与报告指南》' },
  { code: 'COAL', name: '煤炭生产', guide: '《煤炭生产企业温室气体排放核算方法与报告指南》' },
  { code: 'GLASS', name: '平板玻璃', guide: '《平板玻璃生产企业温室气体排放核算方法与报告指南》' },
  { code: 'CERAMIC', name: '陶瓷生产', guide: '《陶瓷生产企业温室气体排放核算方法与报告指南》' },
  { code: 'AMMONIA', name: '合成氨生产', guide: '《合成氨生产企业温室气体排放核算方法与报告指南》' },
  { code: 'METHANOL', name: '甲醇生产', guide: '《甲醇生产企业温室气体排放核算方法与报告指南》' },
  { code: 'RUBBER', name: '橡胶和塑料', guide: '《橡胶和塑料制品企业温室气体排放核算方法与报告指南》' },
  { code: 'ELECTRONICS', name: '电子设备', guide: '《电子设备制造企业温室气体排放核算方法与报告指南》' },
  { code: 'MACHINERY', name: '机械设备', guide: '《机械设备制造企业温室气体排放核算方法与报告指南》' },
  { code: 'FOOD', name: '食品加工', guide: '《食品加工企业温室气体排放核算方法与报告指南》' },
  { code: 'PHARMA', name: '制药', guide: '《制药企业温室气体排放核算方法与报告指南》' },
  { code: 'LOGISTICS', name: '综合交通运输', guide: '《综合交通运输企业温室气体排放核算方法与报告指南》' },
  { code: 'HOTEL', name: '住宿餐饮', guide: '《住宿餐饮企业温室气体排放核算方法与报告指南》' },
  { code: 'RETAIL', name: '批发零售', guide: '《批发零售企业温室气体排放核算方法与报告指南》' },
  { code: 'FINANCE', name: '金融服务', guide: 'ISO 14064-1:2018' },
  { code: 'GENERAL', name: '通用工商业', guide: 'ISO 14064-1:2018' },
];

const CATEGORIES = [
  { code: 'FUEL', name: '化石燃料燃烧', scope: 1, color: '#d97757' },
  { code: 'PROCESS', name: '工业过程排放', scope: 1, color: '#d97757' },
  { code: 'FUGITIVE', name: '逸散排放', scope: 1, color: '#d97757' },
  { code: 'ELEC', name: '净购入电力', scope: 2, color: '#4a86e8' },
  { code: 'HEAT', name: '净购入热力', scope: 2, color: '#4a86e8' },
  { code: 'TRANSPORT', name: '上下游运输', scope: 3, color: '#36c4a8' },
  { code: 'WASTE', name: '废弃物处理', scope: 3, color: '#36c4a8' },
  { code: 'BUSINESS', name: '员工差旅与通勤', scope: 3, color: '#36c4a8' },
];

@Controller('dict')
@UseGuards(JwtAuthGuard)
export class DictController {
  @Get('industries')
  getIndustries() {
    return INDUSTRIES;
  }

  @Get('categories')
  getCategories() {
    return CATEGORIES;
  }
}
