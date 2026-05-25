import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrg } from '@/contexts/OrgContext';
import { previewReport, createReport, fetchReports, deleteReport } from '@/api/reports';
import {
  PageHeader, Panel, Button, Select, Input, Table, Tabs, FormRow,
  StatusTag, Tag, fmt, useToast, useConfirm,
} from '@/components/ui';

const YEAR = new Date().getFullYear();
const PERIOD_OPTIONS = [2023, 2024, 2025].flatMap((y) => [
  { value: `${y}`, label: `${y}年` },
  { value: `${y}Q1`, label: `${y}年 Q1` },
  { value: `${y}Q2`, label: `${y}年 Q2` },
  { value: `${y}Q3`, label: `${y}年 Q3` },
  { value: `${y}Q4`, label: `${y}年 Q4` },
]);

function ReportPreview({ preview, config, orgName }: { preview: any; config: any; orgName?: string }) {
  const byScope = preview.byScope || {};
  const byCategory: any[] = preview.byCategory || [];
  const total = preview.total || 0;
  const orgInfo = preview.orgInfo || {};
  const byMonth: any[] = preview.byMonth || [];

  const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div id="report-print-content" style={{ fontSize: 13, color: '#1a1a1a', lineHeight: 1.7 }}>
      {/* Report Header */}
      <div style={{ borderBottom: '2px solid #2d6a4f', paddingBottom: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#2d6a4f', marginBottom: 4 }}>
          {config.title || `${orgName || orgInfo.name || '组织'} ${config.reportPeriod} 碳排放报告`}
        </div>
        <div style={{ display: 'flex', gap: 24, fontSize: 12, color: '#666' }}>
          <span>报告组织：{orgInfo.name || orgName || '—'}</span>
          <span>报告期：{config.reportPeriod}</span>
          <span>核算标准：{config.standard === 'ISO' ? 'ISO 14064-1:2018' : config.standard === 'INDUSTRY' ? '行业核算指南' : 'ISO 14064-1:2018 + 行业核算指南'}</span>
          <span>生成日期：{today}</span>
        </div>
      </div>

      {/* Section 1: Organization Info */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, borderLeft: '3px solid #2d6a4f', paddingLeft: 8, marginBottom: 10 }}>
          一、组织信息
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <tbody>
            {[
              ['组织名称', orgInfo.name || orgName || '—', '组织编码', orgInfo.code || '—'],
              ['所属行业', orgInfo.industry || '—', '员工人数', orgInfo.employees ? `${orgInfo.employees.toLocaleString()} 人` : '—'],
              ['核算标准', config.standard === 'ISO' ? 'ISO 14064-1:2018' : '行业核算指南', '报告范围', config.scope === 'consolidated' ? '合并（含所有下属组织）' : '独立（本组织）'],
            ].map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} style={{
                    padding: '6px 10px', border: '1px solid #e0e0e0',
                    background: j % 2 === 0 ? '#f8f9fa' : '#fff',
                    fontWeight: j % 2 === 0 ? 500 : 400,
                    width: j % 2 === 0 ? '20%' : '30%',
                  }}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Section 2: Scope Summary */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, borderLeft: '3px solid #2d6a4f', paddingLeft: 8, marginBottom: 10 }}>
          二、温室气体排放汇总（按范围）
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#2d6a4f', color: '#fff' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>排放范围</th>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>说明</th>
              <th style={{ padding: '8px 12px', textAlign: 'right' }}>排放量（tCO₂e）</th>
              <th style={{ padding: '8px 12px', textAlign: 'right' }}>占比</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: '范围一', desc: '直接排放（化石燃料燃烧、工业过程、逸散）', value: byScope[1] || 0 },
              { label: '范围二', desc: '能源间接排放（净购入电力、热力）', value: byScope[2] || 0 },
              { label: '范围三', desc: '其他间接排放（运输、废弃物、差旅通勤）', value: byScope[3] || 0 },
            ].map((r, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                <td style={{ padding: '7px 12px', border: '1px solid #e0e0e0', fontWeight: 600 }}>{r.label}</td>
                <td style={{ padding: '7px 12px', border: '1px solid #e0e0e0', color: '#555' }}>{r.desc}</td>
                <td style={{ padding: '7px 12px', border: '1px solid #e0e0e0', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(r.value, 2)}
                </td>
                <td style={{ padding: '7px 12px', border: '1px solid #e0e0e0', textAlign: 'right' }}>
                  {fmt(total ? r.value / total * 100 : 0, 1)}%
                </td>
              </tr>
            ))}
            <tr style={{ background: '#e8f4ea', fontWeight: 700 }}>
              <td style={{ padding: '8px 12px', border: '1px solid #e0e0e0' }} colSpan={2}>合计</td>
              <td style={{ padding: '8px 12px', border: '1px solid #e0e0e0', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {fmt(total, 2)}
              </td>
              <td style={{ padding: '8px 12px', border: '1px solid #e0e0e0', textAlign: 'right' }}>100%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Section 3: Category Breakdown */}
      {byCategory.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, borderLeft: '3px solid #2d6a4f', paddingLeft: 8, marginBottom: 10 }}>
            三、温室气体排放源清单
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f0f7f2', fontWeight: 600 }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid #e0e0e0' }}>排放源类别</th>
                <th style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #e0e0e0' }}>排放范围</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0' }}>排放量（tCO₂e）</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0' }}>占总量比例</th>
              </tr>
            </thead>
            <tbody>
              {byCategory.map((c: any, i: number) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                  <td style={{ padding: '7px 12px', border: '1px solid #e0e0e0' }}>{c.name}</td>
                  <td style={{ padding: '7px 12px', border: '1px solid #e0e0e0', textAlign: 'center' }}>范围{c.scope}</td>
                  <td style={{ padding: '7px 12px', border: '1px solid #e0e0e0', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(c.value, 2)}
                  </td>
                  <td style={{ padding: '7px 12px', border: '1px solid #e0e0e0', textAlign: 'right' }}>
                    {fmt(total ? c.value / total * 100 : 0, 1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Section 4: Monthly Trend */}
      {byMonth.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, borderLeft: '3px solid #2d6a4f', paddingLeft: 8, marginBottom: 10 }}>
            四、月度排放趋势
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f0f7f2', fontWeight: 600 }}>
                <th style={{ padding: '7px 10px', border: '1px solid #e0e0e0' }}>月份</th>
                <th style={{ padding: '7px 10px', border: '1px solid #e0e0e0', textAlign: 'right' }}>范围一</th>
                <th style={{ padding: '7px 10px', border: '1px solid #e0e0e0', textAlign: 'right' }}>范围二</th>
                <th style={{ padding: '7px 10px', border: '1px solid #e0e0e0', textAlign: 'right' }}>范围三</th>
                <th style={{ padding: '7px 10px', border: '1px solid #e0e0e0', textAlign: 'right', fontWeight: 700 }}>合计（tCO₂e）</th>
              </tr>
            </thead>
            <tbody>
              {byMonth.slice(-12).map((m: any, i: number) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                  <td style={{ padding: '6px 10px', border: '1px solid #e0e0e0' }}>{m.period}</td>
                  <td style={{ padding: '6px 10px', border: '1px solid #e0e0e0', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(m.s1 || 0, 2)}</td>
                  <td style={{ padding: '6px 10px', border: '1px solid #e0e0e0', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(m.s2 || 0, 2)}</td>
                  <td style={{ padding: '6px 10px', border: '1px solid #e0e0e0', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(m.s3 || 0, 2)}</td>
                  <td style={{ padding: '6px 10px', border: '1px solid #e0e0e0', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmt(m.total || 0, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Section 5: Declaration */}
      <div style={{ marginTop: 24, padding: '12px 16px', background: '#f8f9fa', borderRadius: 4, fontSize: 12, color: '#777' }}>
        <strong>声明：</strong>本报告依据 {config.standard === 'ISO' ? 'ISO 14064-1:2018《组织层次上对温室气体排放和清除的量化和报告的规范及指南》' : '相关行业温室气体排放核算方法与报告指南'} 编制，
        报告期内温室气体排放量数据已按照排放因子法进行核算，计算公式为：排放量（tCO₂e）= 活动数据 × 排放因子 × GWP。
        报告对象：{(config as any).reportTo || '相关利益方'}。
      </div>
    </div>
  );
}

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

  const handlePrint = () => {
    const content = document.getElementById('report-print-content');
    if (!content) { toast.push('请先预览报告', 'warning'); return; }
    const printWin = window.open('', '_blank', 'width=900,height=700');
    if (!printWin) return;
    printWin.document.write(`
      <html><head>
        <title>${config.title || '碳排放报告'}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Microsoft YaHei', Arial, sans-serif; font-size: 13px; color: #1a1a1a; padding: 40px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { padding: 7px 12px; border: 1px solid #e0e0e0; }
          @page { margin: 20mm; }
        </style>
      </head><body>
        ${content.innerHTML}
      </body></html>
    `);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); }, 500);
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
    { key: 'standard', title: '标准', width: 90, render: (r: any) => <span style={{ fontSize: 12 }}>{r.standard || 'ISO'}</span> },
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
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, alignItems: 'start' }}>
          <Panel title="报告配置">
            <FormRow label="报告期">
              <Select value={config.reportPeriod} onChange={(v) => set('reportPeriod', v)} options={PERIOD_OPTIONS} style={{ width: '100%' }} />
            </FormRow>
            <FormRow label="报告范围">
              <Select
                value={config.scope} onChange={(v) => set('scope', v)}
                options={[
                  { value: 'self', label: '独立报告（本组织）' },
                  { value: 'consolidated', label: '合并报告（含所有下属）' },
                ]}
                style={{ width: '100%' }}
              />
            </FormRow>
            <FormRow label="核算标准">
              <Select
                value={config.standard} onChange={(v) => set('standard', v)}
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
                value={config.title} onChange={(v) => set('title', v)}
                placeholder={`${currentOrg?.name || ''} ${config.reportPeriod} 碳排放报告`}
              />
            </FormRow>
            <FormRow label="报告对象">
              <Input value={config.reportTo} onChange={(v) => set('reportTo', v)} />
            </FormRow>

            <div style={{ borderTop: '1px solid var(--c-border-lighter)', margin: '16px 0' }} />
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--c-text-secondary)', marginBottom: 10 }}>报告内容</div>
            {[
              { key: 'includeChart', label: '包含趋势图表' },
              { key: 'includeBenchmark', label: '包含行业对标' },
              { key: 'includeAppendix', label: '包含附录数据' },
            ].map(({ key, label }) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={(config as any)[key]} onChange={(e) => set(key, e.target.checked)} />
                {label}
              </label>
            ))}

            <div className="cc-flex gap-8" style={{ marginTop: 20, flexWrap: 'wrap' }}>
              <Button onClick={() => previewMut.mutate()} disabled={previewMut.isPending}>
                {previewMut.isPending ? <><span className="cc-spinner" />生成中...</> : '预览报告'}
              </Button>
              {preview && (
                <Button icon="print" onClick={handlePrint}>导出 PDF</Button>
              )}
              <Button variant="primary" icon="doc" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                {saveMut.isPending ? <><span className="cc-spinner" />生成中...</> : '生成并归档'}
              </Button>
            </div>
          </Panel>

          {/* Preview */}
          <Panel title="报告预览" extra={preview && <Button size="sm" icon="print" onClick={handlePrint}>打印/导出PDF</Button>}>
            {preview ? (
              <div style={{ padding: '4px 0' }}>
                <ReportPreview preview={preview} config={config} orgName={currentOrg?.name} />
              </div>
            ) : (
              <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--c-text-muted)', fontSize: 13 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
                点击「预览报告」生成完整报告预览
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
