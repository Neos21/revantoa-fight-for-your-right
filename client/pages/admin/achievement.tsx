import { isHTTPError } from 'ky';
import { useEffect, useState, type ReactElement, type SubmitEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { createAdminApi } from './helpers/admin-api';
import { useAdminAuthStore } from './helpers/admin-auth-store';
import { isEmpty } from '../../../shared/helpers/is-empty';

import type { AchievementStatus, AdminAchievement } from '../../../shared/types/achievement';

export default function AdminAchievementDetail(): ReactElement {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const token  = useAdminAuthStore(state => state.token);
  const logout = useAdminAuthStore(state => state.logout);
  
  const [achievement, setAchievement] = useState<AdminAchievement | null>(null);
  const [editForm, setEditForm] = useState<{ instruction: string; userName: string; status: AchievementStatus; adminMemo: string; }>({
    instruction: '',
    userName   : '',
    status     : '未送信',
    adminMemo  : ''
  });
  
  useEffect(() => {
    if(isEmpty(token) || isEmpty(id)) return;
    
    (async () => {
      try {
        const result = await createAdminApi(token!).get(`/api/admin/achievements/${id}`).json<{ result: AdminAchievement; }>();
        setAchievement(result.result);
        setEditForm({
          instruction: result.result.instruction,
          userName   : result.result.user_name ?? '',
          status     : result.result.status,
          adminMemo  : result.result.admin_memo ?? ''
        });
      }
      catch(error) {
        console.error('達成状況詳細が読み込めませんでした', error);
        setAchievement(null);
        
        if(isHTTPError(error) && error.response.status === 401) {
          logout();
          navigate('/admin');
        }
      }
    })();
  }, [id, token]);
  
  const onEdit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    try {
      const result = await createAdminApi(token!).put(`/api/admin/achievements/${id}`, {
        json: {
          id: id,
          instruction: instruction,
          user_name: userName.trim() === '' ? null : userName,
          status,
          adminMemo: adminMemo.trim() === '' ? null : adminMemo
        }
      }).json<{ result: AdminAchievement; }>();
      setAchievement(result.result);
      setEditForm({
        instruction: result.result.instruction,
        userName   : result.result.user_name ?? '',
        status     : result.result.status,
        adminMemo  : result.result.admin_memo ?? ''
      });
    }
    catch(error) {
      console.error('達成状況の更新に失敗しました', error);
      setAchievement(null);
      
      if(isHTTPError(error) && error.response.status === 401) {
        logout();
        navigate('/admin');
      }
    }
  }
  
  const onDelete = async (): Promise<void> => {
    const confirmed = window.confirm('この投稿を削除します。よろしいですか？');
    if(!confirmed) return;
    
    try {
      await createAdminApi(token!).delete(`/api/admin/achievements/${id}`).json();
      navigate('/admin');
    }
    catch(error) {
      console.error('達成状況の削除に失敗しました', error);
      
      if(isHTTPError(error) && error.response.status === 401) {
        logout();
        navigate('/admin');
      }
    }
  }
  
  return (
    <main className="admin-achievement-page">
      <p><Link to="/admin">戻る</Link></p>
      
      {isEmpty(token) && (
        <p>ログインしてください</p>
      )}
      
      {!isEmpty(token) && achievement != null && (
        <form onSubmit={onEdit}>
          <p>No {achievement.id}</p>
          <p>
            <textarea
              required
              maxLength={1000}
              rows={6}
              value={instruction}
              onChange={(event) => setInstruction(event.currentTarget.value)}
            />
          </p>
          
          <label>
            <span>投稿者名</span>
            <input
              maxLength={80}
              value={userName}
              onChange={(event) => setUserName(event.currentTarget.value)}
            />
          </label>
          
          <label>
            <span>状態</span>
            <select value={status} onChange={(event) => setStatus(event.currentTarget.value as AchievementStatus)}>
              {achievementStatuses.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          
          <label>
            <span>管理メモ</span>
            <textarea
              maxLength={2000}
              rows={5}
              value={adminMemo}
              onChange={(event) => setAdminMemo(event.currentTarget.value)}
            />
          </label>
          
          <p>
            <button type="submit">保存する</button>
          </p>
          <p>
            <button type="button" onClick={onDelete}>削除する</button>
          </p>
        </form>
      )}
    </main>
  );
}
