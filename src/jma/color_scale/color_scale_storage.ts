/**
 * カラースケール設定の永続化管理クラス
 */

import type { ColorScaleConfig, ColorScaleGlobalConfig } from './color_scale_types'

export class ColorScaleStorage {
  private readonly STORAGE_KEY = 'jma-color-scale-config'

  /**
   * 設定をローカルストレージに保存する
   */
  saveConfig(config: ColorScaleGlobalConfig): void {
    try {
      const jsonString = JSON.stringify(config)
      localStorage.setItem(this.STORAGE_KEY, jsonString)
    } catch (error) {
      console.error('カラースケール設定の保存に失敗しました:', error)
    }
  }

  /**
   * 設定をローカルストレージから読み込む
   */
  loadConfig(): ColorScaleGlobalConfig {
    try {
      const jsonString = localStorage.getItem(this.STORAGE_KEY)
      if (jsonString) {
        const config = JSON.parse(jsonString) as ColorScaleGlobalConfig
        // 設定の妥当性を検証
        if (this.validateConfig(config)) {
          return config
        }
      }
    } catch (error) {
      console.error('カラースケール設定の読み込みに失敗しました:', error)
    }

    // 読み込みに失敗した場合はデフォルト設定を返す
    return this.getDefaultConfig()
  }

  /**
   * デフォルト設定を取得する
   */
  getDefaultConfig(): ColorScaleGlobalConfig {
    return {
      enabled: true,
      columns: {
        'td-volumetric-humidity': {
          enabled: true,
          colorScheme: {
            type: 'gradient',
            colors: ['#ffffff', '#0066cc'],
          },
          minValue: 0,
          maxValue: 30,
        },
        'td-dew-point': {
          enabled: true,
          colorScheme: {
            type: 'gradient',
            colors: ['#0066cc', '#ff0000'],
          },
          minValue: -20,
          maxValue: 30,
        },
        'td-temperature-humidity-index': {
          enabled: true,
          colorScheme: {
            type: 'gradient',
            colors: ['#00ff00', '#ffff00', '#ff0000'],
          },
          minValue: 50,
          maxValue: 85,
        },
      },
    }
  }

  /**
   * 設定の妥当性を検証する
   */
  private validateConfig(config: any): config is ColorScaleGlobalConfig {
    if (!config || typeof config !== 'object') {
      return false
    }

    if (typeof config.enabled !== 'boolean') {
      return false
    }

    if (!config.columns || typeof config.columns !== 'object') {
      return false
    }

    // 各列の設定を検証
    for (const [_columnClass, columnConfig] of Object.entries(config.columns)) {
      if (!this.validateColumnConfig(columnConfig)) {
        return false
      }
    }

    return true
  }

  /**
   * 列設定の妥当性を検証する
   */
  private validateColumnConfig(config: any): config is ColorScaleConfig {
    if (!config || typeof config !== 'object') {
      return false
    }

    if (typeof config.enabled !== 'boolean') {
      return false
    }

    if (!config.colorScheme || typeof config.colorScheme !== 'object') {
      return false
    }

    if (!['gradient', 'discrete'].includes(config.colorScheme.type)) {
      return false
    }

    if (!Array.isArray(config.colorScheme.colors) || config.colorScheme.colors.length === 0) {
      return false
    }

    if (typeof config.minValue !== 'number' || typeof config.maxValue !== 'number') {
      return false
    }

    if (config.minValue >= config.maxValue) {
      return false
    }

    return true
  }
}
