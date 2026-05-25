import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchOrgTree } from '@/api/organizations';
import { useAuth } from './AuthContext';

interface OrgCtx {
  orgId: string | null;
  setOrgId: (id: string) => void;
  tree: any;
  flat: any[];
  currentOrg: any;
}

const Ctx = createContext<OrgCtx>({} as OrgCtx);

function flatten(node: any, parent: any = null, out: any[] = []): any[] {
  const n = { ...node, parentId: parent?.id ?? null, parentName: parent?.name ?? null };
  delete n.children;
  out.push(n);
  (node.children || []).forEach((c: any) => flatten(c, node, out));
  return out;
}

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [orgId, setOrgId] = useState<string | null>(
    () => localStorage.getItem('selectedOrgId'),
  );

  const { data: tree } = useQuery({
    queryKey: ['orgTree'],
    queryFn: () => fetchOrgTree(),
    staleTime: 5 * 60 * 1000,
    enabled: !!user,
  });

  useEffect(() => {
    if (tree && !orgId) {
      const rootId = (tree as any).id;
      setOrgId(rootId);
      localStorage.setItem('selectedOrgId', rootId);
    }
  }, [tree, orgId]);

  const flat = useMemo(() => (tree ? flatten(tree) : []), [tree]);
  const currentOrg = useMemo(() => flat.find((o) => o.id === orgId) ?? null, [flat, orgId]);

  const handleSetOrgId = (id: string) => {
    setOrgId(id);
    localStorage.setItem('selectedOrgId', id);
  };

  return (
    <Ctx.Provider value={{ orgId, setOrgId: handleSetOrgId, tree, flat, currentOrg }}>
      {children}
    </Ctx.Provider>
  );
}

export const useOrg = () => useContext(Ctx);
