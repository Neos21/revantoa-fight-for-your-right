import { Turnstile } from '@marsidev/react-turnstile';
import { type FormEvent, type ReactElement, useEffect, useMemo, useState } from 'react';

import { api, readApiError } from '../../lib/api';

type PublicAchievement = {
  id: number;
  instruction: string;
  user_name: string | null;
  created_at: string;
  status: '未送信' | '既読' | '達成' | 'スキップ' | 'キャンセル';
  updated_at: string;
  admin_memo: string | null;
};

type AchievementListResponse = {
  items: PublicAchievement[];
  nextCursor: number | null;
};

type ConfigResponse = {
  turnstileSiteKey: string;
};

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

const statusLabels: Record<PublicAchievement['status'], string> = {
  未送信: '未送信',
  既読: '既読',
  達成: '達成',
  スキップ: 'スキップ',
  キャンセル: 'キャンセル'
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

export default function Index(): ReactElement {
  const [siteKey, setSiteKey] = useState<string>('');
  const [instruction, setInstruction] = useState('');
  const [userName, setUserName] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [submitMessage, setSubmitMessage] = useState('');
  const [shouldLoadList, setShouldLoadList] = useState(false);
  const [achievements, setAchievements] = useState<PublicAchievement[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [isListLoading, setIsListLoading] = useState(false);
  const [listError, setListError] = useState('');
  
  const canSubmit = useMemo(() => instruction.trim() !== '' && turnstileToken !== '' && submitState !== 'submitting', [instruction, submitState, turnstileToken]);
  
  useEffect(() => {
    let isMounted = true;
    
    api.get('api/config').json<ConfigResponse>()
      .then((config): void => {
        if(isMounted) setSiteKey(config.turnstileSiteKey);
      })
      .catch((): void => {
        if(isMounted) setSubmitMessage('Turnstile の設定を読み込めませんでした');
      });
    
    return (): void => {
      isMounted = false;
    };
  }, []);
  
  useEffect(() => {
    const onScroll = (): void => {
      if(window.scrollY >= window.innerHeight) setShouldLoadList(true);
    };
    
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return (): void => window.removeEventListener('scroll', onScroll);
  }, []);
  
  useEffect(() => {
    if(!shouldLoadList || achievements.length > 0 || isListLoading) return;
    void loadAchievements(null);
  }, [achievements.length, isListLoading, shouldLoadList]);
  
  async function loadAchievements(cursor: number | null): Promise<void> {
    setIsListLoading(true);
    setListError('');
    
    try {
      const response = await api.get('api/achievements', {
        searchParams: cursor == null ? undefined : { cursor: String(cursor) }
      }).json<AchievementListResponse>();
      
      setAchievements((current) => cursor == null ? response.items : [...current, ...response.items]);
      setNextCursor(response.nextCursor);
    }
    catch(error) {
      setListError(await readApiError(error));
    }
    finally {
      setIsListLoading(false);
    }
  }
  
  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if(!canSubmit) return;
    
    setSubmitState('submitting');
    setSubmitMessage('');
    
    try {
      await api.post('api/posts', {
        json: {
          instruction,
          userName,
          turnstileToken
        }
      }).json();
      
      setInstruction('');
      setUserName('');
      setTurnstileToken('');
      setSubmitState('success');
      setSubmitMessage('指示を受け付けました');
      if(shouldLoadList) void loadAchievements(null);
    }
    catch(error) {
      setSubmitState('error');
      setSubmitMessage(await readApiError(error));
    }
  }
  
  return (
    <main className="site-shell">
      <section className="intro-section">
        <div className="intro-copy">
          <p className="eyebrow">Fight For Your Right</p>
          <h1>これやれ</h1>
          <p>
            目的のない散歩が苦手なので、他人からの指示を受け付けます。
            投稿された指示は Discord Bot に届き、実行状況はここに残ります。
          </p>
        </div>
        
        <form className="post-form" onSubmit={onSubmit}>
          <label>
            <span>指示</span>
            <textarea
              required
              maxLength={1000}
              rows={6}
              value={instruction}
              onChange={(event) => setInstruction(event.currentTarget.value)}
              placeholder="例 : 知らない道を20分歩いてくる"
            />
          </label>
          
          <label>
            <span>名前 任意</span>
            <input
              maxLength={80}
              value={userName}
              onChange={(event) => setUserName(event.currentTarget.value)}
              placeholder="名無しでも可"
            />
          </label>
          
          <div className="turnstile-wrap">
            {siteKey === '' ? (
              <p>Turnstile を読み込み中</p>
            ) : (
              <Turnstile
                siteKey={siteKey}
                onSuccess={setTurnstileToken}
                onExpire={() => setTurnstileToken('')}
                onError={() => setTurnstileToken('')}
              />
            )}
          </div>
          
          <button type="submit" disabled={!canSubmit}>
            {submitState === 'submitting' ? '送信中' : '投稿する'}
          </button>
          
          {submitMessage !== '' && (
            <p className={`form-message ${submitState}`}>
              {submitMessage}
            </p>
          )}
        </form>
      </section>
      
      <section className="achievements-section">
        <div className="section-heading">
          <p className="eyebrow">Achievements</p>
          <h2>達成状況</h2>
        </div>
        
        {!shouldLoadList && (
          <p className="muted">もう少しスクロールすると読み込みます。</p>
        )}
        
        {shouldLoadList && achievements.length === 0 && !isListLoading && listError === '' && (
          <p className="muted">まだ投稿された指示はありません。</p>
        )}
        
        {listError !== '' && (
          <p className="form-message error">{listError}</p>
        )}
        
        {achievements.length > 0 && (
          <div className="achievement-table-wrap">
            <table className="achievement-table">
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
                {achievements.map((achievement) => (
                  <tr key={achievement.id}>
                    <td>{achievement.id}</td>
                    <td>{achievement.instruction}</td>
                    <td>{achievement.user_name ?? '名無し'}</td>
                    <td>{formatDate(achievement.created_at)}</td>
                    <td>
                      <span className={`status status-${achievement.status}`}>
                        {statusLabels[achievement.status]}
                      </span>
                    </td>
                    <td>{achievement.status === '達成' ? formatDate(achievement.updated_at) : '-'}</td>
                    <td>{achievement.admin_memo ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {isListLoading && (
          <p className="muted">読み込み中です。</p>
        )}
        
        {nextCursor != null && !isListLoading && (
          <button className="secondary-button" type="button" onClick={() => void loadAchievements(nextCursor)}>
            もっと見る
          </button>
        )}
      </section>
    </main>
  );
}
