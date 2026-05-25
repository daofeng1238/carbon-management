// 碳排放报告生成 + 完整 PDF 风格预览
const { useState, useMemo } = React;
const DR = window.__CARBON_DATA;

function ReportPage() {
  const { orgId, org, path } = useOrg();
  const toast = useToast();

  const [showPreview, setShowPreview] = useState(true);
  const [config, setConfig] = useState({
    reportPeriod: '2024',
    title: '',  // empty → auto
    standard: 'ISO',
    includeChart: true,
    includeBenchmark: true,
    includeAppendix: true,
    showLogo: true,
    statement: '本报告依据 ISO 14064-1:2018《组织层面温室气体排放和清除的量化和报告规范》及国家相关行业核算指南编制，已通过内部三级审核。',
    reportTo: '集团 ESG 委员会',
    scope: 'self' // self | consolidated
  });

  // Determine target orgs
  const targetOrgs = config.scope === 'consolidated'
    ? [org].concat(DR.getDescendants(orgId).filter(id => id !== orgId).map(id => DR.ORG_FLAT.find(o => o.id === id)))
    : [org];

  // Period range
  const yearPeriods = DR.PERIODS.filter(p => p.startsWith(config.reportPeriod));
  const filter = yearPeriods.length ? { start: yearPeriods[0], end: yearPeriods[yearPeriods.length - 1] } : null;
  const agg = useMemo(() => DR.aggregate(orgId, filter), [orgId, config.reportPeriod]);

  // recent reports
  const [history, setHistory] = useState([
    { id: 'R-2025-004', title: '中绿能源控股集团 2024 年度温室气体排放报告', org: '中绿能源控股集团', period: '2024', scope: 'consolidated', status: 'final', updateDate: '2025-03-21 16:42', size: '4.2 MB' },
    { id: 'R-2025-003', title: '中绿电力板块 2024 Q4 温室气体排放报告', org: '中绿电力板块', period: '2024Q4', scope: 'consolidated', status: 'final', updateDate: '2025-01-18 11:08', size: '2.8 MB' },
    { id: 'R-2024-018', title: '河北唐山燃煤电厂 2024 年度核查报告', org: '河北唐山燃煤电厂', period: '2024', scope: 'self', status: 'final', updateDate: '2024-12-30 09:21', size: '1.6 MB' },
    { id: 'R-2024-017', title: '中绿钢铁板块 2024 年度温室气体排放报告', org: '中绿钢铁板块', period: '2024', scope: 'consolidated', status: 'draft', updateDate: '2024-12-15 14:33', size: '3.1 MB' }
  ]);

  const generate = () => {
    toast.push('报告已生成 · 进入预览');
    const newReport = {
      id: 'R-' + new Date().getFullYear() + '-' + String(history.length + 5).padStart(3, '0'),
      title: config.title || `${org.name} ${config.reportPeriod} 年度温室气体排放报告`,
      org: org.name,
      period: config.reportPeriod,
      scope: config.scope,
      status: 'draft',
      updateDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
      size: '2.3 MB'
    };
    setHistory(prev => [newReport, ...prev]);
    setShowPreview(true);
  };

  return (
    <>
      <PageHeader title="碳排放报告生成" breadcrumb={['首页', '报告', '报告生成']}
        extra={
          <>
            <Button icon="history">报告归档</Button>
            <Button variant="primary" icon="doc" onClick={generate}>生成报告</Button>
          </>
        } />

      <div className="cc-grid" style={{ gridTemplateColumns: '380px 1fr' }}>
        {/* Config panel */}
        <div className="cc-flex" style={{ flexDirection: 'column', gap: 12 }}>
          <Panel title="报告参数">
            <FormRow label="报告主体">
              <Select value={config.scope} onChange={(v) => setConfig({ ...config, scope: v })}
                options={[
                  { value: 'self', label: '仅本组织（独立报告）' },
                  { value: 'consolidated', label: '本组织及下属（合并报告）' }
                ]} style={{ width: '100%', minWidth: 'auto' }} />
            </FormRow>
            <FormRow label="当前组织">
              <Input value={path.map(p => p.name).join(' / ')} disabled style={{ width: '100%' }} />
            </FormRow>
            <FormRow label="报告期">
              <Select value={config.reportPeriod} onChange={(v) => setConfig({ ...config, reportPeriod: v })}
                options={[
                  { value: '2024', label: '2024 年度（自然年）' },
                  { value: '2024H2', label: '2024 年下半年' },
                  { value: '2024Q4', label: '2024 第四季度' },
                  { value: '2025Q1', label: '2025 第一季度' }
                ]} style={{ width: '100%', minWidth: 'auto' }} />
            </FormRow>
            <FormRow label="核算标准">
              <Select value={config.standard} onChange={(v) => setConfig({ ...config, standard: v })}
                options={[
                  { value: 'ISO', label: 'ISO 14064-1:2018' },
                  { value: 'INDUSTRY', label: '国家行业核算指南' },
                  { value: 'BOTH', label: 'ISO 14064-1 + 行业指南' }
                ]} style={{ width: '100%', minWidth: 'auto' }} />
            </FormRow>
            <FormRow label="报告标题" help="留空则自动生成">
              <Input value={config.title} onChange={(v) => setConfig({ ...config, title: v })}
                placeholder={`${org.name} ${config.reportPeriod} 年度温室气体排放报告`}
                style={{ width: '100%' }} />
            </FormRow>
            <FormRow label="报送对象">
              <Input value={config.reportTo} onChange={(v) => setConfig({ ...config, reportTo: v })}
                style={{ width: '100%' }} />
            </FormRow>
          </Panel>

          <Panel title="模板配置">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label className="cc-flex gap-8 align-c"><input type="checkbox" checked={config.showLogo} onChange={(e) => setConfig({ ...config, showLogo: e.target.checked })} /> 显示组织 Logo</label>
              <label className="cc-flex gap-8 align-c"><input type="checkbox" checked={config.includeChart} onChange={(e) => setConfig({ ...config, includeChart: e.target.checked })} /> 包含趋势图与饼图</label>
              <label className="cc-flex gap-8 align-c"><input type="checkbox" checked={config.includeBenchmark} onChange={(e) => setConfig({ ...config, includeBenchmark: e.target.checked })} /> 包含行业指标对比</label>
              <label className="cc-flex gap-8 align-c"><input type="checkbox" checked={config.includeAppendix} onChange={(e) => setConfig({ ...config, includeAppendix: e.target.checked })} /> 包含附录（因子明细 / 计算过程）</label>
            </div>
            <div className="cc-divider" />
            <FormRow label="标准声明">
              <textarea className="cc-textarea" value={config.statement}
                onChange={(e) => setConfig({ ...config, statement: e.target.value })}
                style={{ width: '100%' }} rows={4} />
            </FormRow>
          </Panel>

          <Panel title="导出">
            <div className="cc-flex" style={{ flexDirection: 'column', gap: 8 }}>
              <Button icon="download" variant="primary" onClick={() => toast.push('PDF 下载已开始（演示）')}>导出为 PDF</Button>
              <Button icon="download" onClick={() => toast.push('Word 下载已开始（演示）')}>导出为 Word</Button>
              <Button icon="print" onClick={() => window.print()}>打印 / 另存为 PDF</Button>
            </div>
          </Panel>
        </div>

        {/* Preview */}
        <div>
          <Panel
            title={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span className="accent" style={{ display: 'inline-block', width: 3, height: 14, background: 'var(--c-primary)', borderRadius: 2 }} />
                报告预览
              </span>
            }
            accent={false}
            extra={
              <div className="cc-flex gap-8 align-c">
                <Tabs value={config.scope}
                  onChange={(v) => setConfig({ ...config, scope: v })}
                  items={[
                    { value: 'self', label: '本组织视图' },
                    { value: 'consolidated', label: '合并视图' }
                  ]}
                />
              </div>
            } flush>
            <div style={{ background: 'var(--c-bg-page)', padding: 32, minHeight: 800 }}>
              <ReportPreview config={config} org={org} agg={agg} targetOrgs={targetOrgs} yearPeriods={yearPeriods} />
            </div>
          </Panel>
        </div>
      </div>

      <Panel title="历史报告" flush>
        <Table columns={[
          { key: 'id', title: '报告编号', width: 130, render: (r) => <b style={{ fontVariantNumeric: 'tabular-nums' }}>{r.id}</b> },
          { key: 'title', title: '报告名称', minWidth: 280 },
          { key: 'org', title: '报告主体', width: 200 },
          { key: 'period', title: '报告期', width: 100 },
          { key: 'scope', title: '类型', width: 120, render: (r) => <Tag variant={r.scope === 'consolidated' ? 'primary' : ''}>{r.scope === 'consolidated' ? '合并报告' : '独立报告'}</Tag> },
          { key: 'status', title: '状态', width: 90, align: 'center', render: (r) => <Tag variant={r.status === 'final' ? 'success' : 'warning'} dot>{r.status === 'final' ? '已定稿' : '草稿'}</Tag> },
          { key: 'size', title: '大小', width: 80, align: 'right' },
          { key: 'updateDate', title: '更新时间', width: 160 },
          { key: 'actions', title: '操作', width: 200, render: (r) => (
            <div className="cc-flex gap-8">
              <Button variant="text" size="sm" onClick={() => toast.push('已打开预览（演示）')}>预览</Button>
              <Button variant="text" size="sm" onClick={() => toast.push('PDF 下载已开始（演示）')}>下载 PDF</Button>
              <Button variant="text" size="sm" onClick={() => toast.push('Word 下载已开始（演示）')}>下载 Word</Button>
            </div>
          )}
        ]} data={history} rowKey="id" />
      </Panel>
    </>
  );
}

