# 設計書

## 概要

JMAアメダスサイトの気象データテーブルに条件付き書式（カラースケール）機能を追加します。この機能は既存のテーブル拡張機能に統合され、ユーザーが数値データの大小を視覚的に把握できるようにします。

## アーキテクチャ

### 全体構成

```text
src/jma/
├── color_scale/
│   ├── color_scale_manager.ts      # カラースケール管理の中心クラス
│   ├── color_scale_calculator.ts   # カラー計算ロジック
│   ├── color_scale_ui.ts          # UI制御とイベント処理
│   ├── color_scale_storage.ts     # ローカルストレージ管理
│   └── color_scale_types.ts       # 型定義
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
2. **拡張性**: 新しい項目や異なるカラースケールタイプを容易に追加できる設計
3. **パフォーマンス**: テーブル更新時の再計算を最小限に抑制
4. **ユーザビリティ**: 直感的なUI設計とリアルタイムプレビュー

## コンポーネントと インターフェース

### ColorScaleManager

カラースケール機能の中心となるクラス。テーブルの監視、カラースケールの適用・削除を管理します。

```typescript
class ColorScaleManager {
  private isEnabled: boolean
  private columnConfigs: Map<string, ColorScaleConfig>
  private storage: ColorScaleStorage
  private calculator: ColorScaleCalculator
  
  constructor()
  enable(): void
  disable(): void
  applyColorScale(table: HTMLTableElement, columnClass: string): void
  removeColorScale(table: HTMLTableElement, columnClass: string): void
  updateColumnConfig(columnClass: string, config: ColorScaleConfig): void
}
```

### ColorScaleCalculator

カラー計算の核となるクラス。数値範囲からRGB値への変換を行います。

```typescript
class ColorScaleCalculator {
  calculateColor(value: number, min: number, max: number, colorScheme: ColorScheme): string
  parseNumericValue(cellText: string): number | null
  getColorScheme(columnClass: string): ColorScheme
}
```

### ColorScaleUI

ユーザーインターフェースの制御を行うクラス。

```typescript
class ColorScaleUI {
  private container: HTMLElement
  private manager: ColorScaleManager
  
  constructor(manager: ColorScaleManager)
  render(): void
  createToggleCheckbox(): HTMLElement
  createColumnConfigPanel(columnClass: string, config: ColorScaleConfig): HTMLElement
  updatePreview(columnClass: string): void
}
```

### ColorScaleStorage

設定の永続化を管理するクラス。

```typescript
class ColorScaleStorage {
  saveConfig(config: ColorScaleGlobalConfig): void
  loadConfig(): ColorScaleGlobalConfig
  getDefaultConfig(): ColorScaleGlobalConfig
}
```

## データモデル

### 型定義

```typescript
interface ColorScaleConfig {
  enabled: boolean
  colorScheme: ColorScheme
  minValue: number
  maxValue: number
}

interface ColorScheme {
  type: 'gradient' | 'discrete'
  colors: string[]  // hex color codes
}

interface ColorScaleGlobalConfig {
  enabled: boolean
  columns: Record<string, ColorScaleConfig>
}

// 対象列の定義
const COLUMN_DEFINITIONS = {
  'td-volumetric-humidity': {
    name: '容積絶対湿度',
    unit: 'g/㎥',
    defaultMin: 0,
    defaultMax: 30,
    defaultColors: ['#ffffff', '#0066cc']
  },
  'td-dew-point': {
    name: '露点温度', 
    unit: '℃',
    defaultMin: -20,
    defaultMax: 30,
    defaultColors: ['#0066cc', '#ff0000']
  },
  'td-temperature-humidity-index': {
    name: '不快指数',
    unit: '',
    defaultMin: 50,
    defaultMax: 85,
    defaultColors: ['#00ff00', '#ffff00', '#ff0000']
  }
}
```

### デフォルト設定

- **容積絶対湿度**: 白から青のグラデーション (0-30 g/㎥)
- **露点温度**: 青から赤のグラデーション (-20-40℃)
- **不快指数**: 緑から黄色、赤のグラデーション (50-85)

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
- 異常値（範囲外の数値）

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

カラースケール設定UIは以下の構造で配置：

```html
<div id="color-scale-controls" style="position: fixed; bottom: 20px; right: 20px; background: white; border: 1px solid #ccc; padding: 10px;">
  <label>
    <input type="checkbox" id="color-scale-toggle"> カラースケール有効
  </label>
  <div id="color-scale-settings">
    <!-- 各列の設定パネル -->
  </div>
</div>
```
