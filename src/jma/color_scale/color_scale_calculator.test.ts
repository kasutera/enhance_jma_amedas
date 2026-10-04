import { calculateColorFromScale, parseNumericValue } from './color_scale_calculator'
import { DERIVED_COLOR_SCALES, JMA_OFFICIAL_COLOR_SCALES } from './jma_official_colors'

describe('カラースケール計算', () => {
  describe('parseNumericValue', () => {
    test('正常な数値を解析できる', () => {
      expect(parseNumericValue('25.5')).toBe(25.5)
      expect(parseNumericValue('-10')).toBe(-10)
      expect(parseNumericValue('0')).toBe(0)
    })

    test('余計な文字の入っている数値に対してnullを返す', () => {
      expect(parseNumericValue('25.5℃')).toBe(null)
      expect(parseNumericValue('80%')).toBe(null)
      expect(parseNumericValue('15.2g/m³')).toBe(null)
    })

    test('無効な値に対してnullを返す', () => {
      expect(parseNumericValue('')).toBeNull()
      expect(parseNumericValue('---')).toBeNull()
      expect(parseNumericValue('N/A')).toBeNull()
      expect(parseNumericValue('abc')).toBeNull()
    })
  })

  describe('calculateColorFromScale', () => {
    test('気温スケールで色を計算する', () => {
      const tempScale = JMA_OFFICIAL_COLOR_SCALES.temperature

      // 範囲外の値は境界値の色を返す
      const minColor = calculateColorFromScale(-10, tempScale)
      expect(minColor).toBe('#000080') // 濃い青

      const maxColor = calculateColorFromScale(40, tempScale)
      expect(maxColor).toBe('#A52166') // 紫（JMA公式色）
    })

    test('容積絶対湿度スケールで色を計算する', () => {
      const volumetricScale = DERIVED_COLOR_SCALES.volumetricHumidity

      const minColor = calculateColorFromScale(-5, volumetricScale)
      expect(minColor).toBe('#4D0F05') // 茶色（湿度スケール最小値）

      const maxColor = calculateColorFromScale(35, volumetricScale)
      expect(maxColor).toBe('#091E78') // 濃い青（湿度スケール最大値）
    })

    test('空のスケールに対してtransparentを返す', () => {
      const emptyScale = { values: [], colors: [] }
      const color = calculateColorFromScale(25, emptyScale)
      expect(color).toBe('transparent')
    })
  })
})
