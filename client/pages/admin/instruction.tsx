import { isHTTPError } from 'ky';
import { useState, type ReactElement } from 'react';
import { Link, useNavigate } from 'react-router';

import { createAdminApi } from './helpers/admin-api';
import { useAdminAuthStore } from './helpers/admin-auth-store';
import { isEmpty } from '../../../shared/helpers/is-empty';

import type { AdminAchievement } from '../../../shared/types/achievement';

export default function AdminInstruction(): ReactElement {
  const navigate = useNavigate();
  
  const token  = useAdminAuthStore(state => state.token);
  const logout = useAdminAuthStore(state => state.logout);
  
  const [answer, setAnswer] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  const onFetch = async (endpoint: 'from-db' | 'from-prepared' | 'from-template'): Promise<void> => {
    setError('');
    setAnswer('');
    try {
      const result = await createAdminApi(token!).get(`/api/admin/instructions/${endpoint}`).json<{ result: AdminAchievement | string | null; }>();
      setAnswer(result.result == null ? '(Null)' : typeof result.result === 'string' ? result.result : JSON.stringify(result.result, null, 2));
    }
    catch(error) {
      console.error('呼び出しに失敗しました', error);
      setError('呼び出しに失敗しました');
      if(isHTTPError(error) && error.response.status === 401) {
        logout();
        navigate('/admin');
      }
    }
  };
  
  return (
    <main className="admin-ai-page">
      <p><Link to="/admin">戻る</Link> | <Link to="/">トップ</Link></p>
      
      {isEmpty(token) && (<p>ログインしてください</p>)}
      
      {!isEmpty(token) && (
        <>
          <p><button type="button" onClick={() => onFetch('from-db')}>DB からランダムに1つ取得する</button></p>
          <p><button type="button" onClick={() => onFetch('from-prepared')}>用意された指示からランダムに1つ取得する</button></p>
          <p><button type="button" onClick={() => onFetch('from-template')}>テンプレートを穴埋めしてランダムに1つ取得する</button></p>
          
          {!isEmpty(error) && (<p className="text-error">{error}</p>)}
          
          {!isEmpty(answer) && (<p className="pre-wrap">{answer}</p>)}
        </>
      )}
    </main>
  );
}
