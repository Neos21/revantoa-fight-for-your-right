# TASKS

## 前提・決定事項

- `schema.sql` は作らない。D1 の SQL 定義は README に記載して管理する。
- メインテーブルは `achievements`。
- `achievements.status` は文字列で直接保存する。
  - `未送信`: 指示が投稿された直後の状態。
  - `既読`: Discord Bot がその指示を送信した時に DB 更新する。
  - `達成`: 指示を達成した状態。
  - `スキップ`: その日だけスキップした状態。翌日以降の候補には含める。
  - `キャンセル`: 達成不可能、または実行しない状態。
- `スキップ` の翌日以降復帰判定には `updated_at` を使う。
- `updated_at` は送信日時、達成日時、スキップ日時、キャンセル日時を兼ねる。履歴用のカラム分割はしない。
- 投稿フォームには Cloudflare Turnstile を置く。
- フロントエンド表示用に `TURNSTILE_SITE_KEY` を使用する。
- 管理 JWT は Bearer Token として扱う。
- 管理画面の JWT は zustand store 経由で LocalStorage に保存する。
- 管理 API 呼び出しには ky の管理画面用 client を用意する。
- Discord 送信先は Bot との DM 相当を第一候補にする。
- DM が Discord Interactions や権限の都合で難しい場合は、Bot とやり取りする専用チャンネルを作る方針にする。
- 目標の自動生成は今は TODO のままにする。候補がない場合の挙動は最小実装に留める。
- Discord Bot / Interactions / Developer Portal 側の不足知識は実装しながら補い、構築手順を README に追記する。

## 実装タスク

### 1. README の仕様整理

- [x] D1 セクションに `achievements` の `CREATE TABLE` SQL を追記する。
- [x] index 作成 SQL を追記する。
- [x] `posts` 参照のコマンド例を `achievements` に修正する。
- [x] `status` の意味と状態遷移を追記する。
- [x] Turnstile の設定手順を追記する。
- [x] Discord Developer Portal 側の Bot 登録手順を追記する。
- [x] Discord Interactions Endpoint URL の設定手順を追記する。
- [x] Cloudflare Cron Triggers の設定手順を追記する。
- [x] 必要な secrets の一覧と登録コマンドを追記する。

### 2. DB / 型定義

- [x] `AchievementStatus = '未送信' | '既読' | '達成' | 'スキップ' | 'キャンセル'` を定義する。
- [x] `Achievement` 型を定義する。
- [x] `PublicAchievement` 型を定義する。
- [x] `AdminAchievement` 型を定義する。
- [x] D1 操作用の query helper を作成する。
- [x] `created_at` / `updated_at` の生成・保存形式を統一する。
- [x] スキップ済み候補の翌日復帰判定 helper を作成する。

### 3. 公開投稿 API

- [x] `POST /api/posts` を実装する。
- [x] `GET /api/config` で `TURNSTILE_SITE_KEY` を返す。
- [x] Zod で `instruction` 必須、`userName` 任意を検証する。
- [x] Turnstile token を検証する。
- [x] 投稿者 IP を取得して `user_ip` に保存する。
- [x] 初期 `status` を `未送信` にする。
- [x] 成功・失敗レスポンス形式を統一する。

### 4. 公開達成状況 API

- [x] `GET /api/achievements` を実装する。
- [x] 公開用カラムのみ返す。
- [x] `user_ip` を返さない。
- [x] ページングを実装する。
- [x] 登録日降順、または ID 降順で取得する。
- [x] フロントの遅延読み込みに使える `nextCursor` か `page` 方式を決めて実装する。

### 5. トップページ UI

- [x] サイトのコンセプト説明を表示する。
- [x] 「これやれ」投稿フォームを実装する。
- [x] Turnstile を表示する。
- [x] 投稿成功状態を表示する。
- [x] 投稿失敗状態を表示する。
- [x] 送信中状態を表示する。
- [x] 達成状況一覧を表示する。
- [x] 1 画面分スクロール後に一覧読み込みを開始する。
- [x] 一覧の空状態を表示する。
- [x] 一覧の読み込み中状態を表示する。
- [x] 一覧のエラー状態を表示する。

### 6. 管理認証

- [x] `POST /api/admin/login` を実装する。
- [x] `ADMIN_PASSWORD` を検証する。
- [x] `ADMIN_JWT_SECRET` で JWT を発行する。
- [x] フロントに token を返す。
- [x] zustand を追加する。
- [x] 管理 auth store を作成する。
- [x] LocalStorage 永続化を実装する。
- [x] 管理 API 用 ky client を作成する。
- [x] 管理 API の `Authorization: Bearer <token>` 認証 middleware を追加する。
- [x] ログアウト処理を実装する。

### 7. 管理トップページ

