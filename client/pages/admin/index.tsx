import { Turnstile } from '@marsidev/react-turnstile';
import ky, { isHTTPError } from 'ky';
import { useEffect, useState, type ReactElement, type SubmitEvent } from 'react';
import { Link } from 'react-router';

import { createAdminApi } from './helpers/admin-api';
import { useAdminAuthStore } from './helpers/admin-auth-store';
import { convertUtcToJst } from '../../../shared/helpers/convert-utc-to-jst';
import { isEmpty } from '../../../shared/helpers/is-empty';

import type { AdminAchievement } from '../../../shared/types/achievement';

export default function AdminIndex(): ReactElement {
  const token    = useAdminAuthStore(state => state.token);
  const setToken = useAdminAuthStore(state => state.setToken);
  const logout   = useAdminAuthStore(state => state.logout);
  
  const [loginForm, setLoginForm] = useState<{ password: string; turnstileToken: string; }>({ password: '', turnstileToken: '' });
  const [loginError, setLoginError] = useState<string>('');
  
  const [achievements, setAchievements] = useState<Array<AdminAchievement>>([]);
  
  useEffect(() => {
    if(isEmpty(token)) return;
    
    (async () => {
      try {
        const result = await createAdminApi(token!).get('/api/admin/achievements').json<{ result: Array<AdminAchievement> }>();
        setAchievements(result.result);
      }
      catch(error) {
        console.error('達成状況一覧が読み込めませんでした', error);
        setAchievements([]);
        
        if(isHTTPError(error) && error.response.status === 401) logout();
      }
    })();
  }, [token]);
  
  const onLogin = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setLoginError('');
    
    try {
      const response = await ky.post('/api/admin/login', {
        json: {
          password       : loginForm.password,
          turnstile_token: loginForm.turnstileToken
        }
      }).json<{ result: { admin_jwt: string; }; }>();
      setToken(response.result.admin_jwt);
    }
    catch(error) {
      console.error('ログインに失敗しました', error);
      setLoginError('ログインに失敗しました');
    }
  };
  
  return (
    <main className="admin-page">
      {isEmpty(token) && (
        <>
          <h1>Admin</h1>
          <p><Link to="/">トップ</Link></p>
          <form onSubmit={onLogin}>
            <p>
              <input
                type="password"
                value={loginForm.password}
                onChange={event => setLoginForm(prevLoginForm => ({ ...prevLoginForm, password: event.target.value }))}
                placeholder="Password"
                autoComplete="current-password"
              />
            </p>
            <p className="turnstile">
              <Turnstile
                siteKey="0x4AAAAAADJfnedS0W-AbwSN"
                options={{ language: 'ja' }}
                onSuccess={token => setLoginForm(prevLoginForm => ({ ...prevLoginForm, turnstileToken: token }))}
                onError={() => setLoginForm(prevLoginForm => ({ ...prevLoginForm, turnstileToken: '' }))}
                onExpire={() => setLoginForm(prevLoginForm => ({ ...prevLoginForm, turnstileToken: '' }))}
              />
            </p>
            <p>
              <button type="submit" disabled={isEmpty(loginForm.password) || isEmpty(loginForm.turnstileToken)}>Login</button>
            </p>
            {!isEmpty(loginError) && (<p className="text-error">{loginError}</p>)}
          </form>
        </>
      )}
      
      {!isEmpty(token) && (
        <>
          <h1>Admin Dashboard</h1>
          <p><Link to="/admin/ai">AI</Link> | <Link to="/">トップ</Link></p>
          
          {achievements.length === 0 && (<p>達成状況はありません</p>)}
          {achievements.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>No</th>
                    <th>指示</th>
                    <th>投稿者名</th>
                    <th>IP</th>
                    <th>登録日時</th>
                    <th>ステータス</th>
                    <th>更新日時</th>
                    <th>メモ</th>
                  </tr>
                </thead>
                <tbody>
                  {achievements.map(achievement => (
                    <tr key={achievement.id}>
                      <td className="nowrap"><Link to={`/admin/achievements/${achievement.id}`}>{achievement.id}</Link></td>
                      <td className="pre-wrap" style={{ minWidth: '15rem' }}>{achievement.instruction}</td>
                      <td style={{ maxWidth: '10rem' }}>{achievement.user_name || '-'}</td>
                      <td style={{ minWidth: '8rem' }}>{achievement.user_ip}</td>
                      <td className="nowrap">{convertUtcToJst(achievement.created_at)}</td>
                      <td className="nowrap">{achievement.status}</td>
                      <td className="nowrap">{convertUtcToJst(achievement.updated_at)}</td>
                      <td className="pre-wrap" style={{ minWidth: '10rem' }}>{achievement.admin_memo || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <p><button type="button" onClick={logout}>Logout</button></p>
        </>
      )}
    </main>
  );
}
