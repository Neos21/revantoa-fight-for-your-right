import { type FormEvent, type ReactElement, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { createAdminApi } from '../../lib/admin-api';
import { useAdminAuthStore } from '../../lib/admin-auth-store';
import { readApiError } from '../../lib/api';
import { achievementStatuses, type AdminAchievement, type AchievementStatus } from '../../lib/types';

type DetailResponse = {
  achievement: AdminAchievement;
};

export default function AdminAchievementDetail(): ReactElement {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = useAdminAuthStore((state) => state.token);
  const [achievement, setAchievement] = useState<AdminAchievement | null>(null);
  const [instruction, setInstruction] = useState('');
  const [userName, setUserName] = useState('');
  const [status, setStatus] = useState<AchievementStatus>('未送信');
  const [adminMemo, setAdminMemo] = useState('');
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    if(token == null || id == null) return;
    
    createAdminApi(token).get(`api/admin/achievements/${id}`).json<DetailResponse>()
      .then((response) => {
        setAchievement(response.achievement);
        setInstruction(response.achievement.instruction);
        setUserName(response.achievement.user_name ?? '');
        setStatus(response.achievement.status);
        setAdminMemo(response.achievement.admin_memo ?? '');
      })
      .catch(async (error) => setMessage(await readApiError(error)));
  }, [id, token]);
  
  async function onSave(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if(token == null || id == null) return;
    
    setIsSaving(true);
    setMessage('');
    
    try {
      const response = await createAdminApi(token).put(`api/admin/achievements/${id}`, {
        json: {
          instruction,
          userName: userName.trim() === '' ? null : userName,
          status,
          adminMemo: adminMemo.trim() === '' ? null : adminMemo
        }
      }).json<DetailResponse>();
      
      setAchievement(response.achievement);
      setMessage('保存しました');
    }
    catch(error) {
      setMessage(await readApiError(error));
    }
    finally {
      setIsSaving(false);
    }
  }
  
  async function onDelete(): Promise<void> {
    if(token == null || id == null) return;
    const confirmed = window.confirm('この投稿を物理削除します。よろしいですか？');
    if(!confirmed) return;
    
    try {
      await createAdminApi(token).delete(`api/admin/achievements/${id}`).json();
      navigate('/admin');
    }
    catch(error) {
      setMessage(await readApiError(error));
    }
  }
  
  if(token == null) {
    return (
      <main className="admin-shell compact">
        <p className="form-message error">管理者ログインが必要です。</p>
        <Link to="/admin">ログインへ</Link>
      </main>
    );
  }
  
  return (
    <main className="admin-shell compact">
      <Link to="/admin">一覧へ戻る</Link>
      <section className="admin-panel">
        <p className="eyebrow">Admin Detail</p>
        <h1>指示の編集</h1>
        
        {achievement == null && message === '' && <p className="muted">読み込み中です。</p>}
        
        {achievement != null && (
          <form className="post-form" onSubmit={onSave}>
            <p className="muted">No {achievement.id} / IP {achievement.user_ip}</p>
            <label>
              <span>指示</span>
              <textarea
                required
                maxLength={1000}
                rows={6}
                value={instruction}
                onChange={(event) => setInstruction(event.currentTarget.value)}
              />
            </label>
            
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
            
            <div className="admin-actions">
              <button type="submit" disabled={isSaving}>
                {isSaving ? '保存中' : '保存'}
              </button>
              <button className="danger-button" type="button" onClick={() => void onDelete()}>
                削除
              </button>
            </div>
          </form>
        )}
        
        {message !== '' && <p className="form-message">{message}</p>}
      </section>
    </main>
  );
}

