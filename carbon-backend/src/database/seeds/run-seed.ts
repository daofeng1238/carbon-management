import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';
dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgres://carbon:changeme@localhost:5432/carbon',
  entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
  synchronize: false,
  logging: false,
});

// Fixed UUIDs for organizations (stable across seed runs)
const ORG = {
  'ZL-GROUP':    'a0000001-0000-4000-8000-000000000001',
  'ZL-POWER':    'a0000001-0000-4000-8000-000000000100',
  'ZL-PWR-HD':   'a0000001-0000-4000-8000-000000000110',
  'ZL-PWR-SH01': 'a0000001-0000-4000-8000-000000000111',
  'ZL-PWR-SH02': 'a0000001-0000-4000-8000-000000000112',
  'ZL-PWR-HB':   'a0000001-0000-4000-8000-000000000120',
  'ZL-PWR-TS01': 'a0000001-0000-4000-8000-000000000121',
  'ZL-STEEL':    'a0000001-0000-4000-8000-000000000200',
  'ZL-STL-TS':   'a0000001-0000-4000-8000-000000000210',
  'ZL-STL-TS01': 'a0000001-0000-4000-8000-000000000211',
  'ZL-STL-TS02': 'a0000001-0000-4000-8000-000000000212',
  'ZL-CHEM':     'a0000001-0000-4000-8000-000000000300',
  'ZL-CHM-NJ':   'a0000001-0000-4000-8000-000000000310',
  'ZL-CHM-NJ01': 'a0000001-0000-4000-8000-000000000311',
  'ZL-CMT':      'a0000001-0000-4000-8000-000000000400',
  'ZL-CMT-WH':   'a0000001-0000-4000-8000-000000000410',
};

