# Fight For Your Right

<https://fight-for-your-right.revantoa.workers.dev>


## コンセプト

- 他人からの指示をウェブサイトで受け付けて、それを Discord Bot で通知するシステム
    - 「目的のない散歩」が苦手な自分が、「自分自身への内発的動機では上手く動けないが、他人からの指示命令なら素直に従って動ける」ことに気付いたため、それを実現する
- エンドユーザ向け Web サイト部分
    - React Router v7 フロントエンド SPA + Hono バックエンド API
    - `/` トップページ : サイトのコンセプト説明、「これやれ」投稿フォーム (指示 : 必須、名前 : 任意)、達成状況一覧
        - 達成状況一覧 : 投稿された指示と、それぞれの達成状況 … No、指示、投稿者名、登録日、達成状況 (未送信 or 既読 or 達成 or スキップ or キャンセル)、達成日、メモ、の列を表示する
- 管理ページ部分 : 管理者1名のみが利用する
    - `/admin` 管理トップページ : 未ログイン時は管理者パスワードの入力フォーム、ログイン時は達成状況一覧を表示する
    - `/admin/achievements/:id` : 指定の1件に対し、投稿された指示と達成状況を編集・削除する詳細ページ (理由により達成不可能な目標に対しては「キャンセル」、荒らしなどの投稿は物理削除する)
- Discord Bot 部分 : 管理者1名のみが利用する
    - 定時実行 : Cloudflare Cron Triggers … 指定の Discord サーバに「指示」を1つ送る
        - 達成していない目標からランダムに1つ抽出する、全て達成している場合は何らかの目標を自動生成する
            - **TODO : 目標の自動生成には Cloudflare Workers AI の無料枠のみを利用したい。その他、自動生成やストック作成の方法は調査検討する**
        - 本文 : `YYYY-MM-DD はこれをせよ : [ID 0] ◯◯`
            - 自動生成の場合 : `YYYY-MM-DD はこれをするのはどうか : ◯◯ (自動生成)`
        - 「達成」「スキップ」「キャンセル」のボタンを付与する
    - Interactions API : POST `/discord/interactions` … 投稿メッセージのボタン押下、スラッシュコマンドを受信する
        - 「達成」ボタン押下 or `/達成` スラッシュコマンド : 対象の指示を達成したものとして更新する
        - 「スキップ」ボタン押下 or `/スキップ` スラッシュコマンド : 対象の指示を「今日はスキップ」するものとして更新し、別の目標を1つ選んで再送信する
        - 「キャンセル」ボタン押下 or `/キャンセル` スラッシュコマンド : 対象の指示を「キャンセル」するものとして更新する
        - スラッシュコマンド時は ID と任意の「メモ」を指定できる


## npm Scripts

- `$ npm run dev`
    - `@react-router/dev` 内の React Router CLI を使用して Vite による開発サーバを起動する・`isbot` パッケージが勝手にインストールされる
- `$ npm run lint`
    - ESLint を実行して自動修正を行う
- `$ npm run generate-types`
    - Wrangler CLI を使用して `.dev.vars` を参照しつつ Workers が使用する型定義ファイルを `worker-configuration.d.ts` に出力する・React Router CLI を使用して `.react-router/` 型定義を出力する
- `$ npm run build`
    - React Router CLI が Vite を使用して本番ビルドする
- `$ npm run build-only`
    - `npm run build` が `npm run generate-types` と `tsc` の後に実際のビルドを行うのに対して、本コマンドは `react-router build` コマンドのみを実行する
- `$ npm run preview`
    - Vite ビルド後に Wrangler の開発サーバを起動する
- `$ npm run preview-only`
    - ビルド処理をスキップして Wrangler の開発サーバを起動する
- `$ npm run deploy`
    - Vite ビルド後に Cloudflare Workers にデプロイする
- `$ npm run deploy-only`
    - ビルド処理をスキップして Cloudflare Workers にデプロイする
- `$ npm run tsc`
    - TypeScript コンパイルチェックを行う
- `$ npm run wrangler`
    - Wrangler CLI


## D1 SQLite データベース

```bash
$ wrangler d1 create fight-for-your-right

# テーブルを確認する
$ wrangler d1 execute fight-for-your-right --local  --command='SELECT * FROM achievements'
$ wrangler d1 execute fight-for-your-right --remote --command='SELECT * FROM achievements'

# SQL ファイルを実行する場合
# $ wrangler d1 execute fight-for-your-right --local  --file='./schema.sql'
# $ wrangler d1 execute fight-for-your-right --remote --file='./schema.sql'

# インデックスを確認する
$ wrangler d1 execute fight-for-your-right --local  --command='SELECT * FROM sqlite_master WHERE type = '\''index'\'''
$ wrangler d1 execute fight-for-your-right --remote --command='SELECT * FROM sqlite_master WHERE type = '\''index'\'''
```

