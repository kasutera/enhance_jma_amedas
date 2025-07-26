/**
 * 統一キャッシュマネージャー
 * JMA Amedas データの効率的なキャッシュ管理を提供
 */

import { CacheStorage, type CacheStorageConfig } from './cache_storage'
import type { CacheConfig, CacheStats, CacheType, ICacheManager, TimeSlotInfo } from './cache_types'

/**
 * デフォルトキャッシュ設定
 */
const DEFAULT_CONFIG: CacheConfig = {
  storagePrefix: 'enhanced_jma',
  maxMemoryEntries: 100,
  maxStorageSize: 5 * 1024 * 1024, // 5MB
  defaultTtl: {
    map: 60 * 60 * 1000, // 1時間
    pointCurrent: 0, // 常に最新を取得
    pointPast: 3 * 24 * 60 * 60 * 1000, // 3日
  },
}

/**
 * 統一キャッシュマネージャー実装
 */
export class CacheManager implements ICacheManager {
  private readonly storage: CacheStorage
  private readonly config: CacheConfig
  private stats = {
    totalRequests: 0,
    cacheHits: 0,
  }

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }

    const storageConfig: CacheStorageConfig = {
      storagePrefix: this.config.storagePrefix,
      maxMemoryEntries: this.config.maxMemoryEntries,
      maxStorageSize: this.config.maxStorageSize,
      cleanupThreshold: 0.8, // 80%に達したらクリーンアップ
    }

    this.storage = new CacheStorage(storageConfig)
  }

  /**
   * URLからキャッシュキーを生成
   */
  private generateCacheKey(url: string): string {
    if (url.includes('/amedas/data/map/')) {
      const match = url.match(/\/map\/(\d{14})\.json$/)
      return match
        ? `${this.config.storagePrefix}:map:${match[1]}`
        : `${this.config.storagePrefix}:map:${url}`
    }

    if (url.includes('/amedas/data/point/')) {
      const match = url.match(/\/point\/([^/]+)\/(\d{8}_\d{2})\.json$/)
      return match
        ? `${this.config.storagePrefix}:point:${match[1]}:${match[2]}`
        : `${this.config.storagePrefix}:point:${url}`
    }

    throw new Error(`Unsupported URL format: ${url}`)
  }

  /**
   * キャッシュキーの種別を判定
   */
  private getCacheType(key: string): CacheType {
    if (key.includes(':map:')) return 'map'
    if (key.includes(':point:')) return 'point'
    throw new Error(`Unknown cache type for key: ${key}`)
  }

  /**
   * 時系列データの3時間スロット情報を解析
   */
  private parseTimeSlot(url: string): TimeSlotInfo | null {
    const match = url.match(/\/point\/[^/]+\/(\d{4})(\d{2})(\d{2})_(\d{2})\.json$/)
    if (!match) return null

    const [, year, month, day, hour] = match
    const slotHour = Number.parseInt(hour, 10)
    const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))

    const slotStart = new Date(date)
    slotStart.setHours(slotHour, 0, 0, 0)

    const slotEnd = new Date(slotStart)
    slotEnd.setHours(slotHour + 3, 0, 0, 0)

    const now = new Date()
    const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const currentSlotHour = Math.floor(now.getHours() / 3) * 3

    const isCurrent = date.getTime() === currentDate.getTime() && slotHour === currentSlotHour

    return {
      slotStart,
      slotEnd,
      isCurrent,
      slotHour,
    }
  }

  /**
   * URLに基づいて適切なTTLを決定
   */
  private determineTtl(url: string): number {
    const cacheType = this.getCacheType(this.generateCacheKey(url))

    switch (cacheType) {
      case 'map':
        return this.config.defaultTtl.map

      case 'point': {
        const slotInfo = this.parseTimeSlot(url)
        if (!slotInfo) return this.config.defaultTtl.pointCurrent

        return slotInfo.isCurrent
          ? this.config.defaultTtl.pointCurrent
          : this.config.defaultTtl.pointPast
      }

      default:
        return this.config.defaultTtl.map
    }
  }

  /**
   * キャッシュエントリが有効期限内かチェック
   */
  private isEntryValid<T>(entry: { data: T; timestamp: number; ttl: number }): boolean {
    if (entry.ttl === 0) return true // 永続キャッシュ
    return Date.now() - entry.timestamp < entry.ttl
  }

  // ICacheManager インターフェース実装

  async get<T>(key: string): Promise<T | undefined> {
    this.stats.totalRequests++

    try {
      const entry = await this.storage.getItem<T>(key)
      if (!entry) return undefined

      if (!this.isEntryValid(entry)) {
        await this.storage.removeItem(key)
        return undefined
      }

      this.stats.cacheHits++
      return entry.data
    } catch (error) {
      console.warn(`Cache get failed for key ${key}:`, error)
      return undefined
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const effectiveTtl = ttl ?? this.determineTtl(key)
      const entry = {
        data: value,
        timestamp: Date.now(),
        ttl: effectiveTtl,
        accessCount: 0,
        lastAccessed: Date.now(),
      }

      await this.storage.setItem(key, entry)
    } catch (error) {
      console.warn(`Cache set failed for key ${key}:`, error)
      // キャッシュ設定に失敗してもアプリケーションは継続
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const entry = await this.storage.getItem(key)
      return entry !== null && this.isEntryValid(entry)
    } catch {
      return false
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.storage.removeItem(key)
    } catch (error) {
      console.warn(`Cache delete failed for key ${key}:`, error)
    }
  }

  async clear(): Promise<void> {
    try {
      await this.storage.clear()
      this.stats.totalRequests = 0
      this.stats.cacheHits = 0
    } catch (error) {
      console.warn('Cache clear failed:', error)
    }
  }

  async cleanup(): Promise<void> {
    try {
      const keys = await this.storage.keys()
      const expiredKeys: string[] = []

      for (const key of keys) {
        try {
          const entry = await this.storage.getItem(key)
          if (entry && !this.isEntryValid(entry)) {
            expiredKeys.push(key)
          }
        } catch {
          // 破損データも削除対象
          expiredKeys.push(key)
        }
      }

      for (const key of expiredKeys) {
        await this.storage.removeItem(key)
      }

      console.log(`Cache cleanup completed: removed ${expiredKeys.length} expired entries`)
    } catch (error) {
      console.warn('Cache cleanup failed:', error)
    }
  }

  async getStats(): Promise<CacheStats> {
    try {
      const keys = await this.storage.keys()
      const totalSize = await this.storage.size()

      let memoryEntries = 0
      let storageEntries = 0

      // 簡易的な分別（正確にはストレージレイヤーから情報取得が必要）
      for (const key of keys) {
        if (key.startsWith(this.config.storagePrefix)) {
          storageEntries++
        }
      }
      memoryEntries = keys.length - storageEntries

      const hitRate =
        this.stats.totalRequests > 0 ? this.stats.cacheHits / this.stats.totalRequests : 0

      return {
        memoryEntries,
        storageEntries,
        totalSize,
        hitRate,
        totalRequests: this.stats.totalRequests,
        cacheHits: this.stats.cacheHits,
      }
    } catch (error) {
      console.warn('Failed to get cache stats:', error)
      return {
        memoryEntries: 0,
        storageEntries: 0,
        totalSize: 0,
        hitRate: 0,
        totalRequests: this.stats.totalRequests,
        cacheHits: this.stats.cacheHits,
      }
    }
  }

  // JMA Amedas 専用ユーティリティメソッド

  /**
   * URLベースでキャッシュからデータを取得
   */
  async getByUrl<T>(url: string): Promise<T | undefined> {
    const key = this.generateCacheKey(url)
    return this.get<T>(key)
  }

  /**
   * URLベースでキャッシュにデータを保存
   */
  async setByUrl<T>(url: string, value: T): Promise<void> {
    const key = this.generateCacheKey(url)
    await this.set(key, value)
  }

  /**
   * URLベースでキャッシュの存在確認
   */
  async hasByUrl(url: string): Promise<boolean> {
    const key = this.generateCacheKey(url)
    return this.has(key)
  }

  /**
   * 特定の観測所の時系列データをまとめて削除
   */
  async clearPointData(stationCode: string): Promise<void> {
    try {
      const keys = await this.storage.keys()
      const pointKeys = keys.filter((key) => key.includes(`:point:${stationCode}:`))

      for (const key of pointKeys) {
        await this.storage.removeItem(key)
      }

      console.log(`Cleared ${pointKeys.length} cache entries for station ${stationCode}`)
    } catch (error) {
      console.warn(`Failed to clear point data for station ${stationCode}:`, error)
    }
  }

  /**
   * 指定日より古いキャッシュを削除
   */
  async clearOlderThan(date: Date): Promise<void> {
    try {
      const keys = await this.storage.keys()
      const expiredKeys: string[] = []
      const targetTime = date.getTime()

      for (const key of keys) {
        try {
          const entry = await this.storage.getItem(key)
          if (entry && entry.timestamp < targetTime) {
            expiredKeys.push(key)
          }
        } catch {
          // 破損データも削除
          expiredKeys.push(key)
        }
      }

      for (const key of expiredKeys) {
        await this.storage.removeItem(key)
      }

      console.log(`Cleared ${expiredKeys.length} cache entries older than ${date.toISOString()}`)
    } catch (error) {
      console.warn('Failed to clear old cache entries:', error)
    }
  }
}

/**
 * グローバルキャッシュマネージャーインスタンス
 */
export const globalCacheManager = new CacheManager()
