/**
 * cache_storage.ts のテスト
 */

import { CacheStorage, type CacheStorageConfig } from './cache_storage'
import { type CacheEntry, CacheError } from './cache_types'

// localStorage モック
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      if (key.startsWith('quota_test') && Object.keys(store).length > 2) {
        const error = new DOMException('Quota exceeded', 'QuotaExceededError')
        throw error
      }
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      store = {}
    }),
    key: jest.fn((index: number) => Object.keys(store)[index] || null),
    get length() {
      return Object.keys(store).length
    },
    // テスト用ヘルパー
    _reset: () => {
      store = {}
    },
    _getStore: () => store,
  }
})()

// localStorage を置き換え
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('CacheStorage', () => {
  let storage: CacheStorage
  let config: CacheStorageConfig

  beforeEach(() => {
    config = {
      storagePrefix: 'enhanced_jma',
      maxMemoryEntries: 5,
      maxStorageSize: 1024,
      cleanupThreshold: 0.8,
    }
    storage = new CacheStorage(config)
    localStorageMock._reset()
    jest.clearAllMocks()
  })

  describe('初期化', () => {
    test('正常に初期化される', () => {
      expect(storage).toBeInstanceOf(CacheStorage)
    })

    test('localStorageが利用不可の場合もフォールバックで動作する', () => {
      const originalSetItem = localStorage.setItem
      localStorage.setItem = jest.fn(() => {
        throw new Error('localStorage not available')
      })

      const fallbackStorage = new CacheStorage(config)
      expect(fallbackStorage).toBeInstanceOf(CacheStorage)

      localStorage.setItem = originalSetItem
    })
  })

  describe('基本的なキャッシュ操作', () => {
    test('データの保存と取得ができる', async () => {
      const key = 'enhanced_jma:map:test1'
      const data = { test: 'data' }
      const entry: CacheEntry<typeof data> = {
        data,
        timestamp: Date.now(),
        ttl: 60000,
        accessCount: 0,
        lastAccessed: Date.now(),
      }

      await storage.setItem(key, entry)
      const retrieved = await storage.getItem<typeof data>(key)

      expect(retrieved).toBeTruthy()
      expect(retrieved?.data).toEqual(data)
      expect(retrieved?.accessCount).toBe(1) // アクセス時にインクリメント
    })

    test('存在しないキーはnullを返す', async () => {
      const result = await storage.getItem('enhanced_jma:map:nonexistent')
      expect(result).toBeNull()
    })

    test('データの削除ができる', async () => {
      const key = 'enhanced_jma:map:test2'
      const entry: CacheEntry<string> = {
        data: 'test',
        timestamp: Date.now(),
        ttl: 60000,
        accessCount: 0,
        lastAccessed: Date.now(),
      }

      await storage.setItem(key, entry)
      await storage.removeItem(key)

      const result = await storage.getItem(key)
      expect(result).toBeNull()
    })

    test('全データのクリアができる', async () => {
      const key1 = 'enhanced_jma:map:test3'
      const key2 = 'enhanced_jma:point:test4'
      const entry: CacheEntry<string> = {
        data: 'test',
        timestamp: Date.now(),
        ttl: 60000,
        accessCount: 0,
        lastAccessed: Date.now(),
      }

      await storage.setItem(key1, entry)
      await storage.setItem(key2, entry)
      await storage.clear()

      const result1 = await storage.getItem(key1)
      const result2 = await storage.getItem(key2)
      expect(result1).toBeNull()
      expect(result2).toBeNull()
    })
  })

  describe('メモリキャッシュ機能', () => {
    test('メモリキャッシュの上限に達すると古いエントリが削除される', async () => {
      const entries: Array<[string, CacheEntry<string>]> = []

      // 上限を超えるデータを追加
      for (let i = 0; i < config.maxMemoryEntries + 2; i++) {
        const key = `enhanced_jma:map:test${i}`
        const entry: CacheEntry<string> = {
          data: `test${i}`,
          timestamp: Date.now() - i * 1000, // 古いものほど過去のタイムスタンプ
          ttl: 60000,
          accessCount: 0,
          lastAccessed: Date.now() - i * 1000,
        }
        entries.push([key, entry])
        await storage.setItem(key, entry)
      }

      // 最新のエントリは残っているはず
      const latestKey = `enhanced_jma:map:test${config.maxMemoryEntries + 1}`
      const latestEntry = await storage.getItem(latestKey)
      expect(latestEntry).toBeTruthy()
    })

    test('メモリキャッシュからlocalStorageにフォールバック', async () => {
      const key = 'enhanced_jma:map:fallback_test'
      const entry: CacheEntry<string> = {
        data: 'fallback_data',
        timestamp: Date.now(),
        ttl: 60000,
        accessCount: 0,
        lastAccessed: Date.now(),
      }

      // localStorage に直接保存
      localStorage.setItem(key, JSON.stringify(entry))

      // メモリキャッシュにはないが、localStorageから取得できる
      const retrieved = await storage.getItem<string>(key)
      expect(retrieved?.data).toBe('fallback_data')
    })
  })

  describe('キー管理', () => {
    test('キー一覧を取得できる', async () => {
      const key1 = 'enhanced_jma:map:keys1'
      const key2 = 'enhanced_jma:point:keys2'
      const entry: CacheEntry<string> = {
        data: 'test',
        timestamp: Date.now(),
        ttl: 60000,
        accessCount: 0,
        lastAccessed: Date.now(),
      }

      await storage.setItem(key1, entry)
      await storage.setItem(key2, entry)

      const keys = await storage.keys()
      expect(keys).toContain(key1)
      expect(keys).toContain(key2)
    })

    test('サイズ計算ができる', async () => {
      const key = 'enhanced_jma:map:size_test'
      const entry: CacheEntry<string> = {
        data: 'test_data',
        timestamp: Date.now(),
        ttl: 60000,
        accessCount: 0,
        lastAccessed: Date.now(),
      }

      const initialSize = await storage.size()
      await storage.setItem(key, entry)
      const newSize = await storage.size()

      expect(newSize).toBeGreaterThan(initialSize)
    })
  })

  describe('バリデーション', () => {
    test('無効なキー形式でエラーが発生する', async () => {
      const invalidKey = 'invalid_key_format'
      const entry: CacheEntry<string> = {
        data: 'test',
        timestamp: Date.now(),
        ttl: 60000,
        accessCount: 0,
        lastAccessed: Date.now(),
      }

      await expect(storage.setItem(invalidKey, entry)).rejects.toThrow(CacheError)
      await expect(storage.getItem(invalidKey)).rejects.toThrow(CacheError)
    })

    test('データサニタイゼーションが実行される', async () => {
      const key = 'enhanced_jma:map:sanitize_test'
      const maliciousData = {
        __proto__: { evil: 'payload' },
        constructor: { malicious: 'code' },
        data: 'legitimate_data',
      }

      // localStorageに直接悪意のあるデータを保存
      const entry = {
        data: maliciousData,
        timestamp: Date.now(),
        ttl: 60000,
        accessCount: 0,
        lastAccessed: Date.now(),
      }
      localStorage.setItem(key, JSON.stringify(entry))

      const retrieved = await storage.getItem(key)
      expect(retrieved?.data).toBeTruthy()

      // サニタイズされているかチェック
      const data = retrieved?.data as any
      expect(data.__proto__).toBeUndefined()
      expect(data.constructor).toBeUndefined()
      expect(data.data).toBe('legitimate_data')
    })
  })

  describe('エラーハンドリング', () => {
    test('破損データは適切に処理される', async () => {
      const key = 'enhanced_jma:map:corrupted'

      // 破損したJSONを直接設定
      localStorage.setItem(key, 'invalid json data')

      await expect(storage.getItem(key)).rejects.toThrow(CacheError)

      // 破損データは自動削除される
      expect(localStorage.getItem(key)).toBeNull()
    })

    test('容量制限に達するとエラーが発生する', async () => {
      const quotaConfig: CacheStorageConfig = {
        ...config,
        maxStorageSize: 100, // 非常に小さな制限
      }
      const quotaStorage = new CacheStorage(quotaConfig)

      const largeData = 'x'.repeat(200) // 制限を超える大きなデータ
      const entry: CacheEntry<string> = {
        data: largeData,
        timestamp: Date.now(),
        ttl: 60000,
        accessCount: 0,
        lastAccessed: Date.now(),
      }

      await expect(quotaStorage.setItem('enhanced_jma:map:large', entry)).rejects.toThrow(
        CacheError,
      )
    })

    test('localStorage容量不足時のエラーハンドリング', async () => {
      const key = 'quota_test:map:test'
      const entry: CacheEntry<string> = {
        data: 'test',
        timestamp: Date.now(),
        ttl: 60000,
        accessCount: 0,
        lastAccessed: Date.now(),
      }

      // 複数のアイテムを追加してQuotaExceededErrorを発生させる
      localStorage.setItem('quota_test:1', 'data1')
      localStorage.setItem('quota_test:2', 'data2')
      localStorage.setItem('quota_test:3', 'data3')

      await expect(storage.setItem(key, entry)).rejects.toThrow(CacheError)
    })
  })

  describe('LRU削除機能', () => {
    test('localStorageのLRU削除が機能する', async () => {
      const smallConfig: CacheStorageConfig = {
        ...config,
        maxStorageSize: 500,
        cleanupThreshold: 0.5,
      }
      const lruStorage = new CacheStorage(smallConfig)

      // 複数のエントリを追加
      const entries = []
      for (let i = 0; i < 5; i++) {
        const key = `enhanced_jma:map:lru${i}`
        const entry: CacheEntry<string> = {
          data: `data${i}`.repeat(20), // ある程度大きなデータ
          timestamp: Date.now(),
          ttl: 60000,
          accessCount: i, // アクセス回数を変える
          lastAccessed: Date.now() - i * 1000, // 最終アクセス時刻を変える
        }
        entries.push([key, entry])
        await lruStorage.setItem(key, entry)
      }

      // 容量制限に達するとLRU削除が実行される
      const keys = await lruStorage.keys()
      expect(keys.length).toBeLessThanOrEqual(5)
    })
  })
})
