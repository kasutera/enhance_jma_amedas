# 実装計画

- [x] 1. 不快指数計算機能をHumidCalculatorクラスに追加
  - `HumidCalculator`クラスに`temperatureHumidityIndex`プロパティを追加
  - `calcTemperatureHumidityIndex`メソッドを実装（式: 0.81×Td + 0.01×H×(0.99×Td - 14.3) + 46.3）
  - コンストラクタで不快指数を自動計算するよう修正
  - _要件: 2.1, 2.2_

- [x] 2. 不快指数計算の単体テストを作成
  - 正常な気温・湿度での計算結果テスト
  - 境界値（0°C, 0%）での処理テスト
  - 負の値での正常計算テスト
  - 計算精度（小数点以下1桁）のテスト
  - _要件: 2.1, 2.2, 2.3_

- [x] 3. エリアテーブル用presentation.tsを拡張
  - `convertAmedasDataToSeriestableRow`関数の戻り値を3つの列に変更
  - 不快指数列の定数定義（`TEMPERATURE_HUMIDITY_INDEX_CLASS`等）を追加
  - 気温・湿度欠損時の"---"表示処理を実装
  - 負の値でも正常に計算を行う処理を実装
  - _要件: 1.1, 2.3, 3.1_

- [x] 4. 時系列テーブル用presentation.tsを拡張
  - `convertAmedasDataToSeriestableRow`関数の戻り値を3つの行に変更
  - 不快指数行の定数定義を追加
  - 気温・湿度欠損時の"---"表示処理を実装
  - 負の値でも正常に計算を行う処理を実装
  - _要件: 1.2, 2.3, 3.1_

- [x] 5. エリアテーブル用presentation.tsの単体テストを作成
  - 3つの列が正しく返されることを確認するテスト
  - 不快指数列の値が正しく計算されることを確認するテスト
  - 気温・湿度欠損時の"---"表示テスト
  - 負の値での正常計算テスト
  - _要件: 1.1, 2.3, 3.1_

- [x] 6. 時系列テーブル用presentation.tsの単体テストを作成
  - 3つの行が正しく返されることを確認するテスト
  - 不快指数行の値が正しく計算されることを確認するテスト
  - 気温・湿度欠損時の"---"表示テスト
  - 負の値での正常計算テスト
  - _要件: 1.2, 2.3, 3.1_

- [x] 7. エリアテーブルのメイン処理を更新
  - `areastable_main.ts`で3つの列を処理するよう修正
  - 不快指数列をテーブルに追加する処理を実装
  - 既存機能（体積絶対湿度、露点温度）との共存を確認
  - _要件: 1.1, 4.1, 4.2_

- [x] 8. 時系列テーブルのメイン処理を更新
  - `seriestable_main.ts`で3つの行を処理するよう修正
  - 不快指数行をテーブルに追加する処理を実装
  - 既存機能（体積絶対湿度、露点温度）との共存を確認
  - _要件: 1.2, 4.1, 4.2_
