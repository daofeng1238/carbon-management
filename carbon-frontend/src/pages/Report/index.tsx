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

/* Industry benchmark data: average emission intensity (tCO₂e per employee) by industry */
const INDUSTRY_BENCHMARKS: Record<string, { name: string; avg: number; low: number; high: number }> = {
  POWER:     { name: '发电企业', avg: 85.0, low: 45, high: 160 },
  GRID:      { name: '电网企业', avg: 12.5, low: 6, high: 22 },
  STEEL:     { name: '钢铁生产', avg: 120.0, low: 70, high: 200 },
  CEMENT:    { name: '水泥生产', avg: 95.0, low: 50, high: 150 },
  ALUMINUM:  { name: '电解铝生产', avg: 110.0, low: 65, high: 180 },
  FLAT_GLASS:{ name: '平板玻璃', avg: 60.0, low: 30, high: 100 },
  CHEMICAL:  { name: '化工生产', avg: 45.0, low: 20, high: 80 },
  PAPER:     { name: '造纸和纸制品', avg: 35.0, low: 15, high: 60 },
  AVIATION:  { name: '民用航空', avg: 55.0, low: 30, high: 90 },
  PETROCHEM: { name: '石油化工', avg: 75.0, low: 40, high: 120 },
  PETROLEUM: { name: '石油天然气', avg: 65.0, low: 35, high: 110 },
  CERAMIC:   { name: '陶瓷生产', avg: 50.0, low: 25, high: 85 },
  NONFERROUS:{ name: '有色金属', avg: 55.0, low: 30, high: 95 },
  FOOD:      { name: '食品饮料', avg: 8.5, low: 3, high: 18 },
  TEXTILE:   { name: '纺织服装', avg: 12.0, low: 5, high: 25 },
  ELECTRONICS:{ name: '电子设备制造', avg: 5.5, low: 2, high: 12 },
  MACHINERY: { name: '机械设备制造', avg: 10.0, low: 4, high: 20 },
  MINING:    { name: '煤炭开采', avg: 80.0, low: 40, high: 140 },
  BUILDING:  { name: '建筑业', avg: 7.0, low: 3, high: 15 },
  TRANSPORT: { name: '交通运输', avg: 18.0, low: 8, high: 35 },
  HOTEL:     { name: '酒店和商业', avg: 6.0, low: 2, high: 12 },
  IT:        { name: '信息技术', avg: 3.5, low: 1, high: 8 },
  GENERAL:   { name: '综合行业', avg: 15.0, low: 5, high: 40 },
};

const SCOPE_COLORS = { s1: '#d97757', s2: '#4a86e8', s3: '#36c4a8' };

function TrendChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return null;

  const W = 700, H = 260, PL = 60, PR = 20, PT = 20, PB = 50;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;
  const maxVal = Math.max(...data.map((d) => d.total || 0), 1);
  const barW = Math.min(40, (chartW / data.length) * 0.7);
  const gap = chartW / data.length;

  // Y-axis ticks
  const yTicks: number[] = [];
  const step = Math.ceil(maxVal / 5 / (10 ** Math.floor(Math.log10(maxVal / 5)))) * (10 ** Math.floor(Math.log10(maxVal / 5)));
  for (let v = 0; v <= maxVal * 1.1; v += step) yTicks.push(v);
  if (yTicks.length < 2) yTicks.push(maxVal);
  const yMax = yTicks[yTicks.length - 1] || maxVal;

  const scaleY = (v: number) => PT + chartH - (v / yMax) * chartH;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', margin: '0 auto' }}>
      {/* Grid lines */}
      {yTicks.map((v, i) => (
        <g key={i}>
          <line x1={PL} y1={scaleY(v)} x2={W - PR} y2={scaleY(v)} stroke="#e8e8e8" strokeDasharray={v === 0 ? '' : '3,3'} />
          <text x={PL - 8} y={scaleY(v) + 4} textAnchor="end" fontSize={10} fill="#999">{v >= 1000 ? `${(v/1000).toFixed(0)}k` : v.toFixed(0)}</text>
        </g>
      ))}
      {/* Y-axis label */}
      <text x={12} y={PT + chartH / 2} textAnchor="middle" fontSize={10} fill="#999" transform={`rotate(-90, 12, ${PT + chartH / 2})`}>tCO₂e</text>
      {/* Bars */}
      {data.map((d, i) => {
        const cx = PL + i * gap + gap / 2;
        const s1h = ((d.s1 || 0) / yMax) * chartH;
        const s2h = ((d.s2 || 0) / yMax) * chartH;
        const s3h = ((d.s3 || 0) / yMax) * chartH;
        const baseY = scaleY(0);
        return (
          <g key={i}>
            {/* Scope 1 bar (bottom) */}
            <rect x={cx - barW / 2} y={baseY - s1h} width={barW} height={Math.max(s1h, 0)} fill={SCOPE_COLORS.s1} rx={1} />
            {/* Scope 2 bar (middle) */}
            <rect x={cx - barW / 2} y={baseY - s1h - s2h} width={barW} height={Math.max(s2h, 0)} fill={SCOPE_COLORS.s2} rx={1} />
            {/* Scope 3 bar (top) */}
            <rect x={cx - barW / 2} y={baseY - s1h - s2h - s3h} width={barW} height={Math.max(s3h, 0)} fill={SCOPE_COLORS.s3} rx={1} />
            {/* X label */}
            <text x={cx} y={H - PB + 16} textAnchor="middle" fontSize={10} fill="#666">
              {d.period?.length > 5 ? d.period.substring(5) + '月' : d.period}
            </text>
          </g>
        );
      })}
      {/* Legend */}
      {[
        { label: '范围一 (直接排放)', color: SCOPE_COLORS.s1 },
        { label: '范围二 (能源间接)', color: SCOPE_COLORS.s2 },
        { label: '范围三 (其他间接)', color: SCOPE_COLORS.s3 },
      ].map((item, i) => (
        <g key={i} transform={`translate(${PL + i * 160}, ${H - 10})`}>
          <rect x={0} y={-8} width={12} height={12} fill={item.color} rx={2} />
          <text x={16} y={2} fontSize={10} fill="#666">{item.label}</text>
        </g>
      ))}
    </svg>
  );
}

