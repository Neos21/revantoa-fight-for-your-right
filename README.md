# Fight For Your Right

<https://fight-for-your-right.revantoa.workers.dev>


## コンセプト

- 他人からの指示をウェブサイトで受け付けて、それを Discord Bot で通知するシステム
    - 「目的のない散歩」が苦手な自分が、「自分自身への内発的動機では上手く動けないが、他人からの指示命令なら素直に従って動ける」ことに気付いたため、それを実現する
- エンドユーザ向け Web サイト部分
    - React Router v7 フロントエンド SPA + Hono バックエンド API
    - `/` トップページ : サイトのコンセプト説明、「これやれ」投稿フォーム (指示 : 必須、名前 : 任意)、達成状況一覧
        - 達成状況一覧 : 投稿された指示一覧と、それぞれの達成状況 … No、指示、投稿者名、登録日、達成状況 (未送信 or 既読 or 達成 or スキップ or キャンセル)、達成日、メモ、の列を表示する
        - POST `/api/posts` : フォームの投稿先 API エンドポイント
        - GET `/api/achievements` : 達成状況一覧を取得する (ページを1画面分スクロールしたら読込開始する)
- 管理ページ部分 : 管理者1名のみが利用する
    - `/admin` 管理トップページ : 未ログイン時は管理者パスワードの入力フォーム、ログイン時は達成状況の詳細一覧を表示する
        - POST `/api/admin/login` : パスワードを検証し、管理用 JWT トークンを発行する
        - GET `/api/admin/achievements` : 達成状況の一覧
    - `/admin/achievements/:id` : 指定の1件に対し、投稿された指示と達成状況を編集・削除する詳細ページ
        - PUT `/api/admin/achievements/:id` : 指定の1件を更新する (理由により達成不可能な目標に対しては「キャンセル」)
        - DELETE `/api/admin/achievements/:id` : 指定の1件を削除する (荒らしなどの投稿は物理削除する)
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

| Name           | Description                                                                                                                                                                               |
|----------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| dev            | `@react-router/dev` 内の React Router CLI を使用して Vite による開発サーバを起動する・`isbot` パッケージが勝手にインストールされる                                                        |
| lint           | ESLint を実行して自動修正を行う                                                                                                                                                           |
| generate-types | Wrangler CLI を使用して `.dev.vars` を参照しつつ Workers が使用する型定義ファイルを `worker-configuration.d.ts` に出力する・React Router CLI を使用して `.react-router/` 型定義を出力する |
| build          | React Router CLI が Vite を使用して本番ビルドする                                                                                                                                         |
| build-only     | `npm run build` が `npm run generate-types` と `tsc` の後に実際のビルドを行うのに対して、本コマンドは `react-router build` コマンドのみを実行する                                         |
| preview        | Vite ビルド後に Wrangler の開発サーバを起動する                                                                                                                                           |
| preview-only   | ビルド処理をスキップして Wrangler の開発サーバを起動する                                                                                                                                  |
| deploy         | Vite ビルド後に Cloudflare Workers にデプロイする                                                                                                                                         |
| deploy-only    | ビルド処理をスキップして Cloudflare Workers にデプロイする                                                                                                                                |
| tsc            | TypeScript コンパイルチェックを行う                                                                                                                                                       |
| wrangler       | Wrangler CLI                                                                                                                                                                              |


## D1 SQLite データベース

```bash
# D1 データベースを作成する
$ wrangler d1 create fight-for-your-right

# ローカルとリモートを指定して SQL を実行する
$ wrangler d1 execute fight-for-your-right --local  --command='SELECT * FROM posts'
$ wrangler d1 execute fight-for-your-right --remote --command='SELECT * FROM posts'
$ wrangler d1 execute fight-for-your-right --local  --file='./schema.sql'
$ wrangler d1 execute fight-for-your-right --remote --file='./schema.sql'

# インデックス一覧を確認する
$ wrangler d1 execute fight-for-your-right --local  --command='SELECT * FROM sqlite_master WHERE type = '\''index'\'''
$ wrangler d1 execute fight-for-your-right --remote --command='SELECT * FROM sqlite_master WHERE type = '\''index'\'''
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


## シークレット

- ローカルでは `.dev.vars` ファイルを参照する (Git 管理対象外)
- `server/types/hono-bindings.ts` で型定義に含めておく

```bash
$ echo 'VALUE' | wrangler secret put 【Secret 名】 --name fight-for-your-right
```


## Links

- [Neo's World](https://neos21.net/)
