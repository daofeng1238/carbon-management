import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrg } from '@/contexts/OrgContext';
import { previewReport, createReport, fetchReports, deleteReport } from '@/api/reports';
import {
  PageHeader, Panel, Button, Select, Input, Table, Tabs, FormRow,
  StatusTag, Tag, fmt, useToast, useConfirm,
} from '@/components/ui';

const YEAR = new Date().getFullYear();
const PERIOD_OPTIONS = [2024, 2025].flatMap((y) => [
  { value: `${y}`, label: `${y}年` },
  { value: `${y}Q1`, label: `${y}年 Q1` },
  { value: `${y}Q2`, label: `${y}年 Q2` },
  { value: `${y}Q3`, label: `${y}年 Q3` },
  { value: `${y}Q4`, label: `${y}年 Q4` },
]);

export default function Report() {
  const { orgId, currentOrg } = useOrg();
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState('config');
  const [preview, setPreview] = useState<any>(null);
  const [config, setConfig] = useState({
    reportPeriod: `${YEAR}`,
    scope: 'consolidated',
    standard: 'ISO',
    title: '',
    reportTo: '集团 ESG 委员会',
    showLogo: true,
    includeChart: true,
    includeBenchmark: false,
    includeAppendix: true,
  });

  const { data: reports } = useQuery({
    queryKey: ['reports'],
    queryFn: () => fetchReports({ page: 1, pageSize: 20 }),
    enabled: tab === 'history',
  });

  const previewMut = useMutation({
    mutationFn: () => previewReport({ ...config, orgId }),
    onSuccess: (data: any) => setPreview(data.snapshot),
    onError: (e: any) => toast.push(e.message || '预览失败', 'error'),
  });

  const saveMut = useMutation({
    mutationFn: () => createReport({ ...config, orgId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports'] });
      setTab('history');
      toast.push('报告已生成并归档');
    },
    onError: (e: any) => toast.push(e.message || '生成失败', 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteReport,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reports'] }); toast.push('报告已删除'); },
  });

  const handleDelete = async (r: any) => {
    const ok = await confirm({ title: '确认删除', message: `确定删除报告「${r.title}」？` });
    if (ok) deleteMut.mutate(r.id);
  };

  const set = (k: string, v: any) => setConfig((c) => ({ ...c, [k]: v }));

  const historyColumns = [
    { key: 'id', title: '编号', width: 120, render: (r: any) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.id}</span> },
    { key: 'title', title: '标题', minWidth: 180 },
    { key: 'period', title: '报告期', width: 90 },
    {
      key: 'scope', title: '范围', width: 80,
      render: (r: any) => <Tag>{r.scope === 'consolidated' ? '合并' : '独立'}</Tag>,
    },
    { key: 'status', title: '状态', width: 80, align: 'center' as const, render: (r: any) => <StatusTag status={r.status === 'final' ? 'approved' : 'draft'} /> },
    {
      key: 'createdAt', title: '生成时间', width: 110,
      render: (r: any) => new Date(r.createdAt).toLocaleDateString('zh-CN'),
    },
    {
      key: 'actions', title: '操作', width: 80,
      render: (r: any) => <Button size="sm" danger onClick={() => handleDelete(r)}>删除</Button>,
    },
  ];

  return (
    <>
      <PageHeader
        title="报告生成"
        breadcrumb={['首页', '报告生成']}
        orgName={currentOrg?.name}
      />

      <Tabs
        items={[{ value: 'config', label: '配置报告' }, { value: 'history', label: '历史报告' }]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'config' && (
        <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 16, alignItems: 'start' }}>
          <Panel title="报告配置">
            <FormRow label="报告期">
              <Select value={config.reportPeriod} onChange={(v) => set('reportPeriod', v)} options={PERIOD_OPTIONS} style={{ width: '100%' }} />
            </FormRow>
            <FormRow label="报告范围">
              <Select
                value={config.scope}
                onChange={(v) => set('scope', v)}
                options={[
                  { value: 'self', label: '独立报告（本组织）' },
                  { value: 'consolidated', label: '合并报告（含所有下属）' },
                ]}
                style={{ width: '100%' }}
              />
            </FormRow>
            <FormRow label="核算标准">
              <Select
                value={config.standard}
                onChange={(v) => set('standard', v)}
                options={[
                  { value: 'ISO', label: 'ISO 14064-1' },
                  { value: 'INDUSTRY', label: '行业指南' },
                  { value: 'BOTH', label: '两套标准' },
                ]}
                style={{ width: '100%' }}
              />
            </FormRow>
            <FormRow label="报告标题">
              <Input
                value={config.title}
                onChange={(v) => set('title', v)}
                placeholder={`${currentOrg?.name || ''} ${config.reportPeriod} 碳排放报告`}
              />
            </FormRow>
            <FormRow label="报告对象">
              <Input value={config.reportTo} onChange={(v) => set('reportTo', v)} />
            </FormRow>

            <div style={{ borderTop: '1px solid var(--c-border-lighter)', margin: '16px 0' }} />

            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--c-text-secondary)', marginBottom: 10 }}>报告内容</div>
            {[
              { key: 'showLogo', label: '显示 Logo' },
              { key: 'includeChart', label: '包含图表' },
              { key: 'includeBenchmark', label: '包含行业对标' },
              { key: 'includeAppendix', label: '包含附录数据' },
            ].map(({ key, label }) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer', fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={(config as any)[key]}
                  onChange={(e) => set(key, e.target.checked)}
                />
                {label}
              </label>
            ))}

            <div className="cc-flex gap-8" style={{ marginTop: 20 }}>
              <Button onClick={() => previewMut.mutate()} disabled={previewMut.isPending}>
                {previewMut.isPending ? <><span className="cc-spinner" />生成中...</> : '预览报告'}
              </Button>
              <Button variant="primary" icon="doc" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                {saveMut.isPending ? <><span className="cc-spinner" />生成中...</> : '生成并归档'}
              </Button>
            </div>
          </Panel>

          {/* Preview */}
          <Panel title="报告预览">
            {preview ? (
              <div>
                <div style={{ marginBottom: 16, fontSize: 14, fontWeight: 600, color: 'var(--c-text-regular)' }}>
                  {config.title || `${currentOrg?.name} ${config.reportPeriod} 碳排放报告`}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  {[
                    { label: '总排放量', value: `${fmt(preview.total, 0)} tCO₂e` },
                    { label: '范围一', value: `${fmt(preview.byScope?.[1], 0)} tCO₂e` },
                    { label: '范围二', value: `${fmt(preview.byScope?.[2], 0)} tCO₂e` },
                    { label: '范围三', value: `${fmt(preview.byScope?.[3], 0)} tCO₂e` },
                  ].map((kpi) => (
                    <div key={kpi.label} style={{
                      background: 'var(--c-bg-page)', borderRadius: 6, padding: '12px 16px',
                    }}>
                      <div style={{ fontSize: 12, color: 'var(--c-text-muted)', marginBottom: 4 }}>{kpi.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--c-primary)' }}>{kpi.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--c-text-muted)', fontSize: 13 }}>
                点击「预览报告」生成报告概览
              </div>
            )}
          </Panel>
        </div>
      )}

      {tab === 'history' && (
        <Panel title="历史报告" flush>
          <Table columns={historyColumns} data={(reports as any)?.list || []} />
        </Panel>
      )}
    </>
  );
}
