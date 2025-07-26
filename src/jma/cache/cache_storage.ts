/**
 * localStorage永続化レイヤー
 * メモリキャッシュとlocalStorage永続化を組み合わせた2層キャッシュストレージ
 */

import type { CacheEntry, ICacheStorage } from './cache_types'
import { CacheError as CacheErrorImpl, CacheErrorType as ErrorType } from './cache_types'

/**
 * キャッシュストレージの設定
 */
export interface CacheStorageConfig {
  /** localStorage接頭辞 */
  storagePrefix: string
  /** メモリキャッシュの最大エントリ数 */
  maxMemoryEntries: number
  /** localStorage の最大サイズ（バイト） */
  maxStorageSize: number
  /** LRU削除を実行する閾値（全体サイズの割合） */
  cleanupThreshold: number
}

/**
 * 2層キャッシュストレージ実装
 * - 第1層: メモリキャッシュ（高速アクセス）
 * - 第2層: localStorage（永続化）
 */
export class CacheStorage implements ICacheStorage {
  private readonly memoryCache = new Map<string, CacheEntry<unknown>>()
  private readonly config: CacheStorageConfig
  private storageAvailable: boolean
  private currentStorageSize = 0

  constructor(config: CacheStorageConfig) {
    this.config = config
    this.storageAvailable = this.checkStorageAvailable()
    if (this.storageAvailable) {
      this.calculateCurrentStorageSize()
    }
  }

  /**
   * localStorage の利用可能性をチェック
   */
  private checkStorageAvailable(): boolean {
    try {
      const testKey = `${this.config.storagePrefix}:test`
      localStorage.setItem(testKey, 'test')
      localStorage.removeItem(testKey)
      return true
    } catch {
      console.warn('localStorage is not available, falling back to memory-only cache')
      return false
    }
  }

