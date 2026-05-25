// 排放因子库 + 组织管理
const { useState, useMemo } = React;
const DF = window.__CARBON_DATA;

// =========================================================
// 1. 排放因子库
// =========================================================
function FactorLibrary() {
  const toast = useToast();
  const confirm = useConfirm();
  const [factors, setFactors] = useState(() => DF.FACTORS.slice());
  const [filters, setFilters] = useState({ industry: '', category: '', standard: '', status: '', keyword: '' });
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [modal, setModal] = useState(null); // {mode, data}
  const [historyOf, setHistoryOf] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  const filtered = useMemo(() => {
    return factors.filter(f => {
      if (filters.industry && f.industry !== filters.industry) return false;
      if (filters.category && f.category !== filters.category) return false;
      if (filters.standard && f.standard !== filters.standard) return false;
      if (filters.status && f.status !== filters.status) return false;
      if (filters.keyword) {
        const k = filters.keyword.toLowerCase();
        if (!f.name.toLowerCase().includes(k) && !f.source.toLowerCase().includes(k) && !f.id.toLowerCase().includes(k)) return false;
      }
      return true;
    });
  }, [factors, filters]);
  const total = filtered.length;
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleSubmit = (data) => {
    if (modal.mode === 'add') {
      const id = 'F' + String(factors.length + 100).padStart(3, '0');
      setFactors(prev => [{ ...data, id, status: 'enabled' }, ...prev]);
      toast.push('因子已添加');
    } else {
      setFactors(prev => prev.map(f => f.id === data.id ? { ...f, ...data } : f));
      toast.push('因子已更新');
    }
    setModal(null);
  };

  const toggleStatus = (row) => {
    setFactors(prev => prev.map(f => f.id === row.id ? { ...f, status: f.status === 'enabled' ? 'disabled' : 'enabled' } : f));
    toast.push(row.status === 'enabled' ? '因子已停用' : '因子已启用');
  };

  const handleDelete = async (row) => {
    const ok = await confirm({ title: '删除因子', message: <>确定删除排放因子 <b>{row.name}</b>？删除前请确保无填报数据引用。</> });
    if (ok) {
      setFactors(prev => prev.filter(f => f.id !== row.id));
      toast.push('已删除');
    }
  };

  const columns = [
    { key: 'id', title: '因子编码', width: 80 },
    { key: 'name', title: '因子名称', minWidth: 220, render: (r) => (
      <div>
        <div>{r.name}</div>
        <div style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>{r.source}</div>
      </div>
    )},
    { key: 'category', title: '排放类别', width: 110, render: (r) => DF.EMISSION_CATEGORIES.find(c => c.code === r.category)?.name },
    { key: 'industry', title: '适用行业', width: 110, render: (r) => (
      <Tag variant={r.scope === 'industry' ? 'primary' : ''}>
        {DF.INDUSTRIES.find(i => i.code === r.industry)?.name}
      </Tag>
    )},
    { key: 'value', title: '因子值', width: 100, align: 'right', render: (r) => <b style={{ fontVariantNumeric: 'tabular-nums' }}>{r.value}</b> },
    { key: 'unit', title: '单位', width: 130, render: (r) => <span style={{ fontSize: 12, color: 'var(--c-text-secondary)' }}>{r.unit}</span> },
    { key: 'standard', title: '核算标准', width: 90, align: 'center', render: (r) => <Tag variant={r.standard === 'CHINA' ? 'warning' : 'primary'}>{r.standard === 'CHINA' ? '国家指南' : 'ISO 14064'}</Tag> },
    { key: 'version', title: '版本', width: 90, render: (r) => <span style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{r.version}</span> },
    { key: 'effectiveDate', title: '生效日期', width: 100, render: (r) => <span style={{ fontSize: 12 }}>{r.effectiveDate}</span> },
    { key: 'status', title: '状态', width: 80, align: 'center', render: (r) => <StatusTag status={r.status} /> },
    { key: 'actions', title: '操作', width: 220, render: (r) => (
      <div className="cc-flex gap-8">
        <Button variant="text" size="sm" onClick={() => setModal({ mode: 'view', data: r })}>查看</Button>
        <Button variant="text" size="sm" onClick={() => setHistoryOf(r)}>历史版本</Button>
        <Button variant="text" size="sm" onClick={() => setModal({ mode: 'edit', data: r })}>编辑</Button>
        <Button variant="text" size="sm" onClick={() => toggleStatus(r)}>{r.status === 'enabled' ? '停用' : '启用'}</Button>
      </div>
    )}
  ];

  return (
    <>
      <PageHeader title="排放因子库" breadcrumb={['首页', '配置中心', '排放因子库']}
        extra={
          <>
            <Button icon="upload" onClick={() => setImportOpen(true)}>批量导入因子</Button>
            <Button icon="download">导出因子库</Button>
            <Button variant="primary" icon="plus" onClick={() => setModal({ mode: 'add', data: { name: '', category: 'FUEL', industry: 'GENERAL', value: '', unit: '', source: '', effectiveDate: new Date().toISOString().slice(0, 10), version: 'v1.0', standard: 'ISO', scope: 'general' } })}>新增因子</Button>
          </>
        } />

      <div className="cc-grid cols-4">
        <div className="cc-stat accent-primary"><div className="label">因子总数</div><div><span className="value">{factors.length}</span><span className="unit">条</span></div></div>
        <div className="cc-stat"><div className="label">国家行业指南因子</div><div><span className="value">{factors.filter(f => f.standard === 'CHINA').length}</span><span className="unit">条</span></div></div>
        <div className="cc-stat"><div className="label">ISO 14064 通用因子</div><div><span className="value">{factors.filter(f => f.standard === 'ISO').length}</span><span className="unit">条</span></div></div>
        <div className="cc-stat"><div className="label">已停用</div><div><span className="value">{factors.filter(f => f.status === 'disabled').length}</span><span className="unit">条</span></div></div>
      </div>

      <Panel title="因子清单" flush>
        <div style={{ padding: 14, borderBottom: '1px solid var(--c-border-lighter)' }}>
          <div className="cc-flex gap-12 wrap align-c">
            <Select value={filters.industry} onChange={(v) => setFilters({ ...filters, industry: v })}
              placeholder="全部行业"
              options={DF.INDUSTRIES.map(i => ({ value: i.code, label: i.name }))}
              style={{ width: 160 }} />
            <Select value={filters.category} onChange={(v) => setFilters({ ...filters, category: v })}
              placeholder="全部类别"
              options={DF.EMISSION_CATEGORIES.map(c => ({ value: c.code, label: c.name }))}
              style={{ width: 150 }} />
            <Select value={filters.standard} onChange={(v) => setFilters({ ...filters, standard: v })}
              placeholder="全部标准"
              options={[{ value: 'CHINA', label: '国家行业指南' }, { value: 'ISO', label: 'ISO 14064-1' }]}
              style={{ width: 140 }} />
            <Select value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })}
              placeholder="全部状态"
              options={[{ value: 'enabled', label: '启用' }, { value: 'disabled', label: '停用' }]}
              style={{ width: 120 }} />
            <Input value={filters.keyword} onChange={(v) => setFilters({ ...filters, keyword: v })}
              placeholder="搜索因子名称/编码..." style={{ width: 220 }} />
            <Button onClick={() => setFilters({ industry: '', category: '', standard: '', status: '', keyword: '' })}>重置</Button>
            <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--c-text-muted)' }}>共 {filtered.length} 条</div>
          </div>
        </div>
        <Table columns={columns} data={pageData} rowKey="id" />
        <Pagination total={total} page={page} pageSize={pageSize} onChange={setPage} />
      </Panel>

      {modal && <FactorForm mode={modal.mode} initialData={modal.data} onClose={() => setModal(null)} onSubmit={handleSubmit} />}
      {historyOf && <FactorHistory factor={historyOf} onClose={() => setHistoryOf(null)} />}
      {importOpen && <FactorImport onClose={() => setImportOpen(false)} onDone={() => { setImportOpen(false); toast.push('成功导入 8 条因子'); }} />}
    </>
  );
}

