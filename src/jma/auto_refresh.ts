import { getAreastableObservationTime } from './areastable/observation_time'
import { latestTimeUrl } from './jma_urls'
import {
  getSeriestableObservationTime,
  hasSeriestableObservationTime,
} from './seriestable/observation_time'

const CHECK_INTERVAL_MILLISECONDS = 2 * 60 * 1000

interface TableAutoRefreshOptions {
  /** テスト時のreload差し替え用。本番ではwindow.location.reloadを使う。 */
  reload?: () => void
}

interface TableRefreshRoute {
  kind: 'area' | 'series-hourly' | 'series-ten-minute'
  signature: string
}

interface CheckRequest {
  route: TableRefreshRoute
  routeRevision: number
  latestTime?: Date
}

let activeStop: (() => void) | undefined

function getTableRoute(): TableRefreshRoute | null {
  const parameters = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const queryParameters = new URLSearchParams(window.location.search.replace(/^\?/, ''))
  const format = parameters.get('format')
  if (
    parameters.has('datetime') ||
    queryParameters.has('datetime') ||
    (format !== null && format !== 'table1h' && format !== 'table10min')
  ) {
    return null
  }
  const amdno = parameters.get('amdno')
  if (amdno !== null) {
    if (amdno === '') {
      return null
    }
    return {
      kind: format === 'table10min' ? 'series-ten-minute' : 'series-hourly',
      signature: `series\u0000${amdno}\u0000${format ?? 'table1h'}`,
    }
  }
  const areaType = parameters.get('area_type')
  const areaCode = parameters.get('area_code')
  return areaType === null || areaCode === null
    ? null
    : { kind: 'area', signature: `area\u0000${areaType}\u0000${areaCode}` }
}

function parseLatestTime(text: string): Date | null {
  const value = text.trim()
  const matched = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:Z|[+-]\d{2}:\d{2})$/,
  )
  if (matched === null) {
    return null
  }
  const [, year, month, day, hour, minute, second] = matched
  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    hour === undefined ||
    minute === undefined ||
    second === undefined
  ) {
    return null
  }
  const yearNumber = Number(year)
  const monthNumber = Number(month)
  const dayNumber = Number(day)
  if (
    monthNumber < 1 ||
    monthNumber > 12 ||
    dayNumber < 1 ||
    dayNumber > new Date(Date.UTC(yearNumber, monthNumber, 0)).getUTCDate() ||
    Number(hour) > 23 ||
    Number(minute) > 59 ||
    Number(minute) % 10 !== 0 ||
    Number(second) !== 0
  ) {
    return null
  }
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date : null
}

function canReadObservationTime(route: TableRefreshRoute, latestTime?: Date): boolean {
  if (route.kind === 'area') {
    return getAreastableObservationTime() !== null
  }
  return latestTime === undefined
    ? hasSeriestableObservationTime()
    : getSeriestableObservationTime(latestTime) !== null
}

