import { graph_main } from './graph_main'

const flushPromises = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0))
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('派生観測要素のグラフ選択', () => {
  beforeEach(() => {
    window.location.hash = 'amdno=44132&format=graph'
    document.body.innerHTML = `
      <div id="amd-table">
        <table>
          <tr>
            <th>観測要素</th>
            <td>
              <div class="contents-radio-button contents-radio-button-enabled contents-radio-button-on" data-type="temp">気温</div>
            </td>
          </tr>
        </table>
        <div class="amd-content-graph-title">10分毎の気温時系列図</div>
        <div id="amd-graph"></div>
      </div>
    `
    global.fetch = jest.fn(async (url: string) => {
      if (url.endsWith('latest_time.txt')) {
        return { ok: true, text: async () => '2026-08-09T00:00:00+09:00' } as Response
      }
      return {
        ok: true,
        json: async () => ({
          '20260809000000': {
            pressure: [1013.25, 0],
            temp: [25, 0],
            humidity: [60, 0],
          },
        }),
      } as Response
    }) as jest.Mock
  })

  test('グラフ画面に3つの派生観測要素を加え、選択時にグラフを置き換える', async () => {
    const stop = graph_main()
    await flushPromises()

    expect(document.querySelectorAll('[data-enhanced-graph-key]')).toHaveLength(3)
    const button = document.querySelector<HTMLElement>(
      '[data-enhanced-graph-key="volumetricHumidity"]',
    )
    if (button === null) {
      throw new Error('容積絶対湿度のグラフ選択肢がありません')
    }
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()

    expect(document.querySelector('.amd-content-graph-title')?.textContent).toBe(
      '10分毎の容積絶対湿度時系列図',
    )
    expect(document.querySelector('#enhanced-amd-graph')).not.toBeNull()
    expect(global.fetch).toHaveBeenCalled()
    stop()
  })

  test('派生観測要素を連続して切り替えたとき、最後に選択した項目を表示する', async () => {
    const stop = graph_main()
    try {
      await flushPromises()

      const volumetricHumidity = document.querySelector<HTMLElement>(
        '[data-enhanced-graph-key="volumetricHumidity"]',
      )
      const dewPoint = document.querySelector<HTMLElement>('[data-enhanced-graph-key="dewPoint"]')
      if (volumetricHumidity === null || dewPoint === null) {
        throw new Error('派生観測要素のグラフ選択肢がありません')
      }

      volumetricHumidity.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      dewPoint.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()
      await new Promise((resolve) => setTimeout(resolve, 10))
      await flushPromises()

      expect(document.querySelector('.amd-content-graph-title')?.textContent).toBe(
        '10分毎の露点温度時系列図',
      )
      expect(
        document
          .querySelector('[data-enhanced-graph-key="dewPoint"]')
          ?.classList.contains('contents-radio-button-on'),
      ).toBe(true)
    } finally {
      stop()
    }
  })

  test('JMA標準グラフの選択状態を保持する', async () => {
    const standardButton = document.querySelector<HTMLElement>('[data-type="temp"]')
    if (standardButton === null) {
      throw new Error('気温のグラフ選択肢がありません')
    }
    standardButton.addEventListener('click', () => {
      standardButton.classList.add('contents-radio-button-on')
      standardButton.classList.remove('contents-radio-button-off')
      document.querySelector('#amd-graph')?.append(document.createElement('div'))
    })

    const stop = graph_main()
    try {
      await flushPromises()
      expect(standardButton.classList.contains('contents-radio-button-on')).toBe(true)

      const enhancedButton = document.querySelector<HTMLElement>(
        '[data-enhanced-graph-key="dewPoint"]',
      )
      if (enhancedButton === null) {
        throw new Error('露点温度のグラフ選択肢がありません')
      }
      enhancedButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()
      standardButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()

      expect(standardButton.classList.contains('contents-radio-button-on')).toBe(true)
      expect(enhancedButton.classList.contains('contents-radio-button-off')).toBe(true)
    } finally {
      stop()
    }
  })

  test('一覧表用の観測要素行にはグラフボタンを追加しない', async () => {
    document.body.innerHTML = `
      <div id="amd-table">
        <table>
          <tr data-testid="table-selector-row">
            <th>観測要素</th>
            <td><div id="amd-selector-div-block-items"></div></td>
          </tr>
          <tr data-testid="graph-selector-row">
            <th>観測要素</th>
            <td><div class="contents-radio-button contents-radio-button-on" data-type="temp">気温</div></td>
          </tr>
        </table>
        <div class="amd-content-graph-title"></div>
        <div id="amd-graph"></div>
      </div>
    `

    const stop = graph_main()
    try {
      await flushPromises()

      expect(
        document.querySelectorAll('[data-testid="table-selector-row"] [data-enhanced-graph-key]'),
      ).toHaveLength(0)
      expect(
        document.querySelectorAll('[data-testid="graph-selector-row"] [data-enhanced-graph-key]'),
      ).toHaveLength(3)
    } finally {
      stop()
    }
  })

  test('取得失敗時はエラーを表示して自動再試行しない', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('network error')
    }) as jest.Mock
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined)

    const stop = graph_main()
    try {
      const button = document.querySelector<HTMLElement>('[data-enhanced-graph-key="dewPoint"]')
      if (button === null) {
        throw new Error('露点温度のグラフ選択肢がありません')
      }
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()
      await flushPromises()

      expect(global.fetch).toHaveBeenCalledTimes(1)
      expect(document.querySelector('#enhanced-amd-graph-error')).not.toBeNull()
    } finally {
      stop()
      consoleError.mockRestore()
    }
  })
})