function FactorForm({ mode, initialData, onClose, onSubmit }) {
  const [data, setData] = useState(initialData);
  const [errors, setErrors] = useState({});
  const readonly = mode === 'view';
  const set = (k, v) => { setData(d => ({ ...d, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })); };
  const submit = () => {
    const errs = {};
    if (!data.name) errs.name = '请输入因子名称';
    if (!data.value || isNaN(Number(data.value)) || Number(data.value) <= 0) errs.value = '请输入有效因子值';
    if (!data.unit) errs.unit = '请输入单位';
    if (!data.source) errs.source = '请填写数据来源';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit({ ...data, value: Number(data.value) });
  };
  const title = mode === 'add' ? '新增排放因子' : mode === 'edit' ? '编辑排放因子' : '查看排放因子';

  return (
    <Modal open={true} title={title} onClose={onClose} width="wide"
      footer={readonly ? <Button onClick={onClose}>关闭</Button> :
        <><Button onClick={onClose}>取消</Button><Button variant="primary" onClick={submit}>保存</Button></>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
        <FormRow label="因子名称" required error={errors.name}>
          <Input value={data.name} onChange={(v) => set('name', v)} disabled={readonly} style={{ width: '100%' }} />
        </FormRow>
        <FormRow label="排放类别" required>
          <Select value={data.category} onChange={(v) => set('category', v)}
            options={DF.EMISSION_CATEGORIES.map(c => ({ value: c.code, label: `[范围${c.scope}] ${c.name}` }))}
            disabled={readonly} style={{ width: '100%', minWidth: 'auto' }} />
        </FormRow>
        <FormRow label="因子值" required error={errors.value}>
          <Input value={data.value} onChange={(v) => set('value', v)} type="number" disabled={readonly} style={{ width: '100%' }} />
        </FormRow>
        <FormRow label="单位" required error={errors.unit} help="例如：tCO2e/t、tCO2e/MWh、tCO2e/万Nm³">
          <Input value={data.unit} onChange={(v) => set('unit', v)} disabled={readonly} style={{ width: '100%' }} />
        </FormRow>
        <FormRow label="核算标准" required>
          <Select value={data.standard} onChange={(v) => set('standard', v)}
            options={[
              { value: 'ISO', label: 'ISO 14064-1:2018' },
              { value: 'CHINA', label: '国家行业指南' }
            ]} disabled={readonly} style={{ width: '100%', minWidth: 'auto' }} />
        </FormRow>
        <FormRow label="适用行业" required help="选择「通用」时所有行业可用；否则仅匹配行业自动推荐">
          <Select value={data.industry} onChange={(v) => set('industry', v)}
            options={DF.INDUSTRIES.map(i => ({ value: i.code, label: i.name }))}
            disabled={readonly} style={{ width: '100%', minWidth: 'auto' }} />
        </FormRow>
        <FormRow label="适用范围">
          <Select value={data.scope} onChange={(v) => set('scope', v)}
            options={[{ value: 'general', label: '通用因子' }, { value: 'industry', label: '行业专用' }]}
            disabled={readonly} style={{ width: '100%', minWidth: 'auto' }} />
        </FormRow>
        <FormRow label="版本号" required>
          <Input value={data.version} onChange={(v) => set('version', v)} disabled={readonly} style={{ width: '100%' }} />
        </FormRow>
        <FormRow label="生效日期" required>
          <Input value={data.effectiveDate} onChange={(v) => set('effectiveDate', v)} type="date" disabled={readonly} style={{ width: '100%' }} />
        </FormRow>
        <FormRow label="数据来源" required error={errors.source}>
          <Input value={data.source} onChange={(v) => set('source', v)} disabled={readonly}
            placeholder="例：《中国发电企业温室气体排放核算方法与报告指南》"
            style={{ width: '100%' }} />
        </FormRow>
      </div>
      {readonly && (
        <div style={{ marginTop: 12, padding: 12, background: 'var(--c-bg-panel-muted)', borderRadius: 4, fontSize: 12 }}>
          <div style={{ color: 'var(--c-text-secondary)' }}>因子编码：<b>{data.id}</b></div>
        </div>
      )}
    </Modal>
  );
}

function FactorHistory({ factor, onClose }) {
  // Simulated history
  const versions = [
    { version: factor.version, value: factor.value, effectiveDate: factor.effectiveDate, source: factor.source, status: '当前生效', updateBy: '陈彦霖', updateDate: factor.effectiveDate + ' 09:24' },
    { version: 'v2023.1', value: +(factor.value * 1.06).toFixed(4), effectiveDate: '2023-04-01', source: '生态环境部 2023 年度', status: '已停用', updateBy: '陈彦霖', updateDate: '2023-04-01 10:15' },
    { version: 'v2022.1', value: +(factor.value * 1.12).toFixed(4), effectiveDate: '2022-04-01', source: '生态环境部 2022 年度', status: '已停用', updateBy: '李铭哲', updateDate: '2022-04-15 14:08' },
    { version: 'v2021.1', value: +(factor.value * 1.18).toFixed(4), effectiveDate: '2021-04-01', source: '生态环境部 2021 年度', status: '已停用', updateBy: '李铭哲', updateDate: '2021-05-08 11:36' }
  ];
  return (
    <Modal open={true} title={`版本历史 - ${factor.name}`} onClose={onClose} width="wide"
      footer={<Button onClick={onClose}>关闭</Button>}>
      <div className="cc-alert info" style={{ marginBottom: 12 }}>
        <Icon name="info" size={14} />
        <div className="body">同一因子可有多版本。系统在数据填报与计算时，自动根据报告期匹配生效版本。</div>
      </div>
      <Table columns={[
        { key: 'version', title: '版本号', width: 110, render: (r) => <b style={{ fontVariantNumeric: 'tabular-nums' }}>{r.version}</b> },
        { key: 'value', title: '因子值', width: 110, align: 'right' },
        { key: 'effectiveDate', title: '生效日期', width: 110 },
        { key: 'source', title: '数据来源' },
        { key: 'status', title: '状态', width: 90, align: 'center', render: (r) => <Tag variant={r.status === '当前生效' ? 'success' : ''} dot>{r.status}</Tag> },
        { key: 'updateBy', title: '操作人', width: 90 },
        { key: 'updateDate', title: '更新时间', width: 150 }
      ]} data={versions} rowKey="version" />
    </Modal>
  );
}

function FactorImport({ onClose, onDone }) {
  return (
    <Modal open={true} title="批量导入排放因子" onClose={onClose} onOk={onDone} okText="开始导入" width="wide">
      <div className="cc-alert info" style={{ marginBottom: 16 }}>
        <Icon name="info" size={14} />
        <div className="body">支持 .xlsx / .csv 格式。模板字段：因子名称、排放类别、因子值、单位、数据来源、生效日期、版本号、适用行业、核算标准。</div>
      </div>
      <div className="cc-flex gap-12" style={{ marginBottom: 16 }}>
        <Button icon="download" size="sm">下载因子导入模板</Button>
      </div>
      <div style={{ padding: 40, border: '2px dashed var(--c-border)', borderRadius: 6, textAlign: 'center', background: 'var(--c-bg-panel-muted)' }}>
        <Icon name="upload" size={36} color="var(--c-text-placeholder)" />
        <div style={{ marginTop: 10, color: 'var(--c-text-secondary)' }}>点击或拖拽因子库文件到此处</div>
        <Button variant="primary" style={{ marginTop: 12 }}>选择文件</Button>
      </div>
    </Modal>
  );
}

// =========================================================
// 2. 组织管理
// =========================================================
function Organization() {
  const toast = useToast();
  const { orgId, setOrgId } = useOrg();
  const confirm = useConfirm();
  const [tree, setTree] = useState(DF.ORG_TREE);
  const [selectedId, setSelectedId] = useState(orgId);
  const [modal, setModal] = useState(null);

  const flat = useMemo(() => {
    const out = [];
    const walk = (n, parent) => {
      out.push({ ...n, parentId: parent?.id || null, parentName: parent?.name || null });
      (n.children || []).forEach(c => walk(c, n));
    };
    walk(tree, null);
    return out;
  }, [tree]);

  const selected = flat.find(o => o.id === selectedId) || flat[0];
  const children = flat.filter(o => o.parentId === selected.id);

  // Aggregate emissions for selected
  const agg = DF.aggregate(selected.id);

  const handleAddChild = () => {
    setModal({ mode: 'add', data: {
      name: '', code: 'ZL-', level: (selected.level || 0) + 1,
      industry: selected.industry, address: '', employees: 0,
      standard: selected.standard, parentId: selected.id
    }});
  };

  const handleSubmit = (data) => {
    // Helper to immutably update tree
    const updateNode = (node) => {
      if (modal.mode === 'edit' && node.id === data.id) {
        return { ...node, ...data, children: node.children || [] };
      }
      if (modal.mode === 'add' && node.id === data.parentId) {
        const newChild = { ...data, id: 'org-new-' + Date.now(), children: [] };
        return { ...node, children: [...(node.children || []), newChild] };
      }
      return { ...node, children: (node.children || []).map(updateNode) };
    };
    setTree(updateNode(tree));
    toast.push(modal.mode === 'add' ? '新增组织成功' : '编辑组织成功');
    setModal(null);
  };

  const handleDelete = async (node) => {
    const ok = await confirm({ title: '删除组织', message: <>确定删除 <b>{node.name}</b>？删除组织将同时移除其下级组织和所有关联填报数据。</> });
    if (!ok) return;
    const removeNode = (n) => ({
      ...n,
      children: (n.children || []).filter(c => c.id !== node.id).map(removeNode)
    });
    setTree(removeNode(tree));
    toast.push('已删除');
    if (selectedId === node.id) setSelectedId(tree.id);
  };

  return (
    <>
      <PageHeader title="组织架构管理" breadcrumb={['首页', '配置中心', '组织架构']}
        extra={<Button variant="primary" icon="plus" onClick={handleAddChild}>新增子组织</Button>} />

      <div className="cc-grid" style={{ gridTemplateColumns: '320px 1fr' }}>
        <Panel title="组织树" flush extra={<Button size="sm" variant="text" icon="refresh">展开全部</Button>}>
          <div style={{ padding: 12, maxHeight: 720, overflow: 'auto' }}>
            <Tree data={tree} activeId={selectedId} onSelect={(n) => setSelectedId(n.id)} />
          </div>
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--c-border-lighter)', fontSize: 12, color: 'var(--c-text-muted)' }}>
            共 {flat.length} 个组织节点 · {flat.filter(o => o.level === 4).length} 个末级单元
          </div>
        </Panel>

        <div className="cc-flex" style={{ flexDirection: 'column', gap: 12 }}>
          <Panel title={selected.name + ' · 组织详情'}
            extra={
              <div className="cc-flex gap-8">
                <Button size="sm" onClick={() => { setOrgId(selected.id); toast.push('已切换至 ' + selected.name); }}>切换为当前组织</Button>
                <Button size="sm" icon="edit" onClick={() => setModal({ mode: 'edit', data: selected })}>编辑</Button>
                {selected.level > 1 && <Button size="sm" danger variant="text" icon="delete" onClick={() => handleDelete(selected)}>删除</Button>}
              </div>
            }>
            <div className="cc-grid cols-2" style={{ gap: '12px 24px' }}>
              {[
                ['组织编码', selected.code],
                ['组织层级', `${selected.level} 级（${['集团', '板块', '子公司', '厂区'][selected.level - 1]}）`],
                ['所属行业', DF.INDUSTRIES.find(i => i.code === selected.industry)?.name],
                ['上级组织', selected.parentName || '—'],
                ['核算标准', selected.standard],
                ['员工总数', `${fmt(selected.employees, 0)} 人`],
                ['注册地址', selected.address],
                ['末级单元数', flat.filter(o => o.level === 4 && DF.getDescendants(selected.id).includes(o.id)).length + ' 个']
              ].map(([k, v], i) => (
                <div key={i} className="cc-flex" style={{ borderBottom: '1px dashed var(--c-border-lighter)', padding: '8px 0' }}>
                  <span style={{ width: 110, color: 'var(--c-text-muted)', fontSize: 13 }}>{k}</span>
                  <span style={{ flex: 1, color: 'var(--c-text-primary)', fontSize: 13 }}>{v}</span>
                </div>
              ))}
            </div>
          </Panel>

          <div className="cc-grid cols-3">
            <div className="cc-stat accent-primary"><div className="label">本组织（含下属）年度排放</div><div><span className="value">{fmt(agg.total, 0)}</span><span className="unit">tCO₂e</span></div></div>
            <div className="cc-stat accent-1"><div className="label">范围一</div><div><span className="value">{fmt(agg.byScope[1], 0)}</span><span className="unit">tCO₂e</span></div></div>
            <div className="cc-stat accent-2"><div className="label">范围二 + 三</div><div><span className="value">{fmt((agg.byScope[2] || 0) + (agg.byScope[3] || 0), 0)}</span><span className="unit">tCO₂e</span></div></div>
          </div>

          <Panel title="下级组织" flush>
            {children.length === 0 ? (
              <div className="cc-empty">
                <Icon name="leaf" size={32} />
                <div>该组织为末级单元，无下级</div>
                {selected.level < 4 && <Button variant="primary" size="sm" icon="plus" onClick={handleAddChild}>新增下级</Button>}
              </div>
            ) : (
              <Table columns={[
                { key: 'name', title: '组织名称', render: (r) => (
                  <a onClick={() => setSelectedId(r.id)} style={{ cursor: 'pointer' }}>{r.name}</a>
                )},
                { key: 'code', title: '编码', width: 130 },
                { key: 'industry', title: '行业', width: 110, render: (r) => DF.INDUSTRIES.find(i => i.code === r.industry)?.name },
                { key: 'employees', title: '员工', width: 80, align: 'right' },
                { key: 'emission', title: '年度排放 (tCO₂e)', width: 170, align: 'right', render: (r) => {
                  const a = DF.aggregate(r.id);
                  return <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(a.total, 0)}</span>;
                }},
                { key: 'actions', title: '操作', width: 180, render: (r) => (
                  <div className="cc-flex gap-8">
                    <Button variant="text" size="sm" onClick={() => setSelectedId(r.id)}>详情</Button>
                    <Button variant="text" size="sm" onClick={() => setModal({ mode: 'edit', data: r })}>编辑</Button>
                    <Button variant="text" size="sm" danger onClick={() => handleDelete(r)}>删除</Button>
                  </div>
                )}
              ]} data={children} rowKey="id" />
            )}
          </Panel>
        </div>
      </div>

      {modal && <OrgForm mode={modal.mode} initialData={modal.data} onClose={() => setModal(null)} onSubmit={handleSubmit} />}
    </>
  );
}

