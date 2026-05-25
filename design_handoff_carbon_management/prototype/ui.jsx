// UI primitives — Element UI 风格
const { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext, Fragment } = React;

// ─── Icons (inline SVG, line style) ─────────────────────────────
const Icon = ({ name, size = 16, color }) => {
  const paths = {
    dashboard: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
    edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
    upload: 'M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z',
    book: 'M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z',
    doc: 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z',
    tree: 'M22 11V3h-7v3H9V3H2v8h7V8h2v10h4v3h7v-8h-7v3h-2V8h2v3z',
    plus: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
    search: 'M15.5 14h-.79l-.28-.27a6.5 6.5 0 0 0 1.48-5.34c-.47-2.78-2.79-5-5.59-5.34a6.505 6.505 0 0 0-7.27 7.27c.34 2.8 2.56 5.12 5.34 5.59a6.5 6.5 0 0 0 5.34-1.48l.27.28v.79l4.25 4.25c.41.41 1.08.41 1.49 0 .41-.41.41-1.08 0-1.49L15.5 14zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
    download: 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z',
    refresh: 'M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z',
    chevronDown: 'M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z',
    chevronRight: 'M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z',
    close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
    check: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
    warning: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
    info: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
    delete: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
    folder: 'M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z',
    leaf: 'M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z',
    user: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
    menu: 'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z',
    bell: 'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z',
    setting: 'M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65A.488.488 0 0 0 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z',
    sun: 'M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-1 16.95h2V19.5h-2v2.95zm-7.45-3.91l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z',
    moon: 'M12.34 2.02C6.59 1.82 2 6.42 2 12c0 5.52 4.48 10 10 10 3.71 0 6.93-2.02 8.66-5.02-7.51-.25-12.09-8.43-8.32-14.96z',
    chart: 'M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z',
    flow: 'M22 4L12 14.01l-3-3-1.4 1.4 4.4 4.4L23.4 5.4 22 4zM2 12h7v2H2zM2 6h11v2H2zM2 18h11v2H2z',
    eye: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    copy: 'M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z',
    print: 'M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z',
    history: 'M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z'
  };
  const d = paths[name];
  if (!d) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color || 'currentColor'} aria-hidden="true">
      <path d={d} />
    </svg>
  );
};

// ─── Button ─────────────────────────────────────────────────────
const Button = ({ children, variant, size, icon, onClick, disabled, danger, type = 'button', className = '' }) => {
  let cls = 'btn';
  if (variant === 'primary') cls += ' primary';
  else if (variant === 'text') cls += ' text';
  if (size) cls += ' ' + size;
  if (danger) cls += ' danger';
  if (className) cls += ' ' + className;
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled}>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </button>
  );
};

// ─── Tag ────────────────────────────────────────────────────────
const Tag = ({ children, variant, dot }) => {
  const cls = 'cc-tag' + (variant ? ' ' + variant : '');
  return <span className={cls}>{dot && <span className="dot" />}{children}</span>;
};

// ─── Input ──────────────────────────────────────────────────────
const Input = ({ value, onChange, placeholder, type = 'text', disabled, error, style, suffix }) => (
  <div style={{ position: 'relative', display: 'inline-block', minWidth: style?.width || 180 }}>
    <input
      type={type}
      className={'cc-input' + (error ? ' error' : '')}
      value={value ?? ''}
      onChange={(e) => onChange && onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{ width: '100%', paddingRight: suffix ? 36 : 12, ...style }}
    />
    {suffix && <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-muted)', fontSize: 12 }}>{suffix}</span>}
  </div>
);

