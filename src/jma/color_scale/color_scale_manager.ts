/**
 * カラースケール管理クラス（気象庁公式カラースケール・シンプル版）
 */

import { TABLE_CLASS_NAMES } from '../table_classes_definition'
import { ColorScaleCalculator } from './color_scale_calculator'
import { DERIVED_COLOR_SCALES, JMA_OFFICIAL_COLOR_SCALES } from './jma_official_colors'

/**
 * rgb文字列をパースしてRGB値の配列に変換する
 * @param color 色を表す文字列（例: '#ff0000', 'rgb(255, 0, 0)'）
 * @returns [number, number, number] | null
 */
export function parseColorToRGB(color: string): [number, number, number] | null {
  try {
    const el = document.createElement('div')
    el.style.color = color
    document.body.appendChild(el)
    const computed = getComputedStyle(el).color
    document.body.removeChild(el)

    // rgb(r, g, b) 形式をパース
    const match = computed.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/)
    if (match) {
      return [
        Number.parseInt(match[1], 10),
        Number.parseInt(match[2], 10),
        Number.parseInt(match[3], 10),
      ]
    }
    return null
  } catch (error) {
    return null
  }
}

/**
 * 背景色に基づいて適切な文字色を計算する
 * @param backgroundColor RGB形式の背景色文字列
 * @returns 'white' | '#444' | null
 */
export function calculateTextColor(
  backgroundColor: [number, number, number],
): 'white' | '#444' | null {
  try {
    const r = backgroundColor[0]
    const g = backgroundColor[1]
    const b = backgroundColor[2]

    // 相対輝度を計算 (WCAG基準)
    const toLinear = (c: number) => {
      const normalized = c / 255
      return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
    }

    const backgroundLuminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)

    // 白と#444のコントラスト比を計算
    const whiteLuminance = 1
    // #444 (68, 68, 68) の相対輝度を計算
    const darkGrayLuminance = 0.2126 * toLinear(68) + 0.7152 * toLinear(68) + 0.0722 * toLinear(68)

    const contrastWithWhite =
      (Math.max(whiteLuminance, backgroundLuminance) + 0.05) /
      (Math.min(whiteLuminance, backgroundLuminance) + 0.05)
    const contrastWithDarkGray =
      (Math.max(backgroundLuminance, darkGrayLuminance) + 0.05) /
      (Math.min(backgroundLuminance, darkGrayLuminance) + 0.05)

    // コントラスト比が高い方を返す
    return contrastWithWhite > contrastWithDarkGray ? 'white' : '#444'
  } catch (error) {
    console.error('文字色計算中にエラーが発生しました:', error)
    return null
  }
}

export class ColorScaleManager {
  private calculator: ColorScaleCalculator
  private isEnabled: boolean
  private currentTables: Set<HTMLTableElement> = new Set()

  constructor() {
    this.calculator = new ColorScaleCalculator()
    // ローカルストレージから設定を読み込み
    this.isEnabled = this.loadEnabledState()
  }

  /**
   * カラースケール機能を有効にする
   */
  enable(): void {
    this.isEnabled = true
    this.saveEnabledState()
    this.applyColorScaleToAllTables()
  }

  /**
   * カラースケール機能を無効にする
   */
  disable(): void {
    this.isEnabled = false
    this.saveEnabledState()
    this.removeColorScaleFromAllTables()
  }

  /**
   * カラースケール機能の有効状態を取得する
   */
  getEnabled(): boolean {
    return this.isEnabled
  }

  /**
   * テーブルを登録してカラースケールを適用する
   */
  registerTable(table: HTMLTableElement): void {
    this.currentTables.add(table)
    if (this.isEnabled) {
      this.applyColorScaleToTable(table)
    }
  }

  /**
   * テーブルの指定された列にカラースケールを適用する
   */
  applyColorScaleToColumn(table: HTMLTableElement, columnClass: string): void {
    this.registerTable(table)

    if (this.isEnabled) {
      this.applyColorScaleToSpecificColumn(table, columnClass)
    }
  }

  /**
   * 全てのテーブルにカラースケールを適用する
   */
  private applyColorScaleToAllTables(): void {
    this.currentTables.forEach((table) => {
      this.applyColorScaleToTable(table)
    })
  }

  /**
   * 全てのテーブルからカラースケールを削除する
   */
  private removeColorScaleFromAllTables(): void {
    this.currentTables.forEach((table) => {
      this.removeColorScaleFromTable(table)
    })
  }

  /**
   * 単一のテーブルにカラースケールを適用する（全列対応）
   */
  private applyColorScaleToTable(table: HTMLTableElement): void {
    try {
      // 全ての対象列にカラースケールを適用
      const targetColumns = [
        TABLE_CLASS_NAMES.temp,
        TABLE_CLASS_NAMES.humidity,
        TABLE_CLASS_NAMES.precipitation1h,
        TABLE_CLASS_NAMES.wind,
        TABLE_CLASS_NAMES.volumetricHumidity,
        TABLE_CLASS_NAMES.dewPoint,
        TABLE_CLASS_NAMES.temperatureHumidityIndex,
      ]

      for (const columnClass of targetColumns) {
        this.applyColorScaleToSpecificColumn(table, columnClass)
      }
    } catch (error) {
      console.error('カラースケール適用中にエラーが発生しました:', error)
      // エラーが発生しても既存機能に影響を与えない
    }
  }

