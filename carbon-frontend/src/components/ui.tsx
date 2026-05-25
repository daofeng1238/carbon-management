import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';

// ── Icons ─────────────────────────────────────────────────────────
const PATHS: Record<string, string> = {
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
  history: 'M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z',
  copy: 'M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z',
  print: 'M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z',
};

export const Icon: React.FC<{ name: string; size?: number; color?: string }> = ({ name, size = 16, color }) => {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color || 'currentColor'} aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d={d} />
    </svg>
  );
};

// ── Button ────────────────────────────────────────────────────────
interface ButtonProps {
  children?: React.ReactNode;
  variant?: 'primary' | 'text';
  size?: 'sm' | 'lg';
  icon?: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  type?: 'button' | 'submit';
  className?: string;
  style?: React.CSSProperties;
}
export const Button: React.FC<ButtonProps> = ({
  children, variant, size, icon, onClick, disabled, danger, type = 'button', className = '', style
}) => {
  let cls = 'btn';
  if (variant === 'primary') cls += ' primary';
  else if (variant === 'text') cls += ' text';
  if (size) cls += ' ' + size;
  if (danger) cls += ' danger';
  if (className) cls += ' ' + className;
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled} style={style}>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </button>
  );
};

// ── Tag ───────────────────────────────────────────────────────────
export const Tag: React.FC<{ children?: React.ReactNode; variant?: string; dot?: boolean }> = ({ children, variant, dot }) => {
  const cls = 'cc-tag' + (variant ? ' ' + variant : '');
  return <span className={cls}>{dot && <span className="dot" />}{children}</span>;
};

// ── Input ─────────────────────────────────────────────────────────
interface InputProps {
  value?: string | number;
  onChange?: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  error?: string;
  style?: React.CSSProperties;
  suffix?: React.ReactNode;
}
export const Input: React.FC<InputProps> = ({ value, onChange, placeholder, type = 'text', disabled, error, style, suffix }) => (
  <div style={{ position: 'relative', display: 'inline-block', width: style?.width || '100%' }}>
    <input
      type={type}
      className={'cc-input' + (error ? ' error' : '')}
      value={value ?? ''}
      onChange={(e) => onChange && onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{ width: '100%', paddingRight: suffix ? 36 : 12, ...style, minWidth: style?.width ? 'auto' : undefined }}
    />
    {suffix && (
      <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-muted)', fontSize: 12, pointerEvents: 'none' }}>
        {suffix}
      </span>
    )}
  </div>
);

// ── Select ────────────────────────────────────────────────────────
interface SelectOption { value: string; label: string; }
interface SelectProps {
  value?: string;
  onChange?: (v: string) => void;
  options?: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}
