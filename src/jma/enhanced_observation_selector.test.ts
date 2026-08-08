import {
  ENHANCED_OBSERVATION_ELEMENTS,
  ensureEnhancedObservationSelector,
  isEnhancedObservationEnabled,
  setEnhancedObservationEnabled,
} from './enhanced_observation_selector'

function createTestTable(): void {
  document.body.innerHTML = `
    <div id="amd-selector-div-wrap">
      <div id="amd-selector-div-block-items">
        <input type="checkbox" id="table-elem-temp" name="table-elem" value="temp">
        <input type="checkbox" id="table-elem-humidity" name="table-elem" value="humidity" checked>
      </div>
      <div class="amd-selector-div-block-bulkbuttons">
        <div class="amd-selector-div-button">すべて選択</div>
        <div class="amd-selector-div-button">すべて解除</div>
        <div class="amd-selector-div-button">初期表示要素を選択</div>
      </div>
    </div>
    <table class="amd-table-seriestable">
      <tr class="simple-table-hidden-tr">
        <td></td><td></td><td></td><td></td><td></td>
      </tr>
      <tr class="contents-header">
        <th colspan="2" rowspan="2">日時</th>
        <th class="td-volumetric-humidity">容積絶対湿度</th>
        <th class="td-dew-point">露点温度</th>
        <th class="td-temperature-humidity-index">不快指数</th>
      </tr>
      <tr class="contents-header">
        <th class="td-volumetric-humidity">g/㎥</th>
        <th class="td-dew-point">℃</th>
        <th class="td-temperature-humidity-index"></th>
      </tr>
      <tr class="amd-table-tr-onthedot">
        <td rowspan="1">08日</td><td>10:00</td>
        <td class="td-volumetric-humidity">20.0</td>
        <td class="td-dew-point">19.0</td>
        <td class="td-temperature-humidity-index">75.0</td>
      </tr>
    </table>
  `
}

describe('派生観測要素セレクター', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    ENHANCED_OBSERVATION_ELEMENTS.forEach(({ key }) => {
      setEnhancedObservationEnabled(key, true)
    })
  })

  test('JMAの地点別チェック状態を変更せず、派生要素だけを追加する', () => {
    document.body.innerHTML = `
      <div id="amd-selector-div-block-items">
        <input type="checkbox" id="table-elem-temp" name="table-elem" value="temp">
        <input type="checkbox" id="table-elem-humidity" name="table-elem" value="humidity" checked>
      </div>
    `

    ensureEnhancedObservationSelector()
    ensureEnhancedObservationSelector()

    expect((document.querySelector('#table-elem-temp') as HTMLInputElement).checked).toBe(false)
    expect((document.querySelector('#table-elem-humidity') as HTMLInputElement).checked).toBe(true)
    expect(document.querySelectorAll('input[name="enhanced-table-elem"]')).toHaveLength(
      ENHANCED_OBSERVATION_ELEMENTS.length,
    )
    expect(document.querySelectorAll('input[name="table-elem"]')).toHaveLength(2)
  })

  test('派生要素のチェック状態に応じて表の列と幅セルを切り替える', () => {
    createTestTable()
    ensureEnhancedObservationSelector()

    const dewPointInput = document.querySelector<HTMLInputElement>(
      'input[data-enhanced-observation-key="dewPoint"]',
    )
    if (dewPointInput === null) {
      throw new Error('露点温度チェックボックスが生成されていません')
    }
    dewPointInput.checked = false
    dewPointInput.dispatchEvent(new Event('change', { bubbles: true }))

    expect(
      Array.from(document.querySelectorAll<HTMLElement>('.td-dew-point')).every(
        (element) => element.hidden,
      ),
    ).toBe(true)
    expect(document.querySelector('.simple-table-hidden-tr')?.children[3]).toHaveProperty(
      'hidden',
      true,
    )
    expect((document.querySelector('.td-volumetric-humidity') as HTMLElement).hidden).toBe(false)
  })

  test('JMA UIの再生成後も派生要素の選択状態を保持する', () => {
    createTestTable()
    setEnhancedObservationEnabled('temperatureHumidityIndex', false)
    ensureEnhancedObservationSelector()

    const oldBlock = document.querySelector<HTMLElement>('#amd-selector-div-block-items')
    if (oldBlock === null) {
      throw new Error('派生要素セレクターが生成されていません')
    }
    const oldInput = oldBlock.querySelector<HTMLInputElement>(
      'input[data-enhanced-observation-key="temperatureHumidityIndex"]',
    )
    if (oldInput === null) {
      throw new Error('不快指数チェックボックスが生成されていません')
    }
    expect(oldInput.checked).toBe(false)

    oldBlock.replaceWith(document.createElement('div'))
    const newBlock = document.createElement('div')
    newBlock.id = 'amd-selector-div-block-items'
    document.body.prepend(newBlock)
    ensureEnhancedObservationSelector()

    const newInput = newBlock.querySelector<HTMLInputElement>(
      'input[data-enhanced-observation-key="temperatureHumidityIndex"]',
    )
    expect(newInput?.checked).toBe(false)
    expect(isEnhancedObservationEnabled('temperatureHumidityIndex')).toBe(false)
  })

  test('JMAの一括操作と派生要素の表示状態を連動できる', () => {
    createTestTable()
    ensureEnhancedObservationSelector()

    const deselectAll = Array.from(document.querySelectorAll('.amd-selector-div-button')).find(
      (element) => element.textContent === 'すべて解除',
    )
    deselectAll?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    ENHANCED_OBSERVATION_ELEMENTS.forEach(({ key }) => {
      expect(isEnhancedObservationEnabled(key)).toBe(false)
    })
    expect((document.querySelector('.td-volumetric-humidity') as HTMLElement).hidden).toBe(true)
  })
})