function OrgForm({ mode, initialData, onClose, onSubmit }) {
  const [data, setData] = useState(initialData);
  const [errors, setErrors] = useState({});
  const set = (k, v) => { setData(d => ({ ...d, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })); };
  const submit = () => {
    const errs = {};
    if (!data.name) errs.name = '请输入组织名称';
    if (!data.code) errs.code = '请输入组织编码';
    else if (!/^[A-Za-z0-9-]+$/.test(data.code)) errs.code = '编码仅允许字母数字和短横线';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit({ ...data, employees: Number(data.employees) || 0 });
  };
  const levelName = ['集团', '板块', '子公司', '厂区'][data.level - 1] || '组织';
  return (
    <Modal open={true} title={(mode === 'add' ? '新增' : '编辑') + levelName + '组织'} onClose={onClose} width="wide"
      footer={<><Button onClick={onClose}>取消</Button><Button variant="primary" onClick={submit}>保存</Button></>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
        <FormRow label="组织名称" required error={errors.name}>
          <Input value={data.name} onChange={(v) => set('name', v)} style={{ width: '100%' }} />
        </FormRow>
        <FormRow label="组织编码" required error={errors.code} help="同租户下唯一">
          <Input value={data.code} onChange={(v) => set('code', v)} style={{ width: '100%' }} />
        </FormRow>
        <FormRow label="组织层级">
          <Input value={`${data.level} 级 (${levelName})`} disabled style={{ width: '100%' }} />
        </FormRow>
        <FormRow label="所属行业" required>
          <Select value={data.industry} onChange={(v) => set('industry', v)}
            options={DF.INDUSTRIES.map(i => ({ value: i.code, label: i.name }))} style={{ width: '100%', minWidth: 'auto' }} />
        </FormRow>
        <FormRow label="核算标准" required>
          <Input value={data.standard} onChange={(v) => set('standard', v)} style={{ width: '100%' }} />
        </FormRow>
        <FormRow label="员工总数">
          <Input value={data.employees} onChange={(v) => set('employees', v)} type="number" style={{ width: '100%' }} />
        </FormRow>
        <div style={{ gridColumn: '1 / -1' }}>
          <FormRow label="注册地址">
            <Input value={data.address} onChange={(v) => set('address', v)} style={{ width: '100%' }} />
          </FormRow>
        </div>
      </div>
    </Modal>
  );
}

window.FactorLibrary = FactorLibrary;
window.Organization = Organization;
