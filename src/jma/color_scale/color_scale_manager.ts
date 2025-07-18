/**
 * カラースケール管理クラス（基本トグル機能付き）
 */

import { ColorScaleCalculator } from './color_scale_calculator'
import type { ColorScheme } from './color_scale_types'

export class ColorScaleManager {
  private calculator: ColorScaleCalculator
  private isEnabled = true
  private currentTables: Set<HTMLTableElement> = new Set()

  constructor() {
    this.calculator = new ColorScaleCalculator()
  }

  /**
   * カラースケール機能を有効にする
   */
  enable(): void {
    this.isEnabled = true
    this.applyColorScaleToAllTables()
  }

  /**
   * カラースケール機能を無効にする
   */
  disable(): void {
    this.isEnabled = false
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
   * テーブルの指定された列にカラースケールを適用する（最小実装）
   */
  applyColorScaleToColumn(table: HTMLTableElement, _columnClass: string): void {
    this.registerTable(table)
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
   * 単一のテーブルにカラースケールを適用する
   */
  private applyColorScaleToTable(table: HTMLTableElement): void {
    try {
      // 容積絶対湿度列のみに固定のカラースケールを適用
      const columnClass = 'td-volumetric-humidity'
      const cells = table.querySelectorAll(`.${columnClass}`)
      if (cells.length === 0) {
        return
      }

      // 固定のカラースケール設定（白→青）
      const colorScheme: ColorScheme = {
        type: 'gradient',
        colors: ['#ffffff', '#0066cc'],
      }
      const minValue = 0
      const maxValue = 30

      // 各セルにカラースケールを適用
      cells.forEach((cell) => {
        if (cell instanceof HTMLElement) {
          const value = this.calculator.parseNumericValue(cell.textContent || '')
          if (value !== null) {
            const color = this.calculator.calculateColor(value, minValue, maxValue, colorScheme)
            if (color !== 'transparent') {
              cell.style.backgroundColor = color
              // 文字の可読性を確保するため、背景が濃い場合は白文字にする
              if (value > (minValue + maxValue) / 2) {
                cell.style.color = 'white'
              }
            }
          }
        }
      })
    } catch (error) {
      console.error('カラースケール適用中にエラーが発生しました:', error)
      // エラーが発生しても既存機能に影響を与えない
    }
  }

  /**
   * 単一のテーブルからカラースケールを削除する
   */
  private removeColorScaleFromTable(table: HTMLTableElement): void {
    try {
      // 容積絶対湿度列からカラースケールを削除
      const columnClass = 'td-volumetric-humidity'
      const cells = table.querySelectorAll(`.${columnClass}`)

      cells.forEach((cell) => {
        if (cell instanceof HTMLElement) {
          cell.style.backgroundColor = ''
          cell.style.color = ''
        }
      })
    } catch (error) {
      console.error('カラースケール削除中にエラーが発生しました:', error)
      // エラーが発生しても既存機能に影響を与えない
    }
  }
}
