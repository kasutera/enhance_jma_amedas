/**
 * ColorScaleCalculator のテスト
 */

import { ColorScaleCalculator } from './color_scale_calculator'
import { DERIVED_COLOR_SCALES, JMA_OFFICIAL_COLOR_SCALES } from './jma_official_colors'

describe('ColorScaleCalculator', () => {
  let calculator: ColorScaleCalculator

  beforeEach(() => {
    calculator = new ColorScaleCalculator()
  })

  describe('parseNumericValue', () => {
    test('正常な数値を解析できる', () => {
      expect(calculator.parseNumericValue('25.5')).toBe(25.5)
      expect(calculator.parseNumericValue('-10')).toBe(-10)
      expect(calculator.parseNumericValue('0')).toBe(0)
    })

    test('余計な文字の入っている数値に対してnullを返す', () => {
      expect(calculator.parseNumericValue('25.5℃')).toBe(null)
      expect(calculator.parseNumericValue('80%')).toBe(null)
      expect(calculator.parseNumericValue('15.2g/m³')).toBe(null)
    })

    test('無効な値に対してnullを返す', () => {
      expect(calculator.parseNumericValue('')).toBeNull()
      expect(calculator.parseNumericValue('---')).toBeNull()
      expect(calculator.parseNumericValue('N/A')).toBeNull()
      expect(calculator.parseNumericValue('abc')).toBeNull()
    })
  })

  describe('calculateColorFromScale', () => {
    test('気温スケールで色を計算する', () => {
      const tempScale = JMA_OFFICIAL_COLOR_SCALES.temperature

      // 範囲外の値は境界値の色を返す
      const minColor = calculator.calculateColorFromScale(-10, tempScale)
      expect(minColor).toBe('#000080') // 濃い青

      const maxColor = calculator.calculateColorFromScale(40, tempScale)
      expect(maxColor).toBe('#800080') // 紫

      // 範囲内の値は何らかの色を返す（補間またはそのまま）
      const validColor = calculator.calculateColorFromScale(0, tempScale)
      expect(validColor).toBeTruthy()
      expect(validColor).not.toBe('transparent')
    })

    test('容積絶対湿度スケールで色を計算する', () => {
      const volumetricScale = DERIVED_COLOR_SCALES.volumetricHumidity

      const minColor = calculator.calculateColorFromScale(-5, volumetricScale)
      expect(minColor).toBe('#FFFFFF') // 白

      const maxColor = calculator.calculateColorFromScale(35, volumetricScale)
      expect(maxColor).toBe('#800080') // 紫
    })

    test('空のスケールに対してtransparentを返す', () => {
      const emptyScale = { values: [], colors: [] }
      const color = calculator.calculateColorFromScale(25, emptyScale)
      expect(color).toBe('transparent')
    })

    test('線形補間が動作する', () => {
      const simpleScale = {
        values: [0, 10],
        colors: ['#000000', '#FFFFFF'], // 黒から白
      }

      // 中間値は何らかの色を返す
      const midColor = calculator.calculateColorFromScale(5, simpleScale)
      expect(midColor).toBeTruthy()
      expect(midColor).not.toBe('transparent')
      // RGB形式またはHEX形式であることを確認
      expect(midColor).toMatch(/^(#[0-9A-Fa-f]{6}|rgb\(\d+, \d+, \d+\))$/)
    })

    test('範囲外の値を正しく処理する', () => {
      const tempScale = JMA_OFFICIAL_COLOR_SCALES.temperature

      // 最小値より小さい値
      const belowMin = calculator.calculateColorFromScale(-100, tempScale)
      expect(belowMin).toBe('#000080') // 最小値の色

      // 最大値より大きい値
      const aboveMax = calculator.calculateColorFromScale(100, tempScale)
      expect(aboveMax).toBe('#800080') // 最大値の色
    })
  })
})
