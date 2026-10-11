import { initializeApplication } from './application'
import { TABLE_CLASS_NAMES } from './integration/column_classes'

const favoriteNavigationMain = jest.fn()
const mockPointRange = jest
  .fn()
  .mockImplementation((_stationId: string, dates: Date[]) =>
    dates.map((date) => ({ temperature: 20, humidity: 50, date })),
  )
let stopApplication: (() => void) | undefined
const mockRegionalAmedasFetch = jest
  .fn()
  .mockResolvedValue({ '44132': { temperature: 21.2, humidity: 61 } })

jest.mock('./favorite_navigation/favorite_navigation_main', () => ({
  favorite_navigation_main: () => favoriteNavigationMain(),
}))
jest.mock('./graph/graph_main', () => ({
  graph_main: () => ({ refresh: jest.fn(), dispose: jest.fn() }),
}))
jest.mock('./integration/amedas_client', () => ({
  AmedasClient: jest.fn().mockImplementation(() => ({
    fetchPointRange: mockPointRange,
    fetchArea: mockRegionalAmedasFetch,
  })),
  fetchLatestTime: jest.fn().mockResolvedValue(new Date('2026-10-04T06:30:00.000Z')),
}))
jest.mock('./auto_refresh', () => ({
  initializeTableAutoRefresh: () => ({ refresh: jest.fn(), dispose: jest.fn() }),
}))

const tables = `
  <div class="contents-wide-table-scroll">
    <table class="amd-table-seriestable">
      <tbody>
        <tr class="contents-header"><th>日時</th></tr>
        <tr class="contents-header"><th>単位</th></tr>
        <tr class="amd-table-tr-onthedot"><td rowspan="1">1日</td><td>12:00</td></tr>
      </tbody>
    </table>
    <table class="amd-areastable">
      <tbody>
        <tr>
          <th>
            <span class="amd-areastable-span-obstime">2026年10月04日15時30分 現在</span>
            <span class="amd-areastable-span-obstime">2026年10月04日15時00分 現在</span>
          </th>
        </tr>
      </tbody>
    </table>
    <table class="amd-areastable amd-table-responsive">
      <tbody>
        <tr class="simple-table-hidden-tr"><td></td></tr>
        <tr class="contents-header"><th>地点</th></tr>
        <tr class="contents-header"><th>単位</th></tr>
        <tr class="amd-areastable-tr-pointdata"><td><a class="amd-areastable-a-pointlink" href="#amdno=44132">東京</a></td></tr>
      </tbody>
    </table>
  </div>`

function expectEnhancedTables(container: Element): void {
  const expectedRows = [
    {
      selector: '.amd-table-tr-onthedot',
      values: ['8.7', '9.3', '65.3'],
    },
    {
      selector: '.amd-areastable-tr-pointdata',
      values: ['11.3', '13.4', '67.6'],
    },
  ] as const

  for (const { selector, values } of expectedRows) {
    const row = container.querySelector(selector)
    const expectedColumns = [
      [TABLE_CLASS_NAMES.volumetricHumidity, values[0]],
      [TABLE_CLASS_NAMES.dewPoint, values[1]],
      [TABLE_CLASS_NAMES.temperatureHumidityIndex, values[2]],
    ] as const
    for (const [className, value] of expectedColumns) {
      const cells = row?.querySelectorAll(`td.${className}`)
      expect(Array.from(cells ?? [], (cell) => cell.textContent)).toEqual([value])
    }
  }
}

