# 自動リリース機能の解説

このドキュメントでは、Enhance JMA Amedasプロジェクトにおける自動リリース機能の仕組みについて、ジュニアエンジニア向けに詳しく解説します。

## 概要

このプロジェクトでは、以下の技術を組み合わせて自動リリース機能を実装しています：

- **GitHub Actions**: CI/CDパイプラインによる自動リリース
- **Vite + vite-plugin-monkey**: ユーザースクリプトのビルドと動的バージョン管理
- **GitHub Releases**: userscriptの配布とアセット管理

## システム全体の流れ

```
1. 開発者がローカルで npm run release を実行
    ↓
2. YYYYMMDDフォーマットのGitタグが作成される
    ↓
3. GitHub ActionsがタグプッシュをトリガーとしてCI/CDを実行
    ↓
4. Viteがuserscriptをビルド（VERSION環境変数からバージョン設定）
    ↓
5. GitHub Releaseが自動作成され、userscriptがアセットとして添付
    ↓
6. ユーザーは固定URLから最新版を取得可能
```

## 1. GitHub Actionsワークフロー

### ファイル: `.github/workflows/release.yml`

```yaml
name: Create Release

on:
  push:
    tags:
      - '[0-9]+'  # YYYYMMDDパターンのタグをトリガー

permissions:
  contents: write  # リリース作成に必要な権限

jobs:
  release:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v5
      with:
        node-version: '24'
        cache: 'npm'

    - name: Install dependencies
      run: npm install

    - name: Build userscript
      run: npm run build
      env:
        VERSION: ${{ github.ref_name }}  # タグ名をVERSION環境変数に設定

    - name: Create Release
      uses: softprops/action-gh-release@v2
      with:
        files: |
          dist/jma.user.js
        generate_release_notes: true  # 自動リリースノート生成
        draft: false
        prerelease: false
```

### 重要なポイント

1. **トリガー条件**: `[0-9]+` パターンでYYYYMMDD形式のタグのみに反応
2. **環境変数**: `${{ github.ref_name }}` でタグ名をVERSION環境変数に設定
3. **自動リリースノート**: `generate_release_notes: true` で変更履歴を自動生成

## 2. Viteによる動的バージョン管理

### ファイル: `vite.config.mts`

`npm run build` は `tsc --noEmit` による型チェックを行い、Vite + vite-plugin-monkeyで `src/jma/main.ts` を単一の `dist/jma.user.js` にまとめます。UIのDOM/SVG実装はそのまま使用します。

ビルド時はVERSION環境変数を必須とし、未設定なら設定の読み込み時点でエラーにします。`src/jma/manifest.json` を読み込み、その `version` をVERSIONの値で上書きして、Monkeyプラグインがユーザースクリプトのヘッダーを生成します。

```bash
VERSION=20261011 npm run build
```

出力はES2022をターゲットとするIIFE形式です。開発用サーバーやCDNへの依存を追加せず、既存の更新URL・ダウンロードURL・`@grant none` を保持します。従来のRollup設定と、ローカルファイルを `@require` する開発用スクリプトは使用しません。

開発時は `npm run dev` でViteサーバーを起動します。VERSIONは省略可能で、省略時の開発版バージョンは `0.0.0` です。開発版は `[dev] Enhance JMA Amedas` という別名で、リリース用の更新URLを持ちません。注入手順とCSP・ローカルアクセスの制約は [READMEのローカル開発手順](../README.md#技術構成とローカル開発) を参照してください。

## 3. manifest.jsonの設定

### ファイル: `src/jma/manifest.json`

```json
{
  "name": "Enhance JMA Amedas",
  "namespace": "https://github.com/kasutera",
  "version": "__VERSION__",
  "updateURL": "https://github.com/kasutera/enhance_jma_amedas/releases/latest/download/jma.user.js",
  "downloadURL": "https://github.com/kasutera/enhance_jma_amedas/releases/latest/download/jma.user.js",
  ...
}
```

### 重要なポイント

1. **バージョン指定**: manifest.jsonの `"version": "__VERSION__"` を、Vite設定でVERSIONの値に上書きする
2. **固定URL**: `/releases/latest/download/` で常に最新版を指す
3. **自動更新**: userscriptマネージャーがupdateURLから更新を検知

## 4. package.jsonのリリーススクリプト

```json
{
  "scripts": {
    "release": "git tag $(date '+%Y%m%d') && git push --tags"
  }
}
```

### 動作

1. `$(date '+%Y%m%d')` で現在日付のYYYYMMDD形式タグを作成
2. `git push --tags` でリモートリポジトリにタグをプッシュ
3. GitHub Actionsが自動的にトリガーされる

## 5. .gitignoreの設定

```gitignore
# ビルドされたユーザスクリプト
/dist/
```

### 理由

- distファイルはGitHub Actions上で自動生成される
- ソースコードとビルド成果物を分離
- 常に最新のソースから正確なビルドを保証

## 開発ワークフロー

### 日常的な開発

```bash
# 本番形式のローカルビルド（VERSION必須）
VERSION=20261011 npm run build

# Vite開発サーバー（VERSION不要）
npm run dev
```

### リリース作業

```bash
# リリースの作成（今日の日付でタグ作成）
npm run release
```

### トラブルシューティング

#### VERSION環境変数エラー

```
Error: VERSION is required for building userscript. Run: VERSION=YYYYMMDD npm run build
```

**解決方法**: 明示的にVERSION環境変数を設定する

```bash
VERSION=20250814 npm run build
```

#### GitHub Actionsの失敗

1. **権限エラー**: リポジトリの Settings > Actions > General で適切な権限を設定
2. **ビルドエラー**: ローカルでも同じVERSIONでビルドテストを実行
3. **タグ形式エラー**: YYYYMMDDの8桁数字形式を確認

## セキュリティとベストプラクティス

### 環境変数の管理

- **本番環境**: GitHub Actionsが自動的にVERSIONを設定
- **開発サーバー**: VERSIONは省略可能。省略時は `0.0.0`
- **本番ビルド**: VERSION未設定時は必ずエラーで停止

### アセット配布

- **固定URL**: `/releases/latest/download/` により常に最新版を配布
- **バージョン管理**: タグベースで厳密なバージョン管理
- **自動更新**: userscriptマネージャーが自動的に更新を検知

## まとめ

この自動リリース機能により：

1. **人的ミスの削減**: バージョン更新忘れや手動作業ミスを防止
2. **一貫性の保証**: 常に同じプロセスでリリースが作成される
3. **トレーサビリティ**: Gitタグとリリースノートで変更履歴を追跡可能
4. **ユーザビリティ**: 固定URLによる簡単なインストールと自動更新

これらの仕組みにより、品質が高く安定したリリースプロセスを実現しています。
