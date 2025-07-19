# 設計文書

## 概要

既存のカラースケール機能を拡張して、基本気象データ（気温、湿度、1時間降水量、風速）にも気象庁公式カラースケールを適用する機能を実装します。現在の実装は計算された気象パラメータ（容積絶対湿度、露点温度、不快指数）のみに対応していますが、これを基本気象データにも拡張します。

## アーキテクチャ

### 現在のアーキテクチャ

```
ColorScaleManager
├── ColorScaleCalculator (色計算ロジック)
├── JMA_OFFICIAL_COLOR_SCALES (気象庁公式カラースケール定義)
├── DERIVED_COLOR_SCALES (計算パラメータ用カラースケール)
└── ColorScaleUI (ユーザーインターフェース)
```

### 拡張後のアーキテクチャ

```
ColorScaleManager
├── ColorScaleCalculator (色計算ロジック - 変更なし)
├── JMA_OFFICIAL_COLOR_SCALES (基本気象データ用 - 拡張)
├── DERIVED_COLOR_SCALES (計算パラメータ用 - 変更なし)
└── ColorScaleUI (ユーザーインターフェース - 説明文更新)
```

## コンポーネントと インターフェース

### 1. JMA_OFFICIAL_COLOR_SCALES の拡張

**現在の状態:**

- 気温、湿度、風速、降水量のカラースケールは定義済み
- しかし、ColorScaleManagerでは使用されていない

**変更内容:**

- 既存の定義を活用
- 必要に応じて色値の微調整

### 2. ColorScaleManager の拡張

**主要な変更点:**

#### 2.1 対象列の拡張

```typescript
// 現在
const targetColumns = [
  TABLE_CLASS_NAMES.volumetricHumidity,
  TABLE_CLASS_NAMES.dewPoint,
  TABLE_CLASS_NAMES.temperatureHumidityIndex,
]

// 拡張後
const targetColumns = [
  // 既存の計算パラメータ
  TABLE_CLASS_NAMES.volumetricHumidity,
  TABLE_CLASS_NAMES.dewPoint,
  TABLE_CLASS_NAMES.temperatureHumidityIndex,
  // 新規追加の基本気象データ
  TABLE_CLASS_NAMES.temp,
  TABLE_CLASS_NAMES.humidity,
  TABLE_CLASS_NAMES.precipitation1h,
  TABLE_CLASS_NAMES.wind,
]
```

#### 2.2 カラースケール取得メソッドの拡張

```typescript
private getColorScaleForColumn(columnClass: string) {
  switch (columnClass) {
    // 既存の計算パラメータ
    case TABLE_CLASS_NAMES.volumetricHumidity:
      return DERIVED_COLOR_SCALES.volumetricHumidity
    case TABLE_CLASS_NAMES.dewPoint:
      return DERIVED_COLOR_SCALES.dewPoint
    case TABLE_CLASS_NAMES.temperatureHumidityIndex:
      return DERIVED_COLOR_SCALES.temperatureHumidityIndex
    // 新規追加の基本気象データ
    case TABLE_CLASS_NAMES.temp:
      return JMA_OFFICIAL_COLOR_SCALES.temperature
    case TABLE_CLASS_NAMES.humidity:
      return JMA_OFFICIAL_COLOR_SCALES.humidity
    case TABLE_CLASS_NAMES.precipitation1h:
      return JMA_OFFICIAL_COLOR_SCALES.precipitation
    case TABLE_CLASS_NAMES.wind:
      return JMA_OFFICIAL_COLOR_SCALES.windSpeed
    default:
      return null
  }
}
```

### 3. ColorScaleUI の更新

**変更内容:**

- 説明文を更新して新しい対象列を含める
- 「容積絶対湿度・露点温度・不快指数」→「気温・湿度・降水量・風速・容積絶対湿度・露点温度・不快指数」

### 4. ColorScaleCalculator

**変更内容:**

- 変更なし（既存のロジックをそのまま使用）

## データモデル

### カラースケール定義の構造

```typescript
interface ColorScale {
  values: number[]    // 閾値配列
  colors: string[]    // 対応する色配列（HEX形式）
}
```

### 既存のカラースケール定義（活用）

```typescript
export const JMA_OFFICIAL_COLOR_SCALES = {
  temperature: {
    values: [-5, 0, 5, 10, 15, 20, 25, 30, 35],
    colors: ['#000080', '#0000FF', '#00BFFF', '#87CEEB', '#FFFFFF', 
             '#FFFF99', '#FFFF00', '#FFA500', '#FF0000', '#800080']
  },
  humidity: {
    values: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
    colors: ['#8B0000', '#A0522D', '#D2691E', '#FF8C00', '#FFFFFF',
             '#98FB98', '#00FFFF', '#40E0D0', '#0080FF', '#000080']
  },
  windSpeed: {
    values: [5, 10, 15, 20, 25],
    colors: ['#FFFFFF', '#0000FF', '#FFFF00', '#FFA500', '#FF0000', '#800080']
  },
  precipitation: {
    values: [1, 5, 10, 20, 30, 50, 80],
    colors: ['#E6E6FA', '#87CEEB', '#00BFFF', '#0000FF', '#FFFF00',
             '#FFA500', '#FF0000', '#800080']
  }
}
```

## エラーハンドリング

### 1. 既存のエラーハンドリング戦略を継承

- try-catch ブロックでエラーをキャッチ
- エラーが発生しても既存機能に影響を与えない
- コンソールにエラーログを出力

### 2. 新規追加部分のエラーハンドリング

- 存在しない列クラスに対する安全な処理
- 無効な数値データに対する適切な処理
- カラースケール適用失敗時の graceful degradation

## テスト戦略

### 1. 単体テスト

- ColorScaleManager の新しいメソッドのテスト
- 各基本気象データ列に対するカラースケール適用のテスト
- エラーケースのテスト

### 2. 統合テスト

- 実際のテーブル構造での動作確認
- 有効/無効切り替えの動作確認
- localStorage との連携テスト

### 3. 視覚的テスト

- 各気象データに対する色の正確性確認
- 文字色の可読性確認
- UI表示の確認

## 実装の詳細

### Phase 1: ColorScaleManager の拡張

1. `applyColorScaleToTable` メソッドの対象列配列を拡張
2. `getColorScaleForColumn` メソッドに新しいケースを追加
3. `removeColorScaleFromTable` メソッドの対象列配列を拡張

### Phase 2: ColorScaleUI の更新

1. 説明文の更新
2. 必要に応じてUIレイアウトの調整

### Phase 3: テストの追加

1. 新しい機能に対する単体テスト
2. 既存テストの更新
3. 統合テストの追加

## パフォーマンス考慮事項

### 1. 計算量の増加

- 対象列が4列増加するため、カラースケール適用の計算量が増加
- しかし、既存の効率的な実装により、実用上問題ないレベル

### 2. DOM操作の最適化

- 既存の実装では必要最小限のDOM操作を行っている
- 新しい列に対しても同様の効率的な処理を適用

### 3. メモリ使用量

- カラースケール定義は静的データのため、メモリ使用量の増加は最小限

## セキュリティ考慮事項

### 1. XSS対策

- 既存の実装では安全なDOM操作を行っている
- 新しい実装でも同様の安全性を確保

### 2. データ検証

- 数値解析時の適切な検証を継続
- 不正なデータに対する安全な処理

## 互換性

### 1. 後方互換性

- 既存の機能は変更なし
- 既存のユーザー設定は保持

### 2. ブラウザ互換性

- 既存の実装と同じブラウザサポート
- モダンブラウザでの動作を前提
