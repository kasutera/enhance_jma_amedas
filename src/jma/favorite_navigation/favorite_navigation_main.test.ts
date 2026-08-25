import { favorite_navigation_main } from './favorite_navigation_main'

const FAVORITES_STORAGE_KEY = 'enhance-jma-amedas-favorite-stations-v1'

function createController(format = 'graph'): void {
  window.location.hash = `area_type=offices&area_code=130000&amdno=44132&format=${format}&elem=temp`
  document.body.innerHTML = `
    <div id="amd-table">
      <table>
        <tr class="contents-title">
          <th colspan="2">
            <div>
              <div class="amd-content-amdname">東京(トウキョウ)</div>
              <div class="amd-content-location">北緯: 35度41.5分 東経: 139度45.0分 標高: 25m</div>
            </div>
          </th>
        </tr>
        <tr data-testid="format-row">
          <th class="amd-content-controller-item-head">表示形式</th>
          <td>
            <div class="contents-radio-button contents-radio-button-off" data-type="table1h">一覧表(1時間毎)</div>
            <div class="contents-radio-button contents-radio-button-off" data-type="table10min">一覧表(10分毎)</div>
            <div class="contents-radio-button contents-radio-button-on" data-type="graph">グラフ</div>
          </td>
        </tr>
        <tr data-testid="table-observation-row" style="display: none">
          <th class="amd-content-controller-item-head">観測要素</th>
          <td><input name="table-elem" value="temp"></td>
        </tr>
        <tr data-testid="graph-observation-row">
          <th class="amd-content-controller-item-head">観測要素</th>
          <td>
            <div class="contents-radio-button contents-radio-button-on" data-type="temp">気温</div>
            <div class="contents-radio-button contents-radio-button-off" data-type="humidity">湿度</div>
            <div class="contents-radio-button contents-radio-button-off" data-enhanced-graph-key="dewPoint">露点温度</div>
          </td>
        </tr>
      </table>
    </div>
  `
}

function pressArrow(key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  document.dispatchEvent(event)
  return event
}

