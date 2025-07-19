/**
 * 気象庁公式カラースケール計算機能
 */

import type { ColorScale } from './jma_official_colors'

export class ColorScaleCalculator {
  /**
   * 気象庁公式カラースケールを使用して色を計算する
   */
  calculateColorFromScale(value: number, colorScale: ColorScale): string {
    if (colorScale.values.length === 0 || colorScale.colors.length === 0) {
      return 'transparent'
    }

    // 値が範囲外の場合の処理
    if (value <= colorScale.values[0]) {
      return colorScale.colors[0]
    }
    if (value >= colorScale.values[colorScale.values.length - 1]) {
      return colorScale.colors[colorScale.colors.length - 1]
    }

    // 値が属する区間を見つける
    for (let i = 0; i < colorScale.values.length - 1; i++) {
      const currentValue = colorScale.values[i]
      const nextValue = colorScale.values[i + 1]

      if (value >= currentValue && value <= nextValue) {
        // 線形補間で色を計算
        const ratio = (value - currentValue) / (nextValue - currentValue)
        return this.interpolateColor(colorScale.colors[i], colorScale.colors[i + 1], ratio)
      }
    }

    return 'transparent'
  }

  /**
   * セルのテキストから数値を解析する
   */
  parseNumericValue(cellText: string): number | null {
    if (!cellText || cellText.trim() === '' || cellText.trim() === '---') {
      return null
    }

    // 数値部分を抽出（単位や記号を除去）
    const numericMatch = cellText.match(/(-?\d+(?:\.\d+)?)/)
    if (!numericMatch) {
      return null
    }

    const value = Number.parseFloat(numericMatch[1])
    return Number.isNaN(value) ? null : value
  }

  /**
   * 2色間の線形補間
   */
  private interpolateColor(startColor: string, endColor: string, ratio: number): string {
    const startRgb = this.hexToRgb(startColor)
    const endRgb = this.hexToRgb(endColor)

    if (!startRgb || !endRgb) {
      return 'transparent'
    }

    const r = Math.round(startRgb.r + (endRgb.r - startRgb.r) * ratio)
    const g = Math.round(startRgb.g + (endRgb.g - startRgb.g) * ratio)
    const b = Math.round(startRgb.b + (endRgb.b - startRgb.b) * ratio)

    return `rgb(${r}, ${g}, ${b})`
  }

  /**
   * HEXカラーをRGBに変換
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: Number.parseInt(result[1], 16),
          g: Number.parseInt(result[2], 16),
          b: Number.parseInt(result[3], 16),
        }
      : null
  }
}