- [x] `/admin` route を追加する。
- [x] 未ログイン時はパスワードフォームを表示する。
- [x] ログイン時は詳細一覧を表示する。
- [x] 一覧に `user_ip` を表示する。
- [x] 一覧に `admin_memo` を表示する。
- [x] 詳細ページへの導線を追加する。
- [x] ログアウトボタンを追加する。

### 8. 管理詳細 API

- [x] `GET /api/admin/achievements` を実装する。
- [x] `GET /api/admin/achievements/:id` を実装する。
- [x] `PUT /api/admin/achievements/:id` を実装する。
- [x] `DELETE /api/admin/achievements/:id` を実装する。
- [x] `instruction` を更新できるようにする。
- [x] `user_name` を更新できるようにする。
- [x] `status` を更新できるようにする。
- [x] `admin_memo` を更新できるようにする。
- [x] 削除は物理削除として実装する。

### 9. 管理詳細 UI

- [x] `/admin/achievements/:id` route を追加する。
- [x] 投稿内容を表示する。
- [x] `status` 編集 UI を実装する。
- [x] `admin_memo` 編集 UI を実装する。
- [x] 保存処理を実装する。
- [x] 削除処理を実装する。
- [x] 一覧へ戻る導線を追加する。

### 10. Discord Bot 設定

- [x] `DISCORD_PUBLIC_KEY` を binding 型に追加する。
- [x] `DISCORD_BOT_TOKEN` を binding 型に追加する。
- [x] `DISCORD_APPLICATION_ID` を binding 型に追加する。
- [x] DM 送信用に必要なら `DISCORD_USER_ID` を binding 型に追加する。
- [x] 専用チャンネル方式が必要になった場合は `DISCORD_CHANNEL_ID` を binding 型に追加する。
- [x] Discord API 呼び出し helper を作成する。
- [x] Discord Developer Portal の必要設定を README に追記する。

### 11. Discord 送信処理

- [x] 候補取得 query を実装する。
- [x] `未送信` を候補に含める。
- [x] `スキップ` かつ `updated_at` が前日以前のものを候補に含める。
- [x] `既読`、`達成`、`キャンセル` は候補から除外する。
- [x] 候補からランダムに 1 件選ぶ。
- [x] Bot DM 送信を実装する。
- [x] DM が難しい場合に専用チャンネル送信へ切り替えられるようにする。
- [x] Discord メッセージ本文を README 仕様に合わせる。
- [x] `達成` / `スキップ` / `キャンセル` ボタンを付与する。
- [x] 送信成功時に `status` を `既読` に更新する。
- [x] 送信成功時に `updated_at` を現在時刻に更新する。
- [x] 候補がない場合は今は何もしない、または TODO として明示する。

### 12. Cron

- [x] Cloudflare Workers の `scheduled` handler を追加する。
- [x] Cron から Discord 送信処理を呼ぶ。
- [x] `wrangler.jsonc` に Cron Triggers 設定を追加する。
- [x] README に Cron Triggers の設定と確認手順を追記する。

### 13. Discord Interactions API

- [x] `POST /discord/interactions` を実装する。
- [x] Discord 署名検証を実装する。
- [x] Ping 応答を実装する。
- [x] `達成` ボタン押下処理を実装する。
- [x] `スキップ` ボタン押下処理を実装する。
- [x] `キャンセル` ボタン押下処理を実装する。
- [x] `/達成` スラッシュコマンドを実装する。
- [x] `/スキップ` スラッシュコマンドを実装する。
- [x] `/キャンセル` スラッシュコマンドを実装する。
- [x] スラッシュコマンドで ID を受け取れるようにする。
- [x] スラッシュコマンドで任意メモを受け取れるようにする。
- [x] `スキップ` 時は対象を更新し、別候補を再送信する。
- [x] Interactions 関連の登録・確認手順を README に追記する。

### 14. 検証

- [x] `npm run tsc` を実行する。
- [x] `npm run lint` を実行する。
- [x] `npm run build` を実行する。
- [ ] ローカル D1 で投稿を確認する。
- [ ] ローカル D1 で一覧表示を確認する。
- [ ] 管理ログインを確認する。
- [ ] 管理編集を確認する。
- [ ] 管理削除を確認する。
- [ ] Discord 署名検証を確認する。
- [ ] Discord ボタン操作を確認する。
- [ ] Discord スラッシュコマンドを確認する。
- [ ] Cron を Wrangler ローカル実行、またはデプロイ後ログで確認する。

## 推奨実装順

1. README の仕様整理
2. DB / 型定義
3. 公開投稿 API
4. 公開達成状況 API
5. トップページ UI
6. 管理認証
7. 管理トップページ
8. 管理詳細 API
9. 管理詳細 UI
10. Discord Bot 設定
11. Discord 送信処理
12. Cron
13. Discord Interactions API
14. 検証
