/**
 * キャッシュシステムの型定義
 */

/**
 * キャッシュエントリの基本構造
 * @template T キャッシュするデータの型
 */
export interface CacheEntry<T> {
  /** キャッシュするデータ */
  data: T
  /** キャッシュ作成時のタイムスタンプ (ms) */
  timestamp: number
  /** 有効期限 (ms) - 0の場合は永続キャッシュ */
  ttl: number
  /** アクセス回数 (LRU用) */
  accessCount: number
  /** 最終アクセス時刻 (LRU用) */
  lastAccessed: number
}

/**
 * キャッシュキーの種別
 */
export type CacheType = 'map' | 'point'

/**
 * キャッシュキーの構造
 */
export interface CacheKey {
  /** キャッシュの種別 */
  type: CacheType
  /** 元のURL */
  url: string
  /** タイムスタンプ（オプション） */
  timestamp?: string
}

/**
 * キャッシュの設定
 */
export interface CacheConfig {
  /** localStorage接頭辞 */
  storagePrefix: string
  /** メモリキャッシュの最大エントリ数 */
  maxMemoryEntries: number
  /** localStorage の最大サイズ（バイト） */
  maxStorageSize: number
  /** デフォルトTTL設定 */
  defaultTtl: {
    /** マップデータのTTL (ms) */
    map: number
    /** ポイントデータ（最新スロット）のTTL (ms) */
    pointCurrent: number
    /** ポイントデータ（過去スロット）のTTL (ms) - 0は永続 */
    pointPast: number
  }
}

/**
 * キャッシュエラーの種別
 */
export enum CacheErrorType {
  /** localStorage無効 */
  STORAGE_UNAVAILABLE = 'STORAGE_UNAVAILABLE',
  /** 容量不足 */
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  /** データ破損 */
  DATA_CORRUPTED = 'DATA_CORRUPTED',
  /** 無効なキー */
  INVALID_KEY = 'INVALID_KEY',
  /** 期限切れ */
  EXPIRED = 'EXPIRED',
}

/**
 * キャッシュ操作エラー
 */
export class CacheError extends Error {
  constructor(
    public readonly type: CacheErrorType,
    message: string,
    public readonly cause?: Error,
  ) {
    super(message)
    this.name = 'CacheError'
  }
}

/**
 * 時系列データの3時間スロット情報
 */
export interface TimeSlotInfo {
  /** スロットの開始時刻 */
  slotStart: Date
  /** スロットの終了時刻 */
  slotEnd: Date
  /** 現在の最新スロットかどうか */
  isCurrent: boolean
  /** 3時間単位のスロット番号 (0, 3, 6, 9, 12, 15, 18, 21) */
  slotHour: number
}
