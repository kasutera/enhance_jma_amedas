/**
 * cache_types.ts のテスト
 */

import {
  CACHE_DISABLED,
  type CacheEntry,
  CacheError,
  CacheErrorType,
  type CacheKey,
  type TimeSlotInfo,
} from './cache_types'

describe('CacheEntry', () => {
  test('CacheEntryの型定義が正しく使用できる', () => {
    const entry: CacheEntry<string> = {
      data: 'test data',
      timestamp: Date.now(),
      ttl: 60000,
      accessCount: 1,
      lastAccessed: Date.now(),
    }

    expect(entry.data).toBe('test data')
    expect(typeof entry.timestamp).toBe('number')
    expect(typeof entry.ttl).toBe('number')
    expect(typeof entry.accessCount).toBe('number')
    expect(typeof entry.lastAccessed).toBe('number')
  })

  test('ジェネリック型が正しく動作する', () => {
    interface TestData {
      value: number
      name: string
    }

    const entry: CacheEntry<TestData> = {
      data: { value: 42, name: 'test' },
      timestamp: Date.now(),
      ttl: 60000,
      accessCount: 0,
      lastAccessed: Date.now(),
    }

    expect(entry.data.value).toBe(42)
    expect(entry.data.name).toBe('test')
  })
})

describe('CacheKey', () => {
  test('mapタイプのキーが正しく定義できる', () => {
    const key: CacheKey = {
      type: 'map',
      url: 'https://www.jma.go.jp/bosai/amedas/data/map/20240101000000.json',
    }

    expect(key.type).toBe('map')
    expect(key.url).toContain('map')
  })

  test('pointタイプのキーが正しく定義できる', () => {
    const key: CacheKey = {
      type: 'point',
      url: 'https://www.jma.go.jp/bosai/amedas/data/point/s47412/20240101_00.json',
      timestamp: '20240101_00',
    }

    expect(key.type).toBe('point')
    expect(key.url).toContain('point')
    expect(key.timestamp).toBe('20240101_00')
  })
})

describe('CacheError', () => {
  test('CacheErrorが正しく生成される', () => {
    const error = new CacheError(
      CacheErrorType.STORAGE_UNAVAILABLE,
      'localStorage is not available',
    )

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(CacheError)
    expect(error.type).toBe(CacheErrorType.STORAGE_UNAVAILABLE)
    expect(error.message).toBe('localStorage is not available')
    expect(error.name).toBe('CacheError')
  })

  test('原因エラーを含むCacheErrorが正しく生成される', () => {
    const originalError = new Error('Original error')
    const cacheError = new CacheError(
      CacheErrorType.DATA_CORRUPTED,
      'Data is corrupted',
      originalError,
    )

    expect(cacheError.type).toBe(CacheErrorType.DATA_CORRUPTED)
    expect(cacheError.message).toBe('Data is corrupted')
    expect(cacheError.cause).toBe(originalError)
  })

  test('全てのエラータイプが定義されている', () => {
    expect(CacheErrorType.STORAGE_UNAVAILABLE).toBe('STORAGE_UNAVAILABLE')
    expect(CacheErrorType.QUOTA_EXCEEDED).toBe('QUOTA_EXCEEDED')
    expect(CacheErrorType.DATA_CORRUPTED).toBe('DATA_CORRUPTED')
    expect(CacheErrorType.INVALID_KEY).toBe('INVALID_KEY')
    expect(CacheErrorType.EXPIRED).toBe('EXPIRED')
  })
})

describe('CACHE_DISABLED', () => {
  test('CACHE_DISABLED定数が正しく定義されている', () => {
    expect(CACHE_DISABLED).toBe(-1)
  })
})

describe('TimeSlotInfo', () => {
  test('TimeSlotInfoが正しく定義できる', () => {
    const slotInfo: TimeSlotInfo = {
      slotStart: new Date(2024, 0, 1, 9, 0, 0),
      slotEnd: new Date(2024, 0, 1, 12, 0, 0),
      isCurrent: true,
      slotHour: 9,
    }

    expect(slotInfo.slotStart).toBeInstanceOf(Date)
    expect(slotInfo.slotEnd).toBeInstanceOf(Date)
    expect(slotInfo.isCurrent).toBe(true)
    expect(slotInfo.slotHour).toBe(9)
  })

  test('3時間スロットの時刻が正しく設定される', () => {
    const slotInfo: TimeSlotInfo = {
      slotStart: new Date(2024, 0, 1, 6, 0, 0),
      slotEnd: new Date(2024, 0, 1, 9, 0, 0),
      isCurrent: false,
      slotHour: 6,
    }

    const timeDiff = slotInfo.slotEnd.getTime() - slotInfo.slotStart.getTime()
    expect(timeDiff).toBe(3 * 60 * 60 * 1000) // 3時間 = 3 * 60 * 60 * 1000ms
  })

  test('有効なスロット時刻が設定される', () => {
    const validSlotHours = [0, 3, 6, 9, 12, 15, 18, 21]

    for (const hour of validSlotHours) {
      const slotInfo: TimeSlotInfo = {
        slotStart: new Date(2024, 0, 1, hour, 0, 0),
        slotEnd: new Date(2024, 0, 1, hour + 3, 0, 0),
        isCurrent: false,
        slotHour: hour,
      }

      expect(slotInfo.slotHour).toBe(hour)
      expect(slotInfo.slotStart.getHours()).toBe(hour)
      expect(slotInfo.slotEnd.getHours()).toBe((hour + 3) % 24)
    }
  })
})
