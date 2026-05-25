import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrg } from '@/contexts/OrgContext';
import { fetchEntries, fetchEntrySummary, createEntry, updateEntry, deleteEntry, submitEntry, approveEntry } from '@/api/entries';
import { fetchRecommendedFactors } from '@/api/factors';
import {
  PageHeader, Panel, Button, Select, Input, Table, Pagination,
  Modal, FormRow, StatusTag, ScopeTag, fmt, useToast, useConfirm,
} from '@/components/ui';

const SCOPE_OF_CATEGORY: Record<string, number> = {
  FUEL: 1, PROCESS: 1, FUGITIVE: 1, ELEC: 2, HEAT: 2,
  TRANSPORT: 3, WASTE: 3, BUSINESS: 3,
};

const CATEGORY_LABELS: Record<string, string> = {
  FUEL: '化石燃料燃烧', PROCESS: '工业过程', FUGITIVE: '逸散排放',
  ELEC: '净购入电力', HEAT: '净购入热力',
  TRANSPORT: '上下游运输', WASTE: '废弃物处理', BUSINESS: '差旅通勤',
};

const SOURCE_LABELS: Record<string, string> = { manual: '手工', import: '导入' };

export default function DataEntry() {
  const { orgId, currentOrg, flat } = useOrg();
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();

  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('');
  const [filterScope, setFilterScope] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [keyword, setKeyword] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<any>({});

  const filters: any = {};
  if (filterStatus) filters.status = filterStatus;
  if (filterPeriod) filters.period = filterPeriod;
  if (filterScope) filters.scope = filterScope;
  if (filterCategory) filters.category = filterCategory;
  if (keyword) filters.keyword = keyword;

  const { data, isLoading } = useQuery({
    queryKey: ['entries', orgId, page, filters],
    queryFn: () => fetchEntries({ orgId, includeDescendants: 'true', page, pageSize: 10, ...filters }),
    enabled: !!orgId,
  });

  const { data: summary } = useQuery({
    queryKey: ['entry-summary', orgId, filters],
    queryFn: () => fetchEntrySummary({ orgId, includeDescendants: 'true', ...filters }),
    enabled: !!orgId,
  });

  const { data: factors } = useQuery({
    queryKey: ['factors-recommended', orgId, currentOrg?.industryCode],
    queryFn: () => fetchRecommendedFactors({ orgId, industryCode: currentOrg?.industryCode }),
    enabled: !!orgId,
  });

  const saveMut = useMutation({
    mutationFn: (body: any) => form.id ? updateEntry(form.id, body) : createEntry(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries'] });
      qc.invalidateQueries({ queryKey: ['entry-summary'] });
      setModalOpen(false);
      toast.push(form.id ? '更新成功' : '新增成功');
    },
    onError: (e: any) => toast.push(e.message || '保存失败', 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteEntry,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['entries'] }); qc.invalidateQueries({ queryKey: ['entry-summary'] }); toast.push('已删除'); },
    onError: (e: any) => toast.push(e.message || '删除失败', 'error'),
  });

  const submitMut = useMutation({
    mutationFn: submitEntry,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['entries'] }); toast.push('已提交审核'); },
  });

  const approveMut = useMutation({
    mutationFn: approveEntry,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['entries'] }); toast.push('审核通过'); },
  });

  const openCreate = () => {
    setForm({ orgId: orgId, period: new Date().toISOString().slice(0, 7), quantity: '', factorId: '', remark: '' });
    setModalOpen(true);
  };

  const openEdit = (entry: any) => {
    setForm(entry);
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.orgId) { toast.push('请选择所属组织', 'warning'); return; }
    if (!form.factorId) { toast.push('请选择排放因子', 'warning'); return; }
    if (!form.quantity) { toast.push('请填写活动数据', 'warning'); return; }
    saveMut.mutate({
      orgId: form.orgId,
      period: form.period,
      factorId: form.factorId,
      quantity: parseFloat(form.quantity),
      remark: form.remark || '',
      status: 'draft',
    });
  };

  const handleDelete = async (entry: any) => {
    const ok = await confirm({ title: '确认删除', message: `确定删除该条填报记录？此操作不可恢复。` });
    if (ok) deleteMut.mutate(entry.id);
  };

  const resetFilters = () => {
    setFilterStatus(''); setFilterPeriod(''); setFilterScope(''); setFilterCategory(''); setKeyword(''); setPage(1);
  };

  const selectedFactor = (factors as any[])?.find((f: any) => f.id === form.factorId);
  const previewEmission = selectedFactor && form.quantity
    ? parseFloat(form.quantity) * selectedFactor.value
    : null;

  const listData: any[] = (data as any)?.list || [];
  const total: number = (data as any)?.total || 0;
  const sumData: any = summary || { total: 0, byScope: { 1: 0, 2: 0, 3: 0 }, count: 0 };

  const descendantCount = flat.length || 0;

  const columns = [
    {
      key: 'orgName', title: '所属组织', minWidth: 130,
      render: (r: any) => (
        <div>
          <div style={{ fontWeight: 500, fontSize: 13 }}>{r.orgName}</div>
          <div style={{ fontSize: 11, color: 'var(--c-text-muted)', fontFamily: 'monospace' }}>{r.orgCode}</div>
        </div>
      ),
    },
    { key: 'period', title: '报告期', width: 85 },
    {
      key: 'scope', title: '范围', width: 72, align: 'center' as const,
      render: (r: any) => <ScopeTag scope={r.scope || SCOPE_OF_CATEGORY[r.categoryCode] || 0} />,
    },
    {
      key: 'categoryCode', title: '排放类别', width: 110,
      render: (r: any) => CATEGORY_LABELS[r.categoryCode] || r.categoryCode,
    },
    {
      key: 'factorName', title: '排放源', minWidth: 140,
      render: (r: any) => <span style={{ fontSize: 13 }}>{r.factorName || r.factorId}</span>,
    },
    {
      key: 'quantity', title: '活动数据', width: 120, align: 'right' as const,
      render: (r: any) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(r.quantity, 2)} <span style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>{r.unit || ''}</span></span>,
    },
    {
      key: 'factorValue', title: '因子值', width: 100, align: 'right' as const,
      render: (r: any) => <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12, color: 'var(--c-text-secondary)' }}>{r.factorValue}</span>,
    },
    {
      key: 'emission', title: '排放量 (tCO₂e)', width: 130, align: 'right' as const,
      render: (r: any) => <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(r.emission, 2)}</strong>,
    },
    {
      key: 'source', title: '来源', width: 60, align: 'center' as const,
      render: (r: any) => <span style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>{SOURCE_LABELS[r.source] || r.source}</span>,
    },
    { key: 'status', title: '状态', width: 80, align: 'center' as const, render: (r: any) => <StatusTag status={r.status} /> },
    {
      key: 'updateBy', title: '更新人', width: 80,
      render: (r: any) => <span style={{ fontSize: 12 }}>{r.updateBy || r.updatedBy || '—'}</span>,
    },
    {
      key: 'actions', title: '操作', width: 150,
      render: (r: any) => (
        <div className="cc-flex gap-4">
          {r.status === 'draft' && (
            <>
              <Button size="sm" onClick={() => openEdit(r)}>编辑</Button>
              <Button size="sm" variant="primary" onClick={() => submitMut.mutate(r.id)}>提交</Button>
              <Button size="sm" danger onClick={() => handleDelete(r)}>删除</Button>
            </>
          )}
          {r.status === 'submitted' && (
            <Button size="sm" variant="primary" onClick={() => approveMut.mutate(r.id)}>审核通过</Button>
          )}
          {(r.status === 'approved' || r.status === 'rejected') && (
            <span style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>—</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="排放数据填报"
        breadcrumb={['首页', '数据填报']}
        orgName={currentOrg?.name}
        extra={
          <div className="cc-flex gap-8">
            <Button icon="upload" onClick={() => window.location.hash = '#/import'}>批量导入</Button>
            <Button icon="download" onClick={() => window.open(`/api/v1/entries/export?orgId=${orgId}&includeDescendants=true`, '_blank')}>导出数据</Button>
            <Button variant="primary" icon="plus" onClick={openCreate}>新增填报</Button>
          </div>
        }
      />

      {/* Info bar */}
      <div style={{
        background: '#f0f7ff', border: '1px solid #d0e3ff', borderRadius: 6,
        padding: '8px 16px', marginBottom: 16, fontSize: 13, color: '#555', display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ fontSize: 14 }}>&#9432;</span>
        <span>
          当前组织 <strong>{currentOrg?.name}</strong>（{currentOrg?.code}）及其下属 <strong>{descendantCount - 1}</strong> 个单元的填报数据
          {currentOrg?.standard && <> &middot; 核算标准：{currentOrg.standard}</>}
          {currentOrg?.industryCode && <> &middot; 行业：{currentOrg.industryCode}</>}
        </span>
      </div>

      {/* Summary cards */}
      <div className="cc-grid cols-4" style={{ marginBottom: 16 }}>
        <div className="cc-stat accent-primary">
          <div className="label">筛选范围内总排放</div>
          <div><span className="value">{fmt(sumData.total, 0)}</span><span className="unit">tCO₂e</span></div>
          <div style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>共 {sumData.count} 条记录</div>
        </div>
        <div className="cc-stat accent-1">
          <div className="label">范围一</div>
          <div><span className="value">{fmt(sumData.byScope?.[1] || 0, 0)}</span><span className="unit">tCO₂e</span></div>
        </div>
        <div className="cc-stat accent-2">
          <div className="label">范围二</div>
          <div><span className="value">{fmt(sumData.byScope?.[2] || 0, 0)}</span><span className="unit">tCO₂e</span></div>
        </div>
        <div className="cc-stat accent-3">
          <div className="label">范围三</div>
          <div><span className="value">{fmt(sumData.byScope?.[3] || 0, 0)}</span><span className="unit">tCO₂e</span></div>
        </div>
      </div>

      <Panel
        title="填报记录"
        extra={
          <div className="cc-flex gap-8 align-c" style={{ flexWrap: 'wrap' }}>
            <Input type="month" value={filterPeriod} onChange={setFilterPeriod} placeholder="全部报告期" style={{ width: 130 }} />
            <Select value={filterScope} onChange={setFilterScope} placeholder="全部范围"
              options={[{ value: '1', label: '范围一' }, { value: '2', label: '范围二' }, { value: '3', label: '范围三' }]}
              style={{ width: 100 }}
            />
            <Select value={filterCategory} onChange={setFilterCategory} placeholder="全部类别"
              options={Object.entries(CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l }))}
              style={{ width: 120 }}
            />
            <Select value={filterStatus} onChange={setFilterStatus} placeholder="全部状态"
              options={[
                { value: 'draft', label: '草稿' }, { value: 'submitted', label: '已提交' },
                { value: 'approved', label: '已审核' }, { value: 'rejected', label: '已驳回' },
              ]}
              style={{ width: 100 }}
            />
            <Input value={keyword} onChange={setKeyword} placeholder="搜索排放源 / 组织..." style={{ width: 170 }} />
            <Button onClick={resetFilters}>重置</Button>
            <span style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>共 {total} 条</span>
          </div>
        }
        flush
      >
        {isLoading ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--c-text-muted)' }}>加载中...</div>
        ) : (
          <Table columns={columns} data={listData} />
        )}
        {total > 0 && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--c-border-lighter)' }}>
            <Pagination total={total} page={page} pageSize={10} onChange={setPage} />
          </div>
        )}
      </Panel>

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        title={form.id ? '编辑填报' : '新增填报'}
        onClose={() => setModalOpen(false)}
        onOk={handleSave}
        okLoading={saveMut.isPending}
        okText="保存"
      >
        <FormRow label="所属组织" required>
          <select
            className="cc-select"
            style={{ width: '100%' }}
            value={form.orgId || ''}
            onChange={(e) => setForm({ ...form, orgId: e.target.value })}
          >
            <option value="">请选择组织单元</option>
            {flat.map((o: any) => (
              <option key={o.id} value={o.id}>
                {'　'.repeat((o.level || 1) - 1)}{o.name}（{o.code}）
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow label="报告期" required>
          <Input type="month" value={form.period || ''} onChange={(v) => setForm({ ...form, period: v })} style={{ width: 160 }} />
        </FormRow>
        <FormRow label="排放因子" required>
          <select
            className="cc-select"
            style={{ width: '100%' }}
            value={form.factorId || ''}
            onChange={(e) => setForm({ ...form, factorId: e.target.value })}
          >
            <option value="">请选择排放因子</option>
            {(factors as any[])?.map((f: any) => (
              <option key={f.id} value={f.id}>
                [{f.id}] {f.name}（{f.unit}）{f.industryCode !== 'GENERAL' ? ` [${f.industryCode}]` : ''}
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow label="活动数据" required>
          <Input
            type="number" value={form.quantity || ''}
            onChange={(v) => setForm({ ...form, quantity: v })}
            placeholder="请输入活动数据量"
            suffix={selectedFactor?.unit?.split('/')[0] || ''}
          />
        </FormRow>
        {previewEmission != null && selectedFactor && (
          <div style={{ background: 'var(--c-bg-page)', borderRadius: 6, padding: '10px 14px', fontSize: 13, lineHeight: 1.7 }}>
            <div>预估排放量：<strong style={{ color: 'var(--c-primary)', fontSize: 15 }}>{fmt(previewEmission, 4)}</strong> tCO₂e</div>
            <div style={{ color: 'var(--c-text-muted)', fontSize: 12 }}>= {form.quantity} x {selectedFactor.value}（{selectedFactor.unit}）</div>
            {selectedFactor.gwpNote && <div style={{ color: 'var(--c-text-muted)', fontSize: 12 }}>GWP说明：{selectedFactor.gwpNote}</div>}
          </div>
        )}
        <FormRow label="备注">
          <Input value={form.remark || ''} onChange={(v) => setForm({ ...form, remark: v })} placeholder="填报说明（选填）" />
        </FormRow>
      </Modal>
    </>
  );
}
