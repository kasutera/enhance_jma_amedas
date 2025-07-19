# 設計書

## 概要

JMAアメダスサイトの気象データテーブルに条件付き書式（カラースケール）機能を追加します。この機能は既存のテーブル拡張機能に統合され、ユーザーが数値データの大小を視覚的に把握できるようにします。機能はシンプルなオン・オフ切り替えのみで、カラースケールの配色カスタマイズや凡例表示は行いません。

## アーキテクチャ

### 全体構成

```text
src/jma/
├── color_scale/
│   ├── color_scale_manager.ts      # カラースケール管理の中心クラス（実装済み）
│   ├── color_scale_calculator.ts   # カラー計算ロジック（実装済み）
│   ├── color_scale_ui.ts          # UI制御とイベント処理（実装済み）
│   ├── color_scale_global.ts      # グローバル設定管理（実装済み）
│   └── jma_official_colors.ts     # JMA公式カラーパレット（実装済み）
├── areastable/
│   ├── areastable_main.ts         # カラースケール機能統合
│   └── dom_handler.ts             # カラースケール適用機能追加
├── seriestable/
│   ├── seriestable_main.ts        # カラースケール機能統合
│   └── dom_handler.ts             # カラースケール適用機能追加
└── main.ts                        # カラースケールUI初期化
```

### 設計原則

1. **既存機能との分離**: カラースケール機能は独立したモジュールとして実装し、既存機能に影響を与えない
2. **シンプルさ**: オン・オフ切り替えのみのシンプルな機能設計
3. **パフォーマンス**: テーブル更新時の再計算を最小限に抑制
4. **ユーザビリティ**: 最小限のUIで直感的な操作を提供

## コンポーネントと インターフェース

### ColorScaleManager

カラースケール機能の中心となるクラス。テーブルの監視、カラースケールの適用・削除を管理します。

```typescript
class ColorScaleManager {
  private isEnabled: boolean
  private storage: ColorScaleStorage
  private calculator: ColorScaleCalculator
  
  constructor()
  enable(): void
  disable(): void
  applyColorScale(table: HTMLTableElement, columnClass: string): void
  removeColorScale(table: HTMLTableElement, columnClass: string): void
  isColorScaleEnabled(): boolean
}
```

### ColorScaleCalculator

カラー計算の核となるクラス。数値範囲からRGB値への変換を行います。

```typescript
class ColorScaleCalculator {
  calculateColor(value: number, min: number, max: number, columnClass: string): string
  parseNumericValue(cellText: string): number | null
  getDefaultColorScheme(columnClass: string): { startColor: string, endColor: string }
  getDefaultRange(columnClass: string): { min: number, max: number }
}
```

### ColorScaleUI

ユーザーインターフェースの制御を行うクラス。シンプルなオン・オフ切り替えのみを提供します。

```typescript
class ColorScaleUI {
  private container: HTMLElement
  private manager: ColorScaleManager
  
  constructor(manager: ColorScaleManager)
  render(): void
  createToggleCheckbox(): HTMLElement
  handleToggleChange(enabled: boolean): void
}
```

### ColorScaleStorage

設定の永続化を管理するクラス。オン・オフ状態のみを保存します。

```typescript
class ColorScaleStorage {
  saveEnabled(enabled: boolean): void
  loadEnabled(): boolean
}
```

## データモデル

### 型定義

```typescript
// 対象列の定義（固定設定）
const COLUMN_DEFINITIONS = {
  'td-volumetric-humidity': {
    name: '容積絶対湿度',
    unit: 'g/㎥',
    min: 0,
    max: 30,
    startColor: '#ffffff',
    endColor: '#0066cc'
  },
  'td-dew-point': {
    name: '露点温度', 
    unit: '℃',
    min: -20,
    max: 30,
    startColor: '#0066cc',
    endColor: '#ff0000'
  },
  'td-temperature-humidity-index': {
    name: '不快指数',
    unit: '',
    min: 50,
    max: 85,
    startColor: '#00ff00',
    endColor: '#ff0000'
  }
}

interface ColumnDefinition {
  name: string
  unit: string
  min: number
  max: number
  startColor: string
  endColor: string
}
```

### 固定設定

- **容積絶対湿度**: 白から青のグラデーション (0-30 g/㎥)
- **露点温度**: 青から赤のグラデーション (-20-30℃)
- **不快指数**: 緑から赤のグラデーション (50-85)

## エラーハンドリング

### エラー処理戦略

1. **グレースフルデグラデーション**: カラースケール機能でエラーが発生しても、既存のテーブル機能は正常に動作する
2. **ログ出力**: 開発者向けにコンソールにエラー情報を出力
3. **設定復旧**: 不正な設定が検出された場合、デフォルト設定に自動復旧

### エラーケース

- ローカルストレージアクセス失敗
- 不正な数値データの検出
- DOM要素の取得失敗
- カラー計算エラー

## テスト戦略

### 単体テスト

- `ColorScaleCalculator`: 数値からカラーへの変換ロジック
- `ColorScaleStorage`: ローカルストレージの読み書き
- `ColorScaleManager`: カラースケールの適用・削除

### 統合テスト

- テーブル更新時のカラースケール再適用
- UI操作とテーブル表示の連動
- 設定の永続化と復元

### テストデータ

- 正常な数値データ
- 欠損データ（"---"）
- 境界値（最小値、最大値）
- 範囲外の数値（最小値・最大値と同じ色）

## パフォーマンス考慮事項

### 最適化戦略

1. **遅延適用**: テーブル更新後の短時間内に複数回の更新があった場合、最後の更新のみ処理
2. **キャッシュ**: 計算済みのカラー値をキャッシュして再利用
3. **部分更新**: 変更された列のみカラースケールを再計算

### メモリ管理

- イベントリスナーの適切な削除
- DOM参照の適切な解放
- 不要なキャッシュデータの定期的なクリア

## セキュリティ考慮事項

### XSS対策

- ユーザー入力値のサニタイゼーション
- DOM操作時の安全な値設定

### ローカルストレージ

- 設定データの検証
- 不正なデータの検出と除去

## 実装詳細

### カラー計算アルゴリズム

```typescript
// 線形補間によるグラデーション計算
function interpolateColor(value: number, min: number, max: number, startColor: string, endColor: string): string {
  const ratio = (value - min) / (max - min)
  const startRgb = hexToRgb(startColor)
  const endRgb = hexToRgb(endColor)
  
  const r = Math.round(startRgb.r + (endRgb.r - startRgb.r) * ratio)
  const g = Math.round(startRgb.g + (endRgb.g - startRgb.g) * ratio)
  const b = Math.round(startRgb.b + (endRgb.b - startRgb.b) * ratio)
  
  return `rgb(${r}, ${g}, ${b})`
}
```

### DOM統合

既存のテーブル処理に以下の拡張を追加：

1. **areastable/dom_handler.ts**: `appendColumnToAreastable`後にカラースケール適用
2. **seriestable/dom_handler.ts**: `appendColumnToSeriestable`後にカラースケール適用
3. **main.ts**: ページ読み込み時にカラースケールUI初期化

### UI配置

カラースケール制御UIは以下の構造で配置：

```html
<div id="color-scale-controls" style="margin: 10px 0;">
  <label>
    <input type="checkbox" id="color-scale-toggle"> カラースケール有効
  </label>
</div>
```

- 凡例やカラーバーは表示しない
- シンプルなチェックボックスのみでオン・オフを制御
