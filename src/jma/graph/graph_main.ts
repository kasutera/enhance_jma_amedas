import { type AmedasData, AmedasFetcher } from '../amedas_point_fetcher'
import {
  ENHANCED_OBSERVATION_ELEMENTS,
  type EnhancedObservationKey,
} from '../enhanced_observation_selector'
import { getAmdnoFromUrl } from '../jma_urls'
import { fetchLatestTime } from '../latest_amedas_date'
import { HumidCalculator } from '../math'
import { type GraphDataPoint, renderEnhancedGraph } from './graph_renderer'

const GRAPH_CONTAINER_SELECTOR = '#amd-graph'
const GRAPH_SELECTOR_ATTRIBUTE = 'data-enhanced-graph-key'
const GRAPH_RADIO_BUTTON_SELECTOR = '.contents-radio-button'
const STANDARD_PRESSURE = 1013.25

let activeGraphKey: EnhancedObservationKey | undefined
let graphIsRendering = false
let graphRenderVersion = 0
let graphMainIsActive = false

function isGraphFormat(): boolean {
  return new URLSearchParams(window.location.hash.slice(1)).get('format') === 'graph'
}

function getGraphValue(data: AmedasData, key: EnhancedObservationKey): number | null {
  if (data.temperature === undefined || data.humidity === undefined) {
    return null
  }
  const calculator = new HumidCalculator(
    data.temperature,
    data.humidity,
    data.pressure ?? STANDARD_PRESSURE,
  )
  if (key === 'volumetricHumidity') {
    return calculator.volumetricHumidity
  }
  if (key === 'dewPoint') {
    return calculator.dewPoint
  }
  return calculator.temperatureHumidityIndex
}

function getGraphDates(end: Date): Date[] {
  const roundedEnd = new Date(end)
  roundedEnd.setSeconds(0, 0)
  roundedEnd.setMinutes(Math.floor(roundedEnd.getMinutes() / 10) * 10)
  const dates: Date[] = []
  for (let offset = 48 * 6; offset >= 0; offset--) {
    dates.push(new Date(roundedEnd.getTime() - offset * 10 * 60 * 1000))
  }
  return dates
}

function synchronizeGraphButtons(container: HTMLElement): void {
  container.querySelectorAll<HTMLElement>(GRAPH_RADIO_BUTTON_SELECTOR).forEach((button) => {
    const key = button.getAttribute(GRAPH_SELECTOR_ATTRIBUTE)
    const selected = key === activeGraphKey
    button.classList.toggle('contents-radio-button-on', selected)
    button.classList.toggle('contents-radio-button-off', !selected)
  })
}

function createGraphSelectorItem(container: HTMLElement, key: EnhancedObservationKey): void {
  const definition = ENHANCED_OBSERVATION_ELEMENTS.find((element) => element.key === key)
  if (definition === undefined) {
    return
  }
  const item = document.createElement('div')
  item.classList.add(
    'contents-radio-button',
    'contents-radio-button-enabled',
    'contents-radio-button-off',
  )
  item.setAttribute(GRAPH_SELECTOR_ATTRIBUTE, key)
  item.title = definition.label
  item.textContent = definition.label
  item.addEventListener('click', () => {
    activeGraphKey = key
    graphRenderVersion++
    document.querySelector(GRAPH_CONTAINER_SELECTOR)?.replaceChildren()
    synchronizeGraphButtons(container)
    void renderSelectedGraph()
  })
  container.append(item)
}

function getGraphControlContainer(): HTMLElement | null {
  const graphControlRows = Array.from(document.querySelectorAll<HTMLTableRowElement>('tr')).filter(
    (row) => row.querySelector('th')?.textContent?.replaceAll(/\s+/g, '') === '観測要素',
  )
  const graphControlRow =
    graphControlRows.find(
      (row) => row.querySelector(GRAPH_RADIO_BUTTON_SELECTOR)?.getClientRects().length !== 0,
    ) ?? graphControlRows[0]
  return graphControlRow?.querySelector<HTMLElement>('td') ?? null
}

function ensureEnhancedGraphSelector(): void {
  if (!isGraphFormat()) {
    return
  }
  const container = getGraphControlContainer()
  if (container === null) {
    return
  }
  ENHANCED_OBSERVATION_ELEMENTS.forEach(({ key }) => {
    if (container.querySelector(`[${GRAPH_SELECTOR_ATTRIBUTE}="${key}"]`) === null) {
      createGraphSelectorItem(container, key)
    }
  })
  synchronizeGraphButtons(container)
}

async function renderSelectedGraph(): Promise<void> {
  const key = activeGraphKey
  const container = document.querySelector<HTMLElement>(GRAPH_CONTAINER_SELECTOR)
  if (!graphMainIsActive || key === undefined || container === null || graphIsRendering) {
    return
  }
  if (container.querySelector('#enhanced-amd-graph') !== null) {
    return
  }
  graphIsRendering = true
  const renderVersion = graphRenderVersion
  const renderHash = location.hash
  try {
    const [latestTime, code] = await Promise.all([
      fetchLatestTime(),
      Promise.resolve(getAmdnoFromUrl(location.href)),
    ])
    const dates = getGraphDates(latestTime)
    const data = await new AmedasFetcher().fetchAmedasDataRange(code, dates)
    if (
      !graphMainIsActive ||
      activeGraphKey !== key ||
      graphRenderVersion !== renderVersion ||
      location.hash !== renderHash ||
      !isGraphFormat()
    ) {
      return
    }
    const definition = ENHANCED_OBSERVATION_ELEMENTS.find((element) => element.key === key)
    const target = document.querySelector<HTMLElement>(GRAPH_CONTAINER_SELECTOR)
    if (definition === undefined || target === null) {
      return
    }
    const unit = key === 'volumetricHumidity' ? 'g/㎥' : key === 'dewPoint' ? '℃' : ''
    const points: GraphDataPoint[] = data.map((point) => ({
      date: point.date,
      value: getGraphValue(point, key),
    }))
    renderEnhancedGraph(target, definition.label, unit, points)
  } catch (error) {
    console.error('派生観測要素のグラフ生成中にエラーが発生しました:', error)
  } finally {
    graphIsRendering = false
    if (
      graphMainIsActive &&
      activeGraphKey !== undefined &&
      isGraphFormat() &&
      document.querySelector(GRAPH_CONTAINER_SELECTOR)?.querySelector('#enhanced-amd-graph') ===
        null
    ) {
      void renderSelectedGraph()
    }
  }
}

function handleOriginalGraphElement(event: Event): void {
  const target = event.target
  if (
    !(target instanceof HTMLElement) ||
    !target.classList.contains('contents-radio-button') ||
    target.hasAttribute(GRAPH_SELECTOR_ATTRIBUTE)
  ) {
    return
  }
  activeGraphKey = undefined
  graphRenderVersion++
}

/** グラフ表示時の観測要素リストと派生値グラフを管理する。 */
export function graph_main(): () => void {
  // 観測要素リストは #amd-table の外にあり、JMAの描画後に生成される。
  // body全体を監視し、表示形式を切り替えた後にも選択肢を追加する。
  graphMainIsActive = true
  document.addEventListener('click', handleOriginalGraphElement, true)
  const observer = new MutationObserver(() => {
    if (!isGraphFormat()) {
      return
    }
    ensureEnhancedGraphSelector()
    void renderSelectedGraph()
  })
  observer.observe(document.body, { childList: true, subtree: true })
  ensureEnhancedGraphSelector()
  return () => {
    graphMainIsActive = false
    observer.disconnect()
    document.removeEventListener('click', handleOriginalGraphElement, true)
  }
}
