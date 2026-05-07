import { Turnstile } from '@marsidev/react-turnstile';
import ky from 'ky';
import { useEffect, useMemo, useState, type ReactElement, type SubmitEvent } from 'react';

import { mergeIssues } from '../../../server/helpers/merge-issues';
import { convertUtcToJst } from '../../../shared/helpers/convert-utc-to-jst';
import { isEmpty } from '../../../shared/helpers/is-empty';
import { instructionMaxLength, newAchievementSchema, userNameMaxLength } from '../../../shared/schemas/achievement';

import type { PublicAchievement } from '../../../shared/types/achievement';

export default function Index(): ReactElement {
  const [form, setForm] = useState<{ instruction: string; user_name: string; turnstile_token: string; }>({
    instruction    : '',
    user_name      : '',
    turnstile_token: ''
  });
  const [formSubmitState, setFormSubmitState] = useState<'IDLE' | 'SUBMITTING' | 'SUCCEEDED' | 'FAILED'>('IDLE');
  const [showTurnstile, setShowTurnstile] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');
  
  const [shouldLoadAchievements, setShouldLoadAchievements] = useState<boolean>(false);
  const [isLoadingAchievements, setIsLoadingAchievements] = useState<boolean>(false);
  const [achievements, setAchievements] = useState<Array<PublicAchievement>>([]);
  
  useEffect(() => {
    const onScroll = (): void => {
      if(window.scrollY >= (window.innerHeight / 3)) setShouldLoadAchievements(true);
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
  
  const canSubmit = useMemo(() => isEmpty(form.instruction) && isEmpty(form.turnstile_token) && formSubmitState !== 'SUBMITTING', [form, formSubmitState]);
  
  const onSubmit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if(!canSubmit) return;
    
    setFormSubmitState('SUBMITTING');
    setFormError('');
    
    const parsed = newAchievementSchema.safeParse(form);
    if(!parsed.success) {
      setFormError(mergeIssues(parsed.error));
      setFormSubmitState('FAILED');
      return;
    }
    
    try {
      await ky.post('/api/achievements', {
        json: {
          instruction    : form.instruction.trim(),
          user_name      : form.user_name.trim(),
          turnstile_token: form.turnstile_token
        }
      }).json();
      
      setForm({ instruction: '', user_name: '', turnstile_token: '' });
      setFormSubmitState('SUCCEEDED');
      loadAchievements();
    }
    catch(error) {
      console.error('投稿に失敗しました', error);
      setFormError('投稿に失敗しました');
      setFormSubmitState('FAILED');
    }
    finally {
      setShowTurnstile(false);
      setForm(prevForm => ({ ...prevForm, turnstile_token: '' }));
    }
  };
  
  return (
    <main className="index-page">
      <section className="intro">
        <div className="info">
          <h1>これやれ</h1>
          <p>東京在住・35歳の休職中エンジニアが、復職に向けた体力作りを主目的として、皆さまからの指示を何でも受け付けます。</p>
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
              onBlur={() => setShowTurnstile(true)}
              placeholder="例 : 知らない道を20分歩いて写真を1枚撮ってくる"
            />
          </label>
          
          <label>
            <span>名前 (任意)</span>
            <input
              maxLength={userNameMaxLength}
              value={form.user_name}
              onChange={event => setForm(prevForm => ({ ...prevForm, user_name: event.currentTarget.value }))}
              onBlur={() => setShowTurnstile(true)}
              placeholder="名無しでも可"
            />
          </label>
          
          <div className="turnstile">
            {showTurnstile && (
              <Turnstile
                siteKey="0x4AAAAAADJfnedS0W-AbwSN"
                options={{ language: 'ja' }}
                onSuccess={turnstileToken => setForm(prevForm => ({ ...prevForm, turnstile_token: turnstileToken }))}
                onError={() => setForm(prevForm => ({ ...prevForm, turnstile_token: '' }))}
                onExpire={() => setForm(prevForm => ({ ...prevForm, turnstile_token: '' }))}
              />
            )}
          </div>
          
          <button type="submit" disabled={!canSubmit || formSubmitState === 'SUBMITTING'}>
            {formSubmitState === 'SUBMITTING' ? '送信中' : '投稿する'}
          </button>
          
          {formSubmitState === 'SUCCEEDED' && (<p className="text-success">投稿しました</p>)}
          {formSubmitState === 'FAILED'    && (<p className="text-error">{formError}</p>)}
        </form>
      </section>
      
      <section className="achievements">
        <h2>達成状況</h2>
        
        {!shouldLoadAchievements && (<p className="text-muted">もう少しスクロールすると読み込みます</p>)}
        {isLoadingAchievements && (<p className="text-muted">読み込み中…</p>)}
        
        {shouldLoadAchievements && !isLoadingAchievements && achievements.length === 0 && (<p className="text-muted">まだ投稿された指示はありません</p>)}
        
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