function BenchmarkChart({ orgIntensity, benchmark }: { orgIntensity: number; benchmark: { name: string; avg: number; low: number; high: number } }) {
  const W = 500, H = 100;
  const maxVal = Math.max(orgIntensity, benchmark.high) * 1.3;
  const scale = (v: number) => 60 + (v / maxVal) * (W - 80);

  const orgX = scale(orgIntensity);
  const avgX = scale(benchmark.avg);
  const lowX = scale(benchmark.low);
  const highX = scale(benchmark.high);

  const isGood = orgIntensity <= benchmark.avg;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', margin: '0 auto' }}>
      {/* Baseline */}
      <line x1={60} y1={50} x2={W - 20} y2={50} stroke="#e0e0e0" strokeWidth={1} />
      {/* Industry range bar */}
      <rect x={lowX} y={42} width={highX - lowX} height={16} fill="#f0f0f0" rx={8} stroke="#ccc" strokeWidth={0.5} />
      {/* Average marker */}
      <line x1={avgX} y1={36} x2={avgX} y2={64} stroke="#888" strokeWidth={2} strokeDasharray="3,2" />
      <text x={avgX} y={30} textAnchor="middle" fontSize={9} fill="#888">行业均值</text>
      <text x={avgX} y={78} textAnchor="middle" fontSize={9} fill="#888">{benchmark.avg.toFixed(1)}</text>
      {/* Org marker */}
      <circle cx={orgX} cy={50} r={7} fill={isGood ? '#2d6a4f' : '#d97757'} />
      <text x={orgX} y={30} textAnchor="middle" fontSize={10} fontWeight={600} fill={isGood ? '#2d6a4f' : '#d97757'}>本组织</text>
      <text x={orgX} y={78} textAnchor="middle" fontSize={10} fontWeight={600} fill={isGood ? '#2d6a4f' : '#d97757'}>{orgIntensity.toFixed(2)}</text>
      {/* Range labels */}
      <text x={lowX} y={90} textAnchor="middle" fontSize={8} fill="#aaa">低 {benchmark.low}</text>
      <text x={highX} y={90} textAnchor="middle" fontSize={8} fill="#aaa">高 {benchmark.high}</text>
    </svg>
  );
}

