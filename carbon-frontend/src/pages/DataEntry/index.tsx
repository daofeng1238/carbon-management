import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrg } from '@/contexts/OrgContext';
import { fetchEntries, createEntry, updateEntry, deleteEntry, submitEntry, approveEntry } from '@/api/entries';
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
  FUEL: '化石燃料', PROCESS: '工业过程', FUGITIVE: '逸散排放',
  ELEC: '净购入电力', HEAT: '净购入热力',
  TRANSPORT: '运输', WASTE: '废弃物', BUSINESS: '差旅通勤',
};

export default function DataEntry() {
  const { orgId, currentOrg } = useOrg();
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();

  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<any>({});

  const filters: any = {};
  if (filterStatus) filters.status = filterStatus;
  if (filterPeriod) filters.period = filterPeriod;

  const { data, isLoading } = useQuery({
    queryKey: ['entries', orgId, page, filters],
    queryFn: () => fetchEntries({ orgId, includeDescendants: true, page, pageSize: 10, ...filters }),
    enabled: !!orgId,
  });

  const { data: factors } = useQuery({
    queryKey: ['factors-recommended', orgId],
    queryFn: () => fetchRecommendedFactors({ orgId }),
    enabled: !!orgId,
  });

  const saveMut = useMutation({
    mutationFn: (body: any) => form.id ? updateEntry(form.id, body) : createEntry(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries'] });
      setModalOpen(false);
      toast.push(form.id ? '更新成功' : '新增成功');
    },
    onError: (e: any) => toast.push(e.message || '保存失败', 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteEntry,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['entries'] }); toast.push('已删除'); },
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
    setForm({ orgId, period: new Date().toISOString().slice(0, 7), quantity: '', factorId: '' });
    setModalOpen(true);
  };

  const openEdit = (entry: any) => {
    setForm(entry);
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.factorId) { toast.push('请选择排放因子', 'warning'); return; }
    if (!form.quantity) { toast.push('请填写活动数据', 'warning'); return; }
    saveMut.mutate({
      orgId: form.orgId || orgId,
      period: form.period,
      factorId: form.factorId,
      quantity: parseFloat(form.quantity),
      status: 'draft',
    });
  };

  const handleDelete = async (entry: any) => {
    const ok = await confirm({ title: '确认删除', message: `确定删除该条填报记录？此操作不可恢复。` });
    if (ok) deleteMut.mutate(entry.id);
  };

  const selectedFactor = (factors as any[])?.find((f: any) => f.id === form.factorId);
  const previewEmission = selectedFactor && form.quantity
    ? parseFloat(form.quantity) * selectedFactor.value
    : null;

  const listData: any[] = (data as any)?.list || [];
  const total: number = (data as any)?.total || 0;

  const columns = [
    { key: 'id', title: '编号', width: 140, render: (r: any) => <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--c-text-muted)' }}>{r.id?.slice(-8)}</span> },
    { key: 'orgName', title: '组织', minWidth: 120 },
    { key: 'period', title: '报告期', width: 90 },
    { key: 'categoryCode', title: '排放类别', width: 100, render: (r: any) => CATEGORY_LABELS[r.categoryCode] || r.categoryCode },
    {
      key: 'scope', title: '范围', width: 72, align: 'center' as const,
      render: (r: any) => {
        const sc = SCOPE_OF_CATEGORY[r.categoryCode] || 0;
        return sc ? <ScopeTag scope={sc} /> : null;
      },
    },
    {
      key: 'quantity', title: '活动数据', width: 120, align: 'right' as const,
      render: (r: any) => `${fmt(r.quantity, 2)} ${r.unit || ''}`,
    },
    {
      key: 'emission', title: '排放量 tCO₂e', width: 120, align: 'right' as const,
      render: (r: any) => <strong>{fmt(r.emission, 4)}</strong>,
    },
    { key: 'status', title: '状态', width: 80, align: 'center' as const, render: (r: any) => <StatusTag status={r.status} /> },
    {
      key: 'actions', title: '操作', width: 160,
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
        title="数据填报"
        breadcrumb={['首页', '数据填报']}
        orgName={currentOrg?.name}
        extra={<Button variant="primary" icon="plus" onClick={openCreate}>新增填报</Button>}
      />

      <Panel
        title="填报列表"
        extra={
          <div className="cc-flex gap-8 align-c">
            <Select
              value={filterStatus}
              onChange={setFilterStatus}
              placeholder="全部状态"
              options={[
                { value: 'draft', label: '草稿' },
                { value: 'submitted', label: '已提交' },
                { value: 'approved', label: '已审核' },
                { value: 'rejected', label: '已驳回' },
              ]}
              style={{ width: 110 }}
            />
            <Input
              type="month"
              value={filterPeriod}
              onChange={setFilterPeriod}
              placeholder="报告期"
              style={{ width: 130 }}
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
            <Pagination total={total} page={page} pageSize={10} onChange={setPage} />
          </div>
        )}
      </Panel>

      <Modal
        open={modalOpen}
        title={form.id ? '编辑填报' : '新增填报'}
        onClose={() => setModalOpen(false)}
        onOk={handleSave}
        okLoading={saveMut.isPending}
        okText="保存"
      >
        <FormRow label="报告期" required>
          <Input
            type="month"
            value={form.period || ''}
            onChange={(v) => setForm({ ...form, period: v })}
            style={{ width: 160 }}
          />
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
                [{f.id}] {f.name}（{f.unit}）
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow label="活动数据" required>
          <Input
            type="number"
            value={form.quantity || ''}
            onChange={(v) => setForm({ ...form, quantity: v })}
            placeholder="请输入活动数据量"
            suffix={selectedFactor?.unit?.split('/')[0] || ''}
          />
        </FormRow>
        {previewEmission != null && selectedFactor && (
          <div style={{
            background: 'var(--c-bg-page)', borderRadius: 6, padding: '10px 14px',
            fontSize: 13, color: 'var(--c-text-regular)', lineHeight: 1.7,
          }}>
            <div>预估排放量：<strong style={{ color: 'var(--c-primary)', fontSize: 15 }}>{fmt(previewEmission, 4)}</strong> tCO₂e</div>
            <div style={{ color: 'var(--c-text-muted)', fontSize: 12 }}>= {form.quantity} × {selectedFactor.value}（{selectedFactor.unit}）</div>
          </div>
        )}
      </Modal>
    </>
  );
}