export const Select: React.FC<SelectProps> = ({ value, onChange, options = [], placeholder = '请选择', disabled, style }) => {
  return (
    <select
      className="cc-select"
      value={value ?? ''}
      onChange={(e) => onChange && onChange(e.target.value)}
      disabled={disabled}
      style={style}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
};

// ── Panel ─────────────────────────────────────────────────────────
interface PanelProps {
  title?: React.ReactNode;
  extra?: React.ReactNode;
  children?: React.ReactNode;
  flush?: boolean;
  style?: React.CSSProperties;
}
export const Panel: React.FC<PanelProps> = ({ title, extra, children, flush, style }) => (
  <div className="cc-panel" style={style}>
    {title && (
      <div className="cc-panel-header">
        <div className="cc-panel-title">
          <span className="accent" />
          {title}
        </div>
        {extra && <div>{extra}</div>}
      </div>
    )}
    <div className={'cc-panel-body' + (flush ? ' flush' : '')}>{children}</div>
  </div>
);

// ── Table ─────────────────────────────────────────────────────────
interface Column {
  key: string;
  title: string;
  width?: number;
  minWidth?: number;
  align?: 'right' | 'center' | 'left';
  render?: (row: any, idx: number) => React.ReactNode;
}
interface TableProps {
  columns: Column[];
  data?: any[];
  rowKey?: string;
  emptyText?: string;
  maxHeight?: number;
}
export const Table: React.FC<TableProps> = ({ columns, data = [], rowKey = 'id', emptyText = '暂无数据', maxHeight }) => {
  const minW = columns.reduce((s, c) => s + (c.width || c.minWidth || 120), 0);
  return (
    <div style={{ overflow: 'auto', maxHeight }}>
      <table className="cc-table" style={{ minWidth: minW }}>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i} className={c.align === 'right' ? 'num' : c.align === 'center' ? 'center' : ''}
                  style={{ width: c.width, minWidth: c.minWidth || c.width }}>
                {c.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 && <tr className="empty-row"><td colSpan={columns.length}>{emptyText}</td></tr>}
          {data.map((row, idx) => (
            <tr key={row[rowKey] ?? idx}>
              {columns.map((c, i) => {
                const v = typeof c.render === 'function' ? c.render(row, idx) : row[c.key];
                return (
                  <td key={i} className={c.align === 'right' ? 'num' : c.align === 'center' ? 'center' : ''}>
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

// ── Pagination ────────────────────────────────────────────────────
interface PaginationProps { total: number; page: number; pageSize: number; onChange: (p: number) => void; }
export const Pagination: React.FC<PaginationProps> = ({ total, page, pageSize, onChange }) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  const nums = [];
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

// ── Modal ─────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean;
  title?: string;
  onClose?: () => void;
  onOk?: () => void;
  okText?: string;
  cancelText?: string;
  children?: React.ReactNode;
  width?: 'wide' | 'full';
  footer?: React.ReactNode | null;
  okLoading?: boolean;
}
export const Modal: React.FC<ModalProps> = ({
  open, title, onClose, onOk, okText = '保存', cancelText = '取消', children, width, footer, okLoading
}) => {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  const cls = 'cc-modal' + (width === 'wide' ? ' wide' : width === 'full' ? ' full' : '');
  return (
    <div className="cc-modal-mask" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={cls}>
        <div className="cc-modal-header">
          <h3 className="cc-modal-title">{title}</h3>
          <button className="cc-modal-x" onClick={onClose}><Icon name="close" size={16} /></button>
        </div>
        <div className="cc-modal-body">{children}</div>
        {footer !== null && (
          <div className="cc-modal-footer">
            {footer !== undefined ? footer : (
              <>
                <Button onClick={onClose}>{cancelText}</Button>
                {onOk && (
                  <Button variant="primary" onClick={onOk} disabled={okLoading}>
                    {okLoading && <span className="cc-spinner" />}
                    {okText}
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── FormRow ───────────────────────────────────────────────────────
export const FormRow: React.FC<{ label: string; required?: boolean; error?: string; help?: string; children?: React.ReactNode }> = ({
  label, required, error, help, children
}) => (
  <div className="cc-form-row">
    <div className={'cc-form-label' + (required ? ' req' : '')}>{label}</div>
    <div>
      {children}
      {error && <div className="cc-form-error">{error}</div>}
      {help && !error && <div className="cc-form-help">{help}</div>}
    </div>
  </div>
);

// ── Tabs ──────────────────────────────────────────────────────────
export const Tabs: React.FC<{ items: { value: string; label: string }[]; value: string; onChange: (v: string) => void }> = ({
  items, value, onChange
}) => (
  <div className="cc-tabs">
    {items.map(it => (
      <div key={it.value} className={'cc-tab' + (it.value === value ? ' active' : '')} onClick={() => onChange(it.value)}>
        {it.label}
      </div>
    ))}
  </div>
);

// ── StatusTag ─────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { v: string; t: string }> = {
  draft:     { v: '',        t: '草稿' },
  submitted: { v: 'warning', t: '已提交' },
  approved:  { v: 'success', t: '已审核' },
  rejected:  { v: 'danger',  t: '已驳回' },
  enabled:   { v: 'success', t: '启用' },
  disabled:  { v: '',        t: '停用' },
};
export const StatusTag: React.FC<{ status: string }> = ({ status }) => {
  const m = STATUS_MAP[status] || { v: '', t: status };
  return <Tag variant={m.v} dot>{m.t}</Tag>;
};

export const ScopeTag: React.FC<{ scope: number }> = ({ scope }) => (
  <Tag variant={`scope${scope}`}>范围{scope === 1 ? '一' : scope === 2 ? '二' : '三'}</Tag>
);

// ── Toast ─────────────────────────────────────────────────────────
interface ToastItem { id: number; msg: string; type: string; }
const ToastCtx = createContext<{ push: (msg: string, type?: string) => void }>({ push: () => {} });

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((msg: string, type = 'success') => {
    const id = Date.now() + Math.random();
    setItems(s => [...s, { id, msg, type }]);
    setTimeout(() => setItems(s => s.filter(i => i.id !== id)), 2800);
  }, []);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="cc-toast-wrap">
        {items.map(t => (
          <div key={t.id} className="cc-toast" style={{
            borderLeft: `3px solid ${t.type === 'error' ? 'var(--c-danger)' : t.type === 'warning' ? 'var(--c-warning)' : 'var(--c-primary)'}`
          }}>{t.msg}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
};
export const useToast = () => useContext(ToastCtx);

// ── Confirm ───────────────────────────────────────────────────────
interface ConfirmState { title: string; message: React.ReactNode; resolve: (v: boolean) => void; }
const ConfirmCtx = createContext<{ confirm: (opts: { title: string; message: React.ReactNode }) => Promise<boolean> }>({
  confirm: async () => false
});
export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ConfirmState | null>(null);
  const confirm = useCallback((opts: { title: string; message: React.ReactNode }) => {
    return new Promise<boolean>((resolve) => setState({ ...opts, resolve }));
  }, []);
  const close = (v: boolean) => { state?.resolve(v); setState(null); };
  return (
    <ConfirmCtx.Provider value={{ confirm }}>
      {children}
      <Modal open={!!state} title={state?.title || '提示'}
        onClose={() => close(false)}
        footer={
          <>
            <Button onClick={() => close(false)}>取消</Button>
            <Button variant="primary" onClick={() => close(true)}>确定</Button>
          </>
        }>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '8px 0' }}>
          <Icon name="warning" size={20} color="var(--c-warning)" />
          <div style={{ color: 'var(--c-text-regular)', lineHeight: 1.6 }}>{state?.message}</div>
        </div>
      </Modal>
    </ConfirmCtx.Provider>
  );
};
export const useConfirm = () => useContext(ConfirmCtx).confirm;

// ── PageHeader ────────────────────────────────────────────────────
interface PageHeaderProps { title: string; breadcrumb?: string[]; extra?: React.ReactNode; orgName?: string; }
export const PageHeader: React.FC<PageHeaderProps> = ({ title, breadcrumb, extra, orgName }) => (
  <div className="cc-page-head">
    <div>
      {breadcrumb && (
        <div className="cc-breadcrumb">
          {breadcrumb.map((b, i) => (
            <React.Fragment key={i}>
              <span className={i === breadcrumb.length - 1 ? 'cur' : ''}>{b}</span>
              {i < breadcrumb.length - 1 && <span className="sep">/</span>}
            </React.Fragment>
          ))}
        </div>
      )}
      <h1 className="cc-page-title">
        {title}
        {orgName && <span className="scope-org">当前：{orgName}</span>}
      </h1>
    </div>
    <div className="cc-flex gap-8 align-c">{extra}</div>
  </div>
);

// ── Tree ──────────────────────────────────────────────────────────
interface TreeNode { id: string; name: string; children?: TreeNode[]; [key: string]: any; }
interface TreeProps {
  data: TreeNode; activeId?: string; onSelect?: (node: TreeNode) => void;
  draggable?: boolean; onMove?: (dragId: string, targetId: string) => void;
}
export const Tree: React.FC<TreeProps> = ({ data, activeId, onSelect, draggable, onMove }) => {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const ids = new Set<string>();
    const walk = (n: TreeNode) => { ids.add(n.id); (n.children || []).forEach(walk); };
    walk(data);
    return ids;
  });
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const toggle = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpanded(next);
  };
  const renderNode = (node: TreeNode): React.ReactNode => {
    const isLeaf = !node.children || node.children.length === 0;
    const isExp = expanded.has(node.id);
    return (
      <div key={node.id} className="cc-tree-node">
        <div
          className={'cc-tree-row' + (activeId === node.id ? ' active' : '') + (dragOverId === node.id ? ' drag-over' : '')}
          onClick={() => onSelect?.(node)}
          draggable={draggable && node.level !== 1}
          onDragStart={(e) => { e.dataTransfer.setData('text/plain', node.id); e.dataTransfer.effectAllowed = 'move'; }}
          onDragOver={(e) => {
            if (!draggable) return;
            e.preventDefault(); e.dataTransfer.dropEffect = 'move';
            setDragOverId(node.id);
          }}
          onDragLeave={() => setDragOverId(null)}
          onDrop={(e) => {
            e.preventDefault(); setDragOverId(null);
            const dragId = e.dataTransfer.getData('text/plain');
            if (dragId && dragId !== node.id && onMove) onMove(dragId, node.id);
          }}
        >
          <span className={'cc-tree-toggle' + (isExp ? ' expanded' : '') + (isLeaf ? ' leaf' : '')}
                onClick={(e) => { e.stopPropagation(); toggle(node.id); }}>
            <Icon name="chevronRight" size={9} />
          </span>
          <Icon name={isLeaf ? 'leaf' : 'folder'} size={12}
                color={isLeaf ? 'var(--c-success)' : 'var(--c-warning)'} />
          <span>{node.name}</span>
          {node.industry && <span className="cc-tree-meta">{getIndustryShort(node.industry)}</span>}
        </div>
        {isExp && !isLeaf && (
          <div className="cc-tree-children">{(node.children || []).map(c => renderNode(c))}</div>
        )}
      </div>
    );
  };
  return <div className="cc-tree">{renderNode(data)}</div>;
};

// ── Helpers ───────────────────────────────────────────────────────
export function fmt(n: any, digits = 2): string {
  if (n == null || isNaN(Number(n))) return '-';
  return Number(n).toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
export function fmtPct(n: number, digits = 1): string {
  if (n == null || isNaN(n)) return '-';
  return (n >= 0 ? '+' : '') + fmt(n, digits) + '%';
}
export function getIndustryShort(code: string): string {
  const map: Record<string, string> = { POWER: '电力', STEEL: '钢铁', CHEMICAL: '化工', CEMENT: '水泥', ALUMINUM: '铝', PAPER: '造纸', TEXTILE: '纺织', GENERAL: '通用' };
  return map[code] || code;
}