async function seed() {
  await AppDataSource.initialize();
  const qr = AppDataSource.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();

  try {
    console.log('🌱 Seeding database...');

    // ── Industries ──────────────────────────────────────────────
    await qr.query(`INSERT INTO industries (code,name,guide,sort) VALUES
      ('POWER','电力（发电）','《中国发电企业温室气体排放核算方法与报告指南（2022年修订版）》',1),
      ('STEEL','钢铁生产','《中国钢铁生产企业温室气体排放核算方法与报告指南》',2),
      ('CHEMICAL','化工生产','《中国化工生产企业温室气体排放核算方法与报告指南》',3),
      ('CEMENT','建材-水泥','《中国水泥生产企业温室气体排放核算方法与报告指南》',4),
      ('ALUMINUM','电解铝','《中国铝冶炼企业温室气体排放核算方法与报告指南》',5),
      ('PAPER','造纸和纸制品','《中国造纸和纸制品生产企业温室气体排放核算方法与报告指南》',6),
      ('TEXTILE','纺织服装','《中国纺织服装企业温室气体排放核算方法与报告指南》',7),
      ('GENERAL','通用工商业','ISO 14064-1:2018',24)
      ON CONFLICT (code) DO NOTHING`);

    // ── Emission categories ─────────────────────────────────────
    await qr.query(`INSERT INTO emission_categories (code,name,scope,color,sort) VALUES
      ('FUEL','化石燃料燃烧',1,'#d97757',1),
      ('PROCESS','工业过程排放',1,'#d97757',2),
      ('FUGITIVE','逸散排放',1,'#d97757',3),
      ('ELEC','净购入电力',2,'#4a86e8',4),
      ('HEAT','净购入热力',2,'#4a86e8',5),
      ('TRANSPORT','上下游运输',3,'#36c4a8',6),
      ('WASTE','废弃物处理',3,'#36c4a8',7),
      ('BUSINESS','员工差旅与通勤',3,'#36c4a8',8)
      ON CONFLICT (code) DO NOTHING`);

    // ── Organizations ────────────────────────────────────────────
    const orgs = [
      { code:'ZL-GROUP',  name:'中绿能源控股集团',       level:1, parentCode:null,      industryCode:'GENERAL',  standard:'ISO 14064-1:2018',            address:'上海市浦东新区世纪大道1788号',      employees:12480, area:'集团总部',  path:'root001'},
      { code:'ZL-POWER',  name:'中绿电力板块',           level:2, parentCode:'ZL-GROUP', industryCode:'POWER',    standard:'ISO 14064-1 + 发电指南',        address:'上海市黄浦区',                     employees:5240,  area:null,       path:'root001.n0100'},
      { code:'ZL-PWR-HD', name:'华东电力有限公司',        level:3, parentCode:'ZL-POWER', industryCode:'POWER',    standard:'ISO 14064-1 + 发电指南',        address:'上海市奉贤区',                     employees:2100,  area:null,       path:'root001.n0100.n0110'},
      { code:'ZL-PWR-SH01',name:'上海漕泾热电厂',        level:4, parentCode:'ZL-PWR-HD',industryCode:'POWER',    standard:'ISO 14064-1 + 发电指南',        address:'上海市金山区漕泾镇',               employees:480,   area:null,       path:'root001.n0100.n0110.n0111'},
      { code:'ZL-PWR-SH02',name:'江苏苏州燃机电厂',      level:4, parentCode:'ZL-PWR-HD',industryCode:'POWER',    standard:'ISO 14064-1 + 发电指南',        address:'江苏省苏州市工业园区',             employees:320,   area:null,       path:'root001.n0100.n0110.n0112'},
      { code:'ZL-PWR-HB', name:'华北电力有限公司',        level:3, parentCode:'ZL-POWER', industryCode:'POWER',    standard:'ISO 14064-1 + 发电指南',        address:'河北省唐山市',                     employees:1820,  area:null,       path:'root001.n0100.n0120'},
      { code:'ZL-PWR-TS01',name:'河北唐山燃煤电厂',      level:4, parentCode:'ZL-PWR-HB',industryCode:'POWER',    standard:'ISO 14064-1 + 发电指南',        address:'河北省唐山市曹妃甸',               employees:620,   area:null,       path:'root001.n0100.n0120.n0121'},
      { code:'ZL-STEEL',  name:'中绿钢铁板块',           level:2, parentCode:'ZL-GROUP', industryCode:'STEEL',    standard:'ISO 14064-1 + 钢铁指南',        address:'河北省唐山市',                     employees:4180,  area:null,       path:'root001.n0200'},
      { code:'ZL-STL-TS', name:'中绿唐山钢铁有限公司',   level:3, parentCode:'ZL-STEEL',  industryCode:'STEEL',    standard:'ISO 14064-1 + 钢铁指南',        address:'河北省唐山市丰润区',               employees:3260,  area:null,       path:'root001.n0200.n0210'},
      { code:'ZL-STL-TS01',name:'唐山一号炼钢厂',        level:4, parentCode:'ZL-STL-TS', industryCode:'STEEL',    standard:'ISO 14064-1 + 钢铁指南',        address:'河北省唐山市丰润区一区',           employees:1240,  area:null,       path:'root001.n0200.n0210.n0211'},
      { code:'ZL-STL-TS02',name:'唐山轧钢车间',          level:4, parentCode:'ZL-STL-TS', industryCode:'STEEL',    standard:'ISO 14064-1 + 钢铁指南',        address:'河北省唐山市丰润区二区',           employees:860,   area:null,       path:'root001.n0200.n0210.n0212'},
      { code:'ZL-CHEM',   name:'中绿化工板块',           level:2, parentCode:'ZL-GROUP', industryCode:'CHEMICAL', standard:'ISO 14064-1 + 化工指南',        address:'江苏省南京市',                     employees:2180,  area:null,       path:'root001.n0300'},
      { code:'ZL-CHM-NJ', name:'南京中绿化工有限公司',   level:3, parentCode:'ZL-CHEM',   industryCode:'CHEMICAL', standard:'ISO 14064-1 + 化工指南',        address:'江苏省南京市江北新区',             employees:1640,  area:null,       path:'root001.n0300.n0310'},
      { code:'ZL-CHM-NJ01',name:'南京化工一厂',          level:4, parentCode:'ZL-CHM-NJ', industryCode:'CHEMICAL', standard:'ISO 14064-1 + 化工指南',        address:'江苏省南京市江北新区A区',          employees:720,   area:null,       path:'root001.n0300.n0310.n0311'},
      { code:'ZL-CMT',    name:'中绿建材板块',           level:2, parentCode:'ZL-GROUP', industryCode:'CEMENT',   standard:'ISO 14064-1 + 水泥指南',        address:'安徽省芜湖市',                     employees:880,   area:null,       path:'root001.n0400'},
      { code:'ZL-CMT-WH', name:'芜湖中绿水泥有限公司',   level:3, parentCode:'ZL-CMT',    industryCode:'CEMENT',   standard:'ISO 14064-1 + 水泥指南',        address:'安徽省芜湖市三山区',               employees:680,   area:null,       path:'root001.n0400.n0410'},
    ];
    for (const o of orgs) {
      const id = ORG[o.code];
      const parentId = o.parentCode ? ORG[o.parentCode] : null;
      await qr.query(
        `INSERT INTO organizations (id,code,name,level,parent_id,industry_code,standard,address,employees,area,status,path,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active',$11,NOW(),NOW())
         ON CONFLICT (id) DO NOTHING`,
        [id, o.code, o.name, o.level, parentId, o.industryCode, o.standard, o.address, o.employees, o.area, o.path]
      );
    }

    // ── Emission factors ─────────────────────────────────────────
    const f7lineage = uuidv4(), f19lineage = uuidv4();
    const factors = [
      ['F001',uuidv4(),'原煤（无烟煤）燃烧','FUEL','POWER',2.6612,'tCO2e/t','《中国发电企业温室气体排放核算方法与报告指南（2022年修订版）》','v2.1','2024-01-01','CHINA','industry','enabled'],
      ['F002',uuidv4(),'原煤（烟煤）燃烧','FUEL','POWER',2.4567,'tCO2e/t','《中国发电企业温室气体排放核算方法与报告指南（2022年修订版）》','v2.1','2024-01-01','CHINA','industry','enabled'],
      ['F003',uuidv4(),'天然气燃烧','FUEL','GENERAL',21.622,'tCO2e/万Nm³','《省级温室气体清单编制指南》','v3.0','2024-01-01','ISO','general','enabled'],
      ['F004',uuidv4(),'柴油燃烧','FUEL','GENERAL',3.0959,'tCO2e/t','IPCC 2006 国家温室气体清单指南','v3.0','2024-01-01','ISO','general','enabled'],
      ['F005',uuidv4(),'汽油燃烧','FUEL','GENERAL',2.9251,'tCO2e/t','IPCC 2006 国家温室气体清单指南','v3.0','2024-01-01','ISO','general','enabled'],
      ['F006',uuidv4(),'焦炭燃烧','FUEL','STEEL',2.8604,'tCO2e/t','《中国钢铁生产企业温室气体排放核算方法与报告指南》','v2.0','2024-01-01','CHINA','industry','enabled'],
      ['F007',f7lineage,'电力（华东区域电网）','ELEC','GENERAL',0.7035,'tCO2e/MWh','生态环境部《2024年度全国电力二氧化碳排放因子》','v2024.1','2024-04-12','CHINA','general','enabled'],
      ['F008',uuidv4(),'电力（华北区域电网）','ELEC','GENERAL',0.8843,'tCO2e/MWh','生态环境部《2024年度全国电力二氧化碳排放因子》','v2024.1','2024-04-12','CHINA','general','enabled'],
      ['F009',uuidv4(),'电力（全国平均）','ELEC','GENERAL',0.5703,'tCO2e/MWh','生态环境部《2024年度全国电力二氧化碳排放因子》','v2024.1','2024-04-12','CHINA','general','enabled'],
      ['F010',uuidv4(),'熟料（水泥工业过程）','PROCESS','CEMENT',0.538,'tCO2e/t','《中国水泥生产企业温室气体排放核算方法与报告指南》','v1.8','2023-06-01','CHINA','industry','enabled'],
      ['F011',uuidv4(),'钢铁石灰石分解','PROCESS','STEEL',0.4317,'tCO2e/t','《中国钢铁生产企业温室气体排放核算方法与报告指南》','v2.0','2024-01-01','CHINA','industry','enabled'],
      ['F012',uuidv4(),'硝酸生产 N2O','PROCESS','CHEMICAL',7.5,'tCO2e/t','《中国化工生产企业温室气体排放核算方法与报告指南》（GWP=265）','v2.0','2024-01-01','CHINA','industry','enabled'],
      ['F013',uuidv4(),'SF6 逸散排放','FUGITIVE','POWER',23500,'tCO2e/t','IPCC AR5（GWP=23500）','v3.0','2024-01-01','ISO','industry','enabled'],
      ['F014',uuidv4(),'R134a 制冷剂逸散','FUGITIVE','GENERAL',1430,'tCO2e/t','IPCC AR4（GWP=1430）','v2.0','2023-01-01','ISO','general','enabled'],
      ['F015',uuidv4(),'热力（蒸汽）','HEAT','GENERAL',0.11,'tCO2e/GJ','《省级温室气体清单编制指南》','v3.0','2024-01-01','CHINA','general','enabled'],
      ['F016',uuidv4(),'公路货运（重型柴油）','TRANSPORT','GENERAL',0.0696,'tCO2e/t·km','ISO 14064-1 + GHG Protocol','v3.0','2024-01-01','ISO','general','enabled'],
      ['F017',uuidv4(),'一般工业固废填埋','WASTE','GENERAL',0.45,'tCO2e/t','IPCC 2006 国家温室气体清单指南','v2.0','2023-01-01','ISO','general','enabled'],
      ['F018',uuidv4(),'员工航空差旅（短途）','BUSINESS','GENERAL',0.000158,'tCO2e/人·km','DEFRA 2024 转换因子','v2024.0','2024-01-01','ISO','general','enabled'],
      ['F019',f7lineage,'电力（华东区域电网）历史版本','ELEC','GENERAL',0.7921,'tCO2e/MWh','生态环境部 2023 年度','v2023.1','2023-04-01','CHINA','general','disabled'],
      ['F020',uuidv4(),'燃料油燃烧','FUEL','GENERAL',3.1705,'tCO2e/t','IPCC 2006','v3.0','2024-01-01','ISO','general','enabled'],
    ];
    for (const f of factors) {
      await qr.query(
        `INSERT INTO emission_factors (id,lineage_id,name,category_code,industry_code,value,unit,source,version,effective_date,standard,scope_type,status,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW())
         ON CONFLICT (id) DO NOTHING`,
        f
      );
    }

    // ── Seed users ───────────────────────────────────────────────
    const users = [
      { id: uuidv4(), username: 'zhangzihan', name: '张芷涵', pw: 'Carbon@2025', role: 'group_admin',  orgCode: 'ZL-GROUP' },
      { id: uuidv4(), username: 'chenyanlin',  name: '陈彦霖', pw: 'Carbon@2025', role: 'sector_admin', orgCode: 'ZL-POWER' },
      { id: uuidv4(), username: 'limingzhe',   name: '李铭哲', pw: 'Carbon@2025', role: 'reviewer',     orgCode: 'ZL-GROUP' },
      { id: uuidv4(), username: 'wangxueting', name: '王雪婷', pw: 'Carbon@2025', role: 'reporter',     orgCode: 'ZL-PWR-SH01' },
    ];
    for (const u of users) {
      const hash = await bcrypt.hash(u.pw, 10);
      await qr.query(
        `INSERT INTO users (id,username,name,password_hash,status,created_at,updated_at)
         VALUES ($1,$2,$3,$4,'active',NOW(),NOW()) ON CONFLICT (username) DO NOTHING`,
        [u.id, u.username, u.name, hash]
      );
      await qr.query(
        `INSERT INTO user_org_roles (id,user_id,org_id,role_code)
         SELECT $1,id,$3,$4 FROM users WHERE username=$2 ON CONFLICT DO NOTHING`,
        [uuidv4(), u.username, ORG[u.orgCode], u.role]
      );
    }

    // ── Seed entries (generated data from data.js logic) ─────────
    const LEAF_ORGS = ['ZL-PWR-SH01','ZL-PWR-SH02','ZL-PWR-TS01','ZL-STL-TS01','ZL-STL-TS02','ZL-CHM-NJ01','ZL-CMT-WH'];
    const LEAF_INDUSTRIES: Record<string,string> = {
      'ZL-PWR-SH01':'POWER','ZL-PWR-SH02':'POWER','ZL-PWR-TS01':'POWER',
      'ZL-STL-TS01':'STEEL','ZL-STL-TS02':'STEEL',
      'ZL-CHM-NJ01':'CHEMICAL',
      'ZL-CMT-WH':'CEMENT',
    };
    const TEMPLATES: Record<string, Array<{factorId:string,baseQty:number,qtyVar:number,unit:string}>> = {
      POWER: [
        {factorId:'F001',baseQty:12000,qtyVar:0.15,unit:'t'},
        {factorId:'F002',baseQty:8000,qtyVar:0.18,unit:'t'},
        {factorId:'F003',baseQty:320,qtyVar:0.20,unit:'万Nm³'},
        {factorId:'F013',baseQty:0.012,qtyVar:0.30,unit:'t'},
        {factorId:'F007',baseQty:4500,qtyVar:0.10,unit:'MWh'},
        {factorId:'F016',baseQty:86000,qtyVar:0.15,unit:'t·km'},
      ],
      STEEL: [
        {factorId:'F006',baseQty:5400,qtyVar:0.15,unit:'t'},
        {factorId:'F011',baseQty:3200,qtyVar:0.12,unit:'t'},
        {factorId:'F003',baseQty:180,qtyVar:0.18,unit:'万Nm³'},
        {factorId:'F008',baseQty:7800,qtyVar:0.10,unit:'MWh'},
        {factorId:'F015',baseQty:24000,qtyVar:0.12,unit:'GJ'},
        {factorId:'F017',baseQty:2400,qtyVar:0.20,unit:'t'},
      ],
      CHEMICAL: [
        {factorId:'F003',baseQty:240,qtyVar:0.15,unit:'万Nm³'},
        {factorId:'F012',baseQty:86,qtyVar:0.18,unit:'t'},
        {factorId:'F014',baseQty:0.34,qtyVar:0.25,unit:'t'},
        {factorId:'F007',baseQty:6200,qtyVar:0.12,unit:'MWh'},
        {factorId:'F020',baseQty:1400,qtyVar:0.15,unit:'t'},
      ],
      CEMENT: [
        {factorId:'F010',baseQty:24000,qtyVar:0.10,unit:'t'},
        {factorId:'F001',baseQty:4800,qtyVar:0.15,unit:'t'},
        {factorId:'F009',baseQty:3100,qtyVar:0.10,unit:'MWh'},
        {factorId:'F016',baseQty:124000,qtyVar:0.18,unit:'t·km'},
      ],
    };

    // Factor values map
    const FVALS: Record<string,{value:number,unit:string,category:string}> = {
      F001:{value:2.6612,unit:'tCO2e/t',category:'FUEL'},
      F002:{value:2.4567,unit:'tCO2e/t',category:'FUEL'},
      F003:{value:21.622,unit:'tCO2e/万Nm³',category:'FUEL'},
      F006:{value:2.8604,unit:'tCO2e/t',category:'FUEL'},
      F007:{value:0.7035,unit:'tCO2e/MWh',category:'ELEC'},
      F008:{value:0.8843,unit:'tCO2e/MWh',category:'ELEC'},
      F009:{value:0.5703,unit:'tCO2e/MWh',category:'ELEC'},
      F010:{value:0.538,unit:'tCO2e/t',category:'PROCESS'},
      F011:{value:0.4317,unit:'tCO2e/t',category:'PROCESS'},
      F012:{value:7.5,unit:'tCO2e/t',category:'PROCESS'},
      F013:{value:23500,unit:'tCO2e/t',category:'FUGITIVE'},
      F014:{value:1430,unit:'tCO2e/t',category:'FUGITIVE'},
      F015:{value:0.11,unit:'tCO2e/GJ',category:'HEAT'},
      F016:{value:0.0696,unit:'tCO2e/t·km',category:'TRANSPORT'},
      F017:{value:0.45,unit:'tCO2e/t',category:'WASTE'},
      F018:{value:0.000158,unit:'tCO2e/人·km',category:'BUSINESS'},
      F020:{value:3.1705,unit:'tCO2e/t',category:'FUEL'},
    };
    const SCOPE_MAP: Record<string,number> = {FUEL:1,PROCESS:1,FUGITIVE:1,ELEC:2,HEAT:2,TRANSPORT:3,WASTE:3,BUSINESS:3};
    const USERS = ['张芷涵','陈彦霖','李铭哲','王雪婷'];

    // LCG pseudo-random (matches data.js)
    let _seed = 7;
    function rnd() { _seed = (_seed * 9301 + 49297) % 233280; return _seed / 233280; }

    const PERIODS: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(2025, 4 - i, 1);
      PERIODS.push(d.toISOString().slice(0, 7));
    }

    let entryNum = 1;
    for (const orgCode of LEAF_ORGS) {
      const orgId = ORG[orgCode];
      const industry = LEAF_INDUSTRIES[orgCode] || 'GENERAL';
      const tpl = TEMPLATES[industry] || [];
      for (const period of PERIODS) {
        for (const t of tpl) {
          const f = FVALS[t.factorId];
          if (!f) continue;
          const qty = +(t.baseQty * (1 + (rnd() - 0.5) * 2 * t.qtyVar)).toFixed(2);
          const emission = +(qty * f.value).toFixed(4);
          const isLast = period === PERIODS[PERIODS.length - 1];
          const status = isLast ? (rnd() < 0.3 ? 'draft' : 'submitted') : 'approved';
          const createDay = String(Math.floor(rnd() * 28) + 1).padStart(2, '0');
          const updateDay = String(Math.floor(rnd() * 28) + 1).padStart(2, '0');
          const createBy = USERS[Math.floor(rnd() * 4)];
          const updateBy = USERS[Math.floor(rnd() * 4)];
          const id = `E${String(entryNum++).padStart(6,'0')}`;

          await qr.query(
            `INSERT INTO emission_entries
             (id,org_id,period,period_type,category_code,factor_id,quantity,unit,factor_value,factor_unit,scope,emission,source,status,created_by,updated_by,created_at,updated_at)
             VALUES ($1,$2,$3,'month',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
             ON CONFLICT DO NOTHING`,
            [
              id, orgId, period, f.category, t.factorId, qty, t.unit,
              f.value, f.unit, SCOPE_MAP[f.category]||1, emission,
              rnd() < 0.65 ? 'manual' : 'import', status,
              createBy, updateBy,
              `${period}-${createDay} 14:23:08`,
              `${period}-${updateDay} 16:42:11`,
            ]
          );
        }
      }
    }

    await qr.commitTransaction();
    console.log('✅ Seed complete!');
  } catch (err) {
    await qr.rollbackTransaction();
    console.error('❌ Seed failed:', (err as Error).message);
    throw err;
  } finally {
    await qr.release();
    await AppDataSource.destroy();
  }
}

seed().catch((e) => { console.error(e); process.exit(1); });