```sql
CREATE TABLE IF NOT EXISTS achievements (
  id           INTEGER  PRIMARY KEY  AUTOINCREMENT,
  instruction  TEXT     NOT NULL,
  user_name    TEXT,
  user_ip      TEXT     NOT NULL,
  created_at   TEXT     NOT NULL     DEFAULT CURRENT_TIMESTAMP,
  status       TEXT     NOT NULL     DEFAULT '未送信' CHECK(status IN ('未送信', '既読', '達成', 'スキップ', 'キャンセル')),
  updated_at   TEXT     NOT NULL     DEFAULT CURRENT_TIMESTAMP,
  admin_memo   TEXT
);
```

- `achievements` テーブル
    - `id` : 連番
    - `instruction` : 指示
    - `user_name` : 投稿者名 (任意入力)
    - `user_ip` : 投稿者 IP アドレス (管理用途)
    - `created_at` : 投稿日時
    - `status` : 達成状況 (未送信 or 既読 or 達成 or スキップ or キャンセル)
    - `updated_at` : Discord Bot が送信した日時、もしくは達成 or スキップ or キャンセルした日時
    - `admin_memo` : 管理者メモ (任意入力)
- `status` の意味
    - `未送信` : 指示が投稿された直後の状態
    - `既読` : Discord Bot がその指示を送信した時に、同時にこの値へ DB 更新する
    - `達成` : 指示を達成した状態
    - `スキップ` : その日だけスキップした状態。翌日以降の候補には含める
    - `キャンセル` : 達成不可能、または実行しない状態
- `スキップ` の翌日以降復帰判定には `updated_at` を使う


## シークレット

- ローカルでは `.dev.vars` ファイルを参照する (Git 管理対象外)
- `server/types/hono-bindings.ts` で型定義に含めておく

```bash
$ echo 'VALUE' | wrangler secret put 【Secret 名】 --name fight-for-your-right
```

- `TURNSTILE_SECRET_KEY` : Cloudflare Turnstile の Secret Key
- `ADMIN_PASSWORD` : 管理ページのログイン用パスワード
- `ADMIN_JWT_SECRET` : 管理 API 用 JWT 署名シークレット
- `DISCORD_BOT_TOKEN` : Discord Bot Token
- `DISCORD_USER_ID` : DM 送信先の Discord User ID
- `DISCORD_PUBLIC_KEY` : Discord Interactions API の署名検証用 Public Key


## Discord Bot

### Discord Application の作成

