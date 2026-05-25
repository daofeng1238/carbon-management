// Dashboard - 数据看板
const { useState, useMemo } = React;
const D_ = window.__CARBON_DATA;

// SVG doughnut chart
function Doughnut({ data, total }) {
  const r = 65, c = 80;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="cc-doughnut">
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--c-border-lighter)" strokeWidth="22" />
        {data.map((d, i) => {
          const len = (d.value / total) * circumference;
          const dash = `${len} ${circumference - len}`;
          const el = <circle key={i}
            cx={c} cy={c} r={r} fill="none"
            stroke={d.color} strokeWidth="22"
            strokeDasharray={dash}
            strokeDashoffset={-offset}
            style={{ transition: 'stroke-dashoffset .3s' }}
          />;
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

// SVG bar chart
function BarChart({ data, height = 220, color = 'var(--c-primary)' }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const w = 720, padL = 40, padR = 16, padB = 32, padT = 16;
  const chartW = w - padL - padR, chartH = height - padT - padB;
  const barW = chartW / data.length * 0.6;
  const gap = chartW / data.length;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height }}>
      {/* y-axis grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const y = padT + chartH * (1 - t);
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="var(--c-border-lighter)" strokeWidth="1" />
            <text x={padL - 6} y={y + 3} fontSize="10" fill="var(--c-text-muted)" textAnchor="end">
              {fmt(max * t / 1000, 1)}k
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const h = chartH * (d.value / max);
        const x = padL + i * gap + (gap - barW) / 2;
        const y = padT + chartH - h;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={h} fill={color} rx="2" opacity="0.9">
              <title>{d.label}: {fmt(d.value, 2)} tCO₂e</title>
            </rect>
            <text x={x + barW / 2} y={padT + chartH + 16} fontSize="10" fill="var(--c-text-muted)" textAnchor="middle">
              {d.label.slice(-5)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Stacked bar (scope1/2/3 per month)
function StackedBar({ data, height = 280 }) {
  const max = Math.max(...data.map(d => d.s1 + d.s2 + d.s3), 1);
  const w = 720, padL = 50, padR = 16, padB = 36, padT = 16;
  const chartW = w - padL - padR, chartH = height - padT - padB;
  const barW = chartW / data.length * 0.65;
  const gap = chartW / data.length;
  const colors = ['var(--c-scope1)', 'var(--c-scope2)', 'var(--c-scope3)'];
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height }}>
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const y = padT + chartH * (1 - t);
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="var(--c-border-lighter)" strokeWidth="1" />
            <text x={padL - 6} y={y + 3} fontSize="10" fill="var(--c-text-muted)" textAnchor="end">
              {fmt(max * t / 1000, 0)}k
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const x = padL + i * gap + (gap - barW) / 2;
        const segs = [d.s1, d.s2, d.s3];
        let yCursor = padT + chartH;
        return (
          <g key={i}>
            {segs.map((v, j) => {
              const h = chartH * (v / max);
              yCursor -= h;
              return (
                <rect key={j} x={x} y={yCursor} width={barW} height={h} fill={colors[j]} opacity="0.95">
                  <title>范围{j+1}: {fmt(v, 2)} tCO₂e</title>
                </rect>
              );
            })}
            <text x={x + barW / 2} y={padT + chartH + 18} fontSize="10" fill="var(--c-text-muted)" textAnchor="middle">
              {d.label.slice(-5)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Horizontal bar (orgs)
function HBar({ data, max }) {
  const m = max || Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {data.map((d, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
            <span style={{ color: 'var(--c-text-regular)' }}>{d.label}</span>
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

function Dashboard() {
  const { orgId, org, path } = useOrg();
  const [yearRange, setYearRange] = useState('12m');

  const periods = D_.PERIODS;
  const periodFilter = { start: periods[0], end: periods[periods.length - 1] };
  const cur = useMemo(() => D_.aggregate(orgId, periodFilter), [orgId]);

  // Compare with prior period (first half vs second half of 12 months)
  const half = Math.floor(periods.length / 2);
  const prior = D_.aggregate(orgId, { start: periods[0], end: periods[half - 1] });
  const latest = D_.aggregate(orgId, { start: periods[half], end: periods[periods.length - 1] });
  const delta = prior.total > 0 ? (latest.total - prior.total) / prior.total * 100 : 0;

  // monthly trend (stacked)
  const monthly = useMemo(() => {
    return periods.map(p => {
      const entries = cur.entries.filter(e => e.period === p);
      const s = { label: p, s1: 0, s2: 0, s3: 0 };
      entries.forEach(e => { s['s' + e.scope] += e.emission; });
      return s;
    });
  }, [cur.entries, periods]);

  // by category
  const byCategory = D_.EMISSION_CATEGORIES.map(c => ({
    label: c.name,
    value: cur.byCategory[c.code] || 0,
    color: c.color,
    scope: c.scope
  })).filter(c => c.value > 0).sort((a, b) => b.value - a.value);

  // by sub-org (children of current)
  const childOrgs = D_.ORG_FLAT.filter(o => o.parentId === orgId);
  const subOrgData = childOrgs.map(c => {
    const agg = D_.aggregate(c.id, periodFilter);
    return { label: c.name, value: agg.total, color: 'var(--c-primary)' };
  }).filter(d => d.value > 0).sort((a, b) => b.value - a.value);

  const scopeData = [
    { label: '范围一', value: cur.byScope[1] || 0, color: 'var(--c-scope1)' },
    { label: '范围二', value: cur.byScope[2] || 0, color: 'var(--c-scope2)' },
    { label: '范围三', value: cur.byScope[3] || 0, color: 'var(--c-scope3)' }
  ];

  // 排放强度 (per employee)
  const intensity = (org?.employees || 1) > 0 ? cur.total / (org.employees || 1) : 0;

  return (
    <>
      <PageHeader
        title="组织碳排放数据看板"
        breadcrumb={['首页', '数据看板']}
        extra={
          <>
            <Select value={yearRange} onChange={setYearRange} placeholder="" options={[
              { value: '12m', label: '近 12 个月' },
              { value: '6m', label: '近 6 个月' },
              { value: 'ytd', label: '本年至今' }
            ]} style={{ width: 140 }} />
            <Button icon="refresh">刷新数据</Button>
            <Button icon="download">导出看板</Button>
          </>
        }
      />

      {/* Stats row */}
      <div className="cc-grid cols-4">
        <div className="cc-stat accent-primary">
          <div className="label">总排放量（12个月）</div>
          <div>
            <span className="value">{fmt(cur.total, 0)}</span>
            <span className="unit">tCO₂e</span>
          </div>
          <div className={'delta ' + (delta >= 0 ? 'up' : 'down')}>
            {fmtPct(delta)} 较上半年 · 同口径
          </div>
        </div>
        <div className="cc-stat accent-1">
          <div className="label">范围一 · 直接排放</div>
          <div><span className="value">{fmt(cur.byScope[1], 0)}</span><span className="unit">tCO₂e</span></div>
          <div className="scope-bar">
            <span style={{ width: (cur.byScope[1] / cur.total * 100) + '%', background: 'var(--c-scope1)' }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>占比 {fmt(cur.byScope[1] / cur.total * 100, 1)}%</div>
        </div>
        <div className="cc-stat accent-2">
          <div className="label">范围二 · 能源间接</div>
          <div><span className="value">{fmt(cur.byScope[2], 0)}</span><span className="unit">tCO₂e</span></div>
          <div className="scope-bar">
            <span style={{ width: (cur.byScope[2] / cur.total * 100) + '%', background: 'var(--c-scope2)' }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>占比 {fmt(cur.byScope[2] / cur.total * 100, 1)}%</div>
        </div>
        <div className="cc-stat accent-3">
          <div className="label">范围三 · 其他间接</div>
          <div><span className="value">{fmt(cur.byScope[3], 0)}</span><span className="unit">tCO₂e</span></div>
          <div className="scope-bar">
            <span style={{ width: (cur.byScope[3] / cur.total * 100) + '%', background: 'var(--c-scope3)' }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>占比 {fmt(cur.byScope[3] / cur.total * 100, 1)}%</div>
        </div>
      </div>

      {/* Secondary stats */}
      <div className="cc-grid cols-4">
        <div className="cc-stat">
          <div className="label">活动数据记录</div>
          <div><span className="value">{fmt(cur.count, 0)}</span><span className="unit">条</span></div>
          <div style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>含 {fmt(cur.entries.filter(e => e.source === 'manual').length, 0)} 条手工填报</div>
        </div>
        <div className="cc-stat">
          <div className="label">下辖组织单元</div>
          <div><span className="value">{D_.getDescendants(orgId).length}</span><span className="unit">个</span></div>
          <div style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>含末级单元 {D_.getDescendants(orgId).map(id => D_.ORG_FLAT.find(o => o.id === id)).filter(o => o && o.level === 4).length} 个</div>
        </div>
        <div className="cc-stat">
          <div className="label">排放强度</div>
          <div><span className="value">{fmt(intensity, 2)}</span><span className="unit">tCO₂e/人</span></div>
          <div style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>员工总数 {fmt(org?.employees || 0, 0)} 人</div>
        </div>
        <div className="cc-stat">
          <div className="label">核算标准</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-primary)', marginTop: 4, lineHeight: 1.4 }}>
            ISO 14064-1:2018
          </div>
          <div style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>{getIndustryShort(org?.industry)}行业指南 · v2024.1</div>
        </div>
      </div>

      {/* Charts grid */}
      <div className="cc-grid" style={{ gridTemplateColumns: '1fr 400px' }}>
        <Panel title="月度排放趋势（按范围）">
          <StackedBar data={monthly} />
          <div className="cc-flex gap-16" style={{ marginTop: 12, justifyContent: 'center', fontSize: 12, color: 'var(--c-text-secondary)' }}>
            <span className="cc-flex gap-8 align-c"><span style={{ width: 12, height: 12, background: 'var(--c-scope1)', borderRadius: 2 }} /> 范围一</span>
            <span className="cc-flex gap-8 align-c"><span style={{ width: 12, height: 12, background: 'var(--c-scope2)', borderRadius: 2 }} /> 范围二</span>
            <span className="cc-flex gap-8 align-c"><span style={{ width: 12, height: 12, background: 'var(--c-scope3)', borderRadius: 2 }} /> 范围三</span>
          </div>
        </Panel>
        <Panel title="范围排放占比">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <Doughnut data={scopeData} total={cur.total} />
            <div style={{ width: '100%' }}>
              {scopeData.map((d, i) => (
                <div key={i} className="cc-flex between align-c" style={{ padding: '6px 0', fontSize: 13 }}>
                  <span className="cc-flex gap-8 align-c">
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: d.color }} />
                    {d.label}
                  </span>
                  <span style={{ color: 'var(--c-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(d.value, 0)} ({fmt(d.value / cur.total * 100, 1)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      <div className="cc-grid cols-2">
        <Panel title="排放源类别分布" extra={<a onClick={() => location.hash = 'data-entry'} style={{ fontSize: 12, cursor: 'pointer' }}>查看明细 →</a>}>
          <HBar data={byCategory} />
        </Panel>
        {subOrgData.length > 0 ? (
          <Panel title="下辖组织排放对比" extra={<span style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>共 {subOrgData.length} 个</span>}>
            <HBar data={subOrgData} />
          </Panel>
        ) : (
          <Panel title="行业指标对比">
            <div style={{ padding: '12px 0' }}>
              <div style={{ fontSize: 13, color: 'var(--c-text-secondary)', marginBottom: 12 }}>
                {getIndustryShort(org?.industry)}行业基准对比（每万元产值 tCO₂e）
              </div>
              <HBar data={[
                { label: '本组织 ' + org.name, value: 2.81, color: 'var(--c-primary)' },
                { label: '行业领先水平', value: 1.96, color: 'var(--c-success)' },
                { label: '行业平均水平', value: 3.45, color: 'var(--c-info)' },
                { label: '行业落后水平', value: 5.12, color: 'var(--c-warning)' }
              ]} max={6} />
              <div style={{ marginTop: 12, padding: 10, background: 'var(--c-warning-bg)', color: 'var(--c-warning)', borderRadius: 4, fontSize: 12 }}>
                <Icon name="info" size={14} /> 较行业平均水平降低 18.5%，但距离领先水平仍有 43.4% 改善空间
              </div>
            </div>
          </Panel>
        )}
      </div>
    </>
  );
}

window.Dashboard = Dashboard;
