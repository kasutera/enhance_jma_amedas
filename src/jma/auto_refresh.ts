import type { Feature } from './feature'
import { fetchLatestTime } from './integration/amedas_client'
import { getAreastableObservationTime } from './integration/area_observation_time'
import { getTableRefreshRoute, reloadJmaPage, type TableRefreshRoute } from './integration/route'
import {
  getSeriestableObservationTime,
  hasSeriestableObservationTime,
} from './integration/series_observation_time'

const CHECK_INTERVAL_MILLISECONDS = 2 * 60 * 1000

interface TableAutoRefreshOptions {
  /** テスト時のreload差し替え用。本番ではwindow.location.reloadを使う。 */
  reload?: () => void
}

interface CheckRequest {
  route: TableRefreshRoute
  routeRevision: number
  latestTime?: Date
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
export function initializeTableAutoRefresh(options?: TableAutoRefreshOptions): Feature {
  let stopped = false
  let reloading = false
  let lastRouteSignature = getTableRefreshRoute()?.signature ?? null
  let routeRevision = 0
  let activeRequest: CheckRequest | null = null
  let pendingRequest: CheckRequest | null = null
  let deferredRequest: CheckRequest | null = null
  const reload = options?.reload ?? reloadJmaPage

  function isCurrentRequest(request: CheckRequest): boolean {
    const currentRoute = getTableRefreshRoute()
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
        const latestTime = await fetchLatestTime()
        if (!isCurrentRequest(request)) {
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
    const route = getTableRefreshRoute()
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
    const nextRouteSignature = getTableRefreshRoute()?.signature ?? null
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

  document.addEventListener('visibilitychange', handleVisibilityChange)
  requestCheck()

  const stop = () => {
    if (stopped) {
      return
    }
    stopped = true
    window.clearInterval(interval)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    pendingRequest = null
    deferredRequest = null
  }
  return { refresh: handleHashChange, dispose: stop }
}
