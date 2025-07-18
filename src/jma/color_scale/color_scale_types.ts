/**
 * カラースケール機能の型定義
 */

export interface ColorScheme {
  type: 'gradient' | 'discrete'
  colors: string[] // hex color codes
}

export interface ColorScaleConfig {
  enabled: boolean
  colorScheme: ColorScheme
  minValue: number
  maxValue: number
}

export interface ColorScaleGlobalConfig {
  enabled: boolean
  columns: Record<string, ColorScaleConfig>
}

// 対象列の定義
export const COLUMN_DEFINITIONS = {
  'td-volumetric-humidity': {
    name: '容積絶対湿度',
    unit: 'g/㎥',
    defaultMin: 0,
    defaultMax: 30,
    defaultColors: ['#ffffff', '#0066cc'],
  },
  'td-dew-point': {
    name: '露点温度',
    unit: '℃',
    defaultMin: -20,
    defaultMax: 30,
    defaultColors: ['#0066cc', '#ff0000'],
  },
  'td-temperature-humidity-index': {
    name: '不快指数',
    unit: '',
    defaultMin: 50,
    defaultMax: 85,
    defaultColors: ['#00ff00', '#ffff00', '#ff0000'],
  },
} as const
