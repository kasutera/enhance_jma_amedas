/**
 * ColorScaleCalculator のテスト
 */

import { ColorScaleCalculator } from './color_scale_calculator'
import type { ColorScheme } from './color_scale_types'

describe('ColorScaleCalculator', () => {
  let calculator: ColorScaleCalculator

  beforeEach(() => {
    calculator = new ColorScaleCalculator()
  })

  describe('parseNumericValue', () => {
    test('正常な数値を解析できる', () => {
      expect(calculator.parseNumericValue('15.5')).toBe(15.5)
      expect(calculator.parseNumericValue('25')).toBe(25)
      expect(calculator.parseNumericValue('-10.2')).toBe(-10.2)
    })

    test('単位付きの数値を解析できる', () => {
      expect(calculator.parseNumericValue('15.5g/㎥')).toBe(15.5)
      expect(calculator.parseNumericValue('25℃')).toBe(25)
      expect(calculator.parseNumericValue('70%')).toBe(70)
    })

    test('欠損データを正しく処理する', () => {
      expect(calculator.parseNumericValue('---')).toBeNull()
      expect(calculator.parseNumericValue('')).toBeNull()
      expect(calculator.parseNumericValue('   ')).toBeNull()
    })

    test('無効な文字列を正しく処理する', () => {
      expect(calculator.parseNumericValue('abc')).toBeNull()
      expect(calculator.parseNumericValue('N/A')).toBeNull()
    })
  })

  describe('calculateColor', () => {
    const colorScheme: ColorScheme = {
      type: 'gradient',
      colors: ['#ffffff', '#0066cc'],
    }

    test('範囲内の値に対してカラーを計算する', () => {
      const color = calculator.calculateColor(15, 0, 30, colorScheme)
      expect(color).toMatch(/^rgb\(\d+, \d+, \d+\)$/)
    })

    test('最小値に対して開始色を返す', () => {
      const color = calculator.calculateColor(0, 0, 30, colorScheme)
      expect(color).toBe('rgb(255, 255, 255)') // #ffffff
    })

    test('最大値に対して終了色を返す', () => {
      const color = calculator.calculateColor(30, 0, 30, colorScheme)
      expect(color).toBe('rgb(0, 102, 204)') // #0066cc
    })

    test('範囲外の値に対して最小値・最大値と同じ色を返す', () => {
      // 最小値未満の場合は最小値と同じ色
      expect(calculator.calculateColor(-5, 0, 30, colorScheme)).toBe('rgb(255, 255, 255)') // #ffffff
      // 最大値超過の場合は最大値と同じ色
      expect(calculator.calculateColor(35, 0, 30, colorScheme)).toBe('rgb(0, 102, 204)') // #0066cc
    })
  })
})
