# CNP Gallery — 設計ドキュメント

- **日付**: 2026-06-29
- **ステータス**: 設計合意済み（実装計画はこの後 writing-plans で作成）
- **目的**: CNP（CryptoNinja Partners）NFTコレクションのギャラリーページを構築する。メタデータを D1 に格納し、トレイトによるフィルター・検索・詳細表示を提供。画像は Cloudflare Image Transformations で最適化配信する。

---

## 1. ゴール / 非ゴール

### ゴール
- リビール済み **22,222件** を一覧できるギャラリー（左サイドバー型レイアウト）
- トレイトによる多軸フィルター（該当件数表示つき）
- token ID 検索と個別詳細ページ
- token ID 昇順/降順ソート
- 5遁術ステータスの可視化（詳細ページのレーダーチャート、一覧はレンジ絞り込み）
- **速度を最優先**（エッジキャッシュ前提の構成）
- バー忍によるメタデータ変更を、ユーザー操作の「更新」ボタン経由で同期

### 非ゴール（今回スコープ外）
- レアリティスコア / ランキング（**実装しない**）
- バーン（消滅）の検知・除外処理（**今後バーンは発生しないため考慮不要**。トークン集合は固定）
- ウォレット接続・売買・ミント機能
- 多言語化（UI は日本語を基本とする）

---

## 2. データソースとスコープ

- **元データ**: `cnp-metadata/csv/output.csv`（24,444行、tokenId 1〜28888、欠番あり）
  - カラム: `tokenId, name, description, image, NINJUTSU, WEAPON(BACK), CHARACTER, CLAN, COSPLAY, ACCESSORIES(BODY), ACCESSORIES(HEAD), ACCESSORIES(FACE), WEAPON(FRONT), MOKUTON, KATON, DOTON, KINTON, SUITON`
- **対象**: リビール済みのみ＝トレイトが埋まっている **22,222件**。
  - 除外: NINJUTSU 等が空の「リビール待ち」2,222件（tokenId 26667〜28888、画像が `*_reveal.gif`）。
  - 欠番（バーン済み 4,443件、`burned-tokens.csv`）は CSV に存在しないため自然に除外される。
- **メタデータAPI（同期のソース・オブ・トゥルース）**: `https://data.cryptoninjapartners.com/new/json/{tokenId}.json`（現在＝バー忍反映後のメタデータを返す）
- **画像オリジン**: CSV の `image` 列の URL（リビール済みは `https://data.cryptoninjapartners.com/images/{tokenId}.png` 形式）

### トレイトのカーディナリティ（フィルターUI設計の参考）
| カテゴリ | ユニーク値数 |
|---|---|
| CHARACTER | 11 |
| CLAN | 4（Koka / Iga / Saika / Fuma） |
| NINJUTSU | ~37 |
| WEAPON(BACK) | ~42 |
| WEAPON(FRONT) | ~64 |
| COSPLAY | ~311（多い → 検索可能なリスト/折りたたみ） |
| ACCESSORIES(BODY) | ~61 |
| ACCESSORIES(HEAD) | ~47 |
| ACCESSORIES(FACE) | ~32 |
| MOKUTON/KATON/DOTON/KINTON/SUITON | 各 1〜10 の数値 |

> COSPLAY のように値が多いカテゴリは、ファセットを検索ボックス + 折りたたみで表示する。

---

## 3. 技術スタック

- **フレームワーク**: Next.js（App Router）
- **デプロイ**: OpenNext → Cloudflare Workers
- **DB**: Cloudflare D1（SQLite）
- **非同期処理**: Cloudflare Queues（メタデータ同期）
- **画像**: Cloudflare Image Transformations（`/cdn-cgi/image/...`）
- **スタイル**: CNPブランド寄りのポップなトンマナ（明るい配色・丸み）。CSS は Tailwind を想定（プロジェクト規約に合わせて確定）。

---

## 4. アーキテクチャ概要

```
                ┌─────────────────────────── Cloudflare ───────────────────────────┐
 ブラウザ ──▶  Worker (Next.js / OpenNext)                                          │
                │  - / (ギャラリー一覧: Server Component, URLクエリでフィルタ)        │
                │  - /token/[id] (詳細: SSR + キャッシュ)                            │
                │  - Route Handler /api/tokens (追加読み込み JSON)                   │
                │  - Route Handler /api/tokens/[id]/refresh (更新ボタン → enqueue)   │
                │        │ read/write                    │ enqueue                  │
                │        ▼                                ▼                          │
                │      D1 (tokens)  ◀── update ──  Queue Consumer Worker             │
                │                                   └─ fetch /new/json/{id}.json     │
                │  画像: <Image> → /cdn-cgi/image/... → オリジン画像 + エッジキャッシュ │
                └───────────────────────────────────────────────────────────────────┘
```