describe('表コンテナ内の既存表の初期描画', () => {
  beforeEach(() => {
    mockRegionalAmedasFetch.mockClear()
    favoriteNavigationMain.mockReset().mockReturnValue({ refresh: jest.fn(), dispose: jest.fn() })
    document.body.replaceChildren()
    window.location.hash = 'amdno=44132'
    jest.spyOn(document, 'readyState', 'get').mockReturnValue('complete')
    jest.useFakeTimers()
  })

  afterEach(() => {
    stopApplication?.()
    stopApplication = undefined
    jest.restoreAllMocks()
    document.body.replaceChildren()
    jest.useRealTimers()
  })

  it.each(['初期化前', '初期化後'])(
    '%sに表入りコンテナを挿入しても派生列を描画する',
    async (timing) => {
      const container = document.createElement('div')
      container.id = 'amd-table'
      container.innerHTML = tables
      // 非表示版の表は既存の監視処理と同様に拡張しない。
      container.insertAdjacentHTML(
        'beforeend',
        tables.replace(
          'class="contents-wide-table-scroll"',
          'class="contents-wide-table-scroll" style="display: none"',
        ),
      )
      if (timing === '初期化前') {
        document.body.append(container)
      }
      // 初期化前後のDOMを切り替えるため、モジュール読み込み境界をここで実行する。
      stopApplication = initializeApplication()
      if (timing === '初期化後') {
        document.body.append(container)
      }
      await jest.runAllTimersAsync()
      expectEnhancedTables(container)
      expect(
        container.querySelector('[style]')?.querySelector(`.${TABLE_CLASS_NAMES.dewPoint}`),
      ).toBeNull()

      // 派生列の追加によるDOM変更で二重描画されないことを確認する。
      container.append(document.createElement('span'))
      await jest.runAllTimersAsync()
      expectEnhancedTables(container)

      // 初期描画後もJMAによる表の再生成を監視する。
      const replacement = document.createElement('div')
      replacement.innerHTML = tables
      for (const selector of [
        '.amd-table-seriestable',
        '.amd-areastable',
        '.amd-areastable.amd-table-responsive',
      ]) {
        const oldTable = container.querySelector(selector)
        const newTable = replacement.querySelector(selector)
        if (oldTable === null || newTable === null) {
          throw new Error('再生成対象の表が見つかりません')
        }
        oldTable.replaceWith(newTable)
      }
      await jest.runAllTimersAsync()
      expectEnhancedTables(container)
    },
  )

  it('見出しを残して地点行を再生成した同じ地域表にも派生列を復元する', async () => {
    document.body.innerHTML = `<div id="amd-table">${tables}</div>`
    stopApplication = initializeApplication()
    await jest.runAllTimersAsync()
    expectEnhancedTables(document.body)

    const table = document.querySelector('.amd-areastable.amd-table-responsive')
    const parent = table?.parentElement
    const oldRow = table?.querySelector('.amd-areastable-tr-pointdata')
    const replacement = document.createElement('div')
    replacement.innerHTML = tables
    const newRow = replacement.querySelector('.amd-areastable-tr-pointdata')
    if (table === null || parent === null || parent === undefined || !oldRow || !newRow) {
      throw new Error('再利用する地域表または地点行が見つかりません')
    }

    table.remove()
    oldRow.replaceWith(newRow)
    parent.append(table)
    await jest.runAllTimersAsync()

    expectEnhancedTables(document.body)
    for (const heading of table.querySelectorAll('.contents-header')) {
      for (const className of [
        TABLE_CLASS_NAMES.volumetricHumidity,
        TABLE_CLASS_NAMES.dewPoint,
        TABLE_CLASS_NAMES.temperatureHumidityIndex,
      ]) {
        expect(heading.querySelectorAll(`.${className}`)).toHaveLength(1)
      }
    }
  })

  it('同じ地域表で派生セルが一つ欠落しても全派生値を重複なく復元する', async () => {
    document.body.innerHTML = `<div id="amd-table">${tables}</div>`

    stopApplication = initializeApplication()
    await jest.runAllTimersAsync()
    expectEnhancedTables(document.body)

    const cell = document.querySelector(
      `.amd-areastable-tr-pointdata td.${TABLE_CLASS_NAMES.temperatureHumidityIndex}`,
    )
    if (cell === null) {
      throw new Error('削除対象の不快指数セルが見つかりません')
    }
    cell.remove()
    await jest.runAllTimersAsync()

    expectEnhancedTables(document.body)
  })

  it('通信待ち中に地域表が再生成されたら古い表には列を挿入しない', async () => {
    type RegionalFetchResult = { '44132': { temperature: number; humidity: number } }
    const { promise, resolve: resolveInitialFetch } = Promise.withResolvers<RegionalFetchResult>()
    mockRegionalAmedasFetch.mockReturnValueOnce(promise)

    const container = document.createElement('div')
    container.id = 'amd-table'
    container.innerHTML = tables
    document.body.append(container)
    stopApplication = initializeApplication()

    const oldTable = container.querySelector<HTMLTableElement>(
      '.amd-areastable.amd-table-responsive',
    )
    if (oldTable === null) {
      throw new Error('再生成前の地域表が見つかりません')
    }

    const replacement = document.createElement('div')
    replacement.innerHTML = tables.replace(
      '2026年10月04日15時30分 現在',
      '2026年10月04日15時40分 現在',
    )
    for (const selector of [
      '.amd-table-seriestable',
      '.amd-areastable',
      '.amd-areastable.amd-table-responsive',
    ]) {
      const oldElement = container.querySelector(selector)
      const newElement = replacement.querySelector(selector)
      if (oldElement === null || newElement === null) {
        throw new Error('再生成対象の表が見つかりません')
      }
      oldElement.replaceWith(newElement)
    }

    await jest.runAllTimersAsync()
    expect(oldTable.querySelector(`.${TABLE_CLASS_NAMES.dewPoint}`)).toBeNull()

    resolveInitialFetch({ '44132': { temperature: 21.2, humidity: 61 } })
    await Promise.resolve()
    await jest.runAllTimersAsync()

    expect(oldTable.querySelector(`.${TABLE_CLASS_NAMES.dewPoint}`)).toBeNull()
    expect(
      container
        .querySelector('.amd-areastable.amd-table-responsive')
        ?.querySelector(`td.${TABLE_CLASS_NAMES.dewPoint}`)?.textContent,
    ).toBe('13.4')
  })

  it('観測時刻が不明な地域表はAPI取得せず派生値を欠測表示する', async () => {
    const tablesWithoutObservationTime = tables.replace(
      '2026年10月04日15時30分 現在',
      '観測時刻不明',
    )
    document.body.innerHTML = `<div id="amd-table">${tablesWithoutObservationTime}</div>`

    stopApplication = initializeApplication()
    await jest.runAllTimersAsync()

    const pointRow = document.querySelector('.amd-areastable-tr-pointdata')
    for (const className of [
      TABLE_CLASS_NAMES.volumetricHumidity,
      TABLE_CLASS_NAMES.dewPoint,
      TABLE_CLASS_NAMES.temperatureHumidityIndex,
    ]) {
      expect(pointRow?.querySelector(`td.${className}`)?.textContent).toBe('---')
    }
  })

  it('後から判明した観測時刻に同じ地域表の派生値を同期する', async () => {
    document.body.innerHTML = `<div id="amd-table">${tables.replace(
      '2026年10月04日15時30分 現在',
      '観測時刻不明',
    )}</div>`
    // 初期DOMを用意してからエントリーポイントの読み込み時初期化を実行する。
    stopApplication = initializeApplication()
    await jest.runAllTimersAsync()
    const row = document.querySelector('.amd-areastable-tr-pointdata')
    expect(row?.querySelector(`td.${TABLE_CLASS_NAMES.dewPoint}`)?.textContent).toBe('---')
    const heading = document.querySelector('.amd-areastable-span-obstime')
    if (heading === null) {
      throw new Error('観測時刻見出しが見つかりません')
    }
    heading.textContent = '2026年10月04日15時30分 現在'
    await jest.runAllTimersAsync()
    expect(row?.querySelector(`td.${TABLE_CLASS_NAMES.dewPoint}`)?.textContent).toBe('13.4')
  })

  it('派生列を非表示にしてもDOM更新が収束し、表交換後も表示を切り替えられる', async () => {
    document.body.innerHTML = `<div id="amd-selector-div-block-items"></div><div id="amd-table">${tables}</div>`
    stopApplication = initializeApplication()
    await jest.runAllTimersAsync()
    const input = document.querySelector<HTMLInputElement>('#enhanced-table-elem-dewPoint')
    if (input === null) {
      throw new Error('露点温度の選択UIがありません')
    }
    input.click()
    await jest.runAllTimersAsync()
    expect(input.checked).toBe(false)
    expect(document.querySelector('.amd-table-tr-onthedot td.td-dew-point')).toHaveProperty(
      'hidden',
      true,
    )
    const container = document.querySelector('#amd-table')
    if (container === null) {
      throw new Error('表コンテナがありません')
    }
    container.innerHTML = tables
    await jest.runAllTimersAsync()
    expect(document.querySelector('.amd-areastable-tr-pointdata td.td-dew-point')).toHaveProperty(
      'hidden',
      true,
    )
    input.click()
    await jest.runAllTimersAsync()
    expect(input.checked).toBe(true)
    expect(document.querySelector('.amd-table-tr-onthedot td.td-dew-point')).toHaveProperty(
      'hidden',
      false,
    )
  })

  it('表コンテナ全体が交換されても新しい表を拡張し、解除・再接続で列を重複させない', async () => {
    document.body.innerHTML = `<div id="amd-table">${tables}</div>`
    stopApplication = initializeApplication()
    await jest.runAllTimersAsync()
    const oldContainer = document.querySelector('#amd-table')
    if (oldContainer === null) {
      throw new Error('初期コンテナがありません')
    }
    const newContainer = document.createElement('div')
    newContainer.id = 'amd-table'
    newContainer.innerHTML = tables
    oldContainer.replaceWith(newContainer)
    await jest.runAllTimersAsync()
    expectEnhancedTables(newContainer)
    stopApplication()
    stopApplication = initializeApplication()
    await jest.runAllTimersAsync()
    expectEnhancedTables(newContainer)
  })

  it('解除前に開始した通信の応答は、解除後の表を変更しない', async () => {
    const { promise, resolve: resolveArea } =
      Promise.withResolvers<Record<string, { temperature: number; humidity: number }>>()
    mockRegionalAmedasFetch.mockReturnValueOnce(promise)
    document.body.innerHTML = `<div id="amd-table">${tables}</div>`
    stopApplication = initializeApplication()
    await jest.runAllTimersAsync()
    stopApplication()
    resolveArea({ '44132': { temperature: 21.2, humidity: 61 } })
    await jest.runAllTimersAsync()
    expect(document.querySelector('.amd-areastable-tr-pointdata td.td-dew-point')).toBeNull()
  })

  it('地点変更中の古い時系列応答を反映せず、新しい地点の値で更新する', async () => {
    const { promise, resolve: resolveSeries } =
      Promise.withResolvers<Array<{ temperature: number; humidity: number }>>()
    mockPointRange.mockReturnValueOnce(promise)
    document.body.innerHTML = `<div id="amd-table">${tables}</div>`
    stopApplication = initializeApplication()
    await jest.runAllTimersAsync()
    window.location.hash = 'amdno=47772'
    window.dispatchEvent(new Event('hashchange'))
    await jest.runAllTimersAsync()
    resolveSeries([{ temperature: 21.2, humidity: 61 }])
    await jest.runAllTimersAsync()
    expect(document.querySelector('.amd-table-tr-onthedot td.td-dew-point')?.textContent).toBe(
      '9.3',
    )
    expect(document.querySelectorAll('.amd-table-tr-onthedot td.td-dew-point')).toHaveLength(1)
  })

  it('お気に入り操作の初期化が失敗しても両方の表を描画する', async () => {
    document.body.innerHTML = `<div id="amd-table">${tables}</div>`
    favoriteNavigationMain.mockImplementation(() => {
      throw new Error('favorite initialization failed')
    })
    jest.spyOn(console, 'error').mockImplementation()
    // 初期化例外を含むモジュール読み込み境界を検証する。
    stopApplication = initializeApplication()
    await jest.runAllTimersAsync()
    expectEnhancedTables(document.body)
  })
})
