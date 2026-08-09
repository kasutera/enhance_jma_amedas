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
})
