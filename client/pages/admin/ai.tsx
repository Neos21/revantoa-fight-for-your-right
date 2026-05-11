import { isHTTPError } from 'ky';
import { useState, type ReactElement, type SubmitEvent } from 'react';
import { Link, useNavigate } from 'react-router';

import { createAdminApi } from './helpers/admin-api';
import { useAdminAuthStore } from './helpers/admin-auth-store';
import { isEmpty } from '../../../shared/helpers/is-empty';

export default function AdminAi(): ReactElement {
  const navigate = useNavigate();
  
  const token  = useAdminAuthStore(state => state.token);
  const logout = useAdminAuthStore(state => state.logout);
  
  const [prompt, setPrompt] = useState<string>('');
  const [answer, setAnswer] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  const onSubmit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError('');
    setAnswer('');
    
    try {
      const result = await createAdminApi(token!).post(`/api/admin/ai`, { json: { prompt } }).json<{ result: { response: string; }; }>();
      console.log('AI 呼び出し結果', result);
      setAnswer(result.result.response);
    }
    catch(error: any) {  // eslint-disable-line
      console.error('AI の呼び出しに失敗しました', error);
      setError('AI の呼び出しに失敗しました');
      
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
        <form onSubmit={onSubmit}>
          <p>
            <textarea
              required
              rows={6}
              value={prompt}
              onChange={event => setPrompt(event.target.value)}
              placeholder="プロンプト"
            />
          </p>
          
          <p><button type="submit">送信する</button></p>
          
          {!isEmpty(error) && (<p className="text-error">{error}</p>)}
          
          {!isEmpty(answer) && (<p className="pre-wrap">{answer}</p>)}
        </form>
      )}
    </main>
  );
}
