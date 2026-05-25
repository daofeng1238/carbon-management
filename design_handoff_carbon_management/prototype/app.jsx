// 主应用入口
const { useState, useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "tone": "green",
  "dark": false,
  "density": "regular",
  "orgDepth": 4,
  "industry": "ALL"
}/*EDITMODE-END*/;

function useHashRoute(defaultRoute = 'dashboard') {
  const [route, setRoute] = useState(() => location.hash.replace('#', '') || defaultRoute);
  useEffect(() => {
    const handler = () => setRoute(location.hash.replace('#', '') || defaultRoute);
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  const navigate = (r) => { location.hash = r; };
  return [route, navigate];
}

function App() {
  const [route, navigate] = useHashRoute('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Apply theme tokens
  useEffect(() => {
    const cls = ['tone-' + t.tone];
    if (t.dark) cls.push('theme-dark');
    if (t.density === 'compact') cls.push('density-compact');
    else if (t.density === 'comfy') cls.push('density-comfy');
    document.documentElement.className = cls.join(' ');
  }, [t.tone, t.dark, t.density]);

  const renderPage = () => {
    switch (route) {
      case 'dashboard': return <Dashboard />;
      case 'data-entry': return <DataEntry />;
      case 'data-import': return <DataImport />;
      case 'factor-library': return <FactorLibrary />;
      case 'organization': return <Organization />;
      case 'report': return <ReportPage />;
      default: return <Dashboard />;
    }
  };

  return (
    <ToastProvider>
      <ConfirmProvider>
        <OrgProvider orgDepthLimit={t.orgDepth} industryFocus={t.industry}>
          <div className={'cc-app' + (collapsed ? ' sidebar-collapsed' : '')}>
            <Header collapsed={collapsed} onToggleSidebar={() => setCollapsed(v => !v)} />
            <Sidebar collapsed={collapsed} route={route} onNavigate={navigate} />
            <main className="cc-main">
              {renderPage()}
            </main>

            <TweaksPanel>
              <TweakSection label="主题" />
              <TweakColor
                label="主色"
                value={t.tone === 'green' ? '#0d7a5f' : t.tone === 'blue' ? '#1e6bd6' : '#455667'}
                options={['#0d7a5f', '#1e6bd6', '#455667']}
                onChange={(v) => setTweak('tone', v === '#0d7a5f' ? 'green' : v === '#1e6bd6' ? 'blue' : 'graphite')}
              />
              <TweakToggle label="深色模式" value={t.dark} onChange={(v) => setTweak('dark', v)} />
              <TweakSection label="布局" />
              <TweakRadio
                label="信息密度"
                value={t.density}
                options={[{ value: 'compact', label: '紧凑' }, { value: 'regular', label: '标准' }, { value: 'comfy', label: '舒适' }]}
                onChange={(v) => setTweak('density', v)}
              />
              <TweakSection label="组织" />
              <TweakRadio
                label="层级深度"
                value={t.orgDepth}
                options={[{ value: 2, label: '2 级' }, { value: 3, label: '3 级' }, { value: 4, label: '4 级' }]}
                onChange={(v) => setTweak('orgDepth', Number(v))}
              />
              <TweakSelect
                label="演示行业聚焦"
                value={t.industry}
                options={[
                  { value: 'ALL', label: '全行业（集团视角）' },
                  { value: 'POWER', label: '电力（发电）' },
                  { value: 'STEEL', label: '钢铁生产' },
                  { value: 'CHEMICAL', label: '化工生产' },
                  { value: 'CEMENT', label: '建材-水泥' }
                ]}
                onChange={(v) => setTweak('industry', v)}
              />
            </TweaksPanel>
          </div>
        </OrgProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