### レンダリング & キャッシュ戦略（速度最優先）
- メタデータ更新は稀（更新ボタン押下時のみ）。したがって積極的にキャッシュし、更新時だけ無効化する。
- **一覧**: フィルター条件を URL クエリで持つ Server Component。クエリ結果を**エッジキャッシュ**（cache tag: `tokens-list`）。
- **詳細**: SSR 結果を**エッジキャッシュ**（cache tag: `token:{id}`）。
- **追加読み込み / API**: Route Handler の JSON もキャッシュ可能。
- **無効化**: Queue consumer が D1 を更新したら、`token:{id}` と `tokens-list` を revalidate/purge する。
- クライアント JS は最小限（フィルター操作は URL 遷移ベース、必要箇所のみ client component）。

---

## 5. D1 スキーマ

非正規化した単一テーブル。22,222行と小規模なため SQLite で十分高速。

```sql
CREATE TABLE tokens (
  token_id     INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  description  TEXT,
  image_url    TEXT NOT NULL,
  -- カテゴリ系トレイト（フィルター対象）
  character    TEXT,
  clan         TEXT,
  ninjutsu     TEXT,
  weapon_back  TEXT,
  weapon_front TEXT,
  cosplay      TEXT,
  acc_body     TEXT,
  acc_head     TEXT,
  acc_face     TEXT,
  -- 5遁術ステータス（1〜10）
  mokuton      INTEGER,
  katon        INTEGER,
  doton        INTEGER,
  kinton       INTEGER,
  suiton       INTEGER,
  -- 同期管理
  updated_at   INTEGER          -- 最終同期時刻(epoch)
);

CREATE INDEX idx_character    ON tokens(character);
CREATE INDEX idx_clan         ON tokens(clan);
CREATE INDEX idx_ninjutsu     ON tokens(ninjutsu);
CREATE INDEX idx_weapon_back  ON tokens(weapon_back);
CREATE INDEX idx_weapon_front ON tokens(weapon_front);
CREATE INDEX idx_cosplay      ON tokens(cosplay);
CREATE INDEX idx_acc_body     ON tokens(acc_body);
CREATE INDEX idx_acc_head     ON tokens(acc_head);
CREATE INDEX idx_acc_face     ON tokens(acc_face);
```

> ファセット件数や複合フィルターの性能が問題になった場合は、別途 `facet_counts` 集計テーブルの事前計算を検討（22k規模では当面不要の見込み）。

---

## 6. シードパイプライン

- Node スクリプト（`scripts/seed.ts` 等）で実行:
  1. `output.csv` をストリームパース
  2. リビール判定（カテゴリトレイトが空でない）でフィルタ → 22,222件
  3. カラム名を D1 スキーマにマッピング（`WEAPON(BACK)` → `weapon_back` など）
  4. `INSERT` をバッチ（D1 batch API）で投入
- 実行タイミング: 初回セットアップ時、および必要に応じて手動再シード。
- **テスト対象**: CSV→行オブジェクトの変換、リビール判定、カラムマッピング。

---

## 7. フィルター・検索・ソート・ページング

### フィルター意味論
- **同一カテゴリ内 = OR**（例: CHARACTER = Makami OR Narukami）
- **カテゴリ間 = AND**（例: 上記 AND CLAN = Iga）
- 5遁術は**レンジ**（min/max）での絞り込み（任意機能、各遁術ごと）
- 条件は URL クエリに反映（共有・ブックマーク可能）。例: `/?character=Makami,Narukami&clan=Iga&katon_min=5`

### ファセット件数
- 表示中のフィルター文脈における各トレイト値の該当件数を `GROUP BY` で算出して表示。
- カテゴリごとに「他の条件を適用した状態での件数」を出す（標準的なファセット挙動）。

### ソート
- token ID 昇順 / 降順のみ。

### ページング
- **keyset pagination**（`WHERE token_id > :cursor ORDER BY token_id LIMIT :n`、降順時は対称）。
- 初回は Server Component が描画、追加読み込みは Route Handler `/api/tokens` が次バッチ JSON を返す。

### token ID 検索
- ヘッダー検索ボックスに ID を入力 → `/token/{id}` に遷移（存在しなければ Not Found）。

---

## 8. 詳細ページ `/token/[id]`

- 大判画像（Image Transformations）、name、全カテゴリトレイト一覧。
- 5遁術を**レーダーチャート**で可視化（+ 数値）。
- **OGP / Twitter Card** 対応（画像・名前）。
- **「更新」ボタン**: 押下で同期をトリガー（§9）。押下後は「更新リクエストを受付けました。反映まで少々お待ちください」を表示し、完了後の再アクセスで最新表示。
- 存在しない / リビール待ち ID は 404。

