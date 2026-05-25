// Data entry & import pages
const { useState, useMemo, useEffect } = React;
const DE = window.__CARBON_DATA;

// =========================================================
// 1. 数据填报页
// =========================================================
function DataEntry() {
  const { orgId, org, descendants } = useOrg();
  const toast = useToast();
  const confirm = useConfirm();

  const [filters, setFilters] = useState({
    period: '',
    category: '',
    scope: '',
    status: '',
    keyword: ''
  });
  const [page, setPage] = useState(1);
  const pageSize = 10;
  // Local mutable entries (so add/edit/delete actually changes things)
  const [entries, setEntries] = useState(() => DE.ENTRIES.slice());
  const [modal, setModal] = useState(null); // { mode: 'add'|'edit'|'view', data }

  // filter entries
  const filtered = useMemo(() => {
    const inOrg = new Set(descendants);
    return entries.filter(e => {
      if (!inOrg.has(e.orgId)) return false;
      if (filters.period && e.period !== filters.period) return false;
      if (filters.category && e.categoryCode !== filters.category) return false;
      if (filters.scope && String(e.scope) !== filters.scope) return false;
      if (filters.status && e.status !== filters.status) return false;
      if (filters.keyword) {
        const k = filters.keyword.toLowerCase();
        if (!e.factorName.toLowerCase().includes(k) && !e.orgName.toLowerCase().includes(k)) return false;
      }
      return true;
    });
  }, [entries, descendants, filters]);

  const total = filtered.length;
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => { setPage(1); }, [filters, orgId]);

  const handleAdd = () => {
    setModal({
      mode: 'add',
      data: {
        id: null,
        orgId: descendants[descendants.length - 1] || orgId,
        period: DE.PERIODS[DE.PERIODS.length - 1],
        categoryCode: 'FUEL',
        factorId: '',
        quantity: '',
        unit: '',
        status: 'draft'
      }
    });
  };

  const handleSubmit = (data, validate) => {
    const errors = {};
    if (!data.orgId) errors.orgId = '请选择所属组织';
    if (!data.period) errors.period = '请选择报告期';
    if (!data.categoryCode) errors.categoryCode = '请选择排放类别';
    if (!data.factorId) errors.factorId = '请选择排放因子';
    if (data.quantity === '' || isNaN(Number(data.quantity))) errors.quantity = '请输入有效活动数据';
    else if (Number(data.quantity) <= 0) errors.quantity = '活动数据应大于 0';
    else if (Number(data.quantity) > 100000000) errors.quantity = '数值超出合理范围（异常上限 1 亿）';
    if (validate) return errors;
    if (Object.keys(errors).length) return errors;
    const f = DE.FACTORS.find(x => x.id === data.factorId);
    const org_ = DE.ORG_FLAT.find(o => o.id === data.orgId);
    const newEntry = {
      ...data,
      orgName: org_.name,
      orgCode: org_.code,
      factorName: f.name,
      factorValue: f.value,
      factorUnit: f.unit,
      unit: f.unit.split('/')[1] || '',
      scope: DE.EMISSION_CATEGORIES.find(c => c.code === f.category).scope,
      quantity: Number(data.quantity),
      emission: +(Number(data.quantity) * f.value).toFixed(2),
      source: 'manual',
      createBy: '张芷涵', createDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
      updateBy: '张芷涵', updateDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
      periodType: 'month'
    };
    if (modal.mode === 'add') {
      newEntry.id = 'E' + String(Math.floor(Math.random() * 900000) + 100000);
      setEntries(prev => [newEntry, ...prev]);
      toast.push('新增填报成功');
    } else {
      setEntries(prev => prev.map(e => e.id === newEntry.id ? newEntry : e));
      toast.push('修改填报成功');
    }
    setModal(null);
    return {};
  };

  const handleDelete = async (row) => {
    const ok = await confirm({
      title: '删除确认',
      message: <>确定删除 <b>{row.orgName}</b> 在 {row.period} 的"{row.factorName}"填报记录？删除后不可恢复。</>
    });
    if (ok) {
      setEntries(prev => prev.filter(e => e.id !== row.id));
      toast.push('已删除');
    }
  };

  const columns = [
    { key: 'orgName', title: '所属组织', minWidth: 180, render: (r) => (
      <div>
        <div>{r.orgName}</div>
        <div style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>{r.orgCode}</div>
      </div>
    )},
    { key: 'period', title: '报告期', width: 90 },
    { key: 'scope', title: '范围', width: 90, render: (r) => <ScopeTag scope={r.scope} /> },
    { key: 'categoryCode', title: '排放类别', width: 130, render: (r) => DE.EMISSION_CATEGORIES.find(c => c.code === r.categoryCode)?.name },
    { key: 'factorName', title: '排放源/因子', minWidth: 200 },
    { key: 'quantity', title: '活动数据', width: 130, align: 'right', render: (r) => <span>{fmt(r.quantity, 2)} <span style={{ color: 'var(--c-text-muted)', fontSize: 12 }}>{r.unit}</span></span> },
    { key: 'factorValue', title: '因子值', width: 120, align: 'right', render: (r) => <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>{fmt(r.factorValue, 4)}</span> },
    { key: 'emission', title: '排放量 (tCO₂e)', width: 130, align: 'right', render: (r) => <b style={{ color: 'var(--c-text-primary)' }}>{fmt(r.emission, 2)}</b> },
    { key: 'source', title: '来源', width: 80, center: 'center', align: 'center', render: (r) => <Tag>{r.source === 'manual' ? '手工' : '导入'}</Tag> },
    { key: 'status', title: '状态', width: 90, align: 'center', render: (r) => <StatusTag status={r.status} /> },
    { key: 'updateBy', title: '更新人', width: 90 },
    { key: 'actions', title: '操作', width: 160, render: (r) => (
      <div className="cc-flex gap-8">
        <Button variant="text" size="sm" onClick={() => setModal({ mode: 'view', data: r })}>查看</Button>
        <Button variant="text" size="sm" onClick={() => setModal({ mode: 'edit', data: { ...r, factorId: r.factorId } })} disabled={r.status === 'approved'}>编辑</Button>
        <Button variant="text" size="sm" danger onClick={() => handleDelete(r)} disabled={r.status === 'approved'}>删除</Button>
      </div>
    )}
  ];

  // Summary by scope from filtered
  const sum = filtered.reduce((acc, e) => {
    acc.total += e.emission;
    acc[`s${e.scope}`] += e.emission;
    return acc;
  }, { total: 0, s1: 0, s2: 0, s3: 0 });

  return (
    <>
      <PageHeader
        title="排放数据填报"
        breadcrumb={['首页', '数据填报']}
        extra={
          <>
            <Button icon="upload" onClick={() => location.hash = 'data-import'}>批量导入</Button>
            <Button icon="download">导出数据</Button>
            <Button variant="primary" icon="plus" onClick={handleAdd}>新增填报</Button>
          </>
        }
      />

      <div className="cc-alert info">
        <Icon name="info" size={14} />
        <div className="body">
          当前组织 <b>{org.name}</b>（{org.code}）及其下属 {descendants.length - 1} 个单元的填报数据 ·
          核算标准：<b>{org.standard}</b> ·
          行业：<b>{getIndustryShort(org.industry)}</b>
        </div>
      </div>

      {/* Summary strip */}
      <div className="cc-grid cols-4">
        <div className="cc-stat accent-primary"><div className="label">筛选范围内总排放</div><div><span className="value">{fmt(sum.total, 0)}</span><span className="unit">tCO₂e</span></div><div style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>共 {filtered.length} 条记录</div></div>
        <div className="cc-stat accent-1"><div className="label">范围一</div><div><span className="value">{fmt(sum.s1, 0)}</span><span className="unit">tCO₂e</span></div></div>
        <div className="cc-stat accent-2"><div className="label">范围二</div><div><span className="value">{fmt(sum.s2, 0)}</span><span className="unit">tCO₂e</span></div></div>
        <div className="cc-stat accent-3"><div className="label">范围三</div><div><span className="value">{fmt(sum.s3, 0)}</span><span className="unit">tCO₂e</span></div></div>
      </div>

      <Panel title="填报记录" flush>
        {/* Filters */}
        <div style={{ padding: 14, borderBottom: '1px solid var(--c-border-lighter)' }}>
          <div className="cc-flex gap-12 wrap align-c">
            <Select value={filters.period} onChange={(v) => setFilters({ ...filters, period: v })}
              placeholder="全部报告期" options={DE.PERIODS.map(p => ({ value: p, label: p }))}
              style={{ width: 140 }} />
            <Select value={filters.scope} onChange={(v) => setFilters({ ...filters, scope: v })}
              placeholder="全部范围" options={[{ value: '1', label: '范围一' }, { value: '2', label: '范围二' }, { value: '3', label: '范围三' }]}
              style={{ width: 130 }} />
            <Select value={filters.category} onChange={(v) => setFilters({ ...filters, category: v })}
              placeholder="全部类别"
              options={DE.EMISSION_CATEGORIES.map(c => ({ value: c.code, label: c.name }))}
              style={{ width: 150 }} />
            <Select value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })}
              placeholder="全部状态"
              options={[{ value: 'draft', label: '草稿' }, { value: 'submitted', label: '已提交' }, { value: 'approved', label: '已审核' }]}
              style={{ width: 130 }} />
            <Input value={filters.keyword} onChange={(v) => setFilters({ ...filters, keyword: v })}
              placeholder="搜索排放源 / 组织..." style={{ width: 220 }} />
            <Button onClick={() => setFilters({ period: '', category: '', scope: '', status: '', keyword: '' })}>重置</Button>
            <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--c-text-muted)' }}>
              共 {filtered.length} 条
            </div>
          </div>
        </div>
        <Table columns={columns} data={pageData} rowKey="id" emptyText="当前条件下暂无填报记录" />
        <Pagination total={total} page={page} pageSize={pageSize} onChange={setPage} />
      </Panel>

      {modal && (
        <EntryFormModal
          mode={modal.mode}
          initialData={modal.data}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
        />
      )}
    </>
  );
}