  /**
   * 現在のlocalStorageサイズを計算
   */
  private calculateCurrentStorageSize(): void {
    let totalSize = 0
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith(this.config.storagePrefix)) {
          const value = localStorage.getItem(key)
          if (value) {
            totalSize += key.length + value.length
          }
        }
      }
      this.currentStorageSize = totalSize * 2 // UTF-16なので2倍
    } catch (error) {
      console.warn('Failed to calculate storage size:', error)
      this.currentStorageSize = 0
    }
  }

  /**
   * キャッシュキーが有効かチェック
   */
  private validateKey(key: string): void {
    const validKeyPattern = /^enhanced_jma:(map|point):/
    if (!validKeyPattern.test(key)) {
      throw new CacheErrorImpl(ErrorType.INVALID_KEY, `Invalid cache key format: ${key}`)
    }
  }

  /**
   * データのサニタイゼーション
   */
  private sanitizeData<T>(data: unknown): T {
    if (data === null || data === undefined) {
      throw new CacheErrorImpl(ErrorType.DATA_CORRUPTED, 'Cache data is null or undefined')
    }

    // プロトタイプ汚染対策
    if (typeof data === 'object') {
      const sanitized = Object.create(null)
      for (const [key, value] of Object.entries(data)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          continue
        }
        sanitized[key] = value
      }
      return sanitized as T
    }

    return data as T
  }

  /**
   * JSON解析の安全化（プロトタイプ汚染対策）
   */
  private safeJsonParse(text: string): unknown {
    return JSON.parse(text, (key, value) => {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return undefined
      }
      return value
    })
  }

  /**
   * メモリキャッシュのLRU削除
   */
  private evictFromMemory(): void {
    if (this.memoryCache.size <= this.config.maxMemoryEntries) {
      return
    }

    const entries = Array.from(this.memoryCache.entries())
    entries.sort(([, a], [, b]) => {
      // アクセス頻度と最終アクセス時刻を考慮したLRU
      const scoreA = a.accessCount * 0.3 + a.lastAccessed * 0.7
      const scoreB = b.accessCount * 0.3 + b.lastAccessed * 0.7
      return scoreA - scoreB
    })

    const evictCount = Math.ceil(this.config.maxMemoryEntries * 0.1) // 10%削除
    for (let i = 0; i < evictCount && i < entries.length; i++) {
      this.memoryCache.delete(entries[i][0])
    }
  }

  /**
   * localStorageのLRU削除
   */
  private async evictFromStorage(): Promise<void> {
    if (!this.storageAvailable) return

    const keys = await this.keys()
    const entries: Array<[string, CacheEntry<unknown>]> = []

    for (const key of keys) {
      try {
        const entry = await this.getFromStorage<unknown>(key)
        if (entry) {
          entries.push([key, entry])
        }
      } catch {
        // 破損データは削除対象に含めない
      }
    }

    entries.sort(([, a], [, b]) => {
      const scoreA = a.accessCount * 0.3 + a.lastAccessed * 0.7
      const scoreB = b.accessCount * 0.3 + b.lastAccessed * 0.7
      return scoreA - scoreB
    })

    const targetSize = this.config.maxStorageSize * this.config.cleanupThreshold
    let freedSize = 0

    for (const [key] of entries) {
      if (this.currentStorageSize - freedSize <= targetSize) break

      try {
        const item = localStorage.getItem(key)
        if (item) {
          const itemSize = (key.length + item.length) * 2
          localStorage.removeItem(key)
          freedSize += itemSize
        }
      } catch (error) {
        console.warn(`Failed to remove cache item ${key}:`, error)
      }
    }

    this.currentStorageSize -= freedSize
  }

  /**
   * localStorageから直接読み込み
   */
  private async getFromStorage<T>(key: string): Promise<CacheEntry<T> | null> {
    if (!this.storageAvailable) return null

    try {
      const item = localStorage.getItem(key)
      if (!item) return null

      const parsed = this.safeJsonParse(item) as CacheEntry<T>
      if (!parsed || typeof parsed !== 'object') {
        throw new CacheErrorImpl(
          ErrorType.DATA_CORRUPTED,
          `Invalid cache entry structure for key: ${key}`,
        )
      }

      // 必要なプロパティの存在チェック
      if (typeof parsed.timestamp !== 'number' || typeof parsed.ttl !== 'number') {
        throw new CacheErrorImpl(
          ErrorType.DATA_CORRUPTED,
          `Invalid cache entry metadata for key: ${key}`,
        )
      }

      return {
        ...parsed,
        data: this.sanitizeData<T>(parsed.data),
      }
    } catch (error) {
      if (error instanceof CacheErrorImpl) throw error

      console.warn(`Failed to parse cache entry for key ${key}:`, error)
      // 破損データを削除
      try {
        localStorage.removeItem(key)
      } catch {}

      throw new CacheErrorImpl(
        ErrorType.DATA_CORRUPTED,
        `Cache data corrupted for key: ${key}`,
        error as Error,
      )
    }
  }

  /**
   * localStorageに直接保存
   */
  private async setToStorage<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    if (!this.storageAvailable) return

    try {
      const serialized = JSON.stringify(entry)
      const itemSize = (key.length + serialized.length) * 2

      // 容量チェック
      if (this.currentStorageSize + itemSize > this.config.maxStorageSize) {
        await this.evictFromStorage()
      }

      // 再度容量チェック（削除後でも足りない場合）
      if (this.currentStorageSize + itemSize > this.config.maxStorageSize) {
        throw new CacheErrorImpl(
          ErrorType.QUOTA_EXCEEDED,
          'localStorage quota exceeded after cleanup',
        )
      }

      const existingItem = localStorage.getItem(key)
      const existingSize = existingItem ? (key.length + existingItem.length) * 2 : 0

      localStorage.setItem(key, serialized)
      this.currentStorageSize += itemSize - existingSize
    } catch (error) {
      if (error instanceof CacheErrorImpl) throw error

      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        throw new CacheErrorImpl(ErrorType.QUOTA_EXCEEDED, 'localStorage quota exceeded', error)
      }

      throw new CacheErrorImpl(
        ErrorType.STORAGE_UNAVAILABLE,
        'Failed to write to localStorage',
        error as Error,
      )
    }
  }

  // ICacheStorage インターフェース実装

  async getItem<T>(key: string): Promise<CacheEntry<T> | null> {
    this.validateKey(key)

    // メモリキャッシュから先にチェック
    const memoryEntry = this.memoryCache.get(key) as CacheEntry<T> | undefined
    if (memoryEntry) {
      memoryEntry.accessCount++
      memoryEntry.lastAccessed = Date.now()
      return memoryEntry
    }

    // localStorageからチェック
    const storageEntry = await this.getFromStorage<T>(key)
    if (storageEntry) {
      storageEntry.accessCount++
      storageEntry.lastAccessed = Date.now()

      // メモリキャッシュにも保存
      this.memoryCache.set(key, storageEntry as CacheEntry<unknown>)
      this.evictFromMemory()

      return storageEntry
    }

    return null
  }

  async setItem<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    this.validateKey(key)

    const now = Date.now()
    const cacheEntry: CacheEntry<T> = {
      ...entry,
      lastAccessed: now,
      accessCount: entry.accessCount || 0,
    }

    // メモリキャッシュに保存
    this.memoryCache.set(key, cacheEntry as CacheEntry<unknown>)
    this.evictFromMemory()

    // localStorageに保存
    await this.setToStorage(key, cacheEntry)
  }

  async removeItem(key: string): Promise<void> {
    this.validateKey(key)

    // メモリキャッシュから削除
    this.memoryCache.delete(key)

    // localStorageから削除
    if (this.storageAvailable) {
      try {
        const existingItem = localStorage.getItem(key)
        if (existingItem) {
          const itemSize = (key.length + existingItem.length) * 2
          localStorage.removeItem(key)
          this.currentStorageSize -= itemSize
        }
      } catch (error) {
        console.warn(`Failed to remove item ${key} from localStorage:`, error)
      }
    }
  }

  async clear(): Promise<void> {
    // メモリキャッシュをクリア
    this.memoryCache.clear()

    // localStorageから関連キーを削除
    if (this.storageAvailable) {
      try {
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key?.startsWith(this.config.storagePrefix)) {
            keysToRemove.push(key)
          }
        }

        for (const key of keysToRemove) {
          localStorage.removeItem(key)
        }

        this.currentStorageSize = 0
      } catch (error) {
        console.warn('Failed to clear cache from localStorage:', error)
      }
    }
  }

  async keys(): Promise<string[]> {
    const allKeys = new Set<string>()

    // メモリキャッシュのキーを追加
    for (const key of this.memoryCache.keys()) {
      allKeys.add(key)
    }

    // localStorageのキーを追加
    if (this.storageAvailable) {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key?.startsWith(this.config.storagePrefix)) {
            allKeys.add(key)
          }
        }
      } catch (error) {
        console.warn('Failed to get keys from localStorage:', error)
      }
    }

    return Array.from(allKeys)
  }

  async size(): Promise<number> {
    let memorySize = 0
    for (const [key, entry] of this.memoryCache) {
      try {
        memorySize += key.length * 2 + JSON.stringify(entry).length * 2
      } catch {
        // JSON化できない場合はサイズ計算をスキップ
      }
    }

    return memorySize + this.currentStorageSize
  }
}
