import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchFactors, createFactor, updateFactor, updateFactorStatus, deleteFactor, fetchFactorHistory,
  importFactors,
} from '@/api/factors';
import { fetchIndustries, fetchCategories } from '@/api/dict';
import {
  PageHeader, Panel, Button, Select, Input, Table, Pagination,
  Modal, FormRow, StatusTag, Tag, fmt, useToast, useConfirm, Icon,
} from '@/components/ui';

const SCOPE_OF: Record<string, number> = {
  FUEL: 1, PROCESS: 1, FUGITIVE: 1, ELEC: 2, HEAT: 2, TRANSPORT: 3, WASTE: 3, BUSINESS: 3,
};

const SCOPE_TYPE_LABEL: Record<string, string> = {
  general: '通用因子',
  industry: '行业专用',
};

export default function FactorLibrary() {
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [form, setForm] = useState<any>({});
  const [historyFactorId, setHistoryFactorId] = useState<string | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [importLoading, setImportLoading] = useState(false);

  // Load industries and categories from API
  const { data: industries } = useQuery({
    queryKey: ['industries'],
    queryFn: () => fetchIndustries(),
    staleTime: 10 * 60 * 1000,
  });
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => fetchCategories(),
    staleTime: 10 * 60 * 1000,
  });

  const industryOptions = (industries as any[] || []).map((i: any) => ({ value: i.code, label: i.name }));
  const categoryOptions = (categories as any[] || []).map((c: any) => ({ value: c.code, label: c.name }));

  const filters: any = {};
  if (keyword) filters.keyword = keyword;
  if (filterCat) filters.category = filterCat;
  if (filterIndustry) filters.industry = filterIndustry;
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

  const handleImport = async () => {
    if (!importFile) return;
    setImportLoading(true);
    try {
      const res: any = await importFactors(importFile);
      setImportResult(res);
      if (res.success > 0) qc.invalidateQueries({ queryKey: ['factors'] });
    } catch (e: any) {
      toast.push(e.message || '导入失败', 'error');
    } finally {
      setImportLoading(false);
    }
  };

  // Download error report as CSV
  const downloadErrorReport = (errorRows: any[]) => {
    const header = ['行号', '名称', '错误原因'];
    const rows = errorRows.map((r: any) => [r.row, r.name || '', r.reason || '']);
    const csv = [header, ...rows].map(r => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'factor_import_errors.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const getIndustryName = (code: string) => {
    const found = (industries as any[] || []).find((i: any) => i.code === code);
    return found ? found.name : code;
  };
  const getCategoryName = (code: string) => {
    const found = (categories as any[] || []).find((c: any) => c.code === code);
    return found ? found.name : code;
  };

  const listData: any[] = (data as any)?.list || [];
  const total: number = (data as any)?.total || 0;

  const columns = [
    {
      key: 'id', title: '编码', width: 80,
      render: (r: any) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.id}</span>,
    },
    { key: 'name', title: '名称', minWidth: 150 },
    {
      key: 'categoryCode', title: '排放类别', width: 110,
      render: (r: any) => <Tag>{getCategoryName(r.categoryCode)}</Tag>,
    },
    {
      key: 'scope', title: '范围', width: 52, align: 'center' as const,
      render: (r: any) => {
        const sc = SCOPE_OF[r.categoryCode];
        return sc ? <Tag variant={`scope${sc}`}>S{sc}</Tag> : null;
      },
    },
    {
      key: 'industryCode', title: '适用行业', width: 110,
      render: (r: any) => (
        <span style={{ fontSize: 12 }}>
          {r.industryCode === 'GENERAL' ? <Tag>通用</Tag> : <Tag variant="blue">{getIndustryName(r.industryCode)}</Tag>}
        </span>
      ),
    },
    {
      key: 'scopeType', title: '类型', width: 80,
      render: (r: any) => <span style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>{SCOPE_TYPE_LABEL[r.scopeType] || r.scopeType}</span>,
    },
    {
      key: 'value', title: '因子值', width: 100, align: 'right' as const,
      render: (r: any) => <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>{r.value}</span>,
    },
    { key: 'unit', title: '单位', width: 120 },
    { key: 'standard', title: '标准', width: 90, render: (r: any) => <span style={{ fontSize: 12 }}>{r.standard}</span> },
    { key: 'effectiveDate', title: '生效日期', width: 100 },
    { key: 'status', title: '状态', width: 72, align: 'center' as const, render: (r: any) => <StatusTag status={r.status} /> },
    {
      key: 'actions', title: '操作', width: 180,
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
    { key: 'id', title: '编码', width: 80, render: (r: any) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.id}</span> },
    { key: 'version', title: '版本', width: 80 },
    { key: 'value', title: '因子值', width: 90, align: 'right' as const },
    { key: 'unit', title: '单位', width: 110 },
    { key: 'effectiveDate', title: '生效日期', width: 100 },
    { key: 'status', title: '状态', width: 72, align: 'center' as const, render: (r: any) => <StatusTag status={r.status} /> },
  ];

  return (
    <>
      <PageHeader
        title="排放因子库"
        breadcrumb={['首页', '排放因子库']}
        extra={
          <div className="cc-flex gap-8">
            <Button icon="download" onClick={() => window.open('/api/v1/factors/template', '_blank')}>下载模板</Button>
            <Button icon="upload" onClick={() => { setImportFile(null); setImportResult(null); setImportModalOpen(true); }}>批量导入</Button>
            <Button variant="primary" icon="plus" onClick={openCreate}>新建因子</Button>
          </div>
        }
      />

      <Panel
        title="因子列表"
        extra={
          <div className="cc-flex gap-8 align-c">
            <Input value={keyword} onChange={setKeyword} placeholder="搜索名称" style={{ width: 160 }} />
            <Select
              value={filterCat} onChange={setFilterCat} placeholder="全部类别"
              options={categoryOptions} style={{ width: 130 }}
            />
            <Select
              value={filterIndustry} onChange={setFilterIndustry} placeholder="全部行业"
              options={industryOptions} style={{ width: 130 }}
            />
            <Select
              value={filterStatus} onChange={setFilterStatus} placeholder="全部状态"
              options={[{ value: 'enabled', label: '启用' }, { value: 'disabled', label: '停用' }]}
              style={{ width: 90 }}
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

      {/* Create / Edit modal */}
      <Modal
        open={modalOpen}
        title={form.id ? '编辑排放因子' : '新建排放因子'}
        onClose={() => setModalOpen(false)}
        onOk={() => saveMut.mutate(form)}
        okLoading={saveMut.isPending}
        width="wide"
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
          <FormRow label="因子名称" required>
            <Input value={form.name || ''} onChange={(v) => setForm({ ...form, name: v })} placeholder="因子名称" />
          </FormRow>
          <FormRow label="排放类别" required>
            <Select
              value={form.categoryCode || ''} onChange={(v) => setForm({ ...form, categoryCode: v })}
              placeholder="请选择类别" options={categoryOptions} style={{ width: '100%' }}
            />
          </FormRow>
          <FormRow label="因子值" required>
            <Input type="number" value={form.value ?? ''} onChange={(v) => setForm({ ...form, value: v })} placeholder="如 2.6590" />
          </FormRow>
          <FormRow label="单位" required>
            <Input value={form.unit || ''} onChange={(v) => setForm({ ...form, unit: v })} placeholder="如 tCO₂e/MWh" />
          </FormRow>
          <FormRow label="适用行业" required>
            <Select
              value={form.industryCode || 'GENERAL'} onChange={(v) => setForm({ ...form, industryCode: v, scopeType: v === 'GENERAL' ? 'general' : 'industry' })}
              options={[{ value: 'GENERAL', label: '通用（所有行业）' }, ...industryOptions]} style={{ width: '100%' }}
            />
          </FormRow>
          <FormRow label="因子类型">
            <Select
              value={form.scopeType || 'general'} onChange={(v) => setForm({ ...form, scopeType: v })}
              options={[{ value: 'general', label: '通用因子' }, { value: 'industry', label: '行业专用因子' }]}
              style={{ width: '100%' }}
            />
          </FormRow>
          <FormRow label="核算标准">
            <Select
              value={form.standard || 'ISO'} onChange={(v) => setForm({ ...form, standard: v })}
              options={[
                { value: 'ISO', label: 'ISO 14064-1' },
                { value: 'INDUSTRY', label: '行业核算指南' },
                { value: 'IPCC', label: 'IPCC AR6' },
              ]}
              style={{ width: '100%' }}
            />
          </FormRow>
          <FormRow label="版本号">
            <Input value={form.version || ''} onChange={(v) => setForm({ ...form, version: v })} placeholder="如 v2024.1" />
          </FormRow>
          <FormRow label="数据来源">
            <Input value={form.source || ''} onChange={(v) => setForm({ ...form, source: v })} placeholder="如 IPCC 2006，省级清单指南" />
          </FormRow>
          <FormRow label="生效日期">
            <Input type="date" value={form.effectiveDate || ''} onChange={(v) => setForm({ ...form, effectiveDate: v })} style={{ width: '100%' }} />
          </FormRow>
        </div>
        <FormRow label="GWP说明">
          <Input
            value={form.gwpNote || ''} onChange={(v) => setForm({ ...form, gwpNote: v })}
            placeholder="如：CH₄ GWP=25（AR4），已折算为 CO₂e"
          />
        </FormRow>
      </Modal>

      {/* History modal */}
      <Modal
        open={historyOpen} title="历史版本"
        onClose={() => setHistoryOpen(false)}
        footer={<Button onClick={() => setHistoryOpen(false)}>关闭</Button>}
        width="wide"
      >
        <Table columns={historyColumns} data={(history as any[]) || []} />
      </Modal>

      {/* Import modal */}
      <Modal
        open={importModalOpen} title="批量导入排放因子"
        onClose={() => setImportModalOpen(false)}
        footer={
          importResult ? (
            <div className="cc-flex gap-8">
              {importResult.errorRows?.length > 0 && (
                <Button icon="download" onClick={() => downloadErrorReport(importResult.errorRows)}>下载错误报告</Button>
              )}
              <Button variant="primary" onClick={() => setImportModalOpen(false)}>完成</Button>
            </div>
          ) : (
            <div className="cc-flex gap-8">
              <Button onClick={() => setImportModalOpen(false)}>取消</Button>
              <Button variant="primary" icon="upload" onClick={handleImport} disabled={!importFile || importLoading}>
                {importLoading ? <><span className="cc-spinner" />导入中...</> : '开始导入'}
              </Button>
            </div>
          )
        }
      >
        {!importResult ? (
          <>
            <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--c-text-secondary)' }}>
              模板格式：A因子名称 | B类别编码 | C因子值 | D单位 | E数据来源 | F版本号 | G生效日期 | H行业编码（选填）| I标准（选填）
            </div>
            <div
              style={{
                border: '2px dashed var(--c-border-light)', borderRadius: 8, padding: '32px 24px',
                textAlign: 'center', cursor: 'pointer', background: 'var(--c-bg-page)',
              }}
              onClick={() => document.getElementById('factor-file-input')?.click()}
            >
              <Icon name="upload" size={32} color="var(--c-primary)" />
              <div style={{ marginTop: 8, fontSize: 14, fontWeight: 500 }}>
                {importFile ? importFile.name : '点击选择 Excel 文件'}
              </div>
              <input
                id="factor-file-input" type="file" accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
            </div>
          </>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
              {[
                { label: '导入成功', value: importResult.success, color: 'var(--c-success)' },
                { label: '导入失败', value: importResult.failed, color: 'var(--c-danger)' },
                { label: '总计', value: importResult.total, color: 'var(--c-primary)' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center', padding: '12px', background: 'var(--c-bg-page)', borderRadius: 6 }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>{s.label}</div>
                </div>
              ))}
            </div>
            {importResult.errorRows?.length > 0 && (
              <Table
                columns={[
                  { key: 'row', title: '行号', width: 60 },
                  { key: 'name', title: '名称', minWidth: 120 },
                  { key: 'reason', title: '错误原因', minWidth: 160 },
                ]}
                data={importResult.errorRows}
                rowKey="row"
              />
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
