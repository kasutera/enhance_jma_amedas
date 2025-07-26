/**
 * cache_manager.ts のテスト
 */

import { CacheManager, globalCacheManager } from './cache_manager'
import { CacheStorage } from './cache_storage'
import { CACHE_DISABLED, type CacheConfig } from './cache_types'

// CacheStorage をモック
jest.mock('./cache_storage')
const MockedCacheStorage = CacheStorage as jest.MockedClass<typeof CacheStorage>

describe('CacheManager', () => {
  let cacheManager: CacheManager
  let mockStorage: jest.Mocked<CacheStorage>

  beforeEach(() => {
    jest.clearAllMocks()

    // CacheStorage のモックメソッドを設定
    mockStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
      keys: jest.fn(),
      size: jest.fn(),
    } as any

    MockedCacheStorage.mockImplementation(() => mockStorage)

    cacheManager = new CacheManager()
  })

  describe('初期化', () => {
    test('デフォルト設定で初期化される', () => {
      expect(cacheManager).toBeInstanceOf(CacheManager)
      expect(MockedCacheStorage).toHaveBeenCalledWith({
        storagePrefix: 'enhanced_jma',
        maxMemoryEntries: 100,
        maxStorageSize: 5 * 1024 * 1024,
        cleanupThreshold: 0.8,
      })
    })

    test('カスタム設定で初期化される', () => {
      const customConfig: Partial<CacheConfig> = {
        storagePrefix: 'custom_prefix',
        maxMemoryEntries: 50,
        defaultTtl: {
          map: 30 * 60 * 1000,
          pointCurrent: 0,
          pointPast: 24 * 60 * 60 * 1000,
        },
      }

      const customManager = new CacheManager(customConfig)
      expect(customManager).toBeInstanceOf(CacheManager)
    })
  })

  describe('キー生成', () => {
    test('マップデータのURLからキーを生成', async () => {
      const url = 'https://www.jma.go.jp/bosai/amedas/data/map/20240101120000.json'

      mockStorage.getItem.mockResolvedValue({
        data: { test: 'data' },
        timestamp: Date.now(),
        ttl: 60000,
        accessCount: 1,
        lastAccessed: Date.now(),
      })

      await cacheManager.getByUrl(url)

      expect(mockStorage.getItem).toHaveBeenCalledWith('enhanced_jma:map:20240101120000')
    })

    test('ポイントデータのURLからキーを生成', async () => {
      const url = 'https://www.jma.go.jp/bosai/amedas/data/point/s47412/20240101_12.json'

      mockStorage.getItem.mockResolvedValue(null)

      await cacheManager.getByUrl(url)

      expect(mockStorage.getItem).toHaveBeenCalledWith('enhanced_jma:point:s47412:20240101_12')
    })

    test('サポートされていないURL形式でエラー', async () => {
      const invalidUrl = 'https://example.com/invalid/path.json'

      await expect(cacheManager.getByUrl(invalidUrl)).rejects.toThrow('Unsupported URL format')
    })
  })

  describe('TTL設定', () => {
    test('マップデータは1時間のTTL', async () => {
      const url = 'https://www.jma.go.jp/bosai/amedas/data/map/20240101120000.json'
      const data = { temperature: 25 }

      await cacheManager.setByUrl(url, data)

      expect(mockStorage.setItem).toHaveBeenCalledTimes(1)
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'enhanced_jma:map:20240101120000',
        expect.objectContaining({
          data,
          ttl: 60 * 60 * 1000, // 1時間
          timestamp: expect.any(Number),
          accessCount: 0,
          lastAccessed: expect.any(Number),
        }),
      )
    })

    test('過去のポイントデータは3日のTTL', async () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1) // 1日前
      const formatDate = pastDate.toISOString().slice(0, 10).replace(/-/g, '')
      const url = `https://www.jma.go.jp/bosai/amedas/data/point/s47412/${formatDate}_06.json`
      const data = { temperature: 20 }

      await cacheManager.setByUrl(url, data)

      expect(mockStorage.setItem).toHaveBeenCalledTimes(1)
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        `enhanced_jma:point:s47412:${formatDate}_06`,
        expect.objectContaining({
          data,
          ttl: 3 * 24 * 60 * 60 * 1000, // 3日
          timestamp: expect.any(Number),
          accessCount: 0,
          lastAccessed: expect.any(Number),
        }),
      )
    })

    test('現在のポイントデータはキャッシュしない（常に最新を取得）', async () => {
      const now = new Date()
      const currentHour = Math.floor(now.getHours() / 3) * 3
      const formatDate = now.toISOString().slice(0, 10).replace(/-/g, '')
      const url = `https://www.jma.go.jp/bosai/amedas/data/point/s47412/${formatDate}_${currentHour.toString().padStart(2, '0')}.json`
      const data = { temperature: 15 }

      await cacheManager.setByUrl(url, data)

      // CACHE_DISABLED (-1) の場合、setItemは呼ばれない
      expect(mockStorage.setItem).not.toHaveBeenCalled()
    })
  })

  describe('有効期限チェック', () => {
    test('有効期限内のデータは取得できる', async () => {
      const key = 'enhanced_jma:map:test'
      const validEntry = {
        data: { test: 'valid' },
        timestamp: Date.now() - 30 * 60 * 1000, // 30分前
        ttl: 60 * 60 * 1000, // 1時間
        accessCount: 1,
        lastAccessed: Date.now(),
      }

      mockStorage.getItem.mockResolvedValue(validEntry)

      const result = await cacheManager.get(key)
      expect(result).toEqual({ test: 'valid' })
    })

    test('有効期限切れのデータは削除される', async () => {
      const key = 'enhanced_jma:map:expired'
      const expiredEntry = {
        data: { test: 'expired' },
        timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2時間前
        ttl: 60 * 60 * 1000, // 1時間
        accessCount: 1,
        lastAccessed: Date.now(),
      }

      mockStorage.getItem.mockResolvedValue(expiredEntry)

      const result = await cacheManager.get(key)
      expect(result).toBeUndefined()
      expect(mockStorage.removeItem).toHaveBeenCalledWith(key)
    })

    test('TTL=0のデータは永続的に有効', async () => {
      const key = 'enhanced_jma:point:permanent'
      const permanentEntry = {
        data: { test: 'permanent' },
        timestamp: Date.now() - 24 * 60 * 60 * 1000, // 24時間前
        ttl: 0, // 永続
        accessCount: 1,
        lastAccessed: Date.now(),
      }

      mockStorage.getItem.mockResolvedValue(permanentEntry)

      const result = await cacheManager.get(key)
      expect(result).toEqual({ test: 'permanent' })
    })

    test('CACHE_DISABLEDでは保存されない', async () => {
      const key = 'enhanced_jma:map:test_disabled'
      const data = { test: 'not cached' }

      await cacheManager.set(key, data, CACHE_DISABLED)

      expect(mockStorage.setItem).not.toHaveBeenCalled()
    })
  })

  describe('基本操作', () => {
    test('データの保存と取得', async () => {
      const key = 'enhanced_jma:map:basic_test'
      const data = { temperature: 25.5 }

      mockStorage.getItem.mockResolvedValue({
        data,
        timestamp: Date.now(),
        ttl: 60000,
        accessCount: 1,
        lastAccessed: Date.now(),
      })

      await cacheManager.set(key, data)
      const result = await cacheManager.get(key)

      expect(mockStorage.setItem).toHaveBeenCalledTimes(1)
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        key,
        expect.objectContaining({
          data,
          timestamp: expect.any(Number),
          accessCount: 0,
          lastAccessed: expect.any(Number),
        }),
      )
      expect(result).toEqual(data)
    })

    test('存在確認', async () => {
      const key = 'enhanced_jma:map:exists_test'

      mockStorage.getItem.mockResolvedValue({
        data: { test: 'data' },
        timestamp: Date.now(),
        ttl: 60000,
        accessCount: 1,
        lastAccessed: Date.now(),
      })

      const exists = await cacheManager.has(key)
      expect(exists).toBe(true)

      mockStorage.getItem.mockResolvedValue(null)
      const notExists = await cacheManager.has(key)
      expect(notExists).toBe(false)
    })

    test('データ削除', async () => {
      const key = 'enhanced_jma:map:delete_test'

      await cacheManager.delete(key)
      expect(mockStorage.removeItem).toHaveBeenCalledWith(key)
    })

    test('全体クリア', async () => {
      await cacheManager.clear()
      expect(mockStorage.clear).toHaveBeenCalled()
    })
  })

  describe('URL便利メソッド', () => {
    test('URLベースでの保存', async () => {
      const url = 'https://www.jma.go.jp/bosai/amedas/data/map/20240101120000.json'
      const data = { weather: 'sunny' }

      await cacheManager.setByUrl(url, data)

      expect(mockStorage.setItem).toHaveBeenCalledTimes(1)
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'enhanced_jma:map:20240101120000',
        expect.objectContaining({
          data,
          timestamp: expect.any(Number),
          accessCount: 0,
          lastAccessed: expect.any(Number),
        }),
      )
    })

    test('URLベースでの取得', async () => {
      const url = 'https://www.jma.go.jp/bosai/amedas/data/point/s47412/20240101_00.json'
      const expectedData = { temperature: 10 }

      mockStorage.getItem.mockResolvedValue({
        data: expectedData,
        timestamp: Date.now(),
        ttl: 60000,
        accessCount: 1,
        lastAccessed: Date.now(),
      })

      const result = await cacheManager.getByUrl(url)
      expect(result).toEqual(expectedData)
    })

    test('URLベースでの存在確認', async () => {
      const url = 'https://www.jma.go.jp/bosai/amedas/data/map/20240101120000.json'

      mockStorage.getItem.mockResolvedValue({
        data: { test: 'data' },
        timestamp: Date.now(),
        ttl: 60000,
        accessCount: 1,
        lastAccessed: Date.now(),
      })

      const exists = await cacheManager.hasByUrl(url)
      expect(exists).toBe(true)
    })
  })

  describe('クリーンアップ機能', () => {
    test('期限切れエントリのクリーンアップ', async () => {
      const keys = [
        'enhanced_jma:map:valid1',
        'enhanced_jma:map:expired1',
        'enhanced_jma:point:valid2',
        'enhanced_jma:map:expired2',
      ]

      mockStorage.keys.mockResolvedValue(keys)

      // 有効なエントリと期限切れエントリを混在させる
      mockStorage.getItem
        .mockResolvedValueOnce({
          data: { test: 'valid1' },
          timestamp: Date.now() - 30 * 60 * 1000, // 30分前
          ttl: 60 * 60 * 1000, // 1時間TTL
          accessCount: 1,
          lastAccessed: Date.now(),
        })
        .mockResolvedValueOnce({
          data: { test: 'expired1' },
          timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2時間前
          ttl: 60 * 60 * 1000, // 1時間TTL（期限切れ）
          accessCount: 1,
          lastAccessed: Date.now(),
        })
        .mockResolvedValueOnce({
          data: { test: 'valid2' },
          timestamp: Date.now() - 30 * 60 * 1000, // 30分前
          ttl: 60 * 60 * 1000, // 1時間TTL
          accessCount: 1,
          lastAccessed: Date.now(),
        })
        .mockResolvedValueOnce({
          data: { test: 'expired2' },
          timestamp: Date.now() - 3 * 60 * 60 * 1000, // 3時間前
          ttl: 60 * 60 * 1000, // 1時間TTL（期限切れ）
          accessCount: 1,
          lastAccessed: Date.now(),
        })

      await cacheManager.cleanup()

      // 期限切れエントリが削除されることを確認
      expect(mockStorage.removeItem).toHaveBeenCalledWith('enhanced_jma:map:expired1')
      expect(mockStorage.removeItem).toHaveBeenCalledWith('enhanced_jma:map:expired2')
      expect(mockStorage.removeItem).toHaveBeenCalledTimes(2)
    })

    test('破損データも削除される', async () => {
      const keys = ['enhanced_jma:map:corrupted']

      mockStorage.keys.mockResolvedValue(keys)
      mockStorage.getItem.mockRejectedValue(new Error('Data corrupted'))

      await cacheManager.cleanup()

      expect(mockStorage.removeItem).toHaveBeenCalledWith('enhanced_jma:map:corrupted')
    })
  })

  describe('エラーハンドリング', () => {
    test('取得エラーは適切に処理される', async () => {
      const key = 'enhanced_jma:map:error_test'

      mockStorage.getItem.mockRejectedValue(new Error('Storage error'))

      const result = await cacheManager.get(key)
      expect(result).toBeUndefined()
    })

    test('保存エラーは適切に処理される', async () => {
      const key = 'enhanced_jma:map:save_error'
      const data = { test: 'data' }

      mockStorage.setItem.mockRejectedValue(new Error('Storage full'))

      // エラーが発生しても例外は投げられない
      await expect(cacheManager.set(key, data)).resolves.not.toThrow()
    })
  })

  describe('時刻スロット解析', () => {
    test('有効な3時間スロットが解析される', async () => {
      const validSlotHours = [0, 3, 6, 9, 12, 15, 18, 21]

      for (const hour of validSlotHours) {
        const url = `https://www.jma.go.jp/bosai/amedas/data/point/s47412/20240101_${hour.toString().padStart(2, '0')}.json`
        const data = { hour: hour }

        await cacheManager.setByUrl(url, data)

        expect(mockStorage.setItem).toHaveBeenCalledWith(
          `enhanced_jma:point:s47412:20240101_${hour.toString().padStart(2, '0')}`,
          expect.objectContaining({
            data,
            timestamp: expect.any(Number),
            accessCount: 0,
            lastAccessed: expect.any(Number),
          }),
        )
      }
    })
  })

  describe('グローバルインスタンス', () => {
    test('グローバルキャッシュマネージャーが利用可能', () => {
      expect(globalCacheManager).toBeInstanceOf(CacheManager)
    })
  })
})