---

## 9. メタデータ同期フロー（Queues）

```
[詳細ページ 「更新」ボタン]
   │ POST /api/tokens/[id]/refresh
   ▼
[Route Handler] ── enqueue({ tokenId }) ──▶ [Cloudflare Queue]
                                                  │
                                                  ▼
                                        [Queue Consumer Worker]
                                          1. fetch /new/json/{id}.json
                                          2. パース → D1 の該当行と差分比較
                                          3. 差分あれば UPDATE + updated_at 更新
                                          4. キャッシュ無効化: token:{id}, tokens-list
```

- **非同期 UX**: ボタンは即応答。反映は次回アクセス時。
- **リトライ**: 取得失敗時は Queue のリトライに委ねる。
- **レート制御**: Queue のバッチ設定で外部APIへの負荷を抑制。
- **テスト対象**: JSON→D1 差分判定、UPDATE 生成、無効化呼び出し。

---

## 10. 画像パイプライン（Image Transformations）

- Next.js `<Image>` に**カスタムローダー**を実装し、`/cdn-cgi/image/width={w},quality={q},format=auto/{origin_image_url}` を生成。
- `format=auto` で AVIF/WebP を自動選択。
- 提供幅の例: 一覧サムネ `160 / 240 / 320`、詳細 `640 / 1024`（`srcset`/`sizes`）。
- 長期 `Cache-Control` でエッジ・ブラウザキャッシュ。フォールド下は遅延読み込み。
- 前提: Cloudflare ゾーンで Image Transformations を有効化。
- **テスト対象**: ローダーの URL 生成ロジック。

---

## 11. UI / UX

- **レイアウト**: A案＝左サイドバー型（左にフィルター常設、右にグリッド）。
- **トンマナ**: CNPブランド寄りのポップ（明るい配色・丸み）。CLAN を色タグで表現。
- **グリッドカード**: 画像（正方形）＋ name ＋ token ID ＋ CLAN タグ。
- **レスポンシブ**: モバイルではサイドバーをドロワー化、グリッド列数を縮小。
- 参考モック: `.superpowers/brainstorm/` に保存済み（`layout-v2.html`）。

### 主なコンポーネント境界
- `GalleryGrid`（一覧グリッド、追加読み込み）
- `FilterSidebar`（ファセット群、URLクエリ同期）／ `FacetGroup`（1カテゴリ、検索/折りたたみ）
- `StatRangeFilter`（5遁術レンジ）
- `TokenCard`（カード）
- `TokenDetail` / `StatRadar`（詳細・レーダー）
- `RefreshButton`（同期トリガー、client component）
- データ層: `lib/db`（D1 クエリ生成: フィルター WHERE、ファセット件数、keyset ページング）
- `lib/image-loader`（Image Transformations URL 生成）
- `lib/sync`（Queue consumer の同期ロジック）

---

## 12. テスト戦略

ユニットテスト中心（純粋関数に切り出して検証可能にする）:
- シード: CSV パース / リビール判定 / カラムマッピング
- クエリ生成: フィルター WHERE（OR/AND）、ファセット件数、keyset ページング、レンジ条件
- 画像ローダー: URL 生成（幅・format・オリジンURL）
- 同期: JSON→D1 差分判定、UPDATE 生成、キャッシュ無効化呼び出し
- 詳細/一覧の主要レンダリング（スモーク）

---

## 13. 未確定 / 後続検討事項
- スタイリング手段（Tailwind 等）の最終確定。
- COSPLAY など多値カテゴリのファセット UI 詳細（検索/上位表示の閾値）。
- レーダーチャート描画ライブラリの選定（軽量・SSR親和）。
- ファセット件数のクエリ最適化（必要になれば集計テーブル化）。
- 詳細ページ「更新」完了をユーザーに知らせる手段（ポーリング/トースト等）の詳細。

---

## 14. マイルストーン（目安）
1. プロジェクト雛形（Next.js + OpenNext + Cloudflare 設定: D1 / Queues / Images）
2. D1 スキーマ + シードスクリプト（22,222件投入）
3. ギャラリー一覧（A案レイアウト + フィルター + ファセット件数 + keyset ページング）
4. 詳細ページ（トレイト + レーダー + OGP）
5. 画像最適化（Image Transformations ローダー）
6. 同期（更新ボタン + Queue consumer + キャッシュ無効化）
7. 速度チューニング（エッジキャッシュ / 計測）+ テスト整備
