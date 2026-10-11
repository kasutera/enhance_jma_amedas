import {
  DERIVED_OBSERVATION_DEFINITIONS,
  type DerivedObservationKey,
  getDerivedObservationValue,
} from '../derived_observations'
import type { Feature } from '../feature'
import { AmedasClient, fetchLatestTime } from '../integration/amedas_client'
import { getGraphControlContainer, JMA_CLASSES, JMA_SELECTORS } from '../integration/dom'
import { getJmaRoute, getStationId, isGraphFormat } from '../integration/route'
import {
  type GraphDataPoint,
  renderEnhancedGraph,
  renderEnhancedGraphError,
} from './graph_renderer'

const GRAPH_SELECTOR_ATTRIBUTE = 'data-enhanced-graph-key'
const TEN_MINUTES_MILLISECONDS = 10 * 60 * 1000

function getGraphDates(end: Date): Date[] {
  const roundedEnd = Math.floor(end.getTime() / TEN_MINUTES_MILLISECONDS) * TEN_MINUTES_MILLISECONDS
  const dates: Date[] = []
  for (let offset = 48 * 6; offset >= 0; offset--) {
    dates.push(new Date(roundedEnd - offset * TEN_MINUTES_MILLISECONDS))
  }
  return dates
}

/** グラフの選択状態・イベント・非同期描画を一つの機能の寿命に閉じ込める。 */
export function graph_main(): Feature {
  let activeKey: DerivedObservationKey | undefined
  let disposed = false
  let rendering = false
  let revision = 0
  let lastRoute = getJmaRoute().signature
  let lastContainer: HTMLElement | null = null

  function synchronizeButtons(container: HTMLElement): void {
    for (const button of container.querySelectorAll<HTMLElement>(JMA_SELECTORS.radioButton)) {
      const key = button.getAttribute(GRAPH_SELECTOR_ATTRIBUTE)
      if (key === null && activeKey === undefined) {
        continue
      }
      button.classList.toggle(JMA_CLASSES.radioOn, key === activeKey)
      button.classList.toggle(JMA_CLASSES.radioOff, key !== activeKey)
    }
  }

  function ensureSelector(): void {
    const controls = getGraphControlContainer()
    if (controls === null) {
      return
    }
    for (const definition of DERIVED_OBSERVATION_DEFINITIONS) {
      if (controls.querySelector(`[${GRAPH_SELECTOR_ATTRIBUTE}="${definition.key}"]`) !== null) {
        continue
      }
      const button = document.createElement('div')
      button.classList.add(JMA_CLASSES.radioButton, JMA_CLASSES.radioEnabled, JMA_CLASSES.radioOff)
      button.setAttribute(GRAPH_SELECTOR_ATTRIBUTE, definition.key)
      button.title = definition.label
      button.textContent = definition.label
      controls.append(button)
    }
    synchronizeButtons(controls)
  }

  async function renderSelectedGraph(): Promise<void> {
    const key = activeKey
    const container = document.querySelector<HTMLElement>(JMA_SELECTORS.graphContainer)
    if (
      disposed ||
      key === undefined ||
      container === null ||
      !isGraphFormat() ||
      rendering ||
      container.querySelector('#enhanced-amd-graph, #enhanced-amd-graph-error') !== null
    ) {
      return
    }
    rendering = true
    const renderRevision = revision
    const route = getJmaRoute()
    const isCurrentRequest = () =>
      !disposed &&
      activeKey === key &&
      revision === renderRevision &&
      getJmaRoute().signature === route.signature &&
      document.querySelector(JMA_SELECTORS.graphContainer) === container &&
      container.isConnected &&
      isGraphFormat()
    try {
      const stationId = getStationId()
      if (route.historical && route.observationTime === null) {
        throw new Error('指定された過去日時を読み取れません。')
      }
      const end = route.observationTime ?? (await fetchLatestTime())
      if (!isCurrentRequest()) {
        return
      }
      const observations = await new AmedasClient().fetchPointRange(stationId, getGraphDates(end))
      if (!isCurrentRequest()) {
        return
      }
      const definition = DERIVED_OBSERVATION_DEFINITIONS.find((element) => element.key === key)
      if (definition === undefined) {
        return
      }
      const points: GraphDataPoint[] = observations.map((observation) => ({
        date: observation.date,
        value: getDerivedObservationValue(observation, definition),
      }))
      renderEnhancedGraph(container, definition.label, definition.unit, points)
    } catch (error) {
      console.error('派生観測要素のグラフ生成中にエラーが発生しました:', error)
      if (isCurrentRequest()) {
        renderEnhancedGraphError(container)
      }
    } finally {
      rendering = false
      if (
        !disposed &&
        activeKey !== undefined &&
        isGraphFormat() &&
        (revision !== renderRevision || getJmaRoute().signature !== route.signature)
      ) {
        void renderSelectedGraph()
      }
    }
  }

  function handleSelection(event: Event): void {
    if (disposed || !(event.target instanceof Element)) {
      return
    }
    const button = event.target.closest<HTMLElement>(JMA_SELECTORS.radioButton)
    const controls = getGraphControlContainer()
    if (button === null || controls === null || !controls.contains(button)) {
      return
    }
    const key = button.getAttribute(GRAPH_SELECTOR_ATTRIBUTE)
    const definition = DERIVED_OBSERVATION_DEFINITIONS.find((element) => element.key === key)
    activeKey = definition?.key
    revision += 1
    if (activeKey !== undefined) {
      document.querySelector(JMA_SELECTORS.graphContainer)?.replaceChildren()
    }
    synchronizeButtons(controls)
    void renderSelectedGraph()
  }

  document.addEventListener('click', handleSelection, true)
  return {
    refresh() {
      if (disposed) {
        return
      }
      const route = getJmaRoute().signature
      const container = document.querySelector<HTMLElement>(JMA_SELECTORS.graphContainer)
      if (route !== lastRoute || container !== lastContainer) {
        lastRoute = route
        lastContainer = container
        revision += 1
        if (container?.querySelector('#enhanced-amd-graph, #enhanced-amd-graph-error')) {
          container.replaceChildren()
        }
      }
      if (isGraphFormat()) {
        ensureSelector()
        void renderSelectedGraph()
      }
    },
    dispose() {
      disposed = true
      revision += 1
      document.removeEventListener('click', handleSelection, true)
      const container = document.querySelector(JMA_SELECTORS.graphContainer)
      if (container?.querySelector('#enhanced-amd-graph, #enhanced-amd-graph-error')) {
        container.replaceChildren()
      }
      for (const button of document.querySelectorAll(`[${GRAPH_SELECTOR_ATTRIBUTE}]`)) {
        button.remove()
      }
    },
  }
}
