# アメダス欠測・空データ対応計画

## 現状の問題

### 1. 欠測データ（null値）の問題

**場所**: `yyyymmdd_hh.json` 内の個別測定値が `null` の場合

**現状の挙動**:

- `areastable/jma_amedas_fetcher.ts:98-99` で `point.temp[0]` や `point.humidity[0]` が `null` の場合、JavaScript の仕様により数値コンテキストで `0` として扱われる
- この結果、露点温度等の計算で間違った値（ゼロ値）が生成される

**該当コード**:

```typescript
// areastable/jma_amedas_fetcher.ts:96-101
record[ameid] = {
  pressure: point.pressure?.[0],
  temperature: point.temp[0],    // null が 0 として扱われる
  humidity: point.humidity[0],   // null が 0 として扱われる
  date,
}
```

**実際のデータの例**:
```json
  "20250818114000": {
    "prefNumber": 44,
    "observationNumber": 172,
    "pressure": [
      1006.8,
      0
    ],
    "normalPressure": [
      null,
      6
    ],
    "temp": [
      null,
      6
    ],
    "humidity": [
      null,
      6
    ],
    "visibility": [
      20000.0,
      0
    ],
    "sun10m": [
      10,
      0
    ],
    "sun1h": [
      1.0,
      0
    ],
    "precipitation10m": [
      0.0,
      0
    ],
    "precipitation1h": [
      0.0,
      0
    ],
    "precipitation3h": [
      0.0,
      0
    ],
    "precipitation24h": [
      0.0,
      0
    ],
    "windDirection": [
      10,
      0
    ],
    "wind": [
      3.5,
      0
    ],
    "maxTempTime": {
      "hour": 1,
      "minute": 24
    },
    "maxTemp": [
      null,
      6
    ],
    "minTempTime": {
      "hour": 20,
      "minute": 58
    },
    "minTemp": [
      null,
      6
    ],
    "gustTime": {
      "hour": 16,
      "minute": 14
    },
    "gustDirection": [
      8,
      0
    ],
    "gust": [
      10.1,
      0
    ]
  }
```

**影響**:

- 体積絶対湿度、露点温度、不快指数で科学的に不正確な値が表示される
- ユーザーが誤った気象情報を参照する可能性

### 2. 空データ（存在しないキー）の問題

**場所**: `latest_time.txt` で示された時刻に対応するデータが `yyyymmdd_hh.json` に存在しない場合

**現状の挙動**:

- `seriestable/jma_amedas_fetcher.ts:99` で `fetched[timestamp]` が `undefined` となる
- `toAmedasData` 関数が `undefined.temp[0]` にアクセスを試行してエラーで処理全体が停止

**該当コード**:

```typescript
// seriestable/jma_amedas_fetcher.ts:99-105
const timePoint = fetched[timestamp]
return {
  pressure: timePoint.pressure?.[0],
  temperature: timePoint.temp[0],    // timePoint が undefined の場合エラー
  humidity: timePoint.humidity[0],   // timePoint が undefined の場合エラー
  date,
}
```

**影響**:

- 時系列テーブル機能全体が動作しない
- ユーザーがスクリプトの機能を利用できない

## 解決方針

### 1. null値安全な変換処理

**方針**: 明示的な null チェックを実装し、欠測値を適切に undefined として扱う

**実装場所**:

- `areastable/jma_amedas_fetcher.ts` の `toAmedasData` 関数
- `seriestable/jma_amedas_fetcher.ts` の `toAmedasData` 関数

**詳細**:

```typescript
// 修正前
temperature: point.temp[0],
humidity: point.humidity[0],

// 修正後
temperature: point.temp[0] === null ? undefined : point.temp[0],
humidity: point.humidity[0] === null ? undefined : point.humidity[0],
```

### 2. 存在しないデータの適切な処理

**方針**: データ存在確認を追加し、欠損時は適切にエラーハンドリングまたはデフォルト値処理

**実装場所**:

- `seriestable/jma_amedas_fetcher.ts` の `toAmedasData` 関数

**詳細**:

```typescript
// 修正前
const timePoint = fetched[timestamp]
return {
  pressure: timePoint.pressure?.[0],
  temperature: timePoint.temp[0],
  humidity: timePoint.humidity[0],
  date,
}

// 修正後
const timePoint = fetched[timestamp]
if (!timePoint) {
  return {
    pressure: undefined,
    temperature: undefined,
    humidity: undefined,
    date,
  }
}
return {
  pressure: timePoint.pressure?.[0] === null ? undefined : timePoint.pressure?.[0],
  temperature: timePoint.temp[0] === null ? undefined : timePoint.temp[0],
  humidity: timePoint.humidity[0] === null ? undefined : timePoint.humidity[0],
  date,
}
```

### 3. プレゼンテーション層での欠損処理確認

**現状確認**:

- `areastable/presentation.ts:24-32` および `seriestable/presentation.ts:20-24` で既に適切な欠損処理を実装済み
- `undefined` 値は "---" として表示される設計

**追加対応不要**: プレゼンテーション層は既に適切に設計されている

## 実装スケジュール

### Phase 1: null値処理の修正

1. `areastable/jma_amedas_fetcher.ts` の修正
2. `seriestable/jma_amedas_fetcher.ts` の修正
3. 関連する型定義の調整

### Phase 2: テスト実装

1. null値を含むテストケースの追加
2. 存在しないデータのテストケース追加
3. 既存テストの動作確認

### Phase 3: 統合テスト

1. 実際のJMAデータでの動作確認
2. エラーケースでの挙動確認
3. パフォーマンス影響の確認

## 期待される効果

### データ精度の向上

- 欠測値が科学的に正確に処理される
- ユーザーが信頼できる気象情報を取得可能

### システム安定性の向上

- データ欠損時でもスクリプトが正常動作
- エラー耐性の強化によるユーザー体験改善

### 保守性の向上

- 明示的なnullチェックによりコードの意図が明確化
- 将来的なJMAデータ形式変更への耐性向上