// ─── Select ─────────────────────────────────────────────────────
const Select = ({ value, onChange, options, placeholder = '请选择', disabled, style, allowClear }) => {
  const opts = options || [];
  const hasMatch = value != null && value !== '' && opts.some(o => o.value === value);
  return (
    <select
      className="cc-select"
      value={value ?? ''}
      onChange={(e) => onChange && onChange(e.target.value)}
      disabled={disabled}
      style={style}
    >
      {placeholder && !hasMatch && <option value="">{placeholder}</option>}
      {opts.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
};

// ─── Panel ──────────────────────────────────────────────────────
const Panel = ({ title, extra, children, flush, accent = true, style }) => (
  <div className="cc-panel" style={style}>
    {title && (
      <div className="cc-panel-header">
        <div className="cc-panel-title">
          {accent && <span className="accent" />}
          {title}
        </div>
        {extra && <div>{extra}</div>}
      </div>
    )}
    <div className={'cc-panel-body' + (flush ? ' flush' : '')}>{children}</div>
  </div>
);

// ─── Table ──────────────────────────────────────────────────────
const Table = ({ columns, data, rowKey = 'id', emptyText = '暂无数据', maxHeight }) => {
  // Compute min-width from columns to allow horizontal scroll if needed
  const minWidth = columns.reduce((sum, c) => sum + (c.width || c.minWidth || 120), 0);
  return (
    <div style={{ overflow: 'auto', maxHeight }}>
      <table className="cc-table" style={{ minWidth }}>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i} className={c.align === 'right' ? 'num' : c.align === 'center' ? 'center' : ''} style={{ width: c.width, minWidth: c.minWidth || c.width }}>
                {c.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(!data || data.length === 0) && (
            <tr className="empty-row"><td colSpan={columns.length}>{emptyText}</td></tr>
          )}
          {(data || []).map((row, idx) => (
            <tr key={row[rowKey] ?? idx}>
              {columns.map((c, i) => {
                const v = typeof c.render === 'function' ? c.render(row, idx) : row[c.key];
                return (
                  <td key={i} className={[c.align === 'right' ? 'num' : c.align === 'center' ? 'center' : '', c.cellClass || ''].join(' ')}>
                    {v}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─── Pagination ─────────────────────────────────────────────────
const Pagination = ({ total, page, pageSize, onChange }) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const nums = [];
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i++) nums.push(i);
  return (
    <div className="cc-pagination">
      <span>共 {total} 条</span>
      <span className="pgnum" onClick={() => onChange(Math.max(1, page - 1))}>‹</span>
      {nums.map(n => (
        <span key={n} className={'pgnum' + (n === page ? ' active' : '')} onClick={() => onChange(n)}>{n}</span>
      ))}
      <span className="pgnum" onClick={() => onChange(Math.min(totalPages, page + 1))}>›</span>
    </div>
  );
};

// ─── Modal ──────────────────────────────────────────────────────
const Modal = ({ open, title, onClose, onOk, okText = '保存', cancelText = '取消', children, width, footer, okLoading }) => {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose && onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);
  if (!open) return null;
  const cls = 'cc-modal' + (width === 'wide' ? ' wide' : width === 'full' ? ' full' : '');
  return (
    <div className="cc-modal-mask" onClick={(e) => e.target === e.currentTarget && onClose && onClose()}>
      <div className={cls}>
        <div className="cc-modal-header">
          <h3 className="cc-modal-title">{title}</h3>
          <button className="cc-modal-x" onClick={onClose}><Icon name="close" size={16} /></button>
        </div>
        <div className="cc-modal-body">{children}</div>
        {footer !== null && (
          <div className="cc-modal-footer">
            {footer || (
              <>
                <Button onClick={onClose}>{cancelText}</Button>
                {onOk && <Button variant="primary" onClick={onOk} disabled={okLoading}>{okLoading && <span className="cc-spinner" />}{okText}</Button>}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Form helpers ───────────────────────────────────────────────
const FormRow = ({ label, required, error, help, children }) => (
  <div className="cc-form-row">
    <div className={'cc-form-label' + (required ? ' req' : '')}>{label}</div>
    <div>
      {children}
      {error && <div className="cc-form-error">{error}</div>}
      {help && !error && <div className="cc-form-help">{help}</div>}
    </div>
  </div>
);

// ─── Tabs ───────────────────────────────────────────────────────
const Tabs = ({ items, value, onChange }) => (
  <div className="cc-tabs">
    {items.map(it => (
      <div key={it.value} className={'cc-tab' + (it.value === value ? ' active' : '')} onClick={() => onChange(it.value)}>
        {it.label}
      </div>
    ))}
  </div>
);

// ─── Tree (org tree) ────────────────────────────────────────────
const Tree = ({ data, activeId, onSelect, defaultExpanded = true }) => {
  const [expanded, setExpanded] = useState(() => {
    if (defaultExpanded === true) {
      const ids = new Set();
      const walk = (n) => { ids.add(n.id); (n.children || []).forEach(walk); };
      walk(data);
      return ids;
    }
    return new Set([data.id]);
  });
  const toggle = (id) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpanded(next);
  };
  const renderNode = (node, depth = 0) => {
    const isLeaf = !node.children || node.children.length === 0;
    const isExp = expanded.has(node.id);
    return (
      <div key={node.id} className="cc-tree-node">
        <div className={'cc-tree-row' + (activeId === node.id ? ' active' : '')}
             onClick={() => onSelect && onSelect(node)}>
          <span className={'cc-tree-toggle' + (isExp ? ' expanded' : '') + (isLeaf ? ' leaf' : '')}
                onClick={(e) => { e.stopPropagation(); toggle(node.id); }}>
            <Icon name="chevronRight" size={9} />
          </span>
          <Icon name={isLeaf ? 'leaf' : 'folder'} size={12} color={isLeaf ? 'var(--c-success)' : 'var(--c-warning)'} />
          <span>{node.name}</span>
          {node.industry && <span className="cc-tree-meta">{getIndustryShort(node.industry)}</span>}
        </div>
        {isExp && !isLeaf && (
          <div className="cc-tree-children">
            {node.children.map(c => renderNode(c, depth + 1))}
          </div>
        )}
      </div>
    );
  };
  return <div className="cc-tree">{renderNode(data)}</div>;
};

function getIndustryShort(code) {
  const map = { POWER: '电力', STEEL: '钢铁', CHEMICAL: '化工', CEMENT: '水泥', ALUMINUM: '电解铝', PAPER: '造纸', TEXTILE: '纺织', GENERAL: '通用' };
  return map[code] || code;
}

// ─── Status tag ─────────────────────────────────────────────────
const StatusTag = ({ status }) => {
  const map = {
    draft:     { v: 'info',    t: '草稿' },
    submitted: { v: 'warning', t: '已提交' },
    approved:  { v: 'success', t: '已审核' },
    rejected:  { v: 'danger',  t: '已驳回' },
    enabled:   { v: 'success', t: '启用' },
    disabled:  { v: 'info',    t: '停用' }
  };
  const m = map[status] || { v: '', t: status };
  return <Tag variant={m.v} dot>{m.t}</Tag>;
};

const ScopeTag = ({ scope }) => {
  const cls = 'scope' + scope;
  const txt = scope === 1 ? '范围一' : scope === 2 ? '范围二' : '范围三';
  return <Tag variant={cls}>{txt}</Tag>;
};

// ─── Toast (light) ──────────────────────────────────────────────
const ToastCtx = createContext({ push: () => {} });
function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((msg, type = 'success') => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, msg, type }]);
    setTimeout(() => setItems((s) => s.filter(i => i.id !== id)), 2800);
  }, []);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
        {items.map(t => (
          <div key={t.id} style={{
            padding: '10px 16px', borderRadius: 4,
            background: 'var(--c-bg-panel)',
            border: '1px solid var(--c-border-light)',
            borderLeft: '3px solid ' + (t.type === 'error' ? 'var(--c-danger)' : t.type === 'warning' ? 'var(--c-warning)' : 'var(--c-primary)'),
            color: 'var(--c-text-regular)',
            fontSize: 13, boxShadow: 'var(--c-shadow-dropdown)',
            minWidth: 240, maxWidth: 480
          }}>{t.msg}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
const useToast = () => useContext(ToastCtx);

// ─── Number formatting ──────────────────────────────────────────
function fmt(n, digits = 2) {
  if (n == null || isNaN(n)) return '-';
  const opts = { minimumFractionDigits: digits, maximumFractionDigits: digits };
  return Number(n).toLocaleString('zh-CN', opts);
}
function fmtT(n) {
  // tons CO2e — show with units
  if (n == null || isNaN(n)) return '-';
  if (Math.abs(n) >= 10000) return fmt(n / 10000, 2) + ' 万t';
  return fmt(n, 2) + ' t';
}
function fmtPct(n, digits = 1) {
  if (n == null || isNaN(n)) return '-';
  return (n >= 0 ? '+' : '') + fmt(n, digits) + '%';
}

// ─── Confirm dialog (simple wrapper using Modal) ────────────────
const ConfirmCtx = createContext({ confirm: () => {} });
function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      setState({ ...opts, resolve });
    });
  }, []);
  const close = (v) => {
    state?.resolve?.(v);
    setState(null);
  };
  return (
    <ConfirmCtx.Provider value={{ confirm }}>
      {children}
      <Modal
        open={!!state}
        title={state?.title || '提示'}
        onClose={() => close(false)}
        footer={(
          <>
            <Button onClick={() => close(false)}>{state?.cancelText || '取消'}</Button>
            <Button variant="primary" onClick={() => close(true)}>{state?.okText || '确定'}</Button>
          </>
        )}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '8px 0' }}>
          <Icon name="warning" size={20} color="var(--c-warning)" />
          <div style={{ color: 'var(--c-text-regular)', lineHeight: 1.6 }}>{state?.message}</div>
        </div>
      </Modal>
    </ConfirmCtx.Provider>
  );
}
const useConfirm = () => useContext(ConfirmCtx).confirm;

// Export to window
Object.assign(window, {
  React, Icon, Button, Tag, Input, Select, Panel, Table, Pagination,
  Modal, FormRow, Tabs, Tree, StatusTag, ScopeTag,
  ToastProvider, useToast, ConfirmProvider, useConfirm,
  fmt, fmtT, fmtPct, getIndustryShort
});
