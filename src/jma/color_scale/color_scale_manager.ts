/**
 * カラースケール管理クラス（気象庁公式カラースケール・シンプル版）
 */

import { ColorScaleCalculator } from './color_scale_calculator'
import { DERIVED_COLOR_SCALES } from './jma_official_colors'

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
        'td-volumetric-humidity',
        'td-dew-point',
        'td-temperature-humidity-index',
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
      case 'td-volumetric-humidity':
        return DERIVED_COLOR_SCALES.volumetricHumidity
      case 'td-dew-point':
        return DERIVED_COLOR_SCALES.dewPoint
      case 'td-temperature-humidity-index':
        return DERIVED_COLOR_SCALES.temperatureHumidityIndex
      default:
        return null
    }
  }

  /**
   * 背景色に基づいて文字色を調整する
   */
  private adjustTextColor(element: HTMLElement, backgroundColor: string): void {
    try {
      // RGB値を抽出
      const rgbMatch = backgroundColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
      if (!rgbMatch) {
        return
      }

      const r = Number.parseInt(rgbMatch[1])
      const g = Number.parseInt(rgbMatch[2])
      const b = Number.parseInt(rgbMatch[3])

      // 明度を計算（相対輝度の簡易版）
      const brightness = (r * 299 + g * 587 + b * 114) / 1000

      // 明度が128未満の場合は白文字、それ以外は黒文字
      element.style.color = brightness < 128 ? 'white' : 'black'
    } catch (error) {
      console.error('文字色調整中にエラーが発生しました:', error)
    }
  }

  /**
   * 単一のテーブルからカラースケールを削除する（全列対応）
   */
  private removeColorScaleFromTable(table: HTMLTableElement): void {
    try {
      // 全ての対象列からカラースケールを削除
      const targetColumns = [
        'td-volumetric-humidity',
        'td-dew-point',
        'td-temperature-humidity-index',
      ]

      for (const columnClass of targetColumns) {
        const cells = table.querySelectorAll(`.${columnClass}`)
        cells.forEach((cell) => {
          if (cell instanceof HTMLElement) {
            cell.style.backgroundColor = ''
            cell.style.color = ''
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
