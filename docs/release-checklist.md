# Release Checklist

この checklist は local package を公開直前に見直すためのものです。ここに並ぶ項目は確認事項であり、実行済みを前提にしません。

## Verify

- `npm run build`
- `npm test`
- `npm run verify`
- `node dist/cli.js --help`
- `node dist/cli.js --version`

## Package Smoke

- `npm pack --dry-run`
- `npm pack`
- `tar -tzf local-ai-preflight-kit-0.1.0.tgz`
- `/tmp` 配下で `npm init -y`
- `/tmp` 配下で `npm install <tgz>`
- `/tmp` 配下で `npx local-ai-preflight --help`
- `/tmp` 配下で `npx local-ai-preflight --version`
- `/tmp` 配下で `npx local-ai-preflight --repo <repo-path> --no-summarize --artifact-dir <tmp-artifact-dir>`

real Ollama 成功経路は任意確認です。local endpoint が未応答なら `review` と exit code `1` を契約どおりと扱います。

## Public Scan

- tracked-files public scan
- `git ls-files '*.tgz' artifacts latest output tmp 2>/dev/null || true`
- tgz、artifact、tmp 生成物が tracked に入っていないこと

## Metadata Decisions

- `private=true` は npm publish を実行する直前まで維持する
- accidental publish を避ける理由がまだ有効か確認する
- `repository`、`bugs`、`homepage`、`publishConfig` は公開先が固まるまで追加しない
- 公開先が固まった場合だけ、最小の metadata を追加する

## Contract Checks

- TypeScript CLI を本体として維持していること
- shell 版が参考実装/互換補助のままであること
- `result.json` を機械判定の正本として扱うこと
- `schema_version` と CLI contract の破壊的変更がある場合だけ versioning を見直すこと
