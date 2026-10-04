import { TABLE_CLASS_NAMES } from './table_classes_definition'

const favoriteNavigationMain = jest.fn()

jest.mock('./favorite_navigation/favorite_navigation_main', () => ({
  favorite_navigation_main: favoriteNavigationMain,
}))
jest.mock('./graph/graph_main', () => ({ graph_main: jest.fn() }))
jest.mock('./seriestable/jma_amedas_fetcher', () => ({
  AmedasFetcher: jest.fn().mockImplementation(() => ({
    fetchAmedasData: jest.fn().mockResolvedValue({ temperature: 20, humidity: 50 }),
  })),
}))
jest.mock('./areastable/jma_amedas_fetcher', () => ({
  AmedasFetcher: jest.fn().mockImplementation(() => ({
    fetchAmedasData: jest.fn().mockResolvedValue({ '44132': { temperature: 20, humidity: 50 } }),
  })),
}))
jest.mock('./latest_amedas_date', () => ({
  fetchLatestTime: jest.fn().mockResolvedValue(new Date(2026, 9, 3, 12)),
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
  for (const rowSelector of ['.amd-table-tr-onthedot', '.amd-areastable-tr-pointdata']) {
    const row = container.querySelector(rowSelector)
    for (const [className, value] of [
      [TABLE_CLASS_NAMES.volumetricHumidity, '8.7'],
      [TABLE_CLASS_NAMES.dewPoint, '9.3'],
      [TABLE_CLASS_NAMES.temperatureHumidityIndex, '65.3'],
    ]) {
      const cells = row?.querySelectorAll(`td.${className}`)
      expect(Array.from(cells ?? [], (cell) => cell.textContent)).toEqual([value])
    }
  }
}

describe('表コンテナ内の既存表の初期描画', () => {
  beforeEach(() => {
    jest.resetModules()
    favoriteNavigationMain.mockReset()
    document.body.replaceChildren()
    window.location.hash = 'amdno=44132'
    jest.spyOn(document, 'readyState', 'get').mockReturnValue('complete')
    jest.useFakeTimers()
  })

  afterEach(() => {
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
      await import('./main')
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
      for (const selector of ['.amd-table-seriestable', '.amd-areastable']) {
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

  it('お気に入り操作の初期化が失敗しても両方の表を描画する', async () => {
    document.body.innerHTML = `<div id="amd-table">${tables}</div>`
    favoriteNavigationMain.mockImplementation(() => {
      throw new Error('favorite initialization failed')
    })
    jest.spyOn(console, 'error').mockImplementation()
    // 初期化例外を含むモジュール読み込み境界を検証する。
    await import('./main')
    await jest.runAllTimersAsync()
    expectEnhancedTables(document.body)
  })
})
