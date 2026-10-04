import { initializeTableAutoRefresh } from './auto_refresh'

const DISPLAYED_TIME = '2026年10月04日15時30分 現在'
const SAME_LATEST_TIME = '2026-10-04T15:30:00+09:00'
const NEW_LATEST_TIME = '2026-10-04T15:40:00+09:00'
const CHECK_INTERVAL = 2 * 60 * 1000

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

function makeResponse(text: string, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 503,
    text: async () => text,
  } as Response
}

function createPage(includeObservationTime = true): void {
  document.body.innerHTML = `
    <div id="amd-table">
      <table class="amd-areastable">
        <thead><tr><th>
          ${
            includeObservationTime
              ? `<span class="amd-areastable-span-obstime">${DISPLAYED_TIME}</span>`
              : ''
          }
          <span class="amd-areastable-span-obstime">毎正時の注記</span>
        </th></tr></thead>
      </table>
    </div>`
}

function setRoute(route: string): void {
  window.location.hash = route
  window.dispatchEvent(new Event('hashchange'))
}

function createSeriesPage(day = '04日', time = '15:30'): void {
  document.body.innerHTML = `
    <div id="amd-table"><div class="contents-wide-table-scroll">
      <table class="amd-table-seriestable"><tbody>
        <tr class="amd-table-tr-notonthedot">
          <td rowspan="1">${day}</td><td>${time}</td><td class="td-temp">21.2</td>
        </tr>
      </tbody></table>
    </div></div>`
}