/** 地域表・時系列表に新しい観測行が公開されていればページを再読み込みする。 */
export function initializeTableAutoRefresh(options?: TableAutoRefreshOptions): () => void {
  activeStop?.()

  let stopped = false
  let reloading = false
  let lastRouteSignature = getTableRoute()?.signature ?? null
  let routeRevision = 0
  let activeRequest: CheckRequest | null = null
  let pendingRequest: CheckRequest | null = null
  let deferredRequest: CheckRequest | null = null
  const reload = options?.reload ?? (() => window.location.reload())

  function isCurrentRequest(request: CheckRequest): boolean {
    const currentRoute = getTableRoute()
    return (
      !stopped &&
      !reloading &&
      !document.hidden &&
      currentRoute !== null &&
      currentRoute.signature === request.route.signature &&
      routeRevision === request.routeRevision
    )
  }

  function startRequest(request: CheckRequest): void {
    if (activeRequest !== null || !isCurrentRequest(request)) {
      return
    }
    activeRequest = request
    void (async () => {
      try {
        const response = await fetch(latestTimeUrl)
        if (!response.ok) {
          console.warn('表の最新時刻を取得できませんでした。', response.status)
          return
        }
        const text = await response.text()
        if (!isCurrentRequest(request)) {
          return
        }
        const latestTime = parseLatestTime(text)
        if (latestTime === null) {
          return
        }
        const displayedTime =
          request.route.kind === 'area'
            ? getAreastableObservationTime()
            : getSeriestableObservationTime(latestTime)
        if (displayedTime === null || !Number.isFinite(displayedTime.getTime())) {
          if (isCurrentRequest(request)) {
            request.latestTime = latestTime
            deferredRequest = request
          }
          return
        }
        // 1時間表は次の正時が公開されるまで更新しない。10分ごとの再読み込みループを防ぐ。
        const publicationTime =
          request.route.kind === 'series-hourly'
            ? Math.floor(latestTime.getTime() / (60 * 60 * 1000)) * (60 * 60 * 1000)
            : latestTime.getTime()
        if (publicationTime <= displayedTime.getTime()) {
          return
        }
        if (!isCurrentRequest(request)) {
          return
        }
        reloading = true
        try {
          reload()
        } catch (error) {
          reloading = false
          console.warn('表を再読み込みできませんでした。', error)
        }
      } catch (error) {
        console.warn('表の最新時刻を取得できませんでした。', error)
      } finally {
        activeRequest = null
        const queuedRequest = pendingRequest
        pendingRequest = null
        if (queuedRequest !== null && isCurrentRequest(queuedRequest)) {
          requestCheck()
        }
      }
    })()
  }

  function requestCheck(): void {
    const route = getTableRoute()
    if (route === null || stopped || reloading || document.hidden) {
      pendingRequest = null
      deferredRequest = null
      return
    }
    const request: CheckRequest = {
      route,
      routeRevision,
    }
    if (activeRequest !== null) {
      if (
        activeRequest.route.signature === request.route.signature &&
        activeRequest.routeRevision === request.routeRevision
      ) {
        pendingRequest = null
        return
      }
      pendingRequest = request
      return
    }
    if (!canReadObservationTime(route)) {
      deferredRequest = request
      return
    }
    deferredRequest = null
    startRequest(request)
  }

  function resumeDeferredRequest(): void {
    const request = deferredRequest
    if (request === null) {
      return
    }
    if (!isCurrentRequest(request)) {
      deferredRequest = null
      return
    }
    if (!canReadObservationTime(request.route, request.latestTime)) {
      return
    }
    deferredRequest = null
    requestCheck()
  }

  function synchronizeRoute(): void {
    const nextRouteSignature = getTableRoute()?.signature ?? null
    if (nextRouteSignature === lastRouteSignature) {
      return
    }
    lastRouteSignature = nextRouteSignature
    routeRevision += 1
    pendingRequest = null
    deferredRequest = null
    if (nextRouteSignature !== null) {
      requestCheck()
    }
  }

  const handleHashChange = () => {
    synchronizeRoute()
    resumeDeferredRequest()
  }
  const handleVisibilityChange = () => {
    synchronizeRoute()
    resumeDeferredRequest()
    requestCheck()
  }
  const interval = window.setInterval(() => {
    synchronizeRoute()
    resumeDeferredRequest()
    requestCheck()
  }, CHECK_INTERVAL_MILLISECONDS)

  window.addEventListener('hashchange', handleHashChange)
  window.addEventListener('popstate', handleHashChange)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  const observer = new MutationObserver(() => {
    synchronizeRoute()
    resumeDeferredRequest()
  })
  const observationRoot = document.documentElement
  if (observationRoot !== null) {
    observer.observe(observationRoot, {
      childList: true,
      subtree: true,
      characterData: true,
    })
  }
  requestCheck()

  const stop = () => {
    if (stopped) {
      return
    }
    stopped = true
    window.clearInterval(interval)
    window.removeEventListener('hashchange', handleHashChange)
    window.removeEventListener('popstate', handleHashChange)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    observer.disconnect()
    pendingRequest = null
    deferredRequest = null
    if (activeStop === stop) {
      activeStop = undefined
    }
  }
  activeStop = stop
  return stop
}
