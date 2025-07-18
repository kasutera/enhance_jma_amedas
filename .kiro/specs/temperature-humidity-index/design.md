# 設計書

## 概要

JMAアメダスサイトに不快指数（Temperature-Humidity Index）を追加する機能の設計書です。既存の体積絶対湿度・露点温度計算機能と同様のアーキテクチャを採用し、エリアテーブルと時系列テーブルの両方に対応します。

## アーキテクチャ

### 全体構成

```text
src/jma/
├── math.ts                    # 計算ロジック（不快指数計算を追加）
├── areastable/
│   └── presentation.ts        # エリアテーブル用データ変換（不快指数列を追加）
└── seriestable/
    └── presentation.ts        # 時系列テーブル用データ変換（不快指数列を追加）
```

### 既存パターンとの整合性

既存の体積絶対湿度・露点温度機能と同じパターンを踏襲：

- `HumidCalculator`クラスに不快指数計算メソッドを追加
- `presentation.ts`で不快指数列データを生成
- `dom_handler.ts`の既存メソッドを使用してテーブルに列を追加

## コンポーネントと インターフェース

### 1. 計算エンジン（math.ts）

```typescript
export class HumidCalculator {
  // 既存プロパティ
  readonly temperature: number
  readonly relativeHumidity: number
  readonly pressure: number
  
  // 新規追加
  readonly temperatureHumidityIndex: number
  
  constructor(temperature: number, relativeHumidity: number, pressure: number) {
    // 既存の初期化処理
    // 新規追加
    this.temperatureHumidityIndex = this.calcTemperatureHumidityIndex(temperature, relativeHumidity)
  }
  
  // 新規メソッド
  calcTemperatureHumidityIndex(temperature: number, relativeHumidity: number): number
}
```

### 2. データ変換層（presentation.ts）

#### エリアテーブル用

```typescript
// 戻り値を3つの列に拡張
export function convertAmedasDataToSeriestableRow(
  amdnos: Ameid[],
  amedasDatas: Record<Ameid, AmedasData>,
): [AreastableColumn, AreastableColumn, AreastableColumn]
```

#### 時系列テーブル用

```typescript
// 戻り値を3つの行に拡張
export function convertAmedasDataToSeriestableRow(
  amedasDatas: AmedasData[],
): [SeriestableRow, SeriestableRow, SeriestableRow]
```

### 3. DOM操作層

既存の`appendColumnToAreastable`と`appendColumnToSeriestable`メソッドを使用。新しいメソッドの追加は不要。

## データモデル

### 不快指数計算の入力データ

- **気温** (`temperature`): 数値（°C、負の値も許可）
- **湿度** (`relativeHumidity`): 数値（%、0-100）

### 不快指数計算式

```javascript
THI = 0.81 × Td + 0.01 × H × (0.99 × Td - 14.3) + 46.3
```

- `Td`: 気温（°C）
- `H`: 湿度（%）
- `THI`: 不快指数

### 出力データ形式

- **表示精度**: 小数点以下1桁
- **欠損値表示**: "---"（気温または湿度が欠損の場合）

### 列定義

```typescript
const TEMPERATURE_HUMIDITY_INDEX_CLASS = 'td-temperature-humidity-index'

const temperatureHumidityIndexColumn: AreastableColumn = {
  class: TEMPERATURE_HUMIDITY_INDEX_CLASS,
  headerValue: '不快指数',
  headerUnit: '',
  values: string[] // 計算結果の配列
}
```

## エラーハンドリング

### 入力データ検証

1. **気温データ検証**
   - `undefined`または`null`の場合: "---"を表示
   - 負の値の場合: 正常に計算を実行

2. **湿度データ検証**
   - `undefined`または`null`の場合: "---"を表示
   - 負の値の場合: 正常に計算を実行

### 計算エラー処理

- 数値計算でNaNが発生した場合: "---"を表示
- 負の気温・湿度でも計算式に従って正常に処理

### DOM操作エラー処理

既存のエラーハンドリング機構を継承：

- テーブル要素が見つからない場合の例外処理
- 列追加処理での例外処理

## テスト戦略

### 単体テスト

#### 1. 計算ロジックテスト（math.test.ts）

```typescript
describe('HumidCalculator.calcTemperatureHumidityIndex', () => {
  test('正常な気温・湿度での計算', () => {
    // 25°C, 60%での期待値テスト
  })
  
  test('境界値での計算', () => {
    // 0°C, 0%での処理テスト
  })
  
  test('負の値での処理', () => {
    // 負の気温・湿度での処理テスト
  })
})
```

#### 2. データ変換テスト（presentation.test.ts）

```typescript
describe('convertAmedasDataToSeriestableRow with THI', () => {
  test('不快指数列が正しく生成される', () => {
    // 3つの列が返されることを確認
    // 不快指数列の値が正しいことを確認
  })
  
  test('欠損データでの処理', () => {
    // 気温・湿度欠損時の"---"表示確認
  })
  
  test('負の値での正常計算', () => {
    // 負の気温・湿度での正常な計算処理確認
  })
})
```

#### 3. DOM操作テスト（dom_handler.test.ts）

```typescript
describe('appendColumnToAreastable with THI', () => {
  test('不快指数列がテーブルに追加される', () => {
    // 列ヘッダーの確認
    // セル値の確認
  })
})
```

### 統合テスト

#### エンドツーエンドテスト

1. **エリアテーブル統合テスト**
   - 実際のJMAアメダスページでの動作確認
   - 既存列との共存確認

2. **時系列テーブル統合テスト**
   - 実際のJMAアメダスページでの動作確認
   - 既存列との共存確認

### テストデータ

#### 計算検証用データ

```typescript
const testCases = [
  { temp: 25, humidity: 60, expected: 72.6 }, // 標準的な夏日
  { temp: 30, humidity: 80, expected: 84.8 }, // 高温多湿
  { temp: 15, humidity: 40, expected: 59.2 }, // 涼しい日
]
```

#### DOM操作検証用フィクスチャ

- 既存のHTMLフィクスチャを拡張
- 不快指数列追加後のHTMLフィクスチャを作成

## 実装上の考慮事項

### パフォーマンス

- 既存の`HumidCalculator`インスタンス生成時に不快指数も同時計算
- 追加の計算コストは最小限（単純な算術演算のみ）

### 保守性

- 既存コードの変更を最小限に抑制
- 新機能は既存パターンに従って実装
- 設定可能な定数は適切に分離

### 拡張性

- 将来的な気象指数追加に対応できる構造
- 計算式の変更に対応できる設計

### ブラウザ互換性

- 既存コードと同じブラウザサポート範囲
- ES2022モジュール仕様に準拠