1. [Discord Developer Portal](https://discord.com/developers/applications) を開く
2. `New Application` をクリックし、任意の名前で Application を作成する
3. 左メニューの `General Information` を開く
4. `Public Key` をコピーする
5. コピーした値を `DISCORD_PUBLIC_KEY` として Cloudflare Workers Secret に登録する

### Discord Bot Token の取得

1. Discord Developer Portal の対象 Application で、左メニューの `Bot` を開く
2. `Add Bot` をクリックする (既に Bot が存在する場合、この手順は不要)
3. `Token` の `Reset Token` をクリックして Bot Token を発行する
4. 発行された Token をコピーする
    - この値が `DISCORD_BOT_TOKEN`
    - Bot Token は一度閉じると再表示できないため、コピーし忘れた場合は再度 `Reset Token` する
5. コピーした値を `DISCORD_BOT_TOKEN` として Cloudflare Workers Secret に登録する

### Discord User ID の取得

1. Discord アプリを開く
2. `ユーザー設定` → `詳細設定` → `開発者モード` を有効にする
3. DM 送信先にしたい自分のユーザーを右クリックする
4. `ユーザーIDをコピー` をクリックする
5. コピーした数値を `DISCORD_USER_ID` として Cloudflare Workers Secret に登録する

### Bot のインストール

Bot から `DISCORD_USER_ID` 宛に DM 送信するため、Bot と送信先ユーザーが同じ Discord サーバに所属している状態にする。

1. Discord Developer Portal の対象 Application で、左メニューの `OAuth2` → `URL Generator` を開く
2. `Scopes` で以下を選択する
    - `bot`
    - `applications.commands`
3. `Bot Permissions` で以下を選択する
    - `Send Messages`
    - `Use Slash Commands`
4. 生成された URL をブラウザで開く
5. インストール先として自分用の Discord サーバを選択し、認可する

DM 上でスラッシュコマンドを実行する場合は、Bot と送信先ユーザーが「DM が有効なサーバ」を共有している必要がある。Discord で `このコマンドを使用するには、このアプリでDMが有効になっているサーバーを共有する必要があります` と表示される場合は、Bot をインストールしたサーバで以下を確認する。

1. Discord アプリで Bot をインストールしたサーバを開く
2. サーバ名のメニューから `プライバシー設定` を開く
3. `サーバーメンバーからのダイレクトメッセージを許可する` を有効にする
4. Bot との DM を開き直し、スラッシュコマンドを再実行する

それでも DM でスラッシュコマンドが表示されない場合は、一度サーバ内のテキストチャンネルで `/達成` などのコマンドが表示されるか確認する。サーバ内で表示されるが DM で表示されない場合は、Discord 側の DM 許可設定か、Bot とユーザーが共有しているサーバの状態が原因。

### Interactions Endpoint の設定

1. Discord Developer Portal の対象 Application で、左メニューの `General Information` を開く
2. `Interactions Endpoint URL` に以下を入力する
    - `https://fight-for-your-right.revantoa.workers.dev/discord/interactions`
3. `Save Changes` をクリックする
    - Cloudflare Workers 側で `DISCORD_PUBLIC_KEY` による署名検証が正しく実装されていないと保存に失敗する
    - Interactions API は `X-Signature-Ed25519` と `X-Signature-Timestamp` を `DISCORD_PUBLIC_KEY` で署名検証する

### スラッシュコマンド

- スラッシュコマンドは Discord Developer Portal の画面操作ではなく、Discord API で登録する
    - `/達成` : `id` (必須・整数), `memo` (任意・文字列)
    - `/スキップ` : `id` (必須・整数), `memo` (任意・文字列)
    - `/キャンセル` : `id` (必須・整数), `memo` (任意・文字列)
- Discord API で登録する際は `General Information` の `Application ID` を使用する
- Bot の認証には `DISCORD_BOT_TOKEN` を使用する
- グローバルコマンドとして登録する場合は、以下のように `PUT /applications/{application.id}/commands` を実行する
    - 同名の既存コマンドは上書きされる
    - `contexts` は `0` がサーバ、`1` が Bot DM
    - `integration_types` は `0` がサーバインストール

```bash
$ export DISCORD_APPLICATION_ID='General Information の Application ID'
$ export DISCORD_BOT_TOKEN='Bot ページで発行した Token'

$ curl -X PUT "https://discord.com/api/v10/applications/${DISCORD_APPLICATION_ID}/commands" \
  -H "Authorization: Bot ${DISCORD_BOT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "name": "達成",
      "description": "指定した指示を達成済みにする",
      "type": 1,
      "integration_types": [0],
      "contexts": [0, 1],
      "options": [
        {
          "name": "id",
          "description": "達成済みにする指示 ID",
          "type": 4,
          "required": true
        },
        {
          "name": "memo",
          "description": "管理者メモ",
          "type": 3,
          "required": false
        }
      ]
    },
    {
      "name": "スキップ",
      "description": "指定した指示を今日はスキップする",
      "type": 1,
      "integration_types": [0],
      "contexts": [0, 1],
      "options": [
        {
          "name": "id",
          "description": "スキップする指示 ID",
          "type": 4,
          "required": true
        },
        {
          "name": "memo",
          "description": "管理者メモ",
          "type": 3,
          "required": false
        }
      ]
    },
    {
      "name": "キャンセル",
      "description": "指定した指示をキャンセルする",
      "type": 1,
      "integration_types": [0],
      "contexts": [0, 1],
      "options": [
        {
          "name": "id",
          "description": "キャンセルする指示 ID",
          "type": 4,
          "required": true
        },
        {
          "name": "memo",
          "description": "管理者メモ",
          "type": 3,
          "required": false
        }
      ]
    }
  ]'
```

### Bot 送信処理

- 送信先は Bot との DM 相当を第一候補とする
- Bot との DM 送信には `DISCORD_USER_ID` を使用する
- Discord Bot が送信するボタンは `達成` / `スキップ` / `キャンセル`
- `スキップ` 操作時は対象の `status` を `スキップ` に更新し、別の候補を再送信する


## Cron Triggers

- Cloudflare Workers の Cron Triggers で Discord Bot 送信処理を定時実行する
- `wrangler.jsonc` の `triggers.crons` で毎日 `0 0 * * *` UTC (JST 09:00) に実行する


## Links

- [Neo's World](https://neos21.net/)