async function flushAsyncWork(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

describe('initializeTableAutoRefresh', () => {
  let stop: (() => void) | undefined
  let fetchMock: jest.MockedFunction<typeof fetch>
  let reload: jest.Mock<void, []>
  let originalFetch: typeof fetch

  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-10-04T08:00:00Z'))
    window.history.replaceState(null, '', '/')
    createPage()
    window.location.hash = 'area_type=offices&area_code=130000&format=table10min&elems=53414'
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    originalFetch = globalThis.fetch
    fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>
    fetchMock.mockResolvedValue(makeResponse(SAME_LATEST_TIME))
    globalThis.fetch = fetchMock
    reload = jest.fn<void, []>()
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    stop?.()
    stop = undefined
    jest.restoreAllMocks()
    globalThis.fetch = originalFetch
    document.body.replaceChildren()
    jest.useRealTimers()
  })

  it('checks immediately without user interaction and reloads once for a newer publication', async () => {
    fetchMock.mockResolvedValue(makeResponse(NEW_LATEST_TIME))
    stop = initializeTableAutoRefresh({ reload })
    await flushAsyncWork()

    expect(reload).toHaveBeenCalledTimes(1)
    await jest.advanceTimersByTimeAsync(2 * CHECK_INTERVAL)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('checks every two minutes and keeps the page until a newer publication appears', async () => {
    stop = initializeTableAutoRefresh({ reload })
    await flushAsyncWork()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(reload).not.toHaveBeenCalled()

    await jest.advanceTimersByTimeAsync(CHECK_INTERVAL - 1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await jest.advanceTimersByTimeAsync(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(reload).not.toHaveBeenCalled()

    fetchMock.mockResolvedValue(makeResponse(NEW_LATEST_TIME))
    await jest.advanceTimersByTimeAsync(CHECK_INTERVAL)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('ignores element and table-format changes but checks a different region immediately', async () => {
    stop = initializeTableAutoRefresh({ reload })
    await flushAsyncWork()
    setRoute('area_type=offices&area_code=130000&format=table1h&elems=5361c')
    await flushAsyncWork()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    fetchMock.mockResolvedValue(makeResponse(NEW_LATEST_TIME))
    setRoute('area_type=offices&area_code=140000&format=table10min')
    await flushAsyncWork()
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it.each([
    'area_type=offices&area_code=130000&amdno=44132&datetime=202610041500',
    'area_type=offices&area_code=130000&datetime=202610041500',
    'area_type=offices&area_code=130000&format=graph',
  ])(
    'does not refresh the excluded route %s and resumes on entering a regional table',
    async (route) => {
      setRoute(route)
      fetchMock.mockResolvedValue(makeResponse(NEW_LATEST_TIME))
      stop = initializeTableAutoRefresh({ reload })
      await jest.advanceTimersByTimeAsync(CHECK_INTERVAL)
      expect(fetchMock).not.toHaveBeenCalled()
      expect(reload).not.toHaveBeenCalled()

      setRoute('area_type=offices&area_code=130000')
      await flushAsyncWork()
      expect(reload).toHaveBeenCalledTimes(1)
    },
  )

  it('defers the initial check until the displayed observation time exists', async () => {
    createPage(false)
    fetchMock.mockResolvedValue(makeResponse(NEW_LATEST_TIME))
    stop = initializeTableAutoRefresh({ reload })
    setRoute('area_type=offices&area_code=140000&format=table10min')
    await flushAsyncWork()
    expect(fetchMock).not.toHaveBeenCalled()

    document
      .querySelector('#amd-table th')
      ?.insertAdjacentHTML(
        'afterbegin',
        `<span class="amd-areastable-span-obstime">${DISPLAYED_TIME}</span>`,
      )
    await flushAsyncWork()
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('queues the latest region during a request and ignores its result after moving to a station', async () => {
    const responses: Deferred<Response>[] = []
    fetchMock.mockImplementation(() => {
      const response = deferred<Response>()
      responses.push(response)
      return response.promise
    })
    stop = initializeTableAutoRefresh({ reload })
    setRoute('area_type=offices&area_code=140000')
    setRoute('area_type=offices&area_code=150000')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    responses[0]?.resolve(makeResponse(NEW_LATEST_TIME))
    await flushAsyncWork()
    expect(reload).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(2)

    setRoute('area_type=offices&area_code=150000&amdno=44132')
    responses[1]?.resolve(makeResponse(NEW_LATEST_TIME))
    await flushAsyncWork()
    expect(reload).not.toHaveBeenCalled()
  })

  it('pauses checks while hidden and checks immediately when visible again', async () => {
    stop = initializeTableAutoRefresh({ reload })
    await flushAsyncWork()
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    document.dispatchEvent(new Event('visibilitychange'))
    await jest.advanceTimersByTimeAsync(2 * CHECK_INTERVAL)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(reload).not.toHaveBeenCalled()

    fetchMock.mockResolvedValue(makeResponse(NEW_LATEST_TIME))
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    document.dispatchEvent(new Event('visibilitychange'))
    await flushAsyncWork()
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('does not reload a hidden page from an in-flight response', async () => {
    const response = deferred<Response>()
    fetchMock.mockReturnValueOnce(response.promise)
    stop = initializeTableAutoRefresh({ reload })
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    document.dispatchEvent(new Event('visibilitychange'))
    response.resolve(makeResponse(NEW_LATEST_TIME))
    await flushAsyncWork()
    expect(reload).not.toHaveBeenCalled()

    fetchMock.mockResolvedValue(makeResponse(NEW_LATEST_TIME))
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    document.dispatchEvent(new Event('visibilitychange'))
    await flushAsyncWork()
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('invalidates the previous instance and stops checks after cleanup', async () => {
    const response = deferred<Response>()
    fetchMock.mockReturnValueOnce(response.promise)
    stop = initializeTableAutoRefresh({ reload })
    stop = initializeTableAutoRefresh({ reload })
    await flushAsyncWork()
    response.resolve(makeResponse(NEW_LATEST_TIME))
    await flushAsyncWork()
    expect(reload).not.toHaveBeenCalled()

    stop()
    stop = undefined
    fetchMock.mockClear()
    setRoute('area_type=offices&area_code=140000')
    await jest.advanceTimersByTimeAsync(CHECK_INTERVAL)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(reload).not.toHaveBeenCalled()
  })

  it('allows the next scheduled check after a fetch failure', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('offline'))
    fetchMock.mockResolvedValue(makeResponse(NEW_LATEST_TIME))
    stop = initializeTableAutoRefresh({ reload })
    await flushAsyncWork()
    expect(reload).not.toHaveBeenCalled()

    await jest.advanceTimersByTimeAsync(CHECK_INTERVAL)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('reloads the ten-minute series table when a new row is published', async () => {
    createSeriesPage()
    setRoute('amdno=44132&format=table10min')
    stop = initializeTableAutoRefresh({ reload })
    await flushAsyncWork()
    expect(reload).not.toHaveBeenCalled()

    fetchMock.mockResolvedValue(makeResponse(NEW_LATEST_TIME))
    await jest.advanceTimersByTimeAsync(CHECK_INTERVAL)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('refreshes hourly series only at the next full hour, not on every ten-minute publication', async () => {
    createSeriesPage('04日', '15:00')
    setRoute('amdno=44132&format=table1h')
    stop = initializeTableAutoRefresh({ reload })
    await flushAsyncWork()
    expect(reload).not.toHaveBeenCalled()

    fetchMock.mockResolvedValue(makeResponse('2026-10-04T15:50:00+09:00'))
    await jest.advanceTimersByTimeAsync(CHECK_INTERVAL)
    expect(reload).not.toHaveBeenCalled()

    fetchMock.mockResolvedValue(makeResponse('2026-10-04T16:00:00+09:00'))
    await jest.advanceTimersByTimeAsync(CHECK_INTERVAL)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('waits for a delayed series table before checking for newer data', async () => {
    document.body.replaceChildren()
    setRoute('amdno=44132&format=table10min')
    fetchMock.mockResolvedValue(makeResponse(NEW_LATEST_TIME))
    stop = initializeTableAutoRefresh({ reload })
    await flushAsyncWork()
    expect(fetchMock).not.toHaveBeenCalled()

    createSeriesPage()
    await flushAsyncWork()
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('checks the newly selected station without applying the previous station response', async () => {
    createSeriesPage()
    setRoute('amdno=44132&format=table10min')
    const responses: Deferred<Response>[] = []
    fetchMock.mockImplementation(() => {
      const response = deferred<Response>()
      responses.push(response)
      return response.promise
    })
    stop = initializeTableAutoRefresh({ reload })
    setRoute('amdno=47772&format=table10min')
    responses[0]?.resolve(makeResponse(NEW_LATEST_TIME))
    await flushAsyncWork()
    expect(reload).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(2)

    createSeriesPage('04日', '15:40')
    responses[1]?.resolve(makeResponse(NEW_LATEST_TIME))
    await flushAsyncWork()
    expect(reload).not.toHaveBeenCalled()
  })

  it('preserves a series table opened with a historical query timestamp', async () => {
    createSeriesPage()
    window.history.replaceState(null, '', '/?datetime=202610031500#amdno=44132&format=table10min')
    fetchMock.mockResolvedValue(makeResponse(NEW_LATEST_TIME))
    stop = initializeTableAutoRefresh({ reload })
    await jest.advanceTimersByTimeAsync(CHECK_INTERVAL)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(reload).not.toHaveBeenCalled()
  })

  it('handles the previous day 24:00 row at a JST year boundary without a reload loop', async () => {
    createSeriesPage('31日', '24:00')
    setRoute('amdno=44132&format=table1h')
    fetchMock.mockResolvedValue(makeResponse('2026-01-01T00:10:00+09:00'))
    stop = initializeTableAutoRefresh({ reload })
    await flushAsyncWork()
    expect(reload).not.toHaveBeenCalled()

    fetchMock.mockResolvedValue(makeResponse('2026-01-01T01:00:00+09:00'))
    await jest.advanceTimersByTimeAsync(CHECK_INTERVAL)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it.each(['01日', '01/01'])(
    'keeps the newer %s series row when the publication response is from the preceding year',
    async (day) => {
      createSeriesPage(day, '00:00')
      setRoute('amdno=44132&format=table10min')
      fetchMock.mockResolvedValue(makeResponse('2026-12-31T23:50:00+09:00'))
      stop = initializeTableAutoRefresh({ reload })
      await jest.advanceTimersByTimeAsync(CHECK_INTERVAL)
      expect(reload).not.toHaveBeenCalled()
    },
  )

  it.each([
    ['HTTP error', makeResponse(NEW_LATEST_TIME, false)],
    ['invalid timestamp', makeResponse('not-a-date')],
    ['off-interval timestamp', makeResponse('2026-10-04T15:35:00+09:00')],
    ['older publication', makeResponse('2026-10-04T15:20:00+09:00')],
  ] as const)(
    'keeps the current page for %s latest-time responses',
    async (_description, response) => {
      fetchMock.mockResolvedValue(response)
      stop = initializeTableAutoRefresh({ reload })
      await flushAsyncWork()
      expect(reload).not.toHaveBeenCalled()
    },
  )
})
