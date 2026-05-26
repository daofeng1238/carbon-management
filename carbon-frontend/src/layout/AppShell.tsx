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

export function OrgSwitcher() {
  const { flat, orgId, setOrgId, currentOrg, tree } = useOrg();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  // On open, expand ancestors of current org
  useEffect(() => {
    if (!open || !orgId) return;
    const ids = new Set<string>();
    let cur = flat.find(o => o.id === orgId);
    while (cur) {
      ids.add(cur.id);
      cur = flat.find(o => o.id === cur?.parentId);
    }
    if (tree) ids.add(tree.id);
    setExpanded(ids);
    setSearch('');
  }, [open]);

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

  const buildPath = (id: string): string => {
    const parts: string[] = [];
    let cur = flat.find(o => o.id === id);
    while (cur) {
      parts.unshift(cur.name);
      cur = flat.find(o => o.id === cur?.parentId);
    }
    return parts.join(' / ');
  };

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpanded(next);
  };

  const choose = (node: any) => {
    setOrgId(node.id);
    setOpen(false);
    setSearch('');
  };

  const pathLabel = currentOrg ? buildPath(orgId!) : '选择组织';

  // Filter for search
  const filteredFlat = search
    ? flat.filter(o => o.name.includes(search) || (o.code && o.code.includes(search)))
    : [];

  const renderNode = (node: any, depth: number): React.ReactNode => {
    const children = flat.filter(o => o.parentId === node.id);
    const isLeaf = children.length === 0;
    const isExp = expanded.has(node.id);
    const isSelected = node.id === orgId;
    return (
      <div key={node.id}>
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 12px', paddingLeft: 12 + depth * 18,
            cursor: 'pointer', fontSize: 13, borderRadius: 4,
            background: isSelected ? 'var(--c-primary-bg)' : 'transparent',
            color: isSelected ? 'var(--c-primary)' : 'var(--c-text-regular)',
            fontWeight: isSelected ? 600 : 400,
          }}
          onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'var(--c-bg-hover)'; }}
          onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
          onClick={() => choose(node)}
        >
          {!isLeaf ? (
            <span
              onClick={(e) => toggleExpand(node.id, e)}
              style={{ display: 'inline-flex', alignItems: 'center', transform: isExp ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform .15s', flexShrink: 0 }}
            >
              <Icon name="chevronRight" size={10} />
            </span>
          ) : (
            <span style={{ width: 10, flexShrink: 0 }} />
          )}
          <Icon name={isLeaf ? 'leaf' : 'folder'} size={12} color={isLeaf ? 'var(--c-success)' : 'var(--c-warning)'} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.name}</span>
        </div>
        {isExp && !isLeaf && children.map(c => renderNode(c, depth + 1))}
      </div>
    );
  };

  return (
    <div className="cc-org-switcher" ref={ref} onClick={() => setOpen(v => !v)}>
      <span className="org-label">组织：</span>
      <span className="org-name" title={pathLabel}>{pathLabel}</span>
      <span className="caret"><Icon name="chevronDown" size={10} /></span>
      {open && (
        <div className="cc-org-dropdown" onClick={e => e.stopPropagation()}>
          <div style={{ padding: '8px 8px 4px' }}>
            <input
              className="cc-input"
              placeholder="搜索组织名称 / 编码..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', fontSize: 13, height: 32 }}
              autoFocus
            />
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto', padding: '4px 0' }}>
            {search ? (
              filteredFlat.length > 0 ? filteredFlat.map(o => (
                <div key={o.id}
                  style={{
                    padding: '7px 12px', cursor: 'pointer', fontSize: 13, borderRadius: 4, margin: '0 4px',
                    background: o.id === orgId ? 'var(--c-primary-bg)' : 'transparent',
                    color: o.id === orgId ? 'var(--c-primary)' : 'var(--c-text-regular)',
                  }}
                  onMouseEnter={e => { if (o.id !== orgId) (e.currentTarget as HTMLDivElement).style.background = 'var(--c-bg-hover)'; }}
                  onMouseLeave={e => { if (o.id !== orgId) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                  onClick={() => choose(o)}
                >
                  <div style={{ fontWeight: 500 }}>{o.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--c-text-muted)', marginTop: 2 }}>{buildPath(o.id)}</div>
                </div>
              )) : (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--c-text-muted)', fontSize: 13 }}>无匹配结果</div>
              )
            ) : (
              renderNode(tree, 0)
            )}
          </div>
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