// =========================================================
// PDF-style report preview
// =========================================================
function ReportPreview({ config, org, agg, targetOrgs, yearPeriods }) {
  const total = agg.total;
  const scope1 = agg.byScope[1] || 0;
  const scope2 = agg.byScope[2] || 0;
  const scope3 = agg.byScope[3] || 0;
  const periodLabel = config.reportPeriod + (config.reportPeriod.length === 4 ? ' 年度' : '');
  const standardName = {
    ISO: 'ISO 14064-1:2018《组织层面温室气体排放和清除的量化和报告规范》',
    INDUSTRY: org.standard,
    BOTH: 'ISO 14064-1:2018 + ' + DR.INDUSTRIES.find(i => i.code === org.industry)?.guide
  }[config.standard];

  // Monthly trend for the year
  const monthly = yearPeriods.map(p => {
    const entries = agg.entries.filter(e => e.period === p);
    const s = { label: p, s1: 0, s2: 0, s3: 0, total: 0 };
    entries.forEach(e => { s['s' + e.scope] += e.emission; s.total += e.emission; });
    return s;
  });

  // By category
  const byCategory = DR.EMISSION_CATEGORIES.map(c => {
    const v = agg.byCategory[c.code] || 0;
    return { ...c, value: v, pct: total > 0 ? v / total * 100 : 0 };
  }).filter(c => c.value > 0);

  // Per-org breakdown for consolidated
  const orgBreakdown = config.scope === 'consolidated'
    ? targetOrgs.map(o => {
        const a = DR.aggregate(o.id, { start: yearPeriods[0], end: yearPeriods[yearPeriods.length - 1] });
        return { name: o.name, code: o.code, level: o.level, s1: a.byScope[1] || 0, s2: a.byScope[2] || 0, s3: a.byScope[3] || 0, total: a.total };
      }).filter(x => x.total > 0)
    : [];

  return (
    <>
      {/* COVER */}
      <div className="report-page">
        <div className="r-cover">
          {config.showLogo && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 60 }}>
              <div style={{ width: 60, height: 60, borderRadius: 12, background: 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-light) 100%)', display: 'grid', placeItems: 'center', color: 'white', fontWeight: 700, fontSize: 28 }}>碳</div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1f2d3d' }}>{org.name}</div>
                <div style={{ fontSize: 11, color: '#606266' }}>{org.code}</div>
              </div>
            </div>
          )}
          <div className="badge">{config.scope === 'consolidated' ? '集团合并报告' : '独立组织报告'}</div>
          <h1 className="cv">{config.title || `${org.name} ${periodLabel} 温室气体排放报告`}</h1>
          <div className="subtitle">Greenhouse Gas Emissions Report · {periodLabel}</div>

          <div style={{ display: 'inline-block', textAlign: 'left', marginTop: 80, fontSize: 12, color: '#606266' }}>
            <div style={{ padding: '6px 0' }}><span style={{ display: 'inline-block', width: 90 }}>报告主体：</span>{org.name}</div>
            <div style={{ padding: '6px 0' }}><span style={{ display: 'inline-block', width: 90 }}>核算标准：</span>{config.standard === 'ISO' ? 'ISO 14064-1:2018' : config.standard === 'INDUSTRY' ? '国家行业指南' : 'ISO 14064-1 + 行业指南'}</div>
            <div style={{ padding: '6px 0' }}><span style={{ display: 'inline-block', width: 90 }}>报告编号：</span>R-{new Date().getFullYear()}-{Math.floor(Math.random() * 900 + 100)}</div>
            <div style={{ padding: '6px 0' }}><span style={{ display: 'inline-block', width: 90 }}>编制日期：</span>{new Date().toISOString().slice(0, 10)}</div>
            <div style={{ padding: '6px 0' }}><span style={{ display: 'inline-block', width: 90 }}>报送对象：</span>{config.reportTo}</div>
          </div>

          <div style={{ position: 'absolute', bottom: 80, left: 0, right: 0, fontSize: 11, color: '#909399' }}>
            <div>本报告由组织碳管理系统自动生成 · 已通过内部三级审核</div>
          </div>
        </div>
      </div>

      {/* SECTION 1: ORGANIZATION INFO */}
      <div className="report-page" style={{ marginTop: 20 }}>
        <h1>一、组织基本信息与核算边界</h1>
        <h2>1.1 报告主体信息</h2>
        <dl className="r-meta">
          <dt>组织名称</dt><dd>{org.name}</dd>
          <dt>组织编码</dt><dd>{org.code}</dd>
          <dt>所属行业</dt><dd>{DR.INDUSTRIES.find(i => i.code === org.industry)?.name}</dd>
          <dt>组织层级</dt><dd>{['集团', '板块', '子公司', '厂区'][org.level - 1]}（第 {org.level} 级）</dd>
          <dt>员工人数</dt><dd>{fmt(org.employees || 0, 0)} 人</dd>
          <dt>注册地址</dt><dd>{org.address}</dd>
          <dt>报告期</dt><dd>{periodLabel}（{yearPeriods[0]} ~ {yearPeriods[yearPeriods.length - 1]}）</dd>
          <dt>编制日期</dt><dd>{new Date().toISOString().slice(0, 10)}</dd>
        </dl>

        <h2>1.2 核算标准与方法</h2>
        <p>本报告依据 <b>{standardName}</b> 编制。
        采用基于活动数据的"自下而上"核算方法，对各排放源的活动数据（如燃料消耗量、电力消耗量）乘以对应的排放因子，并考虑温室气体的全球增温潜势（GWP），以二氧化碳当量（tCO₂e）汇总。</p>
        <p style={{ background: '#f4f8f7', padding: '10px 14px', borderRadius: 4, border: '1px solid #d6e3df', fontSize: 12, color: '#1f2d3d', lineHeight: 1.7 }}>
          核算公式：<br/>
          <code style={{ fontFamily: 'Consolas, Menlo, monospace' }}>排放量 (tCO₂e) = 活动数据 × 排放因子 × GWP</code><br />
          其中 GWP 来自 IPCC AR5：CO₂=1, CH₄=28, N₂O=265, SF₆=23500, HFC-134a=1430
        </p>

        <h2>1.3 核算边界</h2>
        <p>本报告采用<b>{config.scope === 'consolidated' ? '运营控制权法' : '股权比例法'}</b>界定组织边界，
        {config.scope === 'consolidated'
          ? `涵盖 ${org.name} 及其下属 ${targetOrgs.length - 1} 个组织单元的全部排放源。`
          : `仅涵盖 ${org.name} 单体的排放源。`}</p>

        <h3>排放源识别清单</h3>
        <table className="r">
          <thead><tr><th>编号</th><th>排放源</th><th>排放范围</th><th>温室气体</th><th>是否纳入核算</th></tr></thead>
          <tbody>
            <tr><td>S1-1</td><td>化石燃料燃烧（煤、油、气）</td><td>范围一</td><td>CO₂, CH₄, N₂O</td><td>是</td></tr>
            <tr><td>S1-2</td><td>工业过程排放</td><td>范围一</td><td>CO₂</td><td>是</td></tr>
            <tr><td>S1-3</td><td>逸散排放（SF₆、制冷剂）</td><td>范围一</td><td>SF₆, HFCs</td><td>是</td></tr>
            <tr><td>S2-1</td><td>净购入电力</td><td>范围二</td><td>CO₂</td><td>是</td></tr>
            <tr><td>S2-2</td><td>净购入热力（蒸汽）</td><td>范围二</td><td>CO₂</td><td>是</td></tr>
            <tr><td>S3-1</td><td>上下游运输</td><td>范围三</td><td>CO₂</td><td>是</td></tr>
            <tr><td>S3-2</td><td>废弃物处理</td><td>范围三</td><td>CO₂, CH₄</td><td>是</td></tr>
            <tr><td>S3-3</td><td>员工差旅与通勤</td><td>范围三</td><td>CO₂</td><td>是</td></tr>
          </tbody>
        </table>
      </div>

      {/* SECTION 2: EMISSION SUMMARY */}
      <div className="report-page" style={{ marginTop: 20 }}>
        <h1>二、排放量核算结果</h1>

        <h2>2.1 排放总量</h2>
        <p>本报告期 {org.name} {config.scope === 'consolidated' ? '（合并口径）' : ''}温室气体排放总量为
          <b style={{ color: 'var(--c-primary)', fontSize: 16 }}> {fmt(total, 2)} tCO₂e</b>
          （约 <b>{fmt(total / 10000, 4)} 万 tCO₂e</b>）。
          其中范围一占比 {fmt(scope1 / total * 100, 1)}%，范围二占比 {fmt(scope2 / total * 100, 1)}%，范围三占比 {fmt(scope3 / total * 100, 1)}%。</p>

        <h3>分范围排放量汇总表</h3>
        <table className="r">
          <thead>
            <tr><th style={{ width: 80 }}>范围</th><th>说明</th><th className="num">排放量 (tCO₂e)</th><th className="num">占比</th></tr>
          </thead>
          <tbody>
            <tr><td><b>范围一</b></td><td>直接排放（化石燃料燃烧、工业过程、逸散）</td><td className="num">{fmt(scope1, 2)}</td><td className="num">{fmt(scope1 / total * 100, 2)}%</td></tr>
            <tr><td><b>范围二</b></td><td>能源间接排放（外购电力、热力）</td><td className="num">{fmt(scope2, 2)}</td><td className="num">{fmt(scope2 / total * 100, 2)}%</td></tr>
            <tr><td><b>范围三</b></td><td>其他间接排放（运输、废弃物、差旅）</td><td className="num">{fmt(scope3, 2)}</td><td className="num">{fmt(scope3 / total * 100, 2)}%</td></tr>
            <tr style={{ background: '#f4f8f7' }}><td colSpan="2"><b>合计</b></td><td className="num"><b>{fmt(total, 2)}</b></td><td className="num"><b>100.00%</b></td></tr>
          </tbody>
        </table>

        {config.includeChart && (
          <>
            <h3>排放范围占比</h3>
            <div style={{ display: 'flex', gap: 24, alignItems: 'center', padding: '12px 0' }}>
              <ReportDoughnut total={total} s1={scope1} s2={scope2} s3={scope3} />
              <div style={{ flex: 1, fontSize: 11, color: '#606266' }}>
                <div>由图可见，{scope1 > scope2 && scope1 > scope3 ? '范围一（直接排放）' : scope2 > scope3 ? '范围二（能源间接）' : '范围三（其他间接）'} 是本组织主要排放来源。
                建议在减排路径规划中优先考虑 {scope1 > scope2 ? '化石燃料替代与工艺改造' : '清洁电力采购与能效提升'}。</div>
              </div>
            </div>
          </>
        )}

        <h2>2.2 分排放源类别</h2>
        <table className="r">
          <thead>
            <tr><th>排放类别</th><th>范围</th><th>核算公式</th><th className="num">排放量 (tCO₂e)</th><th className="num">占比</th></tr>
          </thead>
          <tbody>
            {byCategory.map((c, i) => (
              <tr key={i}>
                <td>{c.name}</td>
                <td>范围 {c.scope}</td>
                <td style={{ fontSize: 11, color: '#606266' }}>活动数据 × 排放因子{c.scope === 1 && ['PROCESS', 'FUGITIVE'].includes(c.code) ? ' × GWP' : ''}</td>
                <td className="num">{fmt(c.value, 2)}</td>
                <td className="num">{fmt(c.pct, 2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>

        {config.includeChart && (
          <>
            <h2>2.3 月度排放趋势</h2>
            <ReportLineChart data={monthly} />
            <p style={{ fontSize: 11, color: '#606266', marginTop: 8 }}>
              报告期内月均排放 {fmt(total / monthly.length, 2)} tCO₂e，
              排放峰值出现在 {monthly.reduce((a, b) => a.total > b.total ? a : b).label}，
              排放谷值出现在 {monthly.reduce((a, b) => a.total < b.total ? a : b).label}。
            </p>
          </>
        )}
      </div>

      {/* SECTION 3: ORG breakdown (consolidated only) */}
      {config.scope === 'consolidated' && orgBreakdown.length > 1 && (
        <div className="report-page" style={{ marginTop: 20 }}>
          <h1>三、合并范围内各组织排放明细</h1>
          <p>下表列出本报告核算边界内各组织单元的排放量明细，按组织层级缩进展示，便于追溯。
            各子组织数据已合并入本报告主体，避免重复计入。</p>
          <table className="r">
            <thead>
              <tr><th>组织单元</th><th>编码</th><th>层级</th><th className="num">范围一</th><th className="num">范围二</th><th className="num">范围三</th><th className="num">合计</th></tr>
            </thead>
            <tbody>
              {orgBreakdown.map((o, i) => (
                <tr key={i} style={i === 0 ? { background: '#f4f8f7', fontWeight: 600 } : {}}>
                  <td style={{ paddingLeft: 10 + (o.level - org.level) * 16 }}>{o.name}</td>
                  <td>{o.code}</td>
                  <td>{['集团', '板块', '子公司', '厂区'][o.level - 1]}</td>
                  <td className="num">{fmt(o.s1, 2)}</td>
                  <td className="num">{fmt(o.s2, 2)}</td>
                  <td className="num">{fmt(o.s3, 2)}</td>
                  <td className="num">{fmt(o.total, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SECTION 4: Industry benchmark */}
      {config.includeBenchmark && (
        <div className="report-page" style={{ marginTop: 20 }}>
          <h1>{config.scope === 'consolidated' && orgBreakdown.length > 1 ? '四' : '三'}、行业指标对比</h1>
          <p>依据《{DR.INDUSTRIES.find(i => i.code === org.industry)?.name}》行业核算指南，本组织主要排放强度指标如下：</p>

          <table className="r">
            <thead><tr><th>指标</th><th className="num">本组织</th><th className="num">行业领先</th><th className="num">行业平均</th><th className="num">差距</th></tr></thead>
            <tbody>
              <tr>
                <td>排放总量（{periodLabel}）</td>
                <td className="num">{fmt(total, 0)} tCO₂e</td>
                <td className="num">—</td>
                <td className="num">—</td>
                <td className="num">—</td>
              </tr>
              <tr>
                <td>人均排放强度</td>
                <td className="num">{fmt(total / (org.employees || 1), 2)} tCO₂e/人</td>
                <td className="num">1.96 tCO₂e/人</td>
                <td className="num">3.45 tCO₂e/人</td>
                <td className="num" style={{ color: total / (org.employees || 1) < 3.45 ? '#36c4a8' : '#f56c6c' }}>
                  {total / (org.employees || 1) < 3.45 ? '优于平均' : '高于平均'}
                </td>
              </tr>
              <tr>
                <td>单位产值碳强度</td>
                <td className="num">2.81 tCO₂e/万元</td>
                <td className="num">1.96 tCO₂e/万元</td>
                <td className="num">3.45 tCO₂e/万元</td>
                <td className="num" style={{ color: '#36c4a8' }}>优于平均 -18.5%</td>
              </tr>
              <tr>
                <td>范围一占比</td>
                <td className="num">{fmt(scope1 / total * 100, 1)}%</td>
                <td className="num">28.0%</td>
                <td className="num">52.0%</td>
                <td className="num">—</td>
              </tr>
            </tbody>
          </table>

          <h2>减排建议</h2>
          <ol style={{ paddingLeft: 20, fontSize: 12, color: '#1f2d3d', lineHeight: 1.9 }}>
            <li>主要排放源集中在 {scope1 > scope2 ? '化石燃料燃烧' : '外购电力'}，建议优先实施 {scope1 > scope2 ? '燃料替代（天然气改造、生物质燃料）' : '清洁电力采购（绿电、绿证）'}，预期减排 8% - 15%；</li>
            <li>建立分组织、分排放源的月度监测机制，确保数据填报及时性达到 95% 以上；</li>
            <li>开展能效改造与工艺优化，重点关注高耗能环节；</li>
            <li>对接 ISO 14001 / 14064 体系，每年进行第三方核查；</li>
            <li>纳入集团碳目标管理，建议设定 2030 年单位产值碳强度较 2024 年下降 25% 的目标。</li>
          </ol>
        </div>
      )}

      {/* APPENDIX */}
      {config.includeAppendix && (
        <div className="report-page" style={{ marginTop: 20 }}>
          <h1>附录</h1>
          <h2>附录 A · 排放因子明细</h2>
          <table className="r">
            <thead><tr><th>因子名称</th><th>排放类别</th><th className="num">因子值</th><th>单位</th><th>版本</th><th>来源</th></tr></thead>
            <tbody>
              {[...new Set(agg.entries.map(e => e.factorId))].map(id => {
                const f = DR.FACTORS.find(x => x.id === id);
                if (!f) return null;
                return (
                  <tr key={id}>
                    <td>{f.name}</td>
                    <td>{DR.EMISSION_CATEGORIES.find(c => c.code === f.category)?.name}</td>
                    <td className="num">{f.value}</td>
                    <td>{f.unit}</td>
                    <td>{f.version}</td>
                    <td style={{ fontSize: 10, color: '#606266' }}>{f.source}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <h2>附录 B · 标准声明与签字</h2>
          <p style={{ fontSize: 12, lineHeight: 1.8 }}>{config.statement}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginTop: 60, fontSize: 12, color: '#606266' }}>
            <div>
              <div style={{ borderTop: '1px solid #d0d6de', paddingTop: 6 }}>编制人</div>
              <div style={{ marginTop: 6 }}>张芷涵 · ESG 数据管理</div>
              <div style={{ marginTop: 2, fontSize: 10 }}>{new Date().toISOString().slice(0, 10)}</div>
            </div>
            <div>
              <div style={{ borderTop: '1px solid #d0d6de', paddingTop: 6 }}>审核人</div>
              <div style={{ marginTop: 6 }}>陈彦霖 · ESG 经理</div>
              <div style={{ marginTop: 2, fontSize: 10 }}>{new Date().toISOString().slice(0, 10)}</div>
            </div>
            <div>
              <div style={{ borderTop: '1px solid #d0d6de', paddingTop: 6 }}>批准人</div>
              <div style={{ marginTop: 6 }}>李铭哲 · ESG 委员会主任</div>
              <div style={{ marginTop: 2, fontSize: 10 }}>{new Date().toISOString().slice(0, 10)}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Small report-specific charts (printable, no theme deps)
function ReportDoughnut({ total, s1, s2, s3 }) {
  const r = 50, c = 70;
  const C = 2 * Math.PI * r;
  const colors = ['#d97757', '#4a86e8', '#36c4a8'];
  const values = [s1, s2, s3];
  let off = 0;
  return (
    <div style={{ position: 'relative', width: 140, height: 140 }}>
      <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="#e4e7ed" strokeWidth="20" />
        {values.map((v, i) => {
          const l = (v / total) * C;
          const el = <circle key={i} cx={c} cy={c} r={r} fill="none"
            stroke={colors[i]} strokeWidth="20"
            strokeDasharray={`${l} ${C - l}`} strokeDashoffset={-off} />;
          off += l;
          return el;
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 11, color: '#606266' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1f2d3d' }}>{fmt(total / 10000, 2)}</div>
          <div>万 tCO₂e</div>
        </div>
      </div>
    </div>
  );
}

function ReportLineChart({ data }) {
  const max = Math.max(...data.map(d => d.total), 1);
  const w = 640, h = 200, padL = 40, padR = 16, padB = 32, padT = 16;
  const cw = w - padL - padR, ch = h - padT - padB;
  const points = data.map((d, i) => {
    const x = padL + (i / Math.max(data.length - 1, 1)) * cw;
    const y = padT + ch * (1 - d.total / max);
    return [x, y];
  });
  const path = points.map((p, i) => (i === 0 ? 'M' : 'L') + p[0] + ',' + p[1]).join(' ');
  const area = path + ' L' + points[points.length - 1][0] + ',' + (padT + ch) + ' L' + points[0][0] + ',' + (padT + ch) + ' Z';
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      {[0, 0.5, 1].map((t, i) => {
        const y = padT + ch * (1 - t);
        return <g key={i}>
          <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="#ebeef5" strokeWidth="1" />
          <text x={padL - 4} y={y + 3} fontSize="9" fill="#909399" textAnchor="end">{fmt(max * t / 1000, 1)}k</text>
        </g>;
      })}
      <path d={area} fill="#0d7a5f" opacity="0.10" />
      <path d={path} fill="none" stroke="#0d7a5f" strokeWidth="2" />
      {points.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#0d7a5f" />
      ))}
      {data.map((d, i) => (
        <text key={i} x={points[i][0]} y={padT + ch + 16} fontSize="9" fill="#606266" textAnchor="middle">{d.label.slice(-5)}</text>
      ))}
    </svg>
  );
}

window.ReportPage = ReportPage;
