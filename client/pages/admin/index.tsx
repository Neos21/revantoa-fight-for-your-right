import { type FormEvent, type ReactElement, useEffect, useState } from 'react';
import { Link } from 'react-router';

import { createAdminApi } from '../../lib/admin-api';
import { useAdminAuthStore } from '../../lib/admin-auth-store';
import { api, readApiError } from '../../lib/api';

import type { AchievementListResponse, AdminAchievement } from '../../lib/types';

type LoginResponse = {
  token: string;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

export default function AdminIndex(): ReactElement {
  const token = useAdminAuthStore((state) => state.token);
  const setToken = useAdminAuthStore((state) => state.setToken);
  const logout = useAdminAuthStore((state) => state.logout);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [achievements, setAchievements] = useState<AdminAchievement[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [listError, setListError] = useState('');
  
  useEffect(() => {
    if(token == null) return;
    void loadAchievements(null, token);
  }, [token]);
  
  async function onLogin(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');
    
    try {
      const response = await api.post('api/admin/login', {
        json: { password }
      }).json<LoginResponse>();
      setToken(response.token);
      setPassword('');
    }
    catch(error) {
      setLoginError(await readApiError(error));
    }
    finally {
      setIsLoggingIn(false);
    }
  }
  
  async function loadAchievements(cursor: number | null, activeToken = token): Promise<void> {
    if(activeToken == null) return;
    setIsLoading(true);
    setListError('');
    
    try {
      const response = await createAdminApi(activeToken).get('api/admin/achievements', {
        searchParams: cursor == null ? undefined : { cursor: String(cursor) }
      }).json<AchievementListResponse>();
      
      setAchievements((current) => cursor == null ? response.items : [...current, ...response.items]);
      setNextCursor(response.nextCursor);
    }
    catch(error) {
      setListError(await readApiError(error));
    }
    finally {
      setIsLoading(false);
    }
  }
  
  if(token == null) {
    return (
      <main className="admin-shell compact">
        <section className="admin-panel">
          <p className="eyebrow">Admin</p>
          <h1>管理ログイン</h1>
          <form className="post-form" onSubmit={onLogin}>
            <label>
              <span>パスワード</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.currentTarget.value)}
                autoComplete="current-password"
              />
            </label>
            <button type="submit" disabled={password === '' || isLoggingIn}>
              {isLoggingIn ? '確認中' : 'ログイン'}
            </button>
            {loginError !== '' && <p className="form-message error">{loginError}</p>}
          </form>
        </section>
      </main>
    );
  }
  
  return (
    <main className="admin-shell">
      <section className="admin-heading">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>達成状況管理</h1>
        </div>
        <button type="button" onClick={logout}>ログアウト</button>
      </section>
      
      {listError !== '' && <p className="form-message error">{listError}</p>}
      {achievements.length === 0 && !isLoading && listError === '' && <p className="muted">まだ投稿はありません。</p>}
      
      {achievements.length > 0 && (
        <div className="achievement-table-wrap">
          <table className="achievement-table">
            <thead>
              <tr>
                <th>No</th>
                <th>指示</th>
                <th>投稿者名</th>
                <th>IP</th>
                <th>登録日</th>
                <th>状態</th>
                <th>更新日</th>
                <th>メモ</th>
                <th>詳細</th>
              </tr>
            </thead>
            <tbody>
              {achievements.map((achievement) => (
                <tr key={achievement.id}>
                  <td>{achievement.id}</td>
                  <td>{achievement.instruction}</td>
                  <td>{achievement.user_name ?? '名無し'}</td>
                  <td>{achievement.user_ip}</td>
                  <td>{formatDate(achievement.created_at)}</td>
                  <td>{achievement.status}</td>
                  <td>{formatDate(achievement.updated_at)}</td>
                  <td>{achievement.admin_memo ?? '-'}</td>
                  <td><Link to={`/admin/achievements/${achievement.id}`}>開く</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {isLoading && <p className="muted">読み込み中です。</p>}
      
      {nextCursor != null && !isLoading && (
        <button className="secondary-button" type="button" onClick={() => void loadAchievements(nextCursor)}>
          もっと見る
        </button>
      )}
    </main>
  );
}

