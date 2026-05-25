import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Icon } from '@/components/ui';

export default function Login() {
  const [username, setUsername] = useState('zhangzihan');
  const [password, setPassword] = useState('Carbon@2025');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || '登录失败，请检查账号和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo-mark">碳</div>
          <h1>组织碳管理系统</h1>
          <p>温室气体排放核算与报告平台</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="cc-form-row" style={{ gridTemplateColumns: '72px 1fr' }}>
            <div className="cc-form-label">用户名</div>
            <div>
              <input
                className="cc-input"
                style={{ width: '100%' }}
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="请输入用户名"
                autoComplete="username"
              />
            </div>
          </div>
          <div className="cc-form-row" style={{ gridTemplateColumns: '72px 1fr' }}>
            <div className="cc-form-label">密码</div>
            <div>
              <input
                className="cc-input"
                style={{ width: '100%' }}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="请输入密码"
                autoComplete="current-password"
              />
            </div>
          </div>
          {error && (
            <div className="cc-alert danger" style={{ marginBottom: 12 }}>
              <Icon name="warning" size={14} />
              <span>{error}</span>
            </div>
          )}
          <button
            type="submit"
            className="btn primary lg login-btn"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={loading}
          >
            {loading ? <><span className="cc-spinner" /> 登录中...</> : '登 录'}
          </button>
        </form>
        <div className="login-hint">
          <p>演示账号：zhangzihan / Carbon@2025</p>
        </div>
      </div>
    </div>
  );
}
