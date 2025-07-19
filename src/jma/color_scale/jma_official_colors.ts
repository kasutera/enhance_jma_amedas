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
  // 気温（℃）
  temperature: {
    values: [-5, -2.5, 2.5, 7.5, 12.5, 17.5, 22.5, 27.5, 32.5, 35],
    colors: [
      '#000080', // -5°C-
      '#1840F5', // -2.5°C
      '#4294F7', // 2.5°C
      '#C3EAFD', // 7.5°C
      '#FFFFF1', // 12.5°C
      '#FFFFA3', // 17.5°C
      '#F9F551', // 22.5°C
      '#F19E38', // 27.5°C
      '#EA4225', // 32.5°C
      '#A52166', // 35°C+
    ],
  } as ColorScale,

  // 湿度（%）
  humidity: {
    values: [10, 15, 25, 35, 45, 55, 65, 75, 85, 95, 100],
    colors: [
      '#4D0F05', // 10%-
      '#6C1C0B', // 15%
      '#9F501D', // 25%
      '#DA8C33', // 35%
      '#F6CA5F', // 45%
      '#FFFFF1', // 55%
      '#9FF5E7', // 65%
      '#5CBFD0', // 75%
      '#307096', // 85%
      '#1D4A91', // 95%
      '#091E78', // 100%
    ],
  } as ColorScale,

  // 風速（m/s）
  windSpeed: {
    values: [5, 7.5, 12.5, 17.5, 22.5, 25],
    colors: [
      '#F2F2FE', // 5m/s-
      '#1840F5', // 7.5m/s
      '#F9F551', // 12.5m/s
      '#F19E38', // 17.5m/s
      '#EA4225', // 22.5m/s
      '#A52166', // 25m/s+
    ],
  } as ColorScale,

  // 1時間降水量（mm）
  precipitation: {
    values: [1, 3, 7.5, 15, 25, 40, 75, 80],
    colors: [
      '#F2F2FE', // 1mm-
      '#AAD1FB', // 3mm
      '#458AF7', // 7.5mm
      '#1840F5', // 15mm
      '#F9F551', // 25mm
      '#F19E38', // 40mm
      '#EA4225', // 75mm
      '#A52166', // 80mm+
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
