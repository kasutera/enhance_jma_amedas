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
 * キャッシュ統計情報
 */
export interface CacheStats {
  /** メモリキャッシュのエントリ数 */
  memoryEntries: number
  /** localStorageのエントリ数 */
  storageEntries: number
  /** 総キャッシュサイズ（推定バイト） */
  totalSize: number
  /** ヒット率 */
  hitRate: number
  /** 総リクエスト数 */
  totalRequests: number
  /** キャッシュヒット数 */
  cacheHits: number
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

/**
 * キャッシュマネージャーのインターフェース
 */
export interface ICacheManager {
  /**
   * キャッシュから値を取得
   * @param key キャッシュキー
   * @returns キャッシュされた値、存在しないか期限切れの場合はundefined
   */
  get<T>(key: string): Promise<T | undefined>

  /**
   * キャッシュに値を保存
   * @param key キャッシュキー
   * @param value 保存する値
   * @param ttl 有効期限（ms）、省略時はデフォルト値
   */
  set<T>(key: string, value: T, ttl?: number): Promise<void>

  /**
   * キャッシュにキーが存在するかチェック
   * @param key キャッシュキー
   * @returns 存在し、有効期限内の場合true
   */
  has(key: string): Promise<boolean>

  /**
   * キャッシュを削除
   * @param key キャッシュキー
   */
  delete(key: string): Promise<void>

  /**
   * 全キャッシュをクリア
   */
  clear(): Promise<void>

  /**
   * 期限切れエントリのクリーンアップ
   */
  cleanup(): Promise<void>

  /**
   * キャッシュ統計情報を取得
   */
  getStats(): Promise<CacheStats>
}

/**
 * キャッシュストレージのインターフェース
 */
export interface ICacheStorage {
  /**
   * データを読み込み
   * @param key キー
   */
  getItem<T>(key: string): Promise<CacheEntry<T> | null>

  /**
   * データを保存
   * @param key キー
   * @param entry キャッシュエントリ
   */
  setItem<T>(key: string, entry: CacheEntry<T>): Promise<void>

  /**
   * データを削除
   * @param key キー
   */
  removeItem(key: string): Promise<void>

  /**
   * 全データをクリア
   */
  clear(): Promise<void>

  /**
   * 全キーを取得
   */
  keys(): Promise<string[]>

  /**
   * ストレージサイズを取得（推定バイト）
   */
  size(): Promise<number>
}
