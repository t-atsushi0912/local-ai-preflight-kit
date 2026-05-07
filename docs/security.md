# Security

この kit はローカルでの preflight 確認を前提にしています。project data を自動で公開することはありませんが、scripts に何を渡すかは利用者が制御します。

## Input Rules

- 渡すのは短い運用 context に限定し、transcript 全量は避けてください。
- summary や command text に 機密値、認証情報、私的なデータを入れないでください。
- repository や archive と一緒に共有する前に、生成された artifact を確認してください。

## Artifact Rules

- 生成 artifact は既定で `.local-ai-preflight/` 配下に置きます。
- `.local-ai-preflight/` は git で ignore します。
- 生成された run output は commit しないでください。
- generated artifacts を外部公開しないでください。

## Endpoint Rules

- 既定の endpoint は loopback-only です。
- `LOCAL_AI_OLLAMA_HOSTS` で候補を上書きできます。
- non-loopback への変更は、ローカル運用上の明示的な判断として扱ってください。

## Cleanup Rules

- cleanup の既定は dry-run です。
- 削除には `--apply` が必要です。
- 広すぎる root は拒否します。
- fixture test では古い run、当日の run、`latest/` を確認します。

## Path Rules

- 公開する docs や examples では placeholder と repo-relative path を使ってください。
- commit する例に固定の machine path を書かないでください。
- local wrapper 用の path は共有 repository ではなく、各自の local configuration に置いてください。