// Form modal
function EntryFormModal({ mode, initialData, onClose, onSubmit }) {
  const [data, setData] = useState({ ...initialData, quantity: initialData.quantity || '' });
  const [errors, setErrors] = useState({});
  const readonly = mode === 'view';

  const cat = data.categoryCode;
  const factor = DE.FACTORS.find(f => f.id === data.factorId);
  const org_ = DE.ORG_FLAT.find(o => o.id === data.orgId);
  // Recommended factors based on org industry + selected category
  const recommendedFactors = useMemo(() => {
    if (!cat) return [];
    const orgIndustry = org_?.industry || 'GENERAL';
    return DE.FACTORS.filter(f =>
      f.category === cat &&
      f.status === 'enabled' &&
      (f.industry === orgIndustry || f.industry === 'GENERAL')
    ).sort((a, b) => {
      // industry-specific first
      if (a.industry === orgIndustry && b.industry !== orgIndustry) return -1;
      if (b.industry === orgIndustry && a.industry !== orgIndustry) return 1;
      return 0;
    });
  }, [cat, org_?.industry]);

  const emission = (data.quantity && factor) ? Number(data.quantity) * factor.value : 0;

  const set = (k, v) => {
    setData(d => ({ ...d, [k]: v }));
    setErrors(e => ({ ...e, [k]: undefined }));
  };

  const submit = () => {
    const errs = onSubmit(data, true);
    if (errs && Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit(data, false);
  };

  const title = mode === 'add' ? '新增排放数据' : mode === 'edit' ? '编辑排放数据' : '查看排放数据';
  // Possible leaf orgs (level 4) where data is normally filled
  const orgOptions = DE.ORG_FLAT.filter(o => o.children?.length === 0 || o.level === 4 || true).map(o => ({
    value: o.id,
    label: '  '.repeat(o.level - 1) + o.name + ' (' + o.code + ')'
  }));

  return (
    <Modal open={true} title={title} onClose={onClose} width="wide"
      footer={readonly ? <Button onClick={onClose}>关闭</Button> :
        <><Button onClick={onClose}>取消</Button><Button variant="primary" onClick={submit}>{mode === 'add' ? '保存填报' : '保存修改'}</Button></>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
        <FormRow label="所属组织" required error={errors.orgId}>
          <Select value={data.orgId} onChange={(v) => set('orgId', v)} options={orgOptions}
            placeholder="选择组织单元" disabled={readonly}
            style={{ width: '100%', minWidth: 'auto' }} />
        </FormRow>
        <FormRow label="报告期" required error={errors.period}>
          <Select value={data.period} onChange={(v) => set('period', v)}
            options={DE.PERIODS.map(p => ({ value: p, label: p + ' 月度' }))}
            placeholder="选择月度" disabled={readonly}
            style={{ width: '100%', minWidth: 'auto' }} />
        </FormRow>
        <FormRow label="排放类别" required error={errors.categoryCode}>
          <Select value={data.categoryCode} onChange={(v) => {
            set('categoryCode', v);
            set('factorId', '');
          }} options={DE.EMISSION_CATEGORIES.map(c => ({ value: c.code, label: `[范围${c.scope}] ${c.name}` }))}
          disabled={readonly}
          placeholder="选择排放类别"
          style={{ width: '100%', minWidth: 'auto' }} />
        </FormRow>
        <FormRow label="排放因子" required error={errors.factorId}
          help={recommendedFactors.length > 0 && !readonly ? `根据组织行业(${getIndustryShort(org_?.industry)})自动推荐 ${recommendedFactors.length} 个适用因子` : null}>
          <Select value={data.factorId} onChange={(v) => set('factorId', v)}
            options={recommendedFactors.map(f => ({
              value: f.id,
              label: `${f.name} · ${f.value} ${f.unit}` + (f.industry !== 'GENERAL' ? ' [推荐]' : '')
            }))}
            disabled={readonly || !cat}
            placeholder={!cat ? '请先选择排放类别' : '选择排放因子'}
            style={{ width: '100%', minWidth: 'auto' }} />
        </FormRow>
        <FormRow label="活动数据" required error={errors.quantity}
          help={factor ? `数值合理性参考：行业典型范围 100 ~ 100,000 ${factor.unit.split('/')[1] || ''}` : null}>
          <Input value={data.quantity} onChange={(v) => set('quantity', v)} type="number"
            disabled={readonly} placeholder="输入活动数据"
            suffix={factor ? (factor.unit.split('/')[1] || '') : ''}
            style={{ width: '100%' }} />
        </FormRow>
        <FormRow label="状态">
          <Select value={data.status} onChange={(v) => set('status', v)}
            options={[
              { value: 'draft', label: '草稿（暂存）' },
              { value: 'submitted', label: '已提交（待审核）' }
            ]} disabled={readonly}
            style={{ width: '100%', minWidth: 'auto' }} />
        </FormRow>
      </div>

      {/* Calculation preview */}
      {factor && data.quantity && !isNaN(Number(data.quantity)) && (
        <div style={{ marginTop: 8, padding: 14, background: 'var(--c-primary-bg)', borderRadius: 6 }}>
          <div style={{ fontSize: 12, color: 'var(--c-primary)', fontWeight: 600, marginBottom: 8 }}>
            <Icon name="info" size={12} /> 计算预览（ISO 14064-1 / 行业指南公式：活动数据 × 排放因子 × GWP）
          </div>
          <div style={{ fontSize: 13, color: 'var(--c-text-regular)', fontVariantNumeric: 'tabular-nums' }}>
            {fmt(Number(data.quantity), 2)} {factor.unit.split('/')[1] || ''} ×&nbsp;
            <b>{factor.value}</b> {factor.unit}&nbsp;=&nbsp;
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--c-primary)' }}>{fmt(emission, 2)}</span>&nbsp;tCO₂e
            &nbsp;<ScopeTag scope={DE.EMISSION_CATEGORIES.find(c => c.code === factor.category)?.scope} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-text-muted)', marginTop: 6 }}>
            因子来源：{factor.source} · 版本 {factor.version} · 生效 {factor.effectiveDate}
          </div>
        </div>
      )}

      {mode === 'view' && (
        <div style={{ marginTop: 16, padding: 12, background: 'var(--c-bg-panel-muted)', borderRadius: 4, fontSize: 12, color: 'var(--c-text-muted)' }}>
          <div>创建：{data.createBy} · {data.createDate}</div>
          <div style={{ marginTop: 4 }}>最近更新：{data.updateBy} · {data.updateDate}</div>
        </div>
      )}
    </Modal>
  );
}