function ReportPreview({ preview, config, orgName }: { preview: any; config: any; orgName?: string }) {
  const byScope = preview.byScope || {};
  const byCategory: any[] = preview.byCategory || [];
  const total = preview.total || 0;
  const orgInfo = preview.orgInfo || {};
  const byMonth: any[] = preview.byMonth || [];
  const stats = preview.stats || {};

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

      {/* Section 4b: Trend Chart (SVG) */}
      {byMonth.length > 0 && config.includeChart && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, borderLeft: '3px solid #2d6a4f', paddingLeft: 8, marginBottom: 10 }}>
            五、月度排放趋势图
          </div>
          <div style={{ border: '1px solid #e8e8e8', borderRadius: 6, padding: '16px 8px', background: '#fafbfc' }}>
            <TrendChart data={byMonth.slice(-12)} />
          </div>
          <div style={{ fontSize: 11, color: '#999', marginTop: 6 }}>
            * 图表展示报告期内最近 12 个月的温室气体排放趋势，按范围分类堆叠显示。
          </div>
        </div>
      )}

      {/* Section 5/6: Industry Benchmark */}
      {config.includeBenchmark && (() => {
        const industryCode = orgInfo.industry || 'GENERAL';
        const bm = INDUSTRY_BENCHMARKS[industryCode] || INDUSTRY_BENCHMARKS['GENERAL'];
        const employees = orgInfo.employees || 1;
        const orgIntensity = total > 0 ? total / employees : 0;
        const sectionNum = byMonth.length > 0 && config.includeChart ? '六' : '五';
        const isBelow = orgIntensity <= bm.avg;
        const pctDiff = bm.avg > 0 ? Math.abs((orgIntensity - bm.avg) / bm.avg * 100) : 0;

        return (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, borderLeft: '3px solid #2d6a4f', paddingLeft: 8, marginBottom: 10 }}>
              {sectionNum}、行业对标分析
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 12 }}>
              <thead>
                <tr style={{ background: '#f0f7f2', fontWeight: 600 }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid #e0e0e0' }}>指标</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0' }}>本组织</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0' }}>行业均值</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0' }}>行业范围</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #e0e0e0' }}>对标结果</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '7px 12px', border: '1px solid #e0e0e0', fontWeight: 500 }}>碳排放强度（tCO₂e/人）</td>
                  <td style={{ padding: '7px 12px', border: '1px solid #e0e0e0', textAlign: 'right', fontWeight: 700, color: isBelow ? '#2d6a4f' : '#d97757', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(orgIntensity, 2)}
                  </td>
                  <td style={{ padding: '7px 12px', border: '1px solid #e0e0e0', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(bm.avg, 1)}
                  </td>
                  <td style={{ padding: '7px 12px', border: '1px solid #e0e0e0', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {bm.low} ~ {bm.high}
                  </td>
                  <td style={{ padding: '7px 12px', border: '1px solid #e0e0e0', textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 10px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                      background: isBelow ? '#e8f4ea' : '#fff0eb', color: isBelow ? '#2d6a4f' : '#d97757',
                    }}>
                      {isBelow ? `优于均值 ${fmt(pctDiff, 1)}%` : `高于均值 ${fmt(pctDiff, 1)}%`}
                    </span>
                  </td>
                </tr>
                <tr style={{ background: '#f8f9fa' }}>
                  <td style={{ padding: '7px 12px', border: '1px solid #e0e0e0', fontWeight: 500 }}>年度总排放量（tCO₂e）</td>
                  <td style={{ padding: '7px 12px', border: '1px solid #e0e0e0', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(total, 2)}
                  </td>
                  <td colSpan={3} style={{ padding: '7px 12px', border: '1px solid #e0e0e0', textAlign: 'center', color: '#888', fontSize: 12 }}>
                    参考行业：{bm.name}（员工人数：{employees.toLocaleString()} 人）
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Visual benchmark comparison */}
            <div style={{ border: '1px solid #e8e8e8', borderRadius: 6, padding: '12px 8px', background: '#fafbfc' }}>
              <BenchmarkChart orgIntensity={orgIntensity} benchmark={bm} />
            </div>
            <div style={{ fontSize: 11, color: '#999', marginTop: 6 }}>
              * 行业对标数据来源于国家发展改革委发布的行业温室气体排放基准值，碳排放强度 = 年度总排放量 ÷ 员工人数。
              圆点为本组织排放强度，虚线为行业平均水平，灰色区间为行业正常范围。
            </div>
          </div>
        );
      })()}

      {/* Section: Reduction Recommendations */}
      {config.includeBenchmark && (() => {
        const industryCode = orgInfo.industry || 'GENERAL';
        const bm = INDUSTRY_BENCHMARKS[industryCode] || INDUSTRY_BENCHMARKS['GENERAL'];
        const employees = orgInfo.employees || 1;
        const orgIntensity = total > 0 ? total / employees : 0;
        const isBelow = orgIntensity <= bm.avg;
        const sectionNum = byMonth.length > 0 && config.includeChart ? '七' : '六';
        const maxScope = (byScope[1] || 0) >= (byScope[2] || 0) && (byScope[1] || 0) >= (byScope[3] || 0)
          ? '范围一（直接排放）' : (byScope[2] || 0) >= (byScope[3] || 0) ? '范围二（能源间接排放）' : '范围三（其他间接排放）';

        return (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, borderLeft: '3px solid #2d6a4f', paddingLeft: 8, marginBottom: 10 }}>
              {sectionNum}、减排建议
            </div>
            <div style={{ padding: '10px 14px', background: isBelow ? '#f0faf2' : '#fff8f0', borderRadius: 6, fontSize: 13, lineHeight: 1.8 }}>
              <p style={{ marginBottom: 8 }}>
                根据对标分析，本组织碳排放强度 <strong>{fmt(orgIntensity, 2)} tCO₂e/人</strong>，
                {isBelow ? '低于' : '高于'}行业平均水平（{bm.avg} tCO₂e/人）。
                当前排放占比最大的来源为 <strong>{maxScope}</strong>，建议优先从该领域开展减排工作。
              </p>
              <ul style={{ paddingLeft: 20, margin: 0 }}>
                {(byScope[1] || 0) > 0 && <li>范围一：优化燃料结构，提升设备能效，推进清洁能源替代。</li>}
                {(byScope[2] || 0) > 0 && <li>范围二：提高可再生能源使用比例，推动绿色电力采购，优化用能管理。</li>}
                {(byScope[3] || 0) > 0 && <li>范围三：优化物流运输方式，推广远程办公，加强供应链碳管理。</li>}
                <li>建立碳排放目标管理体系，设定年度减排目标和中长期碳中和路线图。</li>
              </ul>
            </div>
          </div>
        );
      })()}

      {/* Declaration */}
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
    includeBenchmark: true,
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
