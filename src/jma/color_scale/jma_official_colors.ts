/**
 * 気象庁公式カラースケール定義
 */

export interface ColorScale {
  values: number[]
  colors: string[]
}

/**
 * 気象庁公式カラースケール
 * 画像から抽出した色値を基に定義
 */
export const JMA_OFFICIAL_COLOR_SCALES = {
  // 気温（℃）: -5°C から 35°C
  temperature: {
    values: [-5, 0, 5, 10, 15, 20, 25, 30, 35],
    colors: [
      '#000080', // -5°C: 濃い青
      '#0000FF', // 0°C: 青
      '#00BFFF', // 5°C: 水色
      '#87CEEB', // 10°C: 薄い水色
      '#FFFFFF', // 15°C: 白
      '#FFFF99', // 20°C: 薄い黄
      '#FFFF00', // 25°C: 黄
      '#FFA500', // 30°C: オレンジ
      '#FF0000', // 35°C: 赤
      '#800080', // 35°C+: 紫
    ],
  } as ColorScale,

  // 湿度（%）: 10% から 100%
  humidity: {
    values: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
    colors: [
      '#8B0000', // 10%: 濃い茶
      '#A0522D', // 20%: 茶
      '#D2691E', // 30%: オレンジ茶
      '#FF8C00', // 40%: オレンジ
      '#FFFFFF', // 50%: 白
      '#98FB98', // 60%: 薄い緑
      '#00FFFF', // 70%: シアン
      '#40E0D0', // 80%: ターコイズ
      '#0080FF', // 90%: 青
      '#000080', // 100%: 濃い青
    ],
  } as ColorScale,

  // 風速（m/s）: 5m/s から 25m/s
  windSpeed: {
    values: [5, 10, 15, 20, 25],
    colors: [
      '#FFFFFF', // 5m/s: 白
      '#0000FF', // 10m/s: 青
      '#FFFF00', // 15m/s: 黄
      '#FFA500', // 20m/s: オレンジ
      '#FF0000', // 25m/s: 赤
      '#800080', // 25m/s+: 紫
    ],
  } as ColorScale,

  // 降水量（mm）: 1mm から 80mm
  precipitation: {
    values: [1, 5, 10, 20, 30, 50, 80],
    colors: [
      '#E6E6FA', // 1mm: 薄い紫
      '#87CEEB', // 5mm: 薄い水色
      '#00BFFF', // 10mm: 水色
      '#0000FF', // 20mm: 青
      '#FFFF00', // 30mm: 黄
      '#FFA500', // 50mm: オレンジ
      '#FF0000', // 80mm: 赤
      '#800080', // 80mm+: 紫
    ],
  } as ColorScale,
} as const

/**
 * 追加パラメータ用のカラースケール（気温ベース）
 */
export const DERIVED_COLOR_SCALES = {
  // 露点温度（℃）: 気温スケールを流用
  dewPoint: {
    values: [-20, -10, 0, 10, 20, 30],
    colors: [
      '#000080', // -20°C: 濃い青
      '#0000FF', // -10°C: 青
      '#87CEEB', // 0°C: 薄い水色
      '#FFFFFF', // 10°C: 白
      '#FFFF00', // 20°C: 黄
      '#FF0000', // 30°C: 赤
    ],
  } as ColorScale,

  // 容積絶対湿度（g/m³）: 湿度スケールを参考に調整
  volumetricHumidity: {
    values: [0, 5, 10, 15, 20, 25, 30],
    colors: [
      '#FFFFFF', // 0g/m³: 白
      '#E6E6FA', // 5g/m³: 薄い紫
      '#87CEEB', // 10g/m³: 薄い水色
      '#00BFFF', // 15g/m³: 水色
      '#0000FF', // 20g/m³: 青
      '#000080', // 25g/m³: 濃い青
      '#800080', // 30g/m³: 紫
    ],
  } as ColorScale,

  // 不快指数: 快適度に応じた色分け
  temperatureHumidityIndex: {
    values: [50, 55, 60, 65, 70, 75, 80, 85],
    colors: [
      '#0000FF', // 50: 青（寒い）
      '#87CEEB', // 55: 薄い水色（涼しい）
      '#FFFFFF', // 60: 白（快適）
      '#98FB98', // 65: 薄い緑（やや快適）
      '#FFFF00', // 70: 黄（やや暑い）
      '#FFA500', // 75: オレンジ（暑い）
      '#FF0000', // 80: 赤（非常に暑い）
      '#800080', // 85: 紫（極めて暑い）
    ],
  } as ColorScale,
} as const
