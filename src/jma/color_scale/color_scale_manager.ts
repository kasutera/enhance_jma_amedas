/**
 * カラースケール管理クラス（設定永続化・全列対応）
 */

import { ColorScaleCalculator } from './color_scale_calculator'
import { ColorScaleStorage } from './color_scale_storage'
import type { ColorScaleConfig, ColorScaleGlobalConfig } from './color_scale_types'

export class ColorScaleManager {
  private calculator: ColorScaleCalculator
  private storage: ColorScaleStorage
  private config: ColorScaleGlobalConfig
  private currentTables: Set<HTMLTableElement> = new Set()

  constructor() {
    this.calculator = new ColorScaleCalculator()
    this.storage = new ColorScaleStorage()
    this.config = this.storage.loadConfig()
  }

  /**
   * カラースケール機能を有効にする
   */
  enable(): void {
    this.config.enabled = true
    this.saveConfig()
    this.applyColorScaleToAllTables()
  }

  /**
   * カラースケール機能を無効にする
   */
  disable(): void {
    this.config.enabled = false
    this.saveConfig()
    this.removeColorScaleFromAllTables()
  }

  /**
   * カラースケール機能の有効状態を取得する
   */
  getEnabled(): boolean {
    return this.config.enabled
  }

  /**
   * 設定を保存する
   */
  private saveConfig(): void {
    this.storage.saveConfig(this.config)
  }

  /**
   * 列の設定を更新する
   */
  updateColumnConfig(columnClass: string, columnConfig: ColorScaleConfig): void {
    this.config.columns[columnClass] = columnConfig
    this.saveConfig()

    // 該当列のカラースケールを更新
    if (this.config.enabled) {
      this.currentTables.forEach((table) => {
        this.applyColorScaleToColumn(table, columnClass)
      })
    }
  }

  /**
   * 列の設定を取得する
   */
  getColumnConfig(columnClass: string): ColorScaleConfig | undefined {
    return this.config.columns[columnClass]
  }

  /**
   * 全ての列設定を取得する
   */
  getAllColumnConfigs(): Record<string, ColorScaleConfig> {
    return { ...this.config.columns }
  }

  /**
   * テーブルを登録してカラースケールを適用する
   */
  registerTable(table: HTMLTableElement): void {
    this.currentTables.add(table)
    if (this.config.enabled) {
      this.applyColorScaleToTable(table)
    }
  }

  /**
   * テーブルの指定された列にカラースケールを適用する
   */
  applyColorScaleToColumn(table: HTMLTableElement, columnClass: string): void {
    this.registerTable(table)

    if (this.config.enabled) {
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
      const columnConfig = this.config.columns[columnClass]
      if (!columnConfig || !columnConfig.enabled) {
        return
      }

      const cells = table.querySelectorAll(`.${columnClass}`)
      if (cells.length === 0) {
        return
      }

      // 各セルにカラースケールを適用
      cells.forEach((cell) => {
        if (cell instanceof HTMLElement) {
          const value = this.calculator.parseNumericValue(cell.textContent || '')
          if (value !== null) {
            const color = this.calculator.calculateColor(
              value,
              columnConfig.minValue,
              columnConfig.maxValue,
              columnConfig.colorScheme,
            )
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
}
