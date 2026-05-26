import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOrg } from '@/contexts/OrgContext';
import { fetchDashboardOverview, fetchDashboardTrend } from '@/api/dashboard';
import { PageHeader, Panel, Button, Select, fmt, fmtPct } from '@/components/ui';
import { OrgSwitcher } from '@/layout/AppShell';
import dayjs from 'dayjs';

// ── Doughnut chart ────────────────────────────────────────────────
function Doughnut({ data, total }: { data: { value: number; color: string; label: string }[]; total: number }) {
  const r = 65, c = 80;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="cc-doughnut">
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--c-border-lighter)" strokeWidth="22" />
        {data.map((d, i) => {
          const len = (d.value / (total || 1)) * circ;
          const el = (
            <circle key={i} cx={c} cy={c} r={r} fill="none"
              stroke={d.color} strokeWidth="22"
              strokeDasharray={`${len} ${circ - len}`}
              strokeDashoffset={-offset} />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="center">
        <div>
          <div className="total">{fmt(total / 10000, 2)}</div>
          <div className="lbl">万 tCO₂e</div>
        </div>
      </div>
    </div>
  );
}

// ── Grouped bar chart (3 bars per month) ─────────────────────────
function GroupedBar({ data }: { data: { label: string; s1: number; s2: number; s3: number }[] }) {
  const max = Math.max(...data.flatMap(d => [d.s1, d.s2, d.s3]), 1);
  const w = 720, padL = 50, padR = 16, padB = 36, padT = 16;
  const chartW = w - padL - padR, chartH = 280 - padT - padB;
  const groupW = chartW / data.length;
  const barW = Math.min(14, groupW * 0.22);
  const barGap = Math.min(3, barW * 0.2);
  const colors = ['var(--c-scope1)', 'var(--c-scope2)', 'var(--c-scope3)'];

  // Y-axis scale
  const yMax = max * 1.15;

  return (
    <svg width="100%" viewBox={`0 0 ${w} 280`} preserveAspectRatio="none" style={{ width: '100%', height: 280 }}>
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const y = padT + chartH * (1 - t);
        const val = yMax * t;
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="var(--c-border-lighter)" strokeWidth="1" />
            <text x={padL - 6} y={y + 3} fontSize="10" fill="var(--c-text-muted)" textAnchor="end">
              {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0)}
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const cx = padL + i * groupW + groupW / 2;
        const totalBarWidth = 3 * barW + 2 * barGap;
        const startX = cx - totalBarWidth / 2;
        const segs = [d.s1, d.s2, d.s3];
        const baseY = padT + chartH;
        return (
          <g key={i}>
            {segs.map((v, j) => {
              const h = (v / yMax) * chartH;
              const x = startX + j * (barW + barGap);
              return (
                <rect key={j} x={x} y={baseY - h} width={barW} height={Math.max(h, 0)}
                  fill={colors[j]} opacity="0.9" rx={1}>
                  <title>范围{j + 1}: {fmt(v, 2)} tCO₂e</title>
                </rect>
              );
            })}
            <text x={cx} y={padT + chartH + 18} fontSize="10" fill="var(--c-text-muted)" textAnchor="middle">
              {d.label.slice(-5)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Horizontal bar ────────────────────────────────────────────────
function HBar({ data, max: maxProp }: { data: { label: string; value: number; color?: string }[]; max?: number }) {
  const m = maxProp || Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {data.map((d, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
            <span>{d.label}</span>
            <span style={{ color: 'var(--c-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{fmt(d.value, 1)} tCO₂e</span>
          </div>
          <div className="cc-bar-track">
            <div className="cc-bar-fill" style={{ width: (d.value / m * 100) + '%', background: d.color || 'var(--c-primary)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { orgId, currentOrg, setOrgId, flat } = useOrg();
  const [rangeMode, setRangeMode] = useState('12m');
  const [customStart, setCustomStart] = useState(dayjs().subtract(11, 'month').format('YYYY-MM'));
  const [customEnd, setCustomEnd] = useState(dayjs().format('YYYY-MM'));

  let periodStart: string, periodEnd: string;
  if (rangeMode === 'custom') {
    periodStart = customStart;
    periodEnd = customEnd;
  } else if (rangeMode === '6m') {
    periodEnd = dayjs().format('YYYY-MM');
    periodStart = dayjs().subtract(5, 'month').format('YYYY-MM');
  } else if (rangeMode === 'ytd') {
    periodEnd = dayjs().format('YYYY-MM');
    periodStart = dayjs().startOf('year').format('YYYY-MM');
  } else if (rangeMode === 'last-year') {
    periodEnd = dayjs().subtract(1, 'year').endOf('year').format('YYYY-MM');
    periodStart = dayjs().subtract(1, 'year').startOf('year').format('YYYY-MM');
  } else {
    // 12m default
    periodEnd = dayjs().format('YYYY-MM');
    periodStart = dayjs().subtract(11, 'month').format('YYYY-MM');
  }

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', orgId, periodStart, periodEnd],
    queryFn: () => fetchDashboardOverview({ orgId, periodStart, periodEnd, compareWith: 'prior' }),
    enabled: !!orgId,
  });

  const { data: trend } = useQuery({
    queryKey: ['dashboard-trend', orgId, periodStart, periodEnd],
    queryFn: () => fetchDashboardTrend({ orgId, periodStart, periodEnd, groupBy: 'month' }),
    enabled: !!orgId,
  });

  if (isLoading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--c-text-muted)' }}>数据加载中...</div>;
  if (!data) return null;

  const total: number = data.total || 0;
  const byScope: Record<number, number> = data.byScope || {};
  const byCategory: any[] = data.byCategory || [];
  const bySubOrg: any[] = data.bySubOrg || [];
  const stats: any = data.stats || {};
  const delta: number = stats.deltaPercent || 0;

  // Build monthly stacked data from trend API or byMonth
  const byMonth: any[] = (trend as any)?.months || data.byMonth || [];
  const monthly = byMonth.map((m: any) => ({
    label: m.period || m.month,
    s1: m.scope1 || m.s1 || 0,
    s2: m.scope2 || m.s2 || 0,
    s3: m.scope3 || m.s3 || 0,
  }));

  const scopeData = [
    { label: '范围一', value: byScope[1] || 0, color: 'var(--c-scope1)' },
    { label: '范围二', value: byScope[2] || 0, color: 'var(--c-scope2)' },
    { label: '范围三', value: byScope[3] || 0, color: 'var(--c-scope3)' },
  ];

  const catData = byCategory.map((c: any) => ({
    label: c.name, value: c.value || c.total || 0, color: c.color || 'var(--c-primary)'
  })).filter(c => c.value > 0).sort((a, b) => b.value - a.value);

  const subOrgData = bySubOrg.map((o: any) => ({
    id: o.id, label: o.name, value: o.total || o.value || 0, color: 'var(--c-primary)'
  })).filter((d: any) => d.value > 0).sort((a: any, b: any) => b.value - a.value);

  const intensity = stats.intensity || 0;

  return (
    <>
      <PageHeader
        title="组织碳排放数据看板"
        breadcrumb={['首页', '数据看板']}
        orgName={currentOrg?.name}
        extra={
          <div className="cc-flex gap-8 align-c" style={{ flexWrap: 'wrap' }}>
            <OrgSwitcher />
            <div style={{ width: 1, height: 24, background: 'var(--c-border)', margin: '0 4px' }} />
            <Select value={rangeMode} onChange={(v) => setRangeMode(v)} options={[
              { value: '12m', label: '近 12 个月' },
              { value: '6m', label: '近 6 个月' },
              { value: 'ytd', label: '本年至今' },
              { value: 'last-year', label: '上一年度' },
              { value: 'custom', label: '自定义范围' },
            ]} style={{ width: 140 }} />
            {rangeMode === 'custom' && (
              <>
                <input type="month" className="cc-input" value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  style={{ width: 140, height: 32, fontSize: 13, padding: '0 8px', border: '1px solid var(--c-border)', borderRadius: 4 }}
                />
                <span style={{ color: 'var(--c-text-muted)', fontSize: 13 }}>至</span>
                <input type="month" className="cc-input" value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  style={{ width: 140, height: 32, fontSize: 13, padding: '0 8px', border: '1px solid var(--c-border)', borderRadius: 4 }}
                />
              </>
            )}
            {rangeMode !== 'custom' && (
              <span style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>{periodStart} ~ {periodEnd}</span>
            )}
          </div>
        }
      />

      {/* Stats row 1 */}
      <div className="cc-grid cols-4">
        <div className="cc-stat accent-primary">
          <div className="label">总排放量（{periodStart} ~ {periodEnd}）</div>
          <div><span className="value">{fmt(total, 0)}</span><span className="unit">tCO₂e</span></div>
          <div className={'delta ' + (delta >= 0 ? 'up' : 'down')}>{fmtPct(delta)} 较上半年</div>
        </div>
        <div className="cc-stat accent-1">
          <div className="label">范围一 · 直接排放</div>
          <div><span className="value">{fmt(byScope[1] || 0, 0)}</span><span className="unit">tCO₂e</span></div>
          <div className="scope-bar"><span style={{ width: (total ? (byScope[1] || 0) / total * 100 : 0) + '%', background: 'var(--c-scope1)' }} /></div>
          <div style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>占比 {fmt(total ? (byScope[1] || 0) / total * 100 : 0, 1)}%</div>
        </div>
        <div className="cc-stat accent-2">
          <div className="label">范围二 · 能源间接</div>
          <div><span className="value">{fmt(byScope[2] || 0, 0)}</span><span className="unit">tCO₂e</span></div>
          <div className="scope-bar"><span style={{ width: (total ? (byScope[2] || 0) / total * 100 : 0) + '%', background: 'var(--c-scope2)' }} /></div>
          <div style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>占比 {fmt(total ? (byScope[2] || 0) / total * 100 : 0, 1)}%</div>
        </div>
        <div className="cc-stat accent-3">
          <div className="label">范围三 · 其他间接</div>
          <div><span className="value">{fmt(byScope[3] || 0, 0)}</span><span className="unit">tCO₂e</span></div>
          <div className="scope-bar"><span style={{ width: (total ? (byScope[3] || 0) / total * 100 : 0) + '%', background: 'var(--c-scope3)' }} /></div>
          <div style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>占比 {fmt(total ? (byScope[3] || 0) / total * 100 : 0, 1)}%</div>
        </div>
      </div>

      {/* Stats row 2 */}
      <div className="cc-grid cols-4">
        <div className="cc-stat">
          <div className="label">活动数据记录</div>
          <div><span className="value">{fmt(stats.entryCount || 0, 0)}</span><span className="unit">条</span></div>
          <div style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>含 {fmt(stats.manualCount || 0, 0)} 条手工填报</div>
        </div>
        <div className="cc-stat">
          <div className="label">下辖组织单元</div>
          <div><span className="value">{stats.descendantCount || 0}</span><span className="unit">个</span></div>
          <div style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>末级单元 {stats.leafCount || 0} 个</div>
        </div>
        <div className="cc-stat">
          <div className="label">排放强度</div>
          <div><span className="value">{fmt(intensity, 2)}</span><span className="unit">tCO₂e/人</span></div>
          <div style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>员工 {fmt(currentOrg?.employees || 0, 0)} 人</div>
        </div>
        <div className="cc-stat">
          <div className="label">核算标准</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-primary)', marginTop: 4 }}>ISO 14064-1:2018</div>
          <div style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>{currentOrg?.industryCode || ''} · v2024.1</div>
        </div>
      </div>

      {/* Charts — always visible */}
      <div className="cc-grid" style={{ gridTemplateColumns: '1fr 400px' }}>
        <Panel title="月度排放趋势（按范围）">
          {monthly.length > 0 ? (
            <>
              <GroupedBar data={monthly} />
              <div className="cc-flex gap-16" style={{ marginTop: 12, justifyContent: 'center', fontSize: 12, color: 'var(--c-text-secondary)' }}>
                {[['范围一', 'var(--c-scope1)'], ['范围二', 'var(--c-scope2)'], ['范围三', 'var(--c-scope3)']].map(([label, color]) => (
                  <span key={label} className="cc-flex gap-8 align-c">
                    <span style={{ width: 12, height: 12, background: color as string, borderRadius: 2, flexShrink: 0 }} />
                    {label}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--c-text-muted)', fontSize: 13 }}>
              当前组织在所选时间范围内暂无排放数据
            </div>
          )}
        </Panel>
        <Panel title="范围排放占比">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <Doughnut data={scopeData} total={total} />
            <div style={{ width: '100%' }}>
              {scopeData.map((d, i) => (
                <div key={i} className="cc-flex between align-c" style={{ padding: '6px 0', fontSize: 13 }}>
                  <span className="cc-flex gap-8 align-c">
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                    {d.label}
                  </span>
                  <span style={{ color: 'var(--c-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(d.value, 0)} ({fmt(total ? d.value / total * 100 : 0, 1)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      <div className="cc-grid cols-2">
        <Panel title="排放源类别分布">
          {catData.length > 0 ? (
            <HBar data={catData} />
          ) : (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--c-text-muted)', fontSize: 13 }}>
              暂无排放源类别数据
            </div>
          )}
        </Panel>
        <Panel title="下辖组织排放对比" extra={
          <span style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>共 {subOrgData.length} 个 · 点击可查看下级看板</span>
        }>
          {subOrgData.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {subOrgData.map((d: any, i: number) => {
                const m = Math.max(...subOrgData.map((x: any) => x.value), 1);
                return (
                  <div key={i}
                    style={{ cursor: 'pointer', borderRadius: 4, padding: '2px 0', transition: 'background 0.15s' }}
                    onClick={() => d.id && setOrgId(d.id)}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--c-primary-bg)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: 'var(--c-primary)', textDecoration: 'underline' }}>{d.label}</span>
                      <span style={{ color: 'var(--c-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{fmt(d.value, 1)} tCO₂e</span>
                    </div>
                    <div className="cc-bar-track">
                      <div className="cc-bar-fill" style={{ width: (d.value / m * 100) + '%', background: d.color || 'var(--c-primary)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--c-text-muted)', fontSize: 13 }}>
              当前组织暂无下辖组织排放数据
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
