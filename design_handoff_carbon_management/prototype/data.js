// 组织碳管理系统 - 模拟数据
// 多行业集团：中绿能源控股集团

window.__CARBON_DATA = (function () {
  // 24个重点行业（简化为主要行业 + 兜底）
  const INDUSTRIES = [
    { code: 'POWER', name: '电力（发电）', guide: '《中国发电企业温室气体排放核算方法与报告指南（2022年修订版）》' },
    { code: 'STEEL', name: '钢铁生产', guide: '《中国钢铁生产企业温室气体排放核算方法与报告指南》' },
    { code: 'CHEMICAL', name: '化工生产', guide: '《中国化工生产企业温室气体排放核算方法与报告指南》' },
    { code: 'CEMENT', name: '建材-水泥', guide: '《中国水泥生产企业温室气体排放核算方法与报告指南》' },
    { code: 'ALUMINUM', name: '电解铝', guide: '《中国铝冶炼企业温室气体排放核算方法与报告指南》' },
    { code: 'PAPER', name: '造纸和纸制品', guide: '《中国造纸和纸制品生产企业温室气体排放核算方法与报告指南》' },
    { code: 'TEXTILE', name: '纺织服装', guide: '《中国纺织服装企业温室气体排放核算方法与报告指南》' },
    { code: 'GENERAL', name: '通用工商业', guide: 'ISO 14064-1:2018' }
  ];

  // 组织树（4 级：集团 - 板块 - 子公司 - 厂区）
  const ORG_TREE = {
    id: 'org-001', code: 'ZL-GROUP', name: '中绿能源控股集团', level: 1, industry: 'GENERAL',
    address: '上海市浦东新区世纪大道 1788 号', standard: 'ISO 14064-1:2018',
    employees: 12480, area: '集团总部',
    children: [
      {
        id: 'org-100', code: 'ZL-POWER', name: '中绿电力板块', level: 2, industry: 'POWER',
        address: '上海市黄浦区', standard: 'ISO 14064-1 + 发电指南',
        employees: 5240,
        children: [
          {
            id: 'org-110', code: 'ZL-PWR-HD', name: '华东电力有限公司', level: 3, industry: 'POWER',
            address: '上海市奉贤区', standard: 'ISO 14064-1 + 发电指南', employees: 2100,
            children: [
              { id: 'org-111', code: 'ZL-PWR-SH01', name: '上海漕泾热电厂', level: 4, industry: 'POWER', address: '上海市金山区漕泾镇', employees: 480, standard: 'ISO 14064-1 + 发电指南', children: [] },
              { id: 'org-112', code: 'ZL-PWR-SH02', name: '江苏苏州燃机电厂', level: 4, industry: 'POWER', address: '江苏省苏州市工业园区', employees: 320, standard: 'ISO 14064-1 + 发电指南', children: [] }
            ]
          },
          {
            id: 'org-120', code: 'ZL-PWR-HB', name: '华北电力有限公司', level: 3, industry: 'POWER',
            address: '河北省唐山市', standard: 'ISO 14064-1 + 发电指南', employees: 1820,
            children: [
              { id: 'org-121', code: 'ZL-PWR-TS01', name: '河北唐山燃煤电厂', level: 4, industry: 'POWER', address: '河北省唐山市曹妃甸', employees: 620, standard: 'ISO 14064-1 + 发电指南', children: [] }
            ]
          }
        ]
      },
      {
        id: 'org-200', code: 'ZL-STEEL', name: '中绿钢铁板块', level: 2, industry: 'STEEL',
        address: '河北省唐山市', standard: 'ISO 14064-1 + 钢铁指南', employees: 4180,
        children: [
          {
            id: 'org-210', code: 'ZL-STL-TS', name: '中绿唐山钢铁有限公司', level: 3, industry: 'STEEL',
            address: '河北省唐山市丰润区', standard: 'ISO 14064-1 + 钢铁指南', employees: 3260,
            children: [
              { id: 'org-211', code: 'ZL-STL-TS01', name: '唐山一号炼钢厂', level: 4, industry: 'STEEL', address: '河北省唐山市丰润区一区', employees: 1240, standard: 'ISO 14064-1 + 钢铁指南', children: [] },
              { id: 'org-212', code: 'ZL-STL-TS02', name: '唐山轧钢车间', level: 4, industry: 'STEEL', address: '河北省唐山市丰润区二区', employees: 860, standard: 'ISO 14064-1 + 钢铁指南', children: [] }
            ]
          }
        ]
      },
      {
        id: 'org-300', code: 'ZL-CHEM', name: '中绿化工板块', level: 2, industry: 'CHEMICAL',
        address: '江苏省南京市', standard: 'ISO 14064-1 + 化工指南', employees: 2180,
        children: [
          {
            id: 'org-310', code: 'ZL-CHM-NJ', name: '南京中绿化工有限公司', level: 3, industry: 'CHEMICAL',
            address: '江苏省南京市江北新区', standard: 'ISO 14064-1 + 化工指南', employees: 1640,
            children: [
              { id: 'org-311', code: 'ZL-CHM-NJ01', name: '南京化工一厂', level: 4, industry: 'CHEMICAL', address: '江苏省南京市江北新区A区', employees: 720, standard: 'ISO 14064-1 + 化工指南', children: [] }
            ]
          }
        ]
      },
      {
        id: 'org-400', code: 'ZL-CMT', name: '中绿建材板块', level: 2, industry: 'CEMENT',
        address: '安徽省芜湖市', standard: 'ISO 14064-1 + 水泥指南', employees: 880,
        children: [
          {
            id: 'org-410', code: 'ZL-CMT-WH', name: '芜湖中绿水泥有限公司', level: 3, industry: 'CEMENT',
            address: '安徽省芜湖市三山区', standard: 'ISO 14064-1 + 水泥指南', employees: 680, children: []
          }
        ]
      }
    ]
  };

  // 扁平化组织数组（便于查找）
  function flatten(node, parent, out) {
    out = out || [];
    const n = { ...node, parentId: parent ? parent.id : null, parentName: parent ? parent.name : null };
    delete n.children;
    out.push(n);
    (node.children || []).forEach(c => flatten(c, node, out));
    return out;
  }
  const ORG_FLAT = flatten(ORG_TREE);

  function getOrgPath(id) {
    const path = [];
    let cur = ORG_FLAT.find(o => o.id === id);
    while (cur) {
      path.unshift(cur);
      cur = cur.parentId ? ORG_FLAT.find(o => o.id === cur.parentId) : null;
    }
    return path;
  }
  function getDescendants(id) {
    const set = new Set([id]);
    let added = true;
    while (added) {
      added = false;
      ORG_FLAT.forEach(o => {
        if (o.parentId && set.has(o.parentId) && !set.has(o.id)) {
          set.add(o.id); added = true;
        }
      });
    }
    return Array.from(set);
  }

  // 排放类别 & 范围
  const EMISSION_CATEGORIES = [
    { code: 'FUEL', name: '化石燃料燃烧', scope: 1, color: '#d97757' },
    { code: 'PROCESS', name: '工业过程排放', scope: 1, color: '#d97757' },
    { code: 'FUGITIVE', name: '逸散排放', scope: 1, color: '#d97757' },
    { code: 'ELEC', name: '净购入电力', scope: 2, color: '#4a86e8' },
    { code: 'HEAT', name: '净购入热力', scope: 2, color: '#4a86e8' },
    { code: 'TRANSPORT', name: '上下游运输', scope: 3, color: '#36c4a8' },
    { code: 'WASTE', name: '废弃物处理', scope: 3, color: '#36c4a8' },
    { code: 'BUSINESS', name: '员工差旅与通勤', scope: 3, color: '#36c4a8' }
  ];

  // 排放因子库（部分国内常用 + ISO 14064 通用）
  const FACTORS = [
    { id: 'F001', name: '原煤（无烟煤）燃烧', category: 'FUEL', value: 2.6612, unit: 'tCO2e/t', source: '《中国发电企业温室气体排放核算方法与报告指南（2022年修订版）》', industry: 'POWER', effectiveDate: '2024-01-01', version: 'v2.1', standard: 'CHINA', scope: 'industry', status: 'enabled' },
    { id: 'F002', name: '原煤（烟煤）燃烧', category: 'FUEL', value: 2.4567, unit: 'tCO2e/t', source: '《中国发电企业温室气体排放核算方法与报告指南（2022年修订版）》', industry: 'POWER', effectiveDate: '2024-01-01', version: 'v2.1', standard: 'CHINA', scope: 'industry', status: 'enabled' },
    { id: 'F003', name: '天然气燃烧', category: 'FUEL', value: 21.622, unit: 'tCO2e/万Nm³', source: '《省级温室气体清单编制指南》', industry: 'GENERAL', effectiveDate: '2024-01-01', version: 'v3.0', standard: 'ISO', scope: 'general', status: 'enabled' },
    { id: 'F004', name: '柴油燃烧', category: 'FUEL', value: 3.0959, unit: 'tCO2e/t', source: 'IPCC 2006 国家温室气体清单指南', industry: 'GENERAL', effectiveDate: '2024-01-01', version: 'v3.0', standard: 'ISO', scope: 'general', status: 'enabled' },
    { id: 'F005', name: '汽油燃烧', category: 'FUEL', value: 2.9251, unit: 'tCO2e/t', source: 'IPCC 2006 国家温室气体清单指南', industry: 'GENERAL', effectiveDate: '2024-01-01', version: 'v3.0', standard: 'ISO', scope: 'general', status: 'enabled' },
    { id: 'F006', name: '焦炭燃烧', category: 'FUEL', value: 2.8604, unit: 'tCO2e/t', source: '《中国钢铁生产企业温室气体排放核算方法与报告指南》', industry: 'STEEL', effectiveDate: '2024-01-01', version: 'v2.0', standard: 'CHINA', scope: 'industry', status: 'enabled' },
    { id: 'F007', name: '电力（华东区域电网）', category: 'ELEC', value: 0.7035, unit: 'tCO2e/MWh', source: '生态环境部《2024年度全国电力二氧化碳排放因子》', industry: 'GENERAL', effectiveDate: '2024-04-12', version: 'v2024.1', standard: 'CHINA', scope: 'general', status: 'enabled' },
    { id: 'F008', name: '电力（华北区域电网）', category: 'ELEC', value: 0.8843, unit: 'tCO2e/MWh', source: '生态环境部《2024年度全国电力二氧化碳排放因子》', industry: 'GENERAL', effectiveDate: '2024-04-12', version: 'v2024.1', standard: 'CHINA', scope: 'general', status: 'enabled' },
    { id: 'F009', name: '电力（全国平均）', category: 'ELEC', value: 0.5703, unit: 'tCO2e/MWh', source: '生态环境部《2024年度全国电力二氧化碳排放因子》', industry: 'GENERAL', effectiveDate: '2024-04-12', version: 'v2024.1', standard: 'CHINA', scope: 'general', status: 'enabled' },
    { id: 'F010', name: '熟料（水泥工业过程）', category: 'PROCESS', value: 0.538, unit: 'tCO2e/t', source: '《中国水泥生产企业温室气体排放核算方法与报告指南》', industry: 'CEMENT', effectiveDate: '2023-06-01', version: 'v1.8', standard: 'CHINA', scope: 'industry', status: 'enabled' },
    { id: 'F011', name: '钢铁石灰石分解', category: 'PROCESS', value: 0.4317, unit: 'tCO2e/t', source: '《中国钢铁生产企业温室气体排放核算方法与报告指南》', industry: 'STEEL', effectiveDate: '2024-01-01', version: 'v2.0', standard: 'CHINA', scope: 'industry', status: 'enabled' },
    { id: 'F012', name: '硝酸生产 N2O', category: 'PROCESS', value: 7.5, unit: 'tCO2e/t', source: '《中国化工生产企业温室气体排放核算方法与报告指南》（GWP=265）', industry: 'CHEMICAL', effectiveDate: '2024-01-01', version: 'v2.0', standard: 'CHINA', scope: 'industry', status: 'enabled' },
    { id: 'F013', name: 'SF6 逸散排放', category: 'FUGITIVE', value: 23500, unit: 'tCO2e/t', source: 'IPCC AR5（GWP=23500）', industry: 'POWER', effectiveDate: '2024-01-01', version: 'v3.0', standard: 'ISO', scope: 'industry', status: 'enabled' },
    { id: 'F014', name: 'R134a 制冷剂逸散', category: 'FUGITIVE', value: 1430, unit: 'tCO2e/t', source: 'IPCC AR4（GWP=1430）', industry: 'GENERAL', effectiveDate: '2023-01-01', version: 'v2.0', standard: 'ISO', scope: 'general', status: 'enabled' },
    { id: 'F015', name: '热力（蒸汽）', category: 'HEAT', value: 0.11, unit: 'tCO2e/GJ', source: '《省级温室气体清单编制指南》', industry: 'GENERAL', effectiveDate: '2024-01-01', version: 'v3.0', standard: 'CHINA', scope: 'general', status: 'enabled' },
    { id: 'F016', name: '公路货运（重型柴油）', category: 'TRANSPORT', value: 0.0696, unit: 'tCO2e/t·km', source: 'ISO 14064-1 + GHG Protocol', industry: 'GENERAL', effectiveDate: '2024-01-01', version: 'v3.0', standard: 'ISO', scope: 'general', status: 'enabled' },
    { id: 'F017', name: '一般工业固废填埋', category: 'WASTE', value: 0.45, unit: 'tCO2e/t', source: 'IPCC 2006 国家温室气体清单指南', industry: 'GENERAL', effectiveDate: '2023-01-01', version: 'v2.0', standard: 'ISO', scope: 'general', status: 'enabled' },
    { id: 'F018', name: '员工航空差旅（短途）', category: 'BUSINESS', value: 0.000158, unit: 'tCO2e/人·km', source: 'DEFRA 2024 转换因子', industry: 'GENERAL', effectiveDate: '2024-01-01', version: 'v2024.0', standard: 'ISO', scope: 'general', status: 'enabled' },
    { id: 'F019', name: '电力（华东区域电网） 历史版本', category: 'ELEC', value: 0.7921, unit: 'tCO2e/MWh', source: '生态环境部 2023 年度', industry: 'GENERAL', effectiveDate: '2023-04-01', version: 'v2023.1', standard: 'CHINA', scope: 'general', status: 'disabled' },
    { id: 'F020', name: '燃料油燃烧', category: 'FUEL', value: 3.1705, unit: 'tCO2e/t', source: 'IPCC 2006', industry: 'GENERAL', effectiveDate: '2024-01-01', version: 'v3.0', standard: 'ISO', scope: 'general', status: 'enabled' }
  ];

  // 模拟填报数据（按组织 × 月份）
  // 每个最末级组织都有过去 12 月数据
  const LEAF_ORGS = ORG_FLAT.filter(o => o.level === 4);
  const MONTHS = []; // 2024-06 ~ 2025-05
  for (let m = 5; m >= 0; m--) {
    const d = new Date(2025, 4 - m, 1);
    MONTHS.unshift(d.toISOString().slice(0, 7));
  }
  for (let m = 0; m < 6; m++) {
    const d = new Date(2025, 5 + m, 1);
    MONTHS.push(d.toISOString().slice(0, 7));
  }
  // 最终改成 2024-06 .. 2025-05 共 12 个月
  const PERIODS = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(2025, 4 - i, 1);
    PERIODS.push(d.toISOString().slice(0, 7));
  }

  // 按行业生成典型数据条目模板
  const TEMPLATES = {
    POWER: [
      { factorId: 'F001', baseQty: 12000, qtyVar: 0.15, unit: 't' },
      { factorId: 'F002', baseQty: 8000, qtyVar: 0.18, unit: 't' },
      { factorId: 'F003', baseQty: 320, qtyVar: 0.20, unit: '万Nm³' },
      { factorId: 'F013', baseQty: 0.012, qtyVar: 0.30, unit: 't' },
      { factorId: 'F007', baseQty: 4500, qtyVar: 0.10, unit: 'MWh' },
      { factorId: 'F016', baseQty: 86000, qtyVar: 0.15, unit: 't·km' }
    ],
    STEEL: [
      { factorId: 'F006', baseQty: 5400, qtyVar: 0.15, unit: 't' },
      { factorId: 'F011', baseQty: 3200, qtyVar: 0.12, unit: 't' },
      { factorId: 'F003', baseQty: 180, qtyVar: 0.18, unit: '万Nm³' },
      { factorId: 'F008', baseQty: 7800, qtyVar: 0.10, unit: 'MWh' },
      { factorId: 'F015', baseQty: 24000, qtyVar: 0.12, unit: 'GJ' },
      { factorId: 'F017', baseQty: 2400, qtyVar: 0.20, unit: 't' }
    ],
    CHEMICAL: [
      { factorId: 'F003', baseQty: 240, qtyVar: 0.15, unit: '万Nm³' },
      { factorId: 'F012', baseQty: 86, qtyVar: 0.18, unit: 't' },
      { factorId: 'F014', baseQty: 0.34, qtyVar: 0.25, unit: 't' },
      { factorId: 'F007', baseQty: 6200, qtyVar: 0.12, unit: 'MWh' },
      { factorId: 'F020', baseQty: 1400, qtyVar: 0.15, unit: 't' }
    ],
    CEMENT: [
      { factorId: 'F010', baseQty: 24000, qtyVar: 0.10, unit: 't' },
      { factorId: 'F001', baseQty: 4800, qtyVar: 0.15, unit: 't' },
      { factorId: 'F009', baseQty: 3100, qtyVar: 0.10, unit: 'MWh' },
      { factorId: 'F016', baseQty: 124000, qtyVar: 0.18, unit: 't·km' }
    ],
    GENERAL: [
      { factorId: 'F003', baseQty: 12, qtyVar: 0.25, unit: '万Nm³' },
      { factorId: 'F009', baseQty: 320, qtyVar: 0.15, unit: 'MWh' },
      { factorId: 'F018', baseQty: 124000, qtyVar: 0.30, unit: '人·km' }
    ]
  };

  // 生成填报记录
  let _seed = 7;
  function rnd() { _seed = (_seed * 9301 + 49297) % 233280; return _seed / 233280; }
  const ENTRIES = [];
  let entryId = 1;
  LEAF_ORGS.forEach(org => {
    const tpl = TEMPLATES[org.industry] || TEMPLATES.GENERAL;
    PERIODS.forEach(period => {
      tpl.forEach(t => {
        const f = FACTORS.find(x => x.id === t.factorId);
        const qty = t.baseQty * (1 + (rnd() - 0.5) * 2 * t.qtyVar);
        const emission = qty * f.value;
        const status = period === PERIODS[PERIODS.length - 1] ? (rnd() < 0.3 ? 'draft' : 'submitted')
                     : 'approved';
        ENTRIES.push({
          id: 'E' + String(entryId++).padStart(6, '0'),
          orgId: org.id, orgName: org.name, orgCode: org.code,
          period, periodType: 'month',
          categoryCode: f.category,
          factorId: f.id, factorName: f.name,
          quantity: +qty.toFixed(2), unit: t.unit,
          factorValue: f.value, factorUnit: f.unit,
          scope: EMISSION_CATEGORIES.find(c => c.code === f.category).scope,
          emission: +emission.toFixed(2),
          source: rnd() < 0.65 ? 'manual' : 'import',
          status,
          createBy: ['张芷涵', '陈彦霖', '李铭哲', '王雪婷'][Math.floor(rnd() * 4)],
          createDate: period + '-' + String(Math.floor(rnd() * 28) + 1).padStart(2, '0') + ' 14:23:08',
          updateBy: ['张芷涵', '陈彦霖', '李铭哲', '王雪婷'][Math.floor(rnd() * 4)],
          updateDate: period + '-' + String(Math.floor(rnd() * 28) + 1).padStart(2, '0') + ' 16:42:11'
        });
      });
    });
  });

  // 聚合：给定组织 id（含所有后代）、period 范围，按 scope/category 汇总
  function aggregate(orgId, periodFilter) {
    const ids = new Set(getDescendants(orgId));
    let entries = ENTRIES.filter(e => ids.has(e.orgId));
    if (periodFilter) {
      entries = entries.filter(e => e.period >= periodFilter.start && e.period <= periodFilter.end);
    }
    const byScope = { 1: 0, 2: 0, 3: 0 };
    const byCategory = {};
    const byMonth = {};
    const byOrg = {};
    entries.forEach(e => {
      byScope[e.scope] = (byScope[e.scope] || 0) + e.emission;
      byCategory[e.categoryCode] = (byCategory[e.categoryCode] || 0) + e.emission;
      byMonth[e.period] = (byMonth[e.period] || 0) + e.emission;
      byOrg[e.orgId] = (byOrg[e.orgId] || 0) + e.emission;
    });
    const total = byScope[1] + byScope[2] + byScope[3];
    return { total, byScope, byCategory, byMonth, byOrg, count: entries.length, entries };
  }

  return {
    INDUSTRIES, ORG_TREE, ORG_FLAT, FACTORS, EMISSION_CATEGORIES, ENTRIES, PERIODS,
    getOrgPath, getDescendants, aggregate
  };
})();
