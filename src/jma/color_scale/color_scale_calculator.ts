/**
 * カラースケール計算機能
 */

import type { ColorScheme } from './color_scale_types'

export class ColorScaleCalculator {
  /**
   * 数値からカラーを計算する
   */
  calculateColor(value: number, min: number, max: number, colorScheme: ColorScheme): string {
    if (colorScheme.type === 'gradient' && colorScheme.colors.length >= 2) {
      // 範囲外の値は最小値・最大値にクランプする
      const clampedValue = Math.max(min, Math.min(max, value))
      return this.interpolateColor(
        clampedValue,
        min,
        max,
        colorScheme.colors[0],
        colorScheme.colors[1],
      )
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
   * 線形補間によるカラー計算
   */
  private interpolateColor(
    value: number,
    min: number,
    max: number,
    startColor: string,
    endColor: string,
  ): string {
    const ratio = (value - min) / (max - min)
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
