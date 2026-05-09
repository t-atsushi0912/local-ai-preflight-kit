# local-ai-preflight-kit

`local-ai-preflight-kit` は、AI CLI セッションを始める前に、ローカル環境で短い事前確認を行うための小さな TypeScript CLI です。

ワークフローは local-only を前提にしています。最小限の git context を集め、ローカルの Ollama endpoint を確認し、`decision` と `exit code` を固定した小さな artifact を書き出します。

## 提供内容

- `src/`: TypeScript 製の preflight CLI 本体です。
- `dist/`: build 後に生成される CLI output です。
- `tests/ts_preflight.test.js`: TypeScript CLI の契約を確認する test です。
- `schemas/result.schema.json`: `result.json` の公開向け契約です。
- `scripts/ollama_probe.sh`: ローカルの Ollama `/api/tags` 候補を確認します。
- `scripts/ollama_summarize.sh`: stdin または file の内容をローカル Ollama API で要約します。
- `scripts/local-ai-preflight`: 参考実装として残している shell 版です。
- `scripts/preflight-cleanup`: 古い preflight 実行 directory を整理します。既定は dry-run です。
- `examples/codex-shim`: TypeScript CLI を実際の CLI binary の前段に置く wrapper 例です。

## 使い方

依存を入れて build した後は次のように実行できます。

```bash
npm install
npm run build
node dist/cli.js --repo . --no-summarize
```

local package として配布確認する場合は `npm pack` で tgz を作り、別 directory で `npm install ../local-ai-preflight-kit-0.1.0.tgz` のように入れて `npx local-ai-preflight --help` を確認できます。npm publish 済みの前提は置きません。

既定の artifact root は次のとおりです。

```text
.local-ai-preflight/artifacts/
```

この directory は git の管理対象外です。TypeScript CLI は `result.json` と `summary.md` を書き出し、同じ root 内の `latest/` も更新します。`result.json` の path field には、その実行で CLI が解決した path をそのまま記録します。

TypeScript CLI には `--artifact-dir`、`--artifact-root`、`--max-bytes`、`--no-summarize`、`--help`、`--version` があります。機械判定は `result.json` を正本として扱い、stdout は短い案内出力です。

## Decision と Exit Code

- `continue` は exit code `0` です。
- `review` は exit code `1` です。
- `stop` は exit code `2` です。

`review` と `stop` は、そのまま実行を続ける前に見直す前提です。

## 設定

ローカルで上書き設定が必要な場合だけ、example の environment file をコピーしてください。

```bash
cp examples/config.env.example .env
```

その後、手元の環境に合わせて値を調整します。既定のローカル endpoint で Ollama が利用できる場合、この file がなくても scripts は動作します。

## Legacy Shell Scripts

既存の shell scripts は参考実装として残しています。契約の正本は TypeScript CLI と `schemas/result.schema.json` です。shell 版は互換補助として扱い、主導線には戻しません。

## Cleanup

cleanup は `--apply` を付けない限り dry-run のままです。

```bash
scripts/preflight-cleanup --root .local-ai-preflight/artifacts --keep-days 14
scripts/preflight-cleanup --root .local-ai-preflight/artifacts --keep-days 14 --apply
```

`latest/` と当日の run directory は保持されます。

## CI

同梱の workflow では `npm run build`、`npm test`、`npm run verify`、shell syntax、fixture cleanup、shell smoke、公開前提の scan を確認します。

通常 test は mock endpoint で安定させています。real Ollama の任意 test は `LOCAL_AI_RUN_REAL_OLLAMA_TESTS=1 LOCAL_AI_OLLAMA_HOSTS="http://127.0.0.1:11434" node --test tests/ts_preflight.real_ollama.test.js` で明示実行し、local endpoint が未応答なら `not_available` 扱いにします。

## Safety Notes

- summary、command、prompt に 機密値 を渡さないでください。
- 生成された artifact を公開しないでください。
- scripts は既定でローカルの Ollama endpoint のみを対象にします。
- `.local-ai-preflight/` は version control に含めないでください。
- TypeScript CLI の `summary.md` は `public_summary_v1` で短い確認用に整え、機密値やローカル環境固有 path をそのまま出さない方針です。

## Non-goals

- remote への送信
- background daemon
- terminal transcript 全量の記録
- project documentation や test result の代替
