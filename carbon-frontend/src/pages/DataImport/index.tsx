import React, { useState, useRef } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { importEntries, downloadTemplate } from '@/api/entries';
import { PageHeader, Panel, Button, Select, Table, fmt } from '@/components/ui';
import { Icon } from '@/components/ui';

const INDUSTRIES = [
  { value: 'POWER', label: '电力' },
  { value: 'STEEL', label: '钢铁' },
  { value: 'CHEMICAL', label: '化工' },
  { value: 'CEMENT', label: '水泥' },
  { value: 'ALUMINUM', label: '铝冶炼' },
  { value: 'PAPER', label: '造纸' },
  { value: 'TEXTILE', label: '纺织' },
  { value: 'GENERAL', label: '通用' },
];

export default function DataImport() {
  const { currentOrg } = useOrg();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [options, setOptions] = useState({ conflictPolicy: 'skip', importStatus: 'draft', validateRange: true });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [industry, setIndustry] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptFile = (f: File) => {
    if (!f.name.match(/\.(xlsx|xls)$/i)) { setError('仅支持 .xlsx / .xls 文件'); return; }
    if (f.size > 10 * 1024 * 1024) { setError('文件大小不能超过 10MB'); return; }
    setFile(f);
    setError('');
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) acceptFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) acceptFile(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const res: any = await importEntries(file, options);
      setResult(res);
      setStep(3);
    } catch (err: any) {
      setError(err.message || '导入失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep(1); setFile(null); setResult(null); setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const steps = ['下载模板', '上传文件', '导入结果'];

  const errorColumns = [
    { key: 'row', title: '行号', width: 60 },
    { key: 'org', title: '组织', minWidth: 100 },
    { key: 'factor', title: '因子', minWidth: 100 },
    { key: 'col', title: '列', width: 80 },
    { key: 'reason', title: '原因', minWidth: 140 },
  ];

  return (
    <>
      <PageHeader
        title="批量数据导入"
        breadcrumb={['首页', '数据填报', '批量导入']}
        orgName={currentOrg?.name}
        extra={
          <Button icon="edit" onClick={() => window.location.hash = '#/data-entry'}>
            返回填报
          </Button>
        }
      />

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 20, padding: '0 4px' }}>
        {steps.map((s, i) => (
          <React.Fragment key={i}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 600, flexShrink: 0,
                background: step === i + 1 ? 'var(--c-primary)' : step > i + 1 ? 'var(--c-success)' : 'var(--c-border-light)',
                color: step >= i + 1 ? '#fff' : 'var(--c-text-muted)',
              }}>
                {step > i + 1 ? <Icon name="check" size={14} /> : i + 1}
              </div>
              <span style={{
                fontSize: 13,
                color: step === i + 1 ? 'var(--c-primary)' : step > i + 1 ? 'var(--c-text-regular)' : 'var(--c-text-muted)',
                fontWeight: step === i + 1 ? 600 : 400,
              }}>{s}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 1, background: step > i + 1 ? 'var(--c-success)' : 'var(--c-border-light)', margin: '0 12px' }} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Download Template */}
      {step === 1 && (
        <>
          {/* Info banner */}
          <div style={{
            background: 'var(--c-primary-bg)', border: '1px solid #b8ddd0', borderRadius: 6,
            padding: '10px 16px', marginBottom: 20, fontSize: 13, color: '#333',
            display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            <span style={{ color: 'var(--c-primary)', fontSize: 15, marginTop: 1, flexShrink: 0 }}>&#9432;</span>
            <span>
              请按模板填写排放活动数据。模板包含 <strong>组织编码</strong>、<strong>报告期</strong>、<strong>排放类别</strong>、<strong>排放因子编码</strong>、<strong>活动数据</strong>、<strong>单位</strong> 等必填字段。组织编码必须为当前用户有权限访问的组织节点。
            </span>
          </div>

          {/* Two template cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            {/* Standard template card */}
            <Panel>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 8, background: 'var(--c-primary-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon name="doc" size={24} color="var(--c-primary)" />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--c-text-primary)', marginBottom: 4 }}>标准排放数据导入模板</div>
                  <div style={{ fontSize: 13, color: 'var(--c-text-muted)' }}>适用 ISO 14064-1 通用结构</div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--c-text-secondary)', marginBottom: 20, lineHeight: 1.8 }}>
                字段：组织编码、组织完整路径、报告期、排放类别、排放因子编码、活动数据、数量单位、备注
              </div>
              <Button variant="primary" icon="download" onClick={() => downloadTemplate()}>
                下载通用模板
              </Button>
            </Panel>

            {/* Industry template card */}
            <Panel>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 8, background: 'var(--c-primary-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon name="doc" size={24} color="var(--c-primary)" />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--c-text-primary)', marginBottom: 4 }}>行业专用模板</div>
                  <div style={{ fontSize: 13, color: 'var(--c-text-muted)' }}>含行业专用因子预填</div>
                </div>
              </div>
              <Select
                value={industry}
                onChange={setIndustry}
                placeholder="选择行业"
                options={INDUSTRIES}
                style={{ width: '100%', marginBottom: 16 }}
              />
              <Button icon="download" onClick={() => downloadTemplate(industry || undefined)} disabled={!industry}>
                下载行业模板
              </Button>
            </Panel>
          </div>

          {/* Next step button */}
          <div style={{ textAlign: 'center' }}>
            <Button variant="primary" onClick={() => setStep(2)} style={{ padding: '10px 40px', fontSize: 15 }}>
              已下载模板，下一步
            </Button>
          </div>
        </>
      )}

      {/* Step 2: Upload File + Config */}
      {step === 2 && (
        <Panel title="上传文件">
          {!file ? (
            <div
              className={'cc-upload-zone' + (dragging ? ' dragging' : '')}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <div style={{ fontSize: 36, color: 'var(--c-primary)', marginBottom: 12, lineHeight: 1 }}>
                <Icon name="upload" size={48} color="var(--c-primary)" />
              </div>
              <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--c-text-regular)', marginBottom: 6 }}>
                点击或拖拽 Excel 文件到此处上传
              </div>
              <div style={{ fontSize: 13, color: 'var(--c-text-muted)' }}>支持 .xlsx / .xls 格式，文件不超过 10MB</div>
              {error && (
                <div style={{ marginTop: 12, color: 'var(--c-danger)', fontSize: 13 }}>{error}</div>
              )}
              <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFilePick} />
            </div>
          ) : (
            <>
              {/* File info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--c-bg-page)', borderRadius: 6, marginBottom: 20 }}>
                <Icon name="doc" size={18} color="var(--c-primary)" />
                <span style={{ fontSize: 14, fontWeight: 500 }}>{file.name}</span>
                <span style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>({(file.size / 1024).toFixed(1)} KB)</span>
                <span style={{ marginLeft: 'auto', cursor: 'pointer', color: 'var(--c-text-muted)', fontSize: 12 }}
                  onClick={() => { setFile(null); if (inputRef.current) inputRef.current.value = ''; }}>
                  重新选择
                </span>
                <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFilePick} />
              </div>

              {/* Import options */}
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-primary)', marginBottom: 12 }}>配置导入选项</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px', maxWidth: 560 }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--c-text-secondary)', marginBottom: 6 }}>冲突处理方式</div>
                  <Select
                    value={options.conflictPolicy}
                    onChange={(v) => setOptions({ ...options, conflictPolicy: v })}
                    style={{ width: '100%' }}
                    options={[
                      { value: 'skip', label: '跳过（保留已有数据）' },
                      { value: 'update', label: '覆盖（用新数据替换）' },
                      { value: 'error', label: '报错（遇冲突中止）' },
                    ]}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--c-text-secondary)', marginBottom: 6 }}>导入后状态</div>
                  <Select
                    value={options.importStatus}
                    onChange={(v) => setOptions({ ...options, importStatus: v })}
                    style={{ width: '100%' }}
                    options={[
                      { value: 'draft', label: '草稿' },
                      { value: 'submitted', label: '直接提交审核' },
                    ]}
                  />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, cursor: 'pointer', fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={options.validateRange}
                  onChange={(e) => setOptions({ ...options, validateRange: e.target.checked })}
                />
                <span>开启异常范围校验（超出行业典型值 10 倍时标记警告）</span>
              </label>

              {error && (
                <div className="cc-alert danger" style={{ marginTop: 16 }}>
                  <Icon name="warning" size={14} /><span>{error}</span>
                </div>
              )}

              <div className="cc-flex gap-8" style={{ marginTop: 24 }}>
                <Button onClick={() => { setStep(1); setFile(null); setError(''); }}>上一步</Button>
                <Button variant="primary" icon="upload" onClick={handleImport} disabled={loading}>
                  {loading ? <><span className="cc-spinner" />导入中...</> : '开始导入'}
                </Button>
              </div>
            </>
          )}
        </Panel>
      )}

      {/* Step 3: Results */}
      {step === 3 && result && (
        <Panel title="导入结果">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: '导入成功', value: result.success, color: 'var(--c-success)' },
              { label: '导入失败', value: result.failed, color: 'var(--c-danger)' },
              { label: '已跳过', value: result.skipped, color: 'var(--c-warning)' },
              { label: '总计', value: result.total, color: 'var(--c-primary)' },
            ].map((s) => (
              <div key={s.label} style={{
                background: 'var(--c-bg-page)', borderRadius: 8, padding: '16px 20px', textAlign: 'center',
                border: `2px solid ${s.color}20`,
              }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{fmt(s.value, 0)}</div>
                <div style={{ fontSize: 13, color: 'var(--c-text-muted)', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {result.errorRows?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-regular)' }}>错误明细（共 {result.errorRows.length} 行）</div>
                <Button size="sm" icon="download" onClick={() => {
                  const header = ['行号', '组织编码', '排放因子', '列', '错误原因'];
                  const rows = result.errorRows.map((r: any) => [r.row, r.org || '', r.factor || '', r.col || '', r.reason || '']);
                  const csv = [header, ...rows].map((r: any[]) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
                  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = 'import_errors.csv'; a.click();
                  URL.revokeObjectURL(url);
                }}>下载错误报告</Button>
              </div>
              <Table columns={errorColumns} data={result.errorRows} rowKey="row" />
            </div>
          )}

          <Button variant="primary" icon="upload" onClick={handleReset}>再次导入</Button>
        </Panel>
      )}
    </>
  );
}
