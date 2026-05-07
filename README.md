# local-ai-preflight-kit

`local-ai-preflight-kit` は、大きな AI CLI セッションを始める前に、ローカル環境で短い事前確認を行うための小さな shell script 集です。

ワークフローは local-only を前提にしています。最小限の git context を集め、ローカルの Ollama endpoint を確認し、小さな artifact を書き出し、続行前に見直せる短い summary を残します。

## 提供内容

- `scripts/ollama_probe.sh`: ローカルの Ollama `/api/tags` 候補を確認します。
- `scripts/ollama_summarize.sh`: stdin または file の内容をローカル Ollama API で要約します。
- `scripts/local-ai-preflight`: 短い git context を取得し、preflight artifact を書き出します。
- `scripts/preflight-cleanup`: 古い preflight 実行 directory を整理します。既定は dry-run です。
- `examples/codex-shim`: 実際の CLI binary を呼ぶ前に preflight を挟む wrapper 例です。

## 使い方

clone 後は次のように実行できます。

```bash
scripts/ollama_probe.sh
scripts/local-ai-preflight --repo .
scripts/preflight-cleanup --root .local-ai-preflight/artifacts --dry-run
```

既定の preflight artifact root は次のとおりです。

```text
.local-ai-preflight/artifacts/
```

この directory は git の管理対象外です。

## 設定

ローカルで上書き設定が必要な場合だけ、example の environment file をコピーしてください。

```bash
cp examples/config.env.example .env
```

その後、手元の環境に合わせて値を調整します。既定のローカル endpoint で Ollama が利用できる場合、この file がなくても scripts は動作します。

## Cleanup

cleanup は `--apply` を付けない限り dry-run のままです。

```bash
scripts/preflight-cleanup --root .local-ai-preflight/artifacts --keep-days 14
scripts/preflight-cleanup --root .local-ai-preflight/artifacts --keep-days 14 --apply
```

`latest/` と当日の run directory は保持されます。

## CI

同梱の workflow では shell syntax、help output、fixture cleanup の挙動、preflight smoke の挙動、公開前提の safety scan を確認します。

## Safety Notes

- summary、command、prompt に 機密値 を渡さないでください。
- 生成された artifact を公開しないでください。
- scripts は既定でローカルの Ollama endpoint のみを対象にします。
- `.local-ai-preflight/` は version control に含めないでください。

## Non-goals

- remote への送信
- background daemon
- terminal transcript 全量の記録
- project documentation や test result の代替