describe('お気に入り地点とキーボードナビゲーション', () => {
  beforeEach(() => {
    localStorage.clear()
    createController()
  })

  test('地点ヘッダーの星だけで現在地点をお気に入りへ追加・解除できる', () => {
    const stop = favorite_navigation_main()
    try {
      const titleCell = document.querySelector('.contents-title th')
      const toggle = document.querySelector<HTMLButtonElement>('#enhanced-favorite-toggle')
      const style = document.querySelector<HTMLStyleElement>('#enhanced-favorite-navigation-style')
      expect(titleCell?.querySelector('#enhanced-favorite-toggle')).toBe(toggle)
      expect(style?.textContent).toContain('border: 2px solid #ffd700')
      expect(style?.textContent).toContain('background: rgba(0, 0, 0, 0.28)')
      expect(toggle?.textContent).toBe('☆')
      expect(toggle?.textContent).not.toContain('現在地')
      expect(toggle?.getAttribute('aria-pressed')).toBe('false')
      expect(document.querySelector('#enhanced-favorite-stations-row')).toBeNull()

      toggle?.click()

      const stored = JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) ?? '[]')
      expect(stored).toEqual([
        {
          amdno: '44132',
          name: '東京',
          areaType: 'offices',
          areaCode: '130000',
        },
      ])
      expect(toggle?.textContent).toBe('★')
      expect(toggle?.getAttribute('aria-pressed')).toBe('true')
      expect(document.querySelector('[data-enhanced-favorite-amdno="44132"]')).not.toBeNull()

      toggle?.click()
      expect(JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) ?? '[]')).toEqual([])
      expect(toggle?.textContent).toBe('☆')
      expect(document.querySelector('#enhanced-favorite-stations-row')).toBeNull()
    } finally {
      stop()
    }
  })

  test('お気に入りへ移動しても表示形式と観測要素を維持する', () => {
    localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify([
        { amdno: '44132', name: '東京', areaType: 'offices', areaCode: '130000' },
        { amdno: '47772', name: '大阪', areaType: 'offices', areaCode: '270000' },
      ]),
    )
    const stop = favorite_navigation_main()
    try {
      document.querySelector<HTMLElement>('[data-enhanced-favorite-amdno="47772"]')?.click()

      const parameters = new URLSearchParams(window.location.hash.slice(1))
      expect(parameters.get('amdno')).toBe('47772')
      expect(parameters.get('area_code')).toBe('270000')
      expect(parameters.get('format')).toBe('graph')
      expect(parameters.get('elem')).toBe('temp')
    } finally {
      stop()
    }
  })

  test('地域情報のないお気に入りへ移動したとき、以前の地域情報を引き継がない', () => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([{ amdno: '62078', name: '大阪' }]))
    const stop = favorite_navigation_main()
    try {
      document.querySelector<HTMLElement>('[data-enhanced-favorite-amdno="62078"]')?.click()

      const parameters = new URLSearchParams(window.location.hash.slice(1))
      expect(parameters.get('amdno')).toBe('62078')
      expect(parameters.has('area_type')).toBe(false)
      expect(parameters.has('area_code')).toBe(false)
      expect(parameters.get('format')).toBe('graph')
      expect(parameters.get('elem')).toBe('temp')
    } finally {
      stop()
    }
  })

  test('上下で行を、左右で行内の選択肢を切り替える', () => {
    localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify([
        { amdno: '44132', name: '東京', areaType: 'offices', areaCode: '130000' },
        { amdno: '47772', name: '大阪', areaType: 'offices', areaCode: '270000' },
      ]),
    )
    const humidity = document.querySelector<HTMLElement>('[data-type="humidity"]')
    const humidityClick = jest.fn(() => {
      document
        .querySelectorAll('[data-testid="graph-observation-row"] .contents-radio-button')
        .forEach((button) => {
          button.classList.remove('contents-radio-button-on')
        })
      humidity?.classList.add('contents-radio-button-on')
    })
    humidity?.addEventListener('click', humidityClick)

    const stop = favorite_navigation_main()
    try {
      expect(pressArrow('ArrowDown').defaultPrevented).toBe(true)
      expect(
        document
          .querySelector('[data-testid="graph-observation-row"]')
          ?.getAttribute('data-enhanced-keyboard-active'),
      ).toBe('true')

      pressArrow('ArrowRight')
      expect(humidityClick).toHaveBeenCalledTimes(1)

      pressArrow('ArrowUp')
      expect(
        document
          .querySelector('[data-testid="format-row"]')
          ?.getAttribute('data-enhanced-keyboard-active'),
      ).toBe('true')

      pressArrow('ArrowUp')
      pressArrow('ArrowRight')
      expect(new URLSearchParams(window.location.hash.slice(1)).get('amdno')).toBe('47772')
    } finally {
      stop()
    }
  })

  test('一覧表では観測要素を上下左右ナビゲーションの対象にしない', () => {
    createController('table10min')
    const observation = document.querySelector<HTMLElement>('[data-type="humidity"]')
    const observationClick = jest.fn()
    observation?.addEventListener('click', observationClick)
    const table1h = document.querySelector<HTMLElement>('[data-type="table1h"]')
    const table1hClick = jest.fn()
    table1h?.addEventListener('click', table1hClick)

    const stop = favorite_navigation_main()
    try {
      pressArrow('ArrowDown')
      pressArrow('ArrowRight')
      expect(table1hClick).toHaveBeenCalledTimes(1)
      expect(observationClick).not.toHaveBeenCalled()
    } finally {
      stop()
    }
  })

  test('履歴APIで地点一覧へ戻るとお気に入り行を除去し、非表示の表示形式を操作しない', async () => {
    localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify([{ amdno: '44132', name: '東京', areaType: 'offices', areaCode: '130000' }]),
    )
    const formatRow = document.querySelector<HTMLTableRowElement>('[data-testid="format-row"]')
    const table1h = document.querySelector<HTMLElement>('[data-type="table1h"]')
    const table1hClick = jest.fn()
    table1h?.addEventListener('click', table1hClick)

    const stop = favorite_navigation_main()
    try {
      expect(document.querySelector('#enhanced-favorite-stations-row')).not.toBeNull()

      window.history.replaceState(null, '', '#area_type=offices&area_code=130000&elems=5361c')
      if (formatRow !== null) {
        formatRow.style.display = 'none'
      }
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(document.querySelector('#enhanced-favorite-stations-row')).toBeNull()
      expect(document.querySelector('#enhanced-favorite-navigation-style')).toBeNull()
      const event = pressArrow('ArrowRight')
      expect(event.defaultPrevented).toBe(false)
      expect(table1hClick).not.toHaveBeenCalled()
    } finally {
      stop()
    }
  })

  test('別タブのお気に入り変更を反映し、停止後は監視しない', () => {
    localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify([{ amdno: '44132', name: '東京', areaType: 'offices', areaCode: '130000' }]),
    )
    const stop = favorite_navigation_main()
    try {
      expect(document.querySelector('[data-enhanced-favorite-amdno="44132"]')).not.toBeNull()

      const updatedFavorites = [
        { amdno: '62078', name: '大阪', areaType: 'offices', areaCode: '270000' },
      ]
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updatedFavorites))
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: FAVORITES_STORAGE_KEY,
          newValue: JSON.stringify(updatedFavorites),
        }),
      )

      expect(document.querySelector('[data-enhanced-favorite-amdno="44132"]')).toBeNull()
      expect(document.querySelector('[data-enhanced-favorite-amdno="62078"]')).not.toBeNull()

      stop()
      localStorage.setItem(FAVORITES_STORAGE_KEY, '[]')
      window.dispatchEvent(
        new StorageEvent('storage', { key: FAVORITES_STORAGE_KEY, newValue: '[]' }),
      )
      expect(document.querySelector('#enhanced-favorite-stations-row')).toBeNull()
    } finally {
      stop()
    }
  })

  test('入力欄では矢印キーを横取りしない', () => {
    const stop = favorite_navigation_main()
    try {
      const input = document.createElement('input')
      document.body.append(input)
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        cancelable: true,
      })
      input.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(false)
      expect(document.querySelector('[data-enhanced-keyboard-active]')).toBeNull()
    } finally {
      stop()
    }
  })
})
