import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchFactors, createFactor, updateFactor, updateFactorStatus, deleteFactor, fetchFactorHistory,
} from '@/api/factors';
import {
  PageHeader, Panel, Button, Select, Input, Table, Pagination,
  Modal, FormRow, StatusTag, Tag, fmt, useToast, useConfirm,
} from '@/components/ui';

const CATEGORIES = [
  { value: 'FUEL', label: '化石燃料燃烧' },
  { value: 'PROCESS', label: '工业过程' },
  { value: 'FUGITIVE', label: '逸散排放' },
  { value: 'ELEC', label: '净购入电力' },
  { value: 'HEAT', label: '净购入热力' },
  { value: 'TRANSPORT', label: '运输' },
  { value: 'WASTE', label: '废弃物' },
  { value: 'BUSINESS', label: '差旅通勤' },
];

const SCOPE_OF: Record<string, number> = {
  FUEL: 1, PROCESS: 1, FUGITIVE: 1, ELEC: 2, HEAT: 2, TRANSPORT: 3, WASTE: 3, BUSINESS: 3,
};

export default function FactorLibrary() {
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [form, setForm] = useState<any>({});
  const [historyFactorId, setHistoryFactorId] = useState<string | null>(null);

  const filters: any = {};
  if (keyword) filters.keyword = keyword;
  if (filterCat) filters.category = filterCat;
  if (filterStatus) filters.status = filterStatus;

  const { data, isLoading } = useQuery({
    queryKey: ['factors', page, filters],
    queryFn: () => fetchFactors({ page, pageSize: 12, ...filters }),
  });

  const { data: history } = useQuery({
    queryKey: ['factor-history', historyFactorId],
    queryFn: () => fetchFactorHistory(historyFactorId!),
    enabled: !!historyFactorId,
  });

  const saveMut = useMutation({
    mutationFn: (body: any) => form.id ? updateFactor(form.id, body) : createFactor(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['factors'] });
      setModalOpen(false);
      toast.push(form.id ? '因子已更新' : '因子已创建');
    },
    onError: (e: any) => toast.push(e.message || '保存失败', 'error'),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: any) => updateFactorStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['factors'] }); toast.push('状态已更新'); },
  });

  const deleteMut = useMutation({
    mutationFn: deleteFactor,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['factors'] }); toast.push('已删除'); },
    onError: (e: any) => toast.push(e.message || '删除失败', 'error'),
  });

  const openCreate = () => {
    setForm({ standard: 'ISO', scopeType: 'general', industryCode: 'GENERAL', effectiveDate: new Date().toISOString().slice(0, 10) });
    setModalOpen(true);
  };

  const openEdit = (f: any) => { setForm(f); setModalOpen(true); };

  const openHistory = (id: string) => { setHistoryFactorId(id); setHistoryOpen(true); };

  const handleDelete = async (f: any) => {
    const ok = await confirm({ title: '确认删除', message: `确定删除因子「${f.name}」？此操作不可恢复。` });
    if (ok) deleteMut.mutate(f.id);
  };

  const listData: any[] = (data as any)?.list || [];
  const total: number = (data as any)?.total || 0;

  const columns = [
    {
      key: 'id', title: '编码', width: 100,
      render: (r: any) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.id}</span>,
    },
    { key: 'name', title: '名称', minWidth: 140 },
    {
      key: 'categoryCode', title: '类别', width: 100,
      render: (r: any) => {
        const cat = CATEGORIES.find(c => c.value === r.categoryCode);
        return <Tag>{cat?.label || r.categoryCode}</Tag>;
      },
    },
    {
      key: 'scope', title: '范围', width: 60, align: 'center' as const,
      render: (r: any) => {
        const sc = SCOPE_OF[r.categoryCode];
        return sc ? <Tag variant={`scope${sc}`}>S{sc}</Tag> : null;
      },
    },
    {
      key: 'value', title: '因子值', width: 100, align: 'right' as const,
      render: (r: any) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{r.value}</span>,
    },
    { key: 'unit', title: '单位', width: 100 },
    { key: 'source', title: '数据来源', minWidth: 100 },
    { key: 'effectiveDate', title: '生效日期', width: 100 },
    { key: 'status', title: '状态', width: 72, align: 'center' as const, render: (r: any) => <StatusTag status={r.status} /> },
    {
      key: 'actions', title: '操作', width: 160,
      render: (r: any) => (
        <div className="cc-flex gap-4">
          <Button size="sm" onClick={() => openEdit(r)}>编辑</Button>
          <Button size="sm" onClick={() => openHistory(r.id)}>历史</Button>
          <Button size="sm" onClick={() => statusMut.mutate({ id: r.id, status: r.status === 'enabled' ? 'disabled' : 'enabled' })}>
            {r.status === 'enabled' ? '停用' : '启用'}
          </Button>
          <Button size="sm" danger onClick={() => handleDelete(r)}>删除</Button>
        </div>
      ),
    },
  ];

  const historyColumns = [
    { key: 'id', title: '编码', width: 100, render: (r: any) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.id}</span> },
    { key: 'version', title: '版本', width: 80 },
    { key: 'value', title: '因子值', width: 90, align: 'right' as const },
    { key: 'unit', title: '单位', width: 100 },
    { key: 'effectiveDate', title: '生效日期', width: 100 },
    { key: 'status', title: '状态', width: 72, align: 'center' as const, render: (r: any) => <StatusTag status={r.status} /> },
  ];

  return (
    <>
      <PageHeader
        title="排放因子库"
        breadcrumb={['首页', '排放因子库']}
        extra={<Button variant="primary" icon="plus" onClick={openCreate}>新建因子</Button>}
      />

      <Panel
        title="因子列表"
        extra={
          <div className="cc-flex gap-8 align-c">
            <Input
              value={keyword}
              onChange={setKeyword}
              placeholder="搜索名称"
              style={{ width: 160 }}
            />
            <Select
              value={filterCat}
              onChange={setFilterCat}
              placeholder="全部类别"
              options={CATEGORIES}
              style={{ width: 130 }}
            />
            <Select
              value={filterStatus}
              onChange={setFilterStatus}
              placeholder="全部状态"
              options={[{ value: 'enabled', label: '启用' }, { value: 'disabled', label: '停用' }]}
              style={{ width: 100 }}
            />
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
            <Pagination total={total} page={page} pageSize={12} onChange={setPage} />
          </div>
        )}
      </Panel>

      {/* Edit / Create modal */}
      <Modal
        open={modalOpen}
        title={form.id ? '编辑排放因子' : '新建排放因子'}
        onClose={() => setModalOpen(false)}
        onOk={() => saveMut.mutate(form)}
        okLoading={saveMut.isPending}
      >
        <FormRow label="名称" required>
          <Input value={form.name || ''} onChange={(v) => setForm({ ...form, name: v })} placeholder="因子名称" />
        </FormRow>
        <FormRow label="类别" required>
          <Select
            value={form.categoryCode || ''}
            onChange={(v) => setForm({ ...form, categoryCode: v })}
            placeholder="请选择类别"
            options={CATEGORIES}
            style={{ width: '100%' }}
          />
        </FormRow>
        <FormRow label="因子值" required>
          <Input type="number" value={form.value ?? ''} onChange={(v) => setForm({ ...form, value: v })} placeholder="如 2.6590" />
        </FormRow>
        <FormRow label="单位" required>
          <Input value={form.unit || ''} onChange={(v) => setForm({ ...form, unit: v })} placeholder="如 tCO₂e/t" />
        </FormRow>
        <FormRow label="数据来源">
          <Input value={form.source || ''} onChange={(v) => setForm({ ...form, source: v })} placeholder="如 IPCC 2006" />
        </FormRow>
        <FormRow label="版本号">
          <Input value={form.version || ''} onChange={(v) => setForm({ ...form, version: v })} placeholder="如 v2024.1" />
        </FormRow>
        <FormRow label="生效日期">
          <Input type="date" value={form.effectiveDate || ''} onChange={(v) => setForm({ ...form, effectiveDate: v })} style={{ width: 160 }} />
        </FormRow>
      </Modal>

      {/* History modal */}
      <Modal
        open={historyOpen}
        title="历史版本"
        onClose={() => setHistoryOpen(false)}
        footer={<Button onClick={() => setHistoryOpen(false)}>关闭</Button>}
        width="wide"
      >
        <Table columns={historyColumns} data={(history as any[]) || []} />
      </Modal>
    </>
  );
}
