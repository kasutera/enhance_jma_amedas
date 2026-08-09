import { favorite_navigation_main } from './favorite_navigation'

const FAVORITES_STORAGE_KEY = 'enhance-jma-amedas-favorite-stations-v1'

function createController(format = 'graph'): void {
  window.location.hash = `area_type=offices&area_code=130000&amdno=44132&format=${format}&elem=temp`
  document.body.innerHTML = `
    <div id="amd-table">
      <table>
        <tr class="contents-title">
          <th colspan="2"><div class="amd-content-amdname">東京(トウキョウ)</div></th>
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

  test('現在地点をお気に入りへ追加し、表示形式の上へ一覧を表示する', () => {
    const stop = favorite_navigation_main()
    try {
      const favoriteRow = document.querySelector('#enhanced-favorite-stations-row')
      expect(favoriteRow?.nextElementSibling).toBe(
        document.querySelector('[data-testid="format-row"]'),
      )

      const toggle = Array.from(
        favoriteRow?.querySelectorAll<HTMLElement>('[role="button"]') ?? [],
      ).find((button) => button.textContent === '☆ 現在地を追加')
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
      expect(document.querySelector('[data-enhanced-favorite-amdno="44132"]')).not.toBeNull()
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
