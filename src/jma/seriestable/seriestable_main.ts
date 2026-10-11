import { globalColorScaleManager } from '../color_scale/color_scale_global'
import { DERIVED_OBSERVATION_DEFINITIONS } from '../derived_observations'
import {
  applyEnhancedObservationVisibility,
  ensureEnhancedObservationSelector,
} from '../enhanced_observation_selector'
import type { Feature } from '../feature'
import { AmedasClient, fetchLatestTime } from '../integration/amedas_client'
import { getTableContainer, isVisibleTable, JMA_SELECTORS } from '../integration/dom'
import { getJmaRoute, getStationId } from '../integration/route'
import {
  getSeriesTimeSignature,
  getTimeSeries,
  hasCompleteDerivedColumns,
  renderDerivedColumns,
} from '../integration/table_dom'
import { convertAmedasDataToSeriestableColumns } from './presentation'

/** 同じ表への重複描画と、地点・日時・DOM変更後の古い応答の反映を防ぐ。 */
export function seriestable_main(): Feature {
  const renderingTables = new WeakSet<HTMLTableElement>()
  const pendingTables = new WeakSet<HTMLTableElement>()
  const renderedInputs = new WeakMap<HTMLTableElement, string>()
  const columnClasses = DERIVED_OBSERVATION_DEFINITIONS.map(({ className }) => className)
  let disposed = false

  async function render(table: HTMLTableElement): Promise<void> {
    const container = getTableContainer()
    if (disposed || container === null || !container.contains(table) || !isVisibleTable(table)) {
      return
    }
    if (renderingTables.has(table)) {
      pendingTables.add(table)
      return
    }
    renderingTables.add(table)
    try {
      const route = getJmaRoute()
      const rowSignature = getSeriesTimeSignature(table)
      const input = `${route.signature}\u0000${rowSignature}`
      if (
        renderedInputs.get(table) === input &&
        hasCompleteDerivedColumns(table, 'series', columnClasses)
      ) {
        return
      }
      const stationId = getStationId()
      if (route.historical && route.observationTime === null) {
        throw new Error('指定された過去日時を読み取れません。')
      }
      const reference = route.observationTime ?? (await fetchLatestTime())
      if (
        disposed ||
        getTableContainer() !== container ||
        !container.contains(table) ||
        !isVisibleTable(table) ||
        getJmaRoute().signature !== route.signature ||
        getSeriesTimeSignature(table) !== rowSignature
      ) {
        return
      }
      const dates = getTimeSeries(table, reference)
      const observations = await new AmedasClient().fetchPointRange(stationId, dates)
      if (
        disposed ||
        getTableContainer() !== container ||
        !container.contains(table) ||
        !isVisibleTable(table) ||
        getJmaRoute().signature !== route.signature ||
        getSeriesTimeSignature(table) !== rowSignature
      ) {
        return
      }
      const columns = convertAmedasDataToSeriestableColumns(observations)
      renderDerivedColumns(table, 'series', columns)
      for (const column of columns) {
        globalColorScaleManager.applyColorScaleToColumn(table, column.class)
      }
      applyEnhancedObservationVisibility(table)
      renderedInputs.set(table, input)
    } catch (error) {
      console.error('時系列表の派生観測値を描画できませんでした:', error)
    } finally {
      renderingTables.delete(table)
      if (pendingTables.delete(table) && !disposed) {
        void render(table)
      }
    }
  }

  return {
    refresh() {
      if (disposed) {
        return
      }
      ensureEnhancedObservationSelector()
      for (const table of getTableContainer()?.querySelectorAll<HTMLTableElement>(
        JMA_SELECTORS.seriesTable,
      ) ?? []) {
        void render(table)
      }
    },
    dispose() {
      disposed = true
    },
  }
}
