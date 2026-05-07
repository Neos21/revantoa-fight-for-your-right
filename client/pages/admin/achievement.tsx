import { isHTTPError } from 'ky';
import { useEffect, useState, type ReactElement, type SubmitEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { createAdminApi } from './helpers/admin-api';
import { useAdminAuthStore } from './helpers/admin-auth-store';
import { mergeIssues } from '../../../server/helpers/merge-issues';
import { isEmpty } from '../../../shared/helpers/is-empty';
import { instructionMaxLength, updateAchievementSchema, userNameMaxLength } from '../../../shared/schemas/achievement';
import { achievementStatuses, type AchievementStatus, type AdminAchievement } from '../../../shared/types/achievement';

export default function AdminAchievementDetail(): ReactElement {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const token  = useAdminAuthStore(state => state.token);
  const logout = useAdminAuthStore(state => state.logout);
  
  const [achievement, setAchievement] = useState<AdminAchievement | null>(null);
  const [succeeded, setSucceeded] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  useEffect(() => {
    if(isEmpty(token) || isEmpty(id)) return;
    
    (async () => {
      try {
        const result = await createAdminApi(token!).get(`/api/admin/achievements/${id}`).json<{ result: AdminAchievement; }>();
        setAchievement(result.result);
      }
      catch(error) {
        console.error('達成状況詳細が読み込めませんでした', error);
        setAchievement(null);
        setError('達成状況詳細が読み込めませんでした');
        
        if(isHTTPError(error) && error.response.status === 401) {
          logout();
          navigate('/admin');
        }
      }
    })();
  }, [id, token]);
  
  const onEdit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSucceeded(false);
    
    const parsed = updateAchievementSchema.safeParse(achievement);
    if(!parsed.success) return setError(mergeIssues(parsed.error));
    
    try {
      const result = await createAdminApi(token!).put(`/api/admin/achievements/${id}`, { json: achievement }).json<{ result: AdminAchievement; }>();
      setAchievement(result.result);
      setSucceeded(true);
    }
    catch(error) {
      console.error('達成状況の更新に失敗しました', error);
      setError('達成状況の更新に失敗しました');
      
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
      setError('達成状況の削除に失敗しました');
      
      if(isHTTPError(error) && error.response.status === 401) {
        logout();
        navigate('/admin');
      }
    }
  }
  
  return (
    <main className="admin-achievement-page">
      <p><Link to="/admin">戻る</Link></p>
      
      {isEmpty(token) && (<p>ログインしてください</p>)}
      
      {!isEmpty(token) && achievement != null && (
        <form onSubmit={onEdit}>
          <p>No {achievement.id}</p>
          <p>
            <textarea
              required
              rows={6}
              maxLength={instructionMaxLength}
              value={achievement.instruction}
              onChange={event => setAchievement(prevAchievement => ({ ...prevAchievement!, instruction: event.target.value }))}
              placeholder="指示"
            />
          </p>
          
          <p>
            <input
              maxLength={userNameMaxLength}
              value={achievement.user_name ?? ''}
              onChange={event => setAchievement(prevAchievement => ({ ...prevAchievement!, user_name: event.target.value }))}
              placeholder="投稿者名"
            />
          </p>
          
          <p>
            <select value={achievement.status} onChange={event => setAchievement(prevAchievement => ({ ...prevAchievement!, status: event.target.value as AchievementStatus }))}>
              {achievementStatuses.map(item => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </p>
          
          <p>
            <textarea
              rows={5}
              maxLength={2000}
              value={achievement.admin_memo ?? ''}
              onChange={event => setAchievement(prevAchievement => ({ ...prevAchievement!, admin_memo: event.target.value }))}
            />
          </p>
          
          <p>
            <button type="submit">保存する</button>
          </p>
          <p>
            <button type="button" onClick={onDelete}>削除する</button>
          </p>
          {succeeded && (<p className="text-success">更新しました</p>)}
        </form>
      )}
      {!isEmpty(error) && (<p className="text-error">{error}</p>)}
    </main>
  );
}
