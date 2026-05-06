import { Turnstile } from '@marsidev/react-turnstile';
import ky from 'ky';
import { useEffect, useMemo, useState, type ReactElement, type SubmitEvent } from 'react';

import { convertUtcToJst } from '../../../shared/helpers/convert-utc-to-jst';
import { isEmpty } from '../../../shared/helpers/is-empty';
import { instructionMaxLength, userNameMaxLength } from '../../../shared/schemas/achievement';

import type { PublicAchievement } from '../../../shared/types/achievement';

export default function Index(): ReactElement {
  const [form, setForm] = useState<{ instruction: string; userName: string; turnstileToken: string; }>({
    instruction   : '',
    userName      : '',
    turnstileToken: ''
  });
  const [formSubmitState, setFormSubmitState] = useState<'IDLE' | 'SUBMITTING' | 'SUCCEEDED' | 'FAILED'>('IDLE');
  
  const [shouldLoadAchievements, setShouldLoadAchievements] = useState<boolean>(false);
  const [isLoadingAchievements, setIsLoadingAchievements] = useState<boolean>(false);
  const [achievements, setAchievements] = useState<Array<PublicAchievement>>([]);
  
  useEffect(() => {
    const onScroll = (): void => {
      // TODO : ココの判定が微妙かも
      if(window.scrollY >= window.innerHeight) setShouldLoadAchievements(true);
    };
    
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return (): void => window.removeEventListener('scroll', onScroll);
  }, []);
  
  useEffect(() => {
    if(!shouldLoadAchievements || isLoadingAchievements || achievements.length > 0) return;
    loadAchievements();
  }, [shouldLoadAchievements, isLoadingAchievements, achievements.length]);
  
  const loadAchievements = async (): Promise<void> => {
    setIsLoadingAchievements(true);
    try {
      const response = await ky.get('/api/achievements').json<{ result: Array<PublicAchievement>; }>();
      setAchievements(response.result);
    }
    catch(error) {
      console.error('達成状況一覧が読み込めませんでした', error);
      setAchievements([]);
    }
    finally {
      setIsLoadingAchievements(false);
    }
  };
  
  const canSubmit = useMemo(() => isEmpty(form.instruction) && isEmpty(form.turnstileToken) && formSubmitState !== 'SUBMITTING', [form, formSubmitState]);
  
  const onSubmit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if(!canSubmit) return;
    
    // TODO : Zod Validation
    
    setFormSubmitState('SUBMITTING');
    try {
      await ky.post('/api/achievements', {
        json: {
          instruction    : form.instruction.trim(),
          user_name      : form.userName.trim(),
          turnstile_token: form.turnstileToken
        }
      }).json();
      
      setForm({ instruction: '', userName: '', turnstileToken: '' });
      setFormSubmitState('SUCCEEDED');
      loadAchievements();
    }
    catch(error) {
      console.error('投稿に失敗しました', error);
      setFormSubmitState('FAILED');
    }
  };
  
  return (
    <main className="index-page">
      <section className="intro">
        <div className="info">
          <h1>これやれ</h1>
          <p>東京在住・35歳の休職中エンジニアが、皆さまからの指示を受け付けます。</p>
          <p>投稿された指示は Discord で私に通知され、実行状況は以下に公表します。</p>
        </div>
        
        <form className="form" onSubmit={onSubmit}>
          <label>
            <span>指示</span>
            <textarea
              required
              rows={6}
              maxLength={instructionMaxLength}
              value={form.instruction}
              onChange={event => setForm(prevForm => ({ ...prevForm, instruction: event.currentTarget.value }))}
              placeholder="例 : 知らない道を20分歩いてくる"
            />
          </label>
          
          <label>
            <span>名前 (任意)</span>
            <input
              maxLength={userNameMaxLength}
              value={form.userName}
              onChange={event => setForm(prevForm => ({ ...prevForm, userName: event.currentTarget.value }))}
              placeholder="名無しでも可"
            />
          </label>
          
          <div className="turnstile">
            <Turnstile
              siteKey="0x4AAAAAADJfnedS0W-AbwSN"
              onSuccess={token => setForm(prevForm => ({ ...prevForm, turnstileToken: token }))}
              onError={() => setForm(prevForm => ({ ...prevForm, turnstileToken: '' }))}
              onExpire={() => setForm(prevForm => ({ ...prevForm, turnstileToken: '' }))}
            />
          </div>
          
          <button type="submit" disabled={!canSubmit || formSubmitState === 'SUBMITTING'}>
            {formSubmitState === 'SUBMITTING' ? '送信中' : '投稿する'}
          </button>
          
          {formSubmitState === 'SUCCEEDED' && <p className="text-success">投稿しました</p>}
          {formSubmitState === 'FAILED'    && <p className="text-error">投稿に失敗しました</p>}
        </form>
      </section>
      
      <section className="achievements">
        <h2>達成状況</h2>
        
        {!shouldLoadAchievements && <p className="text-muted">もう少しスクロールすると読み込みます</p>}
        {isLoadingAchievements && <p className="text-muted">読み込み中…</p>}
        
        {shouldLoadAchievements && !isLoadingAchievements && achievements.length === 0 && <p className="text-muted">まだ投稿された指示はありません</p>}
        
        {achievements.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>No</th>
                  <th>指示</th>
                  <th>投稿者名</th>
                  <th>登録日</th>
                  <th>達成状況</th>
                  <th>達成日</th>
                  <th>メモ</th>
                </tr>
              </thead>
              <tbody>
                {achievements.map(achievement => (
                  <tr key={achievement.id}>
                    <td>{achievement.id}</td>
                    <td>{achievement.instruction}</td>
                    <td>{achievement.user_name ?? '-'}</td>
                    <td>{convertUtcToJst(achievement.created_at)}</td>
                    <td>{achievement.status}</td>
                    <td>{achievement.status === '達成' ? convertUtcToJst(achievement.updated_at, true) : '-'}</td>
                    <td>{achievement.admin_memo ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
