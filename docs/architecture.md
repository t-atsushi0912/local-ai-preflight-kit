# Architecture

`local-ai-preflight-kit` は、workflow を小さな責務に分けて構成しています。

## Probe

`scripts/ollama_probe.sh` は、短い候補一覧に対してローカルの Ollama endpoint を確認します。既定の候補は loopback host です。必要なら `LOCAL_AI_OLLAMA_HOSTS` で候補一覧を差し替えられます。

probe は project content を読みません。確認するのは `/api/tags` が応答するかどうかだけです。

## Summarize

`scripts/ollama_summarize.sh` は stdin または明示した input file を読み取り、byte 数で上限をかけたうえで、その抜粋だけをローカル Ollama API に渡します。返ってきた summary は stdout に出力し、raw の source text は disk に書き出しません。

## Preflight

`scripts/local-ai-preflight` は git repository を解決し、短い context を集め、probe を実行し、必要に応じて summary を作り、次の artifact を書き出します。

```text
.local-ai-preflight/artifacts/YYYY-MM-DD/YYYYMMDDTHHMMSSZ/result.json
.local-ai-preflight/artifacts/YYYY-MM-DD/YYYYMMDDTHHMMSSZ/summary.md
```

artifact layout は意図的に単純です。保存する context も次の最小限に絞っています。

- repository name
- UTC timestamp
- `git status --short`
- `git diff --stat`

artifact root が repository の内側にある場合は、最新の `result.json` と `summary.md` を `latest/` にもコピーします。

## Cleanup

`scripts/preflight-cleanup` は指定した artifact root 配下の日付 directory を走査します。`latest/` は対象外で、当日の directory も保持します。timestamp 付きの run directory を削除するのは `--apply` を明示した場合だけで、既定は dry-run です。

## Wrapper Examples

`examples/codex-shim` は、実際の CLI binary を実行する前に preflight を呼ぶ例です。wrapper の使い方を示すものであり、installer ではありません。

## Failure Modes

- 対象 path が git repository でなければ、preflight は artifact を書く前に終了します。
- ローカル Ollama probe が失敗した場合でも、preflight は `status: probe_failed` を含む `result.json` を書きます。
- probe 成功後に summarize が失敗した場合は、`status: summarize_failed` を書きます。
- cleanup は filesystem root、home directory、`/tmp` のような広すぎる root を拒否します。
