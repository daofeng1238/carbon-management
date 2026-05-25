// Shell: header (with org cascader) + sidebar + router
const { useState, useEffect, useRef, useMemo, useCallback } = React;
const D = window.__CARBON_DATA;

// ─── Org context ────────────────────────────────────────────────
const OrgCtx = React.createContext(null);

function OrgProvider({ children, orgDepthLimit, industryFocus }) {
  // Default to group (level 1)
  const [orgId, setOrgId] = useState('org-001');
  
  // When industry focus changes, jump to that板块 if found
  useEffect(() => {
    if (!industryFocus || industryFocus === 'ALL') return;
    const target = D.ORG_FLAT.find(o => o.level === 2 && o.industry === industryFocus);
    if (target) setOrgId(target.id);
  }, [industryFocus]);

  const value = useMemo(() => ({
    orgId,
    setOrgId,
    org: D.ORG_FLAT.find(o => o.id === orgId),
    path: D.getOrgPath(orgId),
    descendants: D.getDescendants(orgId),
    orgDepthLimit
  }), [orgId, orgDepthLimit]);

  return <OrgCtx.Provider value={value}>{children}</OrgCtx.Provider>;
}
const useOrg = () => React.useContext(OrgCtx);

// Filtered tree by depth limit
function filterTree(node, maxLevel) {
  if (node.level > maxLevel) return null;
  return {
    ...node,
    children: (node.children || [])
      .map(c => filterTree(c, maxLevel))
      .filter(Boolean)
  };
}

// ─── Org Switcher (cascading dropdown in header) ────────────────
function OrgSwitcher() {
  const { org, path, setOrgId, orgDepthLimit } = useOrg();
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState([]);  // hovered node at each column
  const ref = useRef(null);
  const limit = orgDepthLimit || 4;

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // When opening, initialize columns from current path
  useEffect(() => {
    if (open) setHover(path.map(p => p.id));
  }, [open]);

  const tree = filterTree(D.ORG_TREE, limit);
  // build columns based on hover
  const columns = [];
  let cur = tree;
  for (let i = 0; cur && cur.children && cur.children.length; i++) {
    columns.push(cur.children);
    const selectedId = hover[i + 1];
    cur = cur.children.find(c => c.id === selectedId);
    if (!selectedId) break;
  }
  // also show root as col 0
  const allCols = [[tree], ...columns];

  const choose = (node, colIdx) => {
    const newHover = hover.slice(0, colIdx + 1);
    newHover[colIdx] = node.id;
    setHover(newHover);
    if (!node.children || node.children.length === 0 || colIdx === limit - 1) {
      setOrgId(node.id);
      setOpen(false);
    }
  };

  const pathLabel = path.map(p => p.name).join(' / ');

  return (
    <div className="cc-org-switcher" ref={ref} onClick={() => setOpen(v => !v)}>
      <span className="org-label">组织：</span>
      <span className="org-name" title={pathLabel}>{pathLabel}</span>
      <span className="caret"><Icon name="chevronDown" size={10} /></span>
      {open && (
        <div className="cc-pop-cascader" onClick={(e) => e.stopPropagation()}>
          {allCols.map((col, idx) => (
            <div key={idx} className="cc-pop-col">
              {col.map(n => {
                const isLeaf = !n.children || n.children.length === 0 || idx === limit - 1;
                const isActive = hover[idx] === n.id;
                return (
                  <div key={n.id}
                       className={'cc-pop-item' + (isActive ? ' active' : '') + (isLeaf ? ' leaf' : '')}
                       onMouseEnter={() => {
                         if (!isLeaf) {
                           const h = hover.slice(0, idx);
                           h[idx] = n.id;
                           setHover(h);
                         }
                       }}
                       onClick={() => choose(n, idx)}>
                    <span>{n.name}</span>
                    {!isLeaf && <span className="arrow"><Icon name="chevronRight" size={10} /></span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sidebar nav items ──────────────────────────────────────────
const NAV_ITEMS = [
  { group: '碳排放管理', items: [
    { id: 'dashboard', label: '数据看板',    icon: 'dashboard' },
    { id: 'data-entry', label: '数据填报',   icon: 'edit' },
    { id: 'data-import', label: '批量导入',  icon: 'upload' }
  ]},
  { group: '配置中心', items: [
    { id: 'factor-library', label: '排放因子库', icon: 'book' },
    { id: 'organization',  label: '组织架构',    icon: 'tree' }
  ]},
  { group: '报告', items: [
    { id: 'report', label: '报告生成', icon: 'doc' }
  ]}
];

function Sidebar({ collapsed, route, onNavigate }) {
  return (
    <aside className="cc-sidebar">
      {NAV_ITEMS.map(g => (
        <React.Fragment key={g.group}>
          <div className="cc-nav-group-label">{g.group}</div>
          {g.items.map(it => (
            <a key={it.id}
               className={'cc-nav-item' + (route === it.id ? ' active' : '')}
               onClick={(e) => { e.preventDefault(); onNavigate(it.id); }}
               href={'#' + it.id}>
              <Icon name={it.icon} size={16} />
              <span className="label">{it.label}</span>
            </a>
          ))}
        </React.Fragment>
      ))}
    </aside>
  );
}

// ─── Header ─────────────────────────────────────────────────────
function Header({ collapsed, onToggleSidebar }) {
  return (
    <header className="cc-header">
      <div className="cc-logo">
        <div className="cc-logo-mark">碳</div>
        <span>组织碳管理系统</span>
      </div>
      <button className="cc-collapse-btn" onClick={onToggleSidebar} title="折叠侧边栏">
        <Icon name="menu" size={18} />
      </button>
      <div style={{ marginLeft: 24 }}><OrgSwitcher /></div>
      <div className="cc-header-right">
        <button className="cc-collapse-btn" title="通知"><Icon name="bell" size={16} /></button>
        <button className="cc-collapse-btn" title="设置"><Icon name="setting" size={16} /></button>
        <div className="cc-user">
          <div className="cc-avatar">张</div>
          <span style={{ fontSize: 13 }}>张芷涵</span>
        </div>
      </div>
    </header>
  );
}

// ─── Page Header ────────────────────────────────────────────────
function PageHeader({ title, breadcrumb, extra }) {
  const { path } = useOrg();
  return (
    <div className="cc-page-head">
      <div>
        <div className="cc-breadcrumb">
          {(breadcrumb || []).map((b, i) => (
            <React.Fragment key={i}>
              <span className={i === breadcrumb.length - 1 ? 'cur' : ''}>{b}</span>
              {i < breadcrumb.length - 1 && <span className="sep">/</span>}
            </React.Fragment>
          ))}
        </div>
        <h1 className="cc-page-title">
          {title}
          <span className="scope-org">当前：{path[path.length - 1]?.name}</span>
        </h1>
      </div>
      <div className="cc-flex gap-8 align-c">{extra}</div>
    </div>
  );
}

Object.assign(window, {
  OrgProvider, useOrg, OrgSwitcher, Sidebar, Header, PageHeader, NAV_ITEMS, filterTree
});
