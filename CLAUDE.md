# 言語設定

回答は全て日本語で行う

# プロダクト概要

Enhance JMA Amedasは、気象庁（JMA）のアメダス気象データウェブサイトを拡張し、体積絶対湿度や露点温度などの計算された気象値を追加するユーザースクリプトです。

## 重要な設計制約

- **カラースケール配色**: 気象庁公式の色を使用すること。勝手に変更してはならない
- **Target Website**: JMA Amedas website (`www.jma.go.jp/bosai/amedas/`) のみ対応
- **Userscript Compatibility**: Tampermonkey/Violentmonkey環境での動作を保証すること
- **Language**: ユーザー向けドキュメントは日本語で記述すること

## 主要機能

- **気象計算機能**: 体積絶対湿度と露点温度の自動計算・表示
- **テーブル拡張**: 既存のJMAテーブルに新しい列を動的に追加
- **カラースケール機能**: 気象庁公式配色による数値の視覚化
- **双方向対応**: エリアテーブルと時系列テーブルの両方をサポート
- **リアルタイム処理**: ページ読み込み時とデータ更新時の自動処理

## アーキテクチャ原則

- **モジュラー設計**: `areastable/`、`seriestable/`、`color_scale/`で機能を分離
- **DOM操作の最小化**: 既存のJMAサイト構造を尊重し、必要最小限の変更のみ
- **エラーハンドリング**: JMAサイトの構造変更に対する堅牢性を確保
- **パフォーマンス**: 大量の気象データ処理時の応答性を維持
- **状態管理**: LocalStorageを使用したユーザー設定の永続化

## 開発ガイドライン

- **気象計算の精度**: 科学的に正確な計算式を使用すること
- **UI一貫性**: JMAサイトの既存デザインと調和すること
- **テスト要件**: 気象計算ロジックには必ず単体テストを含めること
- **ブラウザ互換性**: 主要ブラウザでの動作を確認すること

## カラースケール実装

- **ColorScaleCalculator**: 気象庁公式カラースケールによる色計算エンジン
- **ColorScaleManager**: テーブル全体のカラースケール適用・管理
- **ColorScaleUI**: ユーザー向けON/OFF切り替えインターフェース
- **公式配色の厳守**: `jma_official_colors.ts`で定義された配色のみ使用
- **動的適用**: 既存テーブルへの非破壊的なスタイル適用
- **設定永続化**: LocalStorageによるユーザー設定の保存・復元

# プロジェクト構造とアーキテクチャ

## ルートディレクトリレイアウト

```text
├── src/                    # TypeScriptソースコード
├── dist/                   # ビルド済みユーザースクリプト（本番用）
├── coverage/               # Jestテストカバレッジレポート
├── docs/                   # ドキュメントとスクリーンショット
├── .kiro/                  # Kiro IDE設定
└── config files            # ビルドと開発ツール
```

## コアアーキテクチャ (`src/jma/`)

**エントリーポイント:**

- `main.ts` - 本番用ユーザースクリプトエントリーポイント
- `dev.ts` - ホットリロード付き開発モード

**共有ユーティリティ:**

- `jma_urls.ts` - JMA API URL構築
- `latest_amedas_date.ts` - 気象データの日付/時刻処理
- `math.ts` - 気象計算（湿度、露点温度）
- `manifest.json` - ユーザースクリプトメタデータと権限

## 機能モジュールパターン

各気象テーブルタイプは一貫したモジュラーアーキテクチャに従います：

```text
src/jma/{feature}/
├── {feature}_main.ts       # モジュールエントリーポイントと初期化
├── dom_handler.ts          # DOM操作とテーブル変更
├── dom_generators.ts       # HTML要素生成ユーティリティ
├── jma_amedas_fetcher.ts   # 気象データAPI統合
├── presentation.ts         # データフォーマットと表示ロジック
├── *.test.ts              # ユニットテスト（同一場所配置）
└── testcases/             # テストフィクスチャとモックデータ
```

**現在の機能モジュール:**

- `areastable/` - 地域別気象データテーブル
- `seriestable/` - 時系列気象データテーブル
- `color_scale/` - 気象データ可視化と着色

## 開発ルール

**ファイル構成:**

- テストはソースファイルと同一場所に配置 (`*.test.ts`)
- テストフィクスチャは専用の `testcases/` サブディレクトリに
- DOMテスト用HTMLフィクスチャ、APIモック用JSON

**モジュール依存関係:**

- 機能モジュールは自己完結型であること
- 共有ユーティリティは `src/jma/` ルートのみ
- 機能モジュール間の循環依存を禁止

**命名規則:**

- 機能ディレクトリ: アンダースコア付き小文字
- メインファイル: `{feature}_main.ts` パターン
- テストファイル: `{source}.test.ts` パターン

## ビルドシステム

**出力ファイル:**

- `dist/jma.user.js` - 本番用ユーザースクリプト（縮小化済み）
- `dist/jma.dev.user.js` - 開発版（ソースマップ付き）

**設定:**

- `rollup.config.ts` - ビルドパイプラインとバンドル
- `jest.config.ts` - テストランナー設定
- `tsconfig.json` - TypeScriptコンパイラ設定
- `biome.jsonc` - コードフォーマットとリントルール

## テスト戦略

- **ユニットテスト**: ロジックと計算関数
- **DOMテスト**: HTML操作と生成
- **統合テスト**: APIデータ処理
- **フィクスチャベース**: 実際のJMAウェブサイトHTML構造

# 技術スタック

## コア技術

- **TypeScript** - 主要開発言語
- **Node.js 24** - ランタイム環境（@tsconfig/node24を拡張）
- **ES2022 modules** - モジュールシステム（bundlerによるmoduleResolution）
- **Rollup** - ビルドシステムとバンドラー
- **Jest** - jsdom環境でのテストフレームワーク
- **Biome** - コードフォーマットとリント

## ビルドシステム

- **Rollup** TypeScriptプラグイン付きでバンドル
- **@rollup/plugin-replace** 環境変数置換
- **rollup-plugin-cleanup** ビルド後クリーンアップ
- **userscript-metadata** ユーザースクリプトヘッダー生成
- **rimraf** ビルド成果物クリーンアップ
- 本番版（`*.user.js`）と開発版（`*.dev.user.js`）の両方をビルド

## 開発ツール

- **Biome** - 統合フォーマッターとリンター
- **Lefthook** - プリコミットチェック用Gitフック
- **rimraf** - クロスプラットフォーム削除ツール
- **Jest** DOM テスト用jsdom付き（jest-environment-jsdom）
- **ts-jest** TypeScript/Jest統合
- **TypeScript** 厳格設定（isolatedModules、bundler resolution）

## 一般的なコマンド

```bash
# 開発（ウォッチモード）
npm run dev

# 本番版ビルド
npm run build

# テスト実行
npm run test

# コードフォーマット
npm run format

# ビルド成果物クリーンアップ
npm run clean

# gitフックインストール
npx lefthook install

# リリース作成
npm run release
```

## コード品質

- カバレッジレポート有効
- lefthookによるプリコミットフック
- Biomeフォーマット：2スペースインデント、100文字行幅
- シングルクォート、末尾カンマ、必要に応じてセミコロン
- snake_case命名規則、default export許可設定
- VCS統合でgitignore使用、import自動整理機能

# 重要な注意事項

回答は全て日本語で行う
CLAUDE.mdの指示に従って開発すること

## 自動リリース機能

- VERSION環境変数が必須（未設定時はビルドエラー）
- YYYYMMDDフォーマットでのバージョン管理
- GitHub Actionsによる自動リリース
- 詳細は `docs/autorelease.md` を参照