// =========================================================
// 2. 批量导入页
// =========================================================
function DataImport() {
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState(null);

  // Simulated file pick
  const pickFile = () => {
    setFile({
      name: '排放数据导入模板_2025Q2.xlsx',
      size: 248 * 1024,
      rows: 124
    });
    setStep(2);
  };

  const startImport = () => {
    setParsing(true);
    setTimeout(() => {
      setParsing(false);
      setResult({
        total: 124,
        success: 118,
        failed: 6,
        skipped: 0,
        errorRows: [
          { row: 12, org: 'ZL-PWR-TS01', factor: 'F099', reason: '排放因子编码不存在', col: 'F (排放因子编码)' },
          { row: 27, org: 'ZL-CHM-NJ01', factor: 'F003', reason: '活动数据非数值：「待补」', col: 'G (活动数据)' },
          { row: 43, org: 'ZL-XXX-001', factor: 'F001', reason: '组织编码 ZL-XXX-001 不存在或无权限', col: 'B (组织编码)' },
          { row: 68, org: 'ZL-STL-TS01', factor: 'F006', reason: '数值超出合理范围（>1,000,000）', col: 'G (活动数据)' },
          { row: 91, org: 'ZL-PWR-SH02', factor: 'F003', reason: '报告期格式错误：「2025/04」应为「2025-04」', col: 'E (报告期)' },
          { row: 105, org: 'ZL-CMT-WH', factor: '', reason: '必填字段「排放因子编码」为空', col: 'F (排放因子编码)' }
        ]
      });
      setStep(3);
    }, 1800);
  };

  const reset = () => { setStep(1); setFile(null); setResult(null); };

  return (
    <>
      <PageHeader title="批量数据导入" breadcrumb={['首页', '数据填报', '批量导入']}
        extra={<Button onClick={() => location.hash = 'data-entry'}>返回填报</Button>} />

      <Panel>
        <div className="cc-steps">
          <div className={'cc-step' + (step >= 1 ? ' done' : '') + (step === 1 ? ' active' : '')}>
            <div className="num">{step > 1 ? <Icon name="check" size={14} /> : '1'}</div>
            <div className="label">下载模板</div>
            <div className="line" />
          </div>
          <div className={'cc-step' + (step >= 2 ? ' done' : '') + (step === 2 ? ' active' : '')}>
            <div className="num">{step > 2 ? <Icon name="check" size={14} /> : '2'}</div>
            <div className="label">上传文件</div>
            <div className="line" />
          </div>
          <div className={'cc-step' + (step >= 3 ? ' active' : '')}>
            <div className="num">3</div>
            <div className="label">导入结果</div>
          </div>
        </div>

        {step === 1 && (
          <div>
            <div className="cc-alert" style={{ marginBottom: 16 }}>
              <Icon name="info" size={14} />
              <div className="body">
                请按模板填写排放活动数据。模板包含<b> 组织编码、报告期、排放类别、排放因子编码、活动数据、单位 </b>等必填字段。
                组织编码必须为当前用户有权限访问的组织节点。
              </div>
            </div>
            <div className="cc-grid cols-2" style={{ gap: 16 }}>
              <div style={{ padding: 20, border: '1px dashed var(--c-border)', borderRadius: 6 }}>
                <div className="cc-flex gap-12 align-c" style={{ marginBottom: 12 }}>
                  <Icon name="doc" size={32} color="var(--c-primary)" />
                  <div>
                    <div style={{ fontWeight: 600 }}>标准排放数据导入模板</div>
                    <div style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>适用 ISO 14064-1 通用结构</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--c-text-secondary)', lineHeight: 1.8, marginBottom: 12 }}>
                  字段：组织编码 · 组织完整路径 · 报告期 · 排放类别 · 排放因子编码 · 活动数据 · 数据单位 · 备注
                </div>
                <Button variant="primary" icon="download">下载通用模板</Button>
              </div>
              <div style={{ padding: 20, border: '1px dashed var(--c-border)', borderRadius: 6 }}>
                <div className="cc-flex gap-12 align-c" style={{ marginBottom: 12 }}>
                  <Icon name="doc" size={32} color="var(--c-success)" />
                  <div>
                    <div style={{ fontWeight: 600 }}>行业专用模板</div>
                    <div style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>含行业专用因子预填</div>
                  </div>
                </div>
                <Select placeholder="选择行业" options={DE.INDUSTRIES.map(i => ({ value: i.code, label: i.name }))} style={{ width: '100%', marginBottom: 12 }} />
                <Button icon="download">下载行业模板</Button>
              </div>
            </div>
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <Button variant="primary" size="lg" onClick={() => setStep(2)}>已下载模板，下一步</Button>
            </div>
          </div>
        )}

        {step === 2 && !parsing && (
          <div>
            {!file ? (
              <div onClick={pickFile} style={{
                padding: 60, border: '2px dashed var(--c-border)', borderRadius: 8,
                textAlign: 'center', cursor: 'pointer', background: 'var(--c-bg-panel-muted)'
              }}>
                <Icon name="upload" size={48} color="var(--c-text-placeholder)" />
                <div style={{ fontSize: 16, marginTop: 12, color: 'var(--c-text-regular)' }}>
                  点击或拖拽文件到此处上传
                </div>
                <div style={{ fontSize: 12, color: 'var(--c-text-muted)', marginTop: 4 }}>
                  支持 .xlsx, .xls, .csv 格式 · 单文件不超过 10MB · 单次最多 5000 行
                </div>
                <Button variant="primary" style={{ marginTop: 20 }}>选择文件</Button>
              </div>
            ) : (
              <div>
                <Panel title="待导入文件" accent={false} style={{ background: 'var(--c-bg-panel-muted)' }}>
                  <div className="cc-flex gap-16 align-c">
                    <Icon name="doc" size={36} color="var(--c-primary)" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{file.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--c-text-muted)', marginTop: 4 }}>
                        {(file.size / 1024).toFixed(1)} KB · 检测到 {file.rows} 行数据
                      </div>
                    </div>
                    <Button onClick={() => setFile(null)}>重新选择</Button>
                  </div>
                </Panel>
                <div style={{ marginTop: 16 }}>
                  <Panel title="导入选项" accent={false}>
                    <FormRow label="冲突处理">
                      <Select value="skip" options={[
                        { value: 'skip', label: '跳过已存在的记录' },
                        { value: 'update', label: '更新已存在的记录' },
                        { value: 'error', label: '存在记录时报错' }
                      ]} style={{ width: 240 }} />
                    </FormRow>
                    <FormRow label="导入后状态">
                      <Select value="submitted" options={[
                        { value: 'draft', label: '草稿（不进入审核）' },
                        { value: 'submitted', label: '已提交（进入审核流程）' }
                      ]} style={{ width: 240 }} />
                    </FormRow>
                    <FormRow label="行级校验">
                      <label className="cc-flex gap-8 align-c"><input type="checkbox" defaultChecked /> 数值合理性校验</label>
                      <div className="cc-form-help">超出行业典型范围 10x 的数值将被标记</div>
                    </FormRow>
                  </Panel>
                </div>
                <div style={{ marginTop: 20, textAlign: 'right' }}>
                  <Button onClick={() => setStep(1)} style={{ marginRight: 8 }}>上一步</Button>
                  <Button variant="primary" size="lg" onClick={startImport}>开始导入</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && parsing && (
          <div style={{ padding: 80, textAlign: 'center' }}>
            <div className="cc-spinner" style={{ width: 40, height: 40, borderWidth: 4 }} />
            <div style={{ marginTop: 16, fontSize: 14, color: 'var(--c-text-secondary)' }}>
              正在解析与校验数据（{file?.rows} 行）...
            </div>
          </div>
        )}

        {step === 3 && result && (
          <div>
            <div className="cc-grid cols-4" style={{ marginBottom: 16 }}>
              <div className="cc-stat accent-primary"><div className="label">总行数</div><div><span className="value">{result.total}</span></div></div>
              <div className="cc-stat" style={{ borderTop: '2px solid var(--c-success)' }}><div className="label" style={{ color: 'var(--c-success)' }}>成功导入</div><div><span className="value">{result.success}</span></div></div>
              <div className="cc-stat" style={{ borderTop: '2px solid var(--c-danger)' }}><div className="label" style={{ color: 'var(--c-danger)' }}>失败行数</div><div><span className="value">{result.failed}</span></div></div>
              <div className="cc-stat"><div className="label">跳过</div><div><span className="value">{result.skipped}</span></div></div>
            </div>

            {result.failed > 0 && (
              <Panel title={`错误明细（${result.failed} 条）`}
                extra={<Button icon="download" size="sm">下载错误报告 (.xlsx)</Button>}>
                <Table columns={[
                  { key: 'row', title: '行号', width: 70, align: 'center', render: (r) => <b style={{ color: 'var(--c-danger)' }}>第 {r.row} 行</b> },
                  { key: 'org', title: '组织编码', width: 130 },
                  { key: 'factor', title: '因子编码', width: 110 },
                  { key: 'col', title: '错误列', width: 180 },
                  { key: 'reason', title: '错误原因' }
                ]} data={result.errorRows} rowKey="row" />
              </Panel>
            )}

            {result.success > 0 && (
              <div className="cc-alert" style={{ marginTop: 16 }}>
                <Icon name="check" size={14} />
                <div className="body">
                  成功导入 <b>{result.success}</b> 条记录，均归属到对应组织节点，操作日志已记录。
                  您可以前往 <a onClick={() => location.hash = 'data-entry'} style={{ cursor: 'pointer' }}>填报记录</a> 查看，或对失败行修正后重新导入。
                </div>
              </div>
            )}

            <div style={{ marginTop: 20, textAlign: 'right' }}>
              <Button onClick={reset} style={{ marginRight: 8 }}>重新导入</Button>
              <Button variant="primary" onClick={() => location.hash = 'data-entry'}>查看填报记录</Button>
            </div>
          </div>
        )}
      </Panel>
    </>
  );
}

window.DataEntry = DataEntry;
window.DataImport = DataImport;
