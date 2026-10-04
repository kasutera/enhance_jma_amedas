// areastable 用の監視・編集処理

import { globalColorScaleManager } from '../color_scale/color_scale_global'
import {
  applyEnhancedObservationVisibility,
  ensureEnhancedObservationSelector,
} from '../enhanced_observation_selector'
import { TABLE_CLASS_NAMES } from '../table_classes_definition'
import { _getAmdnos, appendColumnToAreastable } from './dom_handler'
import { AmedasFetcher } from './jma_amedas_fetcher'
import { getAreastableObservationTime } from './observation_time'
import { convertAmedasDataToSeriestableRow as convertAmedasDataToAreastableRow } from './presentation'

export function areastable_main() {
  const fetcher = new AmedasFetcher()
  ensureEnhancedObservationSelector()

  const tableContainer = document.querySelector('#amd-table')
  if (tableContainer === null) {
    return
  }
  const observationTarget = tableContainer

  const renderingTables = new WeakSet<HTMLTableElement>()
  const renderedObservationTimes = new WeakMap<HTMLTableElement, number | null>()
  const derivedColumnClasses = [
    TABLE_CLASS_NAMES.volumetricHumidity,
    TABLE_CLASS_NAMES.dewPoint,
    TABLE_CLASS_NAMES.temperatureHumidityIndex,
  ]

  function isCurrentTable(areastable: HTMLTableElement): boolean {
    return (
      document.querySelector('#amd-table') === observationTarget &&
      observationTarget.isConnected &&
      observationTarget.contains(areastable) &&
      areastable.parentElement?.style.display !== 'none'
    )
  }

  function hasCompleteDerivedColumns(areastable: HTMLTableElement): boolean {
    const rows = areastable.querySelectorAll('.contents-header, .amd-areastable-tr-pointdata')
    if (rows.length === 0) {
      return false
    }
    for (const row of rows) {
      for (const className of derivedColumnClasses) {
        if (row.querySelector(`.${className}`) === null) {
          return false
        }
      }
    }
    return true
  }

  async function renderAreastable(areastable: HTMLTableElement): Promise<void> {
    if (!isCurrentTable(areastable) || renderingTables.has(areastable)) {
      return
    }

    renderingTables.add(areastable)
    let requestedObservationTime: number | null | undefined
    try {
      // JMAの表再生成時にも派生要素の選択UIを復元する。
      // JMA側の地点別ビットマスクには触れない。
      ensureEnhancedObservationSelector()

      const observationTime = getAreastableObservationTime(observationTarget)
      const observationTimeValue = observationTime?.getTime() ?? null
      requestedObservationTime = observationTimeValue
      if (
        renderedObservationTimes.get(areastable) === observationTimeValue &&
        hasCompleteDerivedColumns(areastable)
      ) {
        return
      }

      // 地点リンクは表示中のデータ表から取得する。地域変更時に古い表の地点を使わない。
      const amdnos = Array.from(
        areastable.querySelectorAll<HTMLAnchorElement>('.amd-areastable-a-pointlink'),
      ).map(_getAmdnos)
      const fetched = observationTime === null ? {} : await fetcher.fetchAmedasData(observationTime)

      const currentObservationTime = getAreastableObservationTime(observationTarget)
      if (
        !isCurrentTable(areastable) ||
        (currentObservationTime?.getTime() ?? null) !== observationTimeValue
      ) {
        return
      }

      // 同じDOM表で見出し時刻だけが更新された場合、以前の値を残さず再描画する。
      for (const className of derivedColumnClasses) {
        for (const oldCell of areastable.querySelectorAll(`.${className}`)) {
          oldCell.remove()
        }
      }

      const [volumetricHumidityRow, dewPointRow, temperatureHumidityIndexRow] =
        convertAmedasDataToAreastableRow(amdnos, fetched)
      appendColumnToAreastable(areastable, volumetricHumidityRow)
      appendColumnToAreastable(areastable, dewPointRow)
      appendColumnToAreastable(areastable, temperatureHumidityIndexRow)
      renderedObservationTimes.set(areastable, observationTimeValue)

      // カラースケールを適用（全ての対象列）
      globalColorScaleManager.applyColorScaleToColumn(
        areastable,
        TABLE_CLASS_NAMES.volumetricHumidity,
      )
      globalColorScaleManager.applyColorScaleToColumn(areastable, TABLE_CLASS_NAMES.dewPoint)
      globalColorScaleManager.applyColorScaleToColumn(
        areastable,
        TABLE_CLASS_NAMES.temperatureHumidityIndex,
      )

      applyEnhancedObservationVisibility(areastable)
    } finally {
      renderingTables.delete(areastable)
      if (
        isCurrentTable(areastable) &&
        requestedObservationTime !== undefined &&
        (getAreastableObservationTime(observationTarget)?.getTime() ?? null) !==
          requestedObservationTime
      ) {
        void renderAreastable(areastable)
      }
    }
  }

  const observer = new MutationObserver(() => {
    for (const table of observationTarget.querySelectorAll<HTMLTableElement>(
      '.amd-areastable.amd-table-responsive',
    )) {
      void renderAreastable(table)
    }
  })
  observer.observe(observationTarget, {
    attributes: true,
    childList: true,
    subtree: true,
    characterData: true,
  })

  // コンテナと表が一括挿入された場合、監視開始前の表も描画する。
  for (const table of observationTarget.querySelectorAll<HTMLTableElement>(
    '.amd-areastable.amd-table-responsive',
  )) {
    if (table.parentElement?.style.display !== 'none') {
      void renderAreastable(table)
    }
  }
}
