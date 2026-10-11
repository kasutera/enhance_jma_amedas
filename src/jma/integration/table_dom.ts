import type { DerivedObservationColumn } from '../derived_observations'
import { JMA_CLASSES, JMA_SELECTORS } from './dom'
import { getStationId } from './route'
import { parseSeriesObservationTime } from './series_observation_time'

export type TableKind = 'area' | 'series'

export function getDataRows(table: HTMLTableElement, kind: TableKind): HTMLTableRowElement[] {
  return Array.from(
    table.querySelectorAll<HTMLTableRowElement>(
      kind === 'area' ? JMA_SELECTORS.areaDataRow : JMA_SELECTORS.seriesDataRow,
    ),
  )
}

export function getAreaStationIds(table: HTMLTableElement): string[] {
  return Array.from(
    table.querySelectorAll<HTMLAnchorElement>(JMA_SELECTORS.areaPointLink),
    (link) => getStationId(link.href),
  )
}

/** 非同期取得中に同じ表の時刻行が置換された場合も旧応答を適用しないための入力識別子。 */
export function getSeriesTimeSignature(table: HTMLTableElement): string {
  return getDataRows(table, 'series')
    .map(
      (row) =>
        `${row.querySelector(JMA_SELECTORS.dayCell)?.textContent ?? ''}/${row.querySelector(JMA_SELECTORS.timeCell)?.textContent ?? ''}`,
    )
    .join('\u0000')
}

/** 表の行順を維持し、表示日時をJSTの実時刻へ変換する。 */
export function getTimeSeries(table: HTMLTableElement, reference: Date): Date[] {
  const dates: Date[] = []
  let dayText = ''
  let referenceTime = reference
  for (const row of getDataRows(table, 'series')) {
    const dayCell = row.querySelector(JMA_SELECTORS.dayCell)
    if (dayCell !== null) {
      dayText = dayCell.textContent?.trim() ?? ''
    }
    const timeText = row.querySelector(JMA_SELECTORS.timeCell)?.textContent?.trim() ?? ''
    const date = parseSeriesObservationTime(dayText, timeText, referenceTime)
    if (date === null) {
      throw new Error(`時刻の取得に失敗しました: ${dayText} ${timeText}`)
    }
    dates.push(date)
    referenceTime = date
  }
  return dates
}

export function hasCompleteDerivedColumns(
  table: HTMLTableElement,
  kind: TableKind,
  classes: readonly string[],
): boolean {
  const rows = [...table.querySelectorAll(JMA_SELECTORS.headerRow), ...getDataRows(table, kind)]
  return (
    rows.length > 0 &&
    rows.every((row) =>
      classes.every((className) => row.querySelectorAll(`.${className}`).length === 1),
    )
  )
}

/** 派生列を一括更新する。幅行は標準列から再計算し、再描画で列幅セルを増殖させない。 */
export function renderDerivedColumns(
  table: HTMLTableElement,
  kind: TableKind,
  columns: readonly DerivedObservationColumn[],
): void {
  const headers = Array.from(table.querySelectorAll<HTMLTableRowElement>(JMA_SELECTORS.headerRow))
  const rows = getDataRows(table, kind)
  if (headers.length === 0 || headers.length % 2 !== 0) {
    throw new Error(`contents-headerの数が不正です: ${headers.length}`)
  }
  for (const column of columns) {
    for (const cell of table.querySelectorAll(`.${column.class}`)) {
      cell.remove()
    }
  }
  const standardColumnCount = Array.from(headers[0].cells).reduce(
    (total, cell) => total + cell.colSpan,
    0,
  )
  const totalColumnCount = standardColumnCount + columns.length
  const widthRow = document.createElement('tr')
  widthRow.className = JMA_CLASSES.widthRow
  const headerCount = kind === 'series' ? 2 : 1
  const elementCount = totalColumnCount - headerCount
  const headerWeight = kind === 'series' ? 29 : 65
  const elementWeight = kind === 'series' ? 21 : 42
  const headerRatio = headerWeight / (headerWeight + elementWeight * elementCount)
  for (let index = 0; index < totalColumnCount; index++) {
    const cell = document.createElement('td')
    let ratio = (1 - headerRatio) / elementCount
    let minWidth = kind === 'series' ? 40 : 42
    if (index < headerCount) {
      ratio = headerRatio
      minWidth = 65
      if (kind === 'series') {
        ratio *= (index === 0 ? 9 : 16) / 25
        minWidth = index === 0 ? 20 : 35
      }
    }
    cell.style.width = `${ratio * 100}%`
    cell.style.minWidth = `${minWidth}px`
    cell.style.padding = '0px'
    widthRow.append(cell)
  }
  table.querySelector(JMA_SELECTORS.widthRow)?.remove()
  table.prepend(widthRow)

  for (const column of columns) {
    for (let index = 0; index < headers.length; index++) {
      const cell = document.createElement('th')
      cell.className = column.class
      const content = document.createElement('div')
      content.className =
        index % 2 === 0
          ? `${JMA_CLASSES.elementName} ${JMA_CLASSES.responsiveName}`
          : JMA_CLASSES.responsiveUnit
      content.textContent = index % 2 === 0 ? column.headerValue : column.headerUnit
      if (index % 2 === 0) {
        const wrapper = document.createElement('div')
        wrapper.append(content)
        cell.append(wrapper)
      } else {
        cell.append(content)
      }
      headers[index].append(cell)
    }
    for (let index = 0; index < rows.length; index++) {
      const cell = document.createElement('td')
      cell.className = column.class
      cell.textContent = column.values[index]
      rows[index].append(cell)
    }
  }
}
