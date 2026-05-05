# Fight For Your Right

<https://fight-for-your-right.revantoa.workers.dev>


## コンセプト

- TODO


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


## シークレット

- ローカルでは `.dev.vars` ファイルを参照する (Git 管理対象外)
- `server/types/hono-bindings.ts` で型定義に含めておく

```bash
$ echo 'VALUE' | wrangler secret put 【Secret 名】 --name fight-for-your-right
```


## Links

- [Neo's World](https://neos21.net/)