  /**
   * 特定の列にカラースケールを適用する
   */
  private applyColorScaleToSpecificColumn(table: HTMLTableElement, columnClass: string): void {
    try {
      const cells = table.querySelectorAll(`.${columnClass}`)
      if (cells.length === 0) {
        return
      }

      // 列に対応するカラースケールを取得
      const colorScale = this.getColorScaleForColumn(columnClass)
      if (!colorScale) {
        return
      }

      // 各セルにカラースケールを適用
      cells.forEach((cell) => {
        if (cell instanceof HTMLElement) {
          const value = this.calculator.parseNumericValue(cell.textContent || '')
          if (value !== null) {
            const color = this.calculator.calculateColorFromScale(value, colorScale)
            if (color !== 'transparent') {
              cell.style.backgroundColor = color
              // 文字の可読性を確保するため、背景の明度に基づいて文字色を調整
              this.adjustTextColor(cell, color)
            }
          }
        }
      })
    } catch (error) {
      console.error(`列 ${columnClass} のカラースケール適用中にエラーが発生しました:`, error)
    }
  }

  /**
   * 列に対応するカラースケールを取得する
   */
  private getColorScaleForColumn(columnClass: string) {
    switch (columnClass) {
      case TABLE_CLASS_NAMES.temp:
        return JMA_OFFICIAL_COLOR_SCALES.temperature
      case TABLE_CLASS_NAMES.humidity:
        return JMA_OFFICIAL_COLOR_SCALES.humidity
      case TABLE_CLASS_NAMES.precipitation1h:
        return JMA_OFFICIAL_COLOR_SCALES.precipitation
      case TABLE_CLASS_NAMES.wind:
        return JMA_OFFICIAL_COLOR_SCALES.windSpeed
      case TABLE_CLASS_NAMES.volumetricHumidity:
        return DERIVED_COLOR_SCALES.volumetricHumidity
      case TABLE_CLASS_NAMES.dewPoint:
        return DERIVED_COLOR_SCALES.dewPoint
      case TABLE_CLASS_NAMES.temperatureHumidityIndex:
        return DERIVED_COLOR_SCALES.temperatureHumidityIndex
      default:
        return null
    }
  }

  /**
   * 背景色に基づいて文字色を調整する
   */
  private adjustTextColor(element: HTMLElement, backgroundColor: string): void {
    const rgbValues = parseColorToRGB(backgroundColor)
    if (rgbValues) {
      const textColor = calculateTextColor(rgbValues)
      if (textColor) {
        element.style.color = textColor
        // 文字の可読性を向上させるため8方向の縁取りを追加
        if (textColor === '#444') {
          element.style.textShadow =
            '1px 0 0 white, -1px 0 0 white, 0 1px 0 white, 0 -1px 0 white, 1px 1px 0 white, -1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white'
        } else {
          element.style.textShadow =
            '1px 0 0 black, -1px 0 0 black, 0 1px 0 black, 0 -1px 0 black, 1px 1px 0 black, -1px -1px 0 black, 1px -1px 0 black, -1px 1px 0 black'
        }
      }
    }
  }

  /**
   * 単一のテーブルからカラースケールを削除する（全列対応）
   */
  private removeColorScaleFromTable(table: HTMLTableElement): void {
    try {
      // 全ての対象列からカラースケールを削除
      const targetColumns = [
        TABLE_CLASS_NAMES.temp,
        TABLE_CLASS_NAMES.humidity,
        TABLE_CLASS_NAMES.precipitation1h,
        TABLE_CLASS_NAMES.wind,
        TABLE_CLASS_NAMES.volumetricHumidity,
        TABLE_CLASS_NAMES.dewPoint,
        TABLE_CLASS_NAMES.temperatureHumidityIndex,
      ]

      for (const columnClass of targetColumns) {
        const cells = table.querySelectorAll(`.${columnClass}`)
        cells.forEach((cell) => {
          if (cell instanceof HTMLElement) {
            cell.style.backgroundColor = ''
            cell.style.color = ''
            cell.style.textShadow = ''
          }
        })
      }
    } catch (error) {
      console.error('カラースケール削除中にエラーが発生しました:', error)
      // エラーが発生しても既存機能に影響を与えない
    }
  }

  /**
   * 有効状態をローカルストレージから読み込む
   */
  private loadEnabledState(): boolean {
    try {
      const stored = localStorage.getItem('jma-color-scale-enabled')
      return stored !== null ? JSON.parse(stored) : true // デフォルトは有効
    } catch (error) {
      console.error('カラースケール設定の読み込みに失敗しました:', error)
      return true // エラー時はデフォルト値
    }
  }

  /**
   * 有効状態をローカルストレージに保存する
   */
  private saveEnabledState(): void {
    try {
      localStorage.setItem('jma-color-scale-enabled', JSON.stringify(this.isEnabled))
    } catch (error) {
      console.error('カラースケール設定の保存に失敗しました:', error)
    }
  }
}
