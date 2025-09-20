# 自動リリース機能の解説

このドキュメントでは、Enhance JMA Amedasプロジェクトにおける自動リリース機能の仕組みについて、ジュニアエンジニア向けに詳しく解説します。

## 概要

このプロジェクトでは、以下の技術を組み合わせて自動リリース機能を実装しています：

- **GitHub Actions**: CI/CDパイプラインによる自動リリース
- **Rollup + @rollup/plugin-replace**: ビルド時の動的バージョン管理
- **GitHub Releases**: userscriptの配布とアセット管理

## システム全体の流れ

```
1. 開発者がローカルで npm run release を実行
    ↓
2. YYYYMMDDフォーマットのGitタグが作成される
    ↓
3. GitHub ActionsがタグプッシュをトリガーとしてCI/CDを実行
    ↓
4. Rollupがuserscriptをビルド（VERSION環境変数からバージョン設定）
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

## 2. Rollupによる動的バージョン管理

### ファイル: `rollup.config.ts`

#### バージョンチェック機能

```typescript
const getVersion = (): string => {
  const version = process.env.VERSION
  
  if (!version) {
    console.error('ERROR: VERSION environment variable is required for building userscript')
    console.error('Please run: VERSION=YYYYMMDD npm run build')
    process.exit(1)
  }
  
  return version
}
```

#### manifest.jsonの動的処理

```typescript
const readMetadata = (path: string): Metadata => {
  const content = readFileSync(path, 'utf8')
  const version = getVersion()
  return JSON.parse(content.replace('__VERSION__', version))
}
```

#### プラグイン設定

```typescript
plugins: [
  replace({
    __VERSION__: getVersion(),  // ソースコード内の__VERSION__を置換
    preventAssignment: true
  }),
  typescript(),
  cleanup(),
  watch()
]
```

### 重要なポイント

1. **環境変数必須**: VERSION未設定時は明確なエラーメッセージと共にビルド停止
2. **プレースホルダー置換**: `__VERSION__` を実際のバージョン番号に置換
3. **二重チェック**: manifest.jsonとソースコード両方でバージョン管理

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

1. **プレースホルダー**: `"version": "__VERSION__"` がビルド時に置換される
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
# 開発用ビルド（VERSION環境変数なしではエラーになる）
VERSION=dev npm run build

# または開発モード
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
ERROR: VERSION environment variable is required for building userscript
Please run: VERSION=YYYYMMDD npm run build
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
- **開発環境**: 明示的にVERSIONを指定する必要がある
- **検証**: VERSION未設定時は必ずエラーで停止

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
