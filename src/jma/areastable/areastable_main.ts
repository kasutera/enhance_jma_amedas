import { globalColorScaleManager } from '../color_scale/color_scale_global'
import { DERIVED_OBSERVATION_DEFINITIONS } from '../derived_observations'
import {
  applyEnhancedObservationVisibility,
  ensureEnhancedObservationSelector,
} from '../enhanced_observation_selector'
import type { Feature } from '../feature'
import { AmedasClient } from '../integration/amedas_client'
import { getAreastableObservationTime } from '../integration/area_observation_time'
import { getTableContainer, isVisibleTable, JMA_SELECTORS } from '../integration/dom'
import { getJmaRoute } from '../integration/route'
import {
  getAreaStationIds,
  hasCompleteDerivedColumns,
  renderDerivedColumns,
} from '../integration/table_dom'
import { convertAmedasDataToAreastableColumns } from './presentation'

/** 監視はアプリケーションが所有する。ここでは地域表の更新と非同期描画の寿命だけを管理する。 */
export function areastable_main(): Feature {
  const client = new AmedasClient()
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
      const route = getJmaRoute().signature
      const observationTime = getAreastableObservationTime(container)
      const stationIds = getAreaStationIds(table)
      const input = `${route}\u0000${observationTime?.getTime() ?? ''}\u0000${stationIds.join(',')}`
      if (
        renderedInputs.get(table) === input &&
        hasCompleteDerivedColumns(table, 'area', columnClasses)
      ) {
        return
      }
      const observations = observationTime === null ? {} : await client.fetchArea(observationTime)
      if (
        disposed ||
        getTableContainer() !== container ||
        !container.contains(table) ||
        !isVisibleTable(table) ||
        getJmaRoute().signature !== route ||
        getAreastableObservationTime(container)?.getTime() !== observationTime?.getTime()
      ) {
        return
      }
      const currentStationIds = getAreaStationIds(table)
      if (currentStationIds.join(',') !== stationIds.join(',')) {
        return
      }
      const columns = convertAmedasDataToAreastableColumns(stationIds, observations)
      renderDerivedColumns(table, 'area', columns)
      for (const column of columns) {
        globalColorScaleManager.applyColorScaleToColumn(table, column.class)
      }
      applyEnhancedObservationVisibility(table)
      renderedInputs.set(table, input)
    } catch (error) {
      console.error('地域表の派生観測値を描画できませんでした:', error)
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
        JMA_SELECTORS.areaDataTable,
      ) ?? []) {
        void render(table)
      }
    },
    dispose() {
      disposed = true
    },
  }
}
