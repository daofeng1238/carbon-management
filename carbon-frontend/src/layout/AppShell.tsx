import React, { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/contexts/OrgContext';
import { Icon } from '@/components/ui';

const NAV_GROUPS = [
  { group: '碳排放管理', items: [
    { path: '/dashboard',      icon: 'dashboard', label: '数据看板' },
    { path: '/data-entry',     icon: 'edit',      label: '数据填报' },
    { path: '/data-import',    icon: 'upload',    label: '批量导入' },
  ]},
  { group: '配置中心', items: [
    { path: '/factor-library', icon: 'book',      label: '排放因子库' },
    { path: '/organization',   icon: 'tree',      label: '组织架构' },
  ]},
  { group: '报告', items: [
    { path: '/report',         icon: 'doc',       label: '报告生成' },
  ]},
];

function OrgSwitcher() {
  const { flat, orgId, setOrgId, currentOrg, tree } = useOrg();
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!tree) return (
    <div className="cc-org-switcher">
      <span className="org-label">组织：</span>
      <span className="org-name">加载中...</span>
    </div>
  );

  // Build path label from flat list
  const buildPath = (id: string): string => {
    const parts: string[] = [];
    let cur = flat.find(o => o.id === id);
    while (cur) {
      parts.unshift(cur.name);
      cur = flat.find(o => o.id === cur?.parentId);
    }
    return parts.join(' / ');
  };

  // Build cascading columns from tree
  const buildColumns = () => {
    const cols: any[][] = [];
    let node: any = tree;
    cols.push([node]);
    for (let i = 0; i < 4; i++) {
      const parentId = hovered[i] || (i === 0 ? tree.id : undefined);
      if (!parentId) break;
      const parent = flat.find(o => o.id === parentId);
      if (!parent) break;
      const children = flat.filter(o => o.parentId === parentId);
      if (children.length === 0) break;
      cols.push(children);
    }
    return cols;
  };

  const columns = buildColumns();
  const pathLabel = currentOrg ? buildPath(orgId!) : '选择组织';

  const choose = (node: any, colIdx: number) => {
    const newHover = hovered.slice(0, colIdx + 1);
    newHover[colIdx] = node.id;
    setHovered(newHover);
    const children = flat.filter(o => o.parentId === node.id);
    if (children.length === 0 || colIdx >= 3) {
      setOrgId(node.id);
      setOpen(false);
    }
  };

  return (
    <div className="cc-org-switcher" ref={ref} onClick={() => setOpen(v => !v)}>
      <span className="org-label">组织：</span>
      <span className="org-name" title={pathLabel}>{pathLabel}</span>
      <span className="caret"><Icon name="chevronDown" size={10} /></span>
      {open && (
        <div className="cc-pop-cascader" onClick={e => e.stopPropagation()}>
          {columns.map((col, idx) => (
            <div key={idx} className="cc-pop-col">
              {col.map(n => {
                const children = flat.filter(o => o.parentId === n.id);
                const isLeaf = children.length === 0 || idx >= 3;
                const isActive = hovered[idx] === n.id || (idx === 0 && n.id === orgId);
                return (
                  <div key={n.id}
                    className={'cc-pop-item' + (isActive ? ' active' : '')}
                    onMouseEnter={() => {
                      if (!isLeaf) {
                        const h = [...hovered.slice(0, idx), n.id];
                        setHovered(h);
                      }
                    }}
                    onClick={() => choose(n, idx)}>
                    <span>{n.name}</span>
                    {!isLeaf && <span><Icon name="chevronRight" size={10} /></span>}
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

export default function AppShell() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className={'cc-app' + (collapsed ? ' sidebar-collapsed' : '')}>
      {/* Header */}
      <header className="cc-header">
        <div className="cc-logo">
          <div className="cc-logo-mark">碳</div>
          {!collapsed && <span>组织碳管理系统</span>}
        </div>
        <button className="cc-collapse-btn" onClick={() => setCollapsed(v => !v)} title="折叠侧边栏">
          <Icon name="menu" size={18} />
        </button>
        <div style={{ marginLeft: 24 }}>
          <OrgSwitcher />
        </div>
        <div className="cc-header-right">
          <button className="cc-collapse-btn" title="通知"><Icon name="bell" size={16} /></button>
          <button className="cc-collapse-btn" title="设置"><Icon name="setting" size={16} /></button>
          <div className="cc-user" onClick={handleLogout} title="点击退出">
            <div className="cc-avatar">{user?.name?.[0] || '?'}</div>
            {!collapsed && <span style={{ fontSize: 13 }}>{user?.name}</span>}
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className="cc-sidebar">
        {NAV_GROUPS.map(g => (
          <React.Fragment key={g.group}>
            <div className="cc-nav-group-label">{g.group}</div>
            {g.items.map(it => (
              <NavLink
                key={it.path}
                to={it.path}
                className={({ isActive }) => 'cc-nav-item' + (isActive ? ' active' : '')}
              >
                <Icon name={it.icon} size={16} />
                <span className="label">{it.label}</span>
              </NavLink>
            ))}
          </React.Fragment>
        ))}
      </aside>

      {/* Main */}
      <main className="cc-main">
        <Outlet />
      </main>
    </div>
  );
}
