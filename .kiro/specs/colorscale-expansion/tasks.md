# 実装計画

- [-] 1. ColorScaleManagerの対象列配列を拡張する
  - `applyColorScaleToTable`メソッドの`targetColumns`配列に基本気象データの列クラスを追加
  - `removeColorScaleFromTable`メソッドの`targetColumns`配列に基本気象データの列クラスを追加
  - 気温（td-temp）、湿度（td-humidity）、1時間降水量（td-precipitation1h）、風速（td-wind）を対象に含める
  - _要件: 要件1.1, 要件2.1, 要件3.1, 要件4.1, 要件5.1_

- [ ] 2. ColorScaleManagerのカラースケール取得メソッドを拡張する
  - `getColorScaleForColumn`メソッドに新しい基本気象データ列のケースを追加
  - 気温列にはJMA_OFFICIAL_COLOR_SCALES.temperatureを適用
  - 湿度列にはJMA_OFFICIAL_COLOR_SCALES.humidityを適用
  - 1時間降水量列にはJMA_OFFICIAL_COLOR_SCALES.precipitationを適用
  - 風速列にはJMA_OFFICIAL_COLOR_SCALES.windSpeedを適用
  - _要件: 要件1.1, 要件2.1, 要件3.1, 要件4.1, 要件6.3_

- [ ] 3. ColorScaleUIの説明文を更新する
  - 現在の「容積絶対湿度・露点温度・不快指数」を削除
  - _要件: 要件5.1_

- [ ] 4. ColorScaleManagerの単体テストを追加する
  - 新しい基本気象データ列に対するカラースケール適用のテスト
  - `getColorScaleForColumn`メソッドの新しいケースのテスト
  - 気温、湿度、降水量、風速の各列に対する正しいカラースケール取得のテスト
  - _要件: 要件1.1, 要件2.1, 要件3.1, 要件4.1_

- [ ] 5. 統合テストを追加する
  - 実際のテーブル構造での基本気象データカラースケール適用テスト
  - 有効/無効切り替え時の全列（既存+新規）の動作確認テスト
  - localStorage設定の保存・復元テスト
  - _要件: 要件5.2, 要件5.3, 要件5.4_
