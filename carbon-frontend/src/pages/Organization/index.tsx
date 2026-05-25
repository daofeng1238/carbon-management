import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchOrgTree, createOrg, updateOrg, deleteOrg, moveOrg } from '@/api/organizations';
import { fetchIndustries } from '@/api/dict';
import {
  PageHeader, Panel, Button, Select, Input, Tree, Modal, FormRow,
  Tag, getIndustryShort, useToast, useConfirm,
} from '@/components/ui';

const LEVEL_LABELS: Record<number, string> = { 1: '集团', 2: '板块', 3: '子公司', 4: '厂区' };

export default function Organization() {
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<any>({});

  const { data: tree, isLoading } = useQuery({
    queryKey: ['orgTree'],
    queryFn: () => fetchOrgTree(),
  });

  const { data: industriesData } = useQuery({
    queryKey: ['industries'],
    queryFn: () => fetchIndustries(),
    staleTime: 10 * 60 * 1000,
  });
  const INDUSTRIES = (industriesData as any[] || []).map((i: any) => ({ value: i.code, label: i.name }));

  const saveMut = useMutation({
    mutationFn: (body: any) => form.id ? updateOrg(form.id, body) : createOrg(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orgTree'] });
      setModalOpen(false);
      toast.push(form.id ? '组织信息已更新' : '子组织已创建');
    },
    onError: (e: any) => toast.push(e.message || '保存失败', 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteOrg(id, true),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orgTree'] }); toast.push('组织已删除'); setSelectedId(null); },
    onError: (e: any) => toast.push(e.message || '删除失败', 'error'),
  });

  const moveMut = useMutation({
    mutationFn: ({ id, newParentId }: { id: string; newParentId: string }) => moveOrg(id, newParentId),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['orgTree'] });
      toast.push(`已移动 ${data.moved || 1} 个组织`);
    },
    onError: (e: any) => toast.push(e.message || '移动失败', 'error'),
  });

  const handleDragMove = async (dragId: string, targetId: string) => {
    const dragNode = tree ? findNode(tree as any, dragId) : null;
    const targetNode = tree ? findNode(tree as any, targetId) : null;
    if (!dragNode || !targetNode) return;

    const ok = await confirm({
      title: '确认移动',
      message: `确定将「${dragNode.name}」移动到「${targetNode.name}」下方？`,
    });
    if (ok) moveMut.mutate({ id: dragId, newParentId: targetId });
  };

  const openCreate = (parentId?: string) => {
    setForm({ parentId, industryCode: 'GENERAL', standard: 'ISO 14064-1:2018' });
    setModalOpen(true);
  };

  const openEdit = (node: any) => {
    setForm({ ...node, industryCode: node.industryCode || node.industry });
    setModalOpen(true);
  };

  const handleDelete = async (node: any) => {
    const ok = await confirm({
      title: '确认删除',
      message: `确定删除组织「${node.name}」及其所有下属？此操作不可恢复。`,
    });
    if (ok) deleteMut.mutate(node.id);
  };

  const findNode = (root: any, id: string): any => {
    if (!root) return null;
    if (root.id === id) return root;
    for (const c of root.children || []) { const r = findNode(c, id); if (r) return r; }
    return null;
  };

  const selectedNode = selectedId && tree ? findNode(tree, selectedId) : null;

  return (
    <>
      <PageHeader
        title="组织架构"
        breadcrumb={['首页', '组织架构']}
        extra={<Button variant="primary" icon="plus" onClick={() => openCreate()}>新增顶层组织</Button>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, alignItems: 'start' }}>
        {/* Tree panel */}
        <Panel title="组织树" extra={<span style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>拖拽节点可调整层级</span>} flush>
          {isLoading ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--c-text-muted)' }}>加载中...</div>
          ) : tree ? (
            <div style={{ padding: '8px 0' }}>
              <Tree
                data={tree as any}
                activeId={selectedId || undefined}
                onSelect={(n) => setSelectedId(n.id)}
                draggable
                onMove={handleDragMove}
              />
            </div>
          ) : (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--c-text-muted)' }}>暂无数据</div>
          )}
        </Panel>

        {/* Detail panel */}
        <Panel
          title={selectedNode ? selectedNode.name : '组织详情'}
          extra={selectedNode && (
            <div className="cc-flex gap-8">
              <Button size="sm" onClick={() => openEdit(selectedNode)}>编辑</Button>
              {selectedNode.level < 4 && (
                <Button size="sm" variant="primary" onClick={() => openCreate(selectedNode.id)}>添加子组织</Button>
              )}
              {selectedNode.level > 1 && (
                <Button size="sm" danger onClick={() => handleDelete(selectedNode)}>删除</Button>
              )}
            </div>
          )}
        >
          {selectedNode ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
              {[
                { label: '组织编码', value: <span style={{ fontFamily: 'monospace' }}>{selectedNode.code}</span> },
                { label: '组织名称', value: selectedNode.name },
                { label: '层级类型', value: <Tag>{LEVEL_LABELS[selectedNode.level] || `L${selectedNode.level}`}</Tag> },
                { label: '所属行业', value: getIndustryShort(selectedNode.industryCode || selectedNode.industry || '') },
                { label: '员工人数', value: selectedNode.employees ? `${selectedNode.employees.toLocaleString()} 人` : '—' },
                { label: '核算标准', value: selectedNode.standard || '—' },
                { label: '地址', value: selectedNode.address || '—' },
                { label: '下辖组织', value: `${(selectedNode.children || []).length} 个` },
              ].map((item) => (
                <div key={item.label}>
                  <div style={{ fontSize: 12, color: 'var(--c-text-muted)', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 14, color: 'var(--c-text-regular)' }}>{item.value}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--c-text-muted)', fontSize: 13 }}>
              从左侧树形结构中选择一个组织节点查看详情
            </div>
          )}
        </Panel>
      </div>

      <Modal
        open={modalOpen}
        title={form.id ? '编辑组织' : '新增子组织'}
        onClose={() => setModalOpen(false)}
        onOk={() => saveMut.mutate(form)}
        okLoading={saveMut.isPending}
      >
        {!form.id && (
          <FormRow label="组织编码" required>
            <Input value={form.code || ''} onChange={(v) => setForm({ ...form, code: v })} placeholder="如 ZL-NEW-01（仅限字母、数字和连字符）" />
          </FormRow>
        )}
        <FormRow label="组织名称" required>
          <Input value={form.name || ''} onChange={(v) => setForm({ ...form, name: v })} placeholder="请输入组织名称" />
        </FormRow>
        <FormRow label="所属行业">
          <Select
            value={form.industryCode || ''} onChange={(v) => setForm({ ...form, industryCode: v })}
            options={INDUSTRIES} placeholder="请选择行业" style={{ width: '100%' }}
          />
        </FormRow>
        <FormRow label="核算标准">
          <Input value={form.standard || ''} onChange={(v) => setForm({ ...form, standard: v })} placeholder="ISO 14064-1:2018" />
        </FormRow>
        <FormRow label="地址">
          <Input value={form.address || ''} onChange={(v) => setForm({ ...form, address: v })} placeholder="选填" />
        </FormRow>
        <FormRow label="员工人数">
          <Input type="number" value={form.employees ?? ''} onChange={(v) => setForm({ ...form, employees: v })} placeholder="如 1000" />
        </FormRow>
      </Modal>
    </>
  );
}
