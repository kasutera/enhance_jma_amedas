import { isGraphFormat } from './route'

/** JMA所有のDOM構造。userscript所有のID・属性は各機能で管理する。 */
export const JMA_SELECTORS = {
  tableContainer: '#amd-table',
  seriesTable: '.amd-table-seriestable',
  areaTable: '.amd-areastable',
  areaDataTable: '.amd-areastable.amd-table-responsive',
  areaPointLink: '.amd-areastable-a-pointlink',
  areaDataRow: '.amd-areastable-tr-pointdata',
  areaObservationTime: '.amd-areastable-span-obstime',
  seriesDataRow: '.amd-table-tr-onthedot, .amd-table-tr-notonthedot',
  latestSeriesRow:
    '.contents-wide-table-scroll .amd-table-seriestable .amd-table-tr-onthedot, .contents-wide-table-scroll .amd-table-seriestable .amd-table-tr-notonthedot',
  dataRow: '.amd-table-tr-onthedot, .amd-table-tr-notonthedot, .amd-areastable-tr-pointdata',
  observationTable: '.amd-table-seriestable, .amd-areastable',
  headerRow: '.contents-header',
  widthRow: '.simple-table-hidden-tr',
  dayCell: 'td[rowspan]',
  timeCell: 'td:not([rowspan])',
  titleContainer: '.contents-title',
  stationName: '.contents-title .amd-content-amdname',
  stationNameContent: '.amd-content-amdname',
  controllerHeading: '.amd-content-controller-item-head',
  radioButton: '.contents-radio-button',
  typedRadioButton: '.contents-radio-button[data-type]',
  graphObservationButton:
    '.contents-radio-button[data-type]:not([data-type="table1h"]):not([data-type="table10min"]):not([data-type="graph"])',
  graphContainer: '#amd-graph',
  graphTitle: '.amd-content-graph-title',
  selectorBlock: '#amd-selector-div-block-items',
  selectorBulkButton: '.amd-selector-div-button',
} as const

const JMA_REFRESH_SELECTORS = [
  JMA_SELECTORS.tableContainer,
  JMA_SELECTORS.seriesTable,
  JMA_SELECTORS.areaTable,
  JMA_SELECTORS.titleContainer,
  JMA_SELECTORS.stationNameContent,
  JMA_SELECTORS.controllerHeading,
  JMA_SELECTORS.radioButton,
  JMA_SELECTORS.graphContainer,
  JMA_SELECTORS.graphTitle,
  JMA_SELECTORS.selectorBlock,
  JMA_SELECTORS.selectorBulkButton,
].join(', ')

function isInsideJmaDom(element: Element): boolean {
  return element.closest(JMA_REFRESH_SELECTORS) !== null
}

function containsJmaDom(element: Element): boolean {
  return isInsideJmaDom(element) || element.querySelector(JMA_REFRESH_SELECTORS) !== null
}

function hasJmaDomInNodes(nodes: NodeList): boolean {
  for (const node of nodes) {
    if (node instanceof Element && containsJmaDom(node)) {
      return true
    }
  }
  return false
}

/** JMAの機能が依存するDOMに関係するMutationRecordだけを選ぶ。 */
export function hasRelevantJmaMutation(records: MutationRecord[]): boolean {
  return records.some((record) => {
    if (record.type === 'childList') {
      return (
        (record.target instanceof Element && isInsideJmaDom(record.target)) ||
        hasJmaDomInNodes(record.addedNodes) ||
        hasJmaDomInNodes(record.removedNodes)
      )
    }
    if (record.type === 'attributes') {
      return record.target instanceof Element && containsJmaDom(record.target)
    }
    if (record.type === 'characterData') {
      const parentElement = record.target.parentElement
      return parentElement !== null && isInsideJmaDom(parentElement)
    }
    return false
  })
}

export const JMA_CLASSES = {
  seriesTable: 'amd-table-seriestable',
  widthRow: 'simple-table-hidden-tr',
  elementName: 'amd-table-div-elemname',
  responsiveName: 'amd-table-elemname-resize-responsive',
  responsiveUnit: 'amd-table-elemunit-resize-responsive',
  controllerHeading: 'amd-content-controller-item-head',
  radioButton: 'contents-radio-button',
  radioEnabled: 'contents-radio-button-enabled',
  radioOn: 'contents-radio-button-on',
  radioOff: 'contents-radio-button-off',
  selectorItem: 'amd-selector-div-block-item',
  selectorInput: 'amd-selector-input-button',
  selectorLabel: 'amd-selector-label-button',
  graphGridline: 'amd-graph-line-gridline',
  graphDataPath: 'amd-graph-path-data',
  graphLegend: 'amd-graph-legend',
  graphLegendLine: 'amd-graph-legend-line',
} as const

export const FORMAT_TYPES = ['table1h', 'table10min', 'graph'] as const

export function getTableContainer(): HTMLElement | null {
  return document.querySelector<HTMLElement>(JMA_SELECTORS.tableContainer)
}

/** 非表示の複製表は拡張しない。JMAがスクロール版と固定版を同時に生成するため。 */
export function isVisibleTable(table: HTMLTableElement): boolean {
  return table.isConnected && table.parentElement?.style.display !== 'none'
}

export function getControllerRows(): HTMLTableRowElement[] {
  return Array.from(document.querySelectorAll<HTMLTableRowElement>('tr')).filter(
    (row) => row.querySelector(JMA_SELECTORS.typedRadioButton) !== null,
  )
}

export function getFormatRow(): HTMLTableRowElement | null {
  return (
    getControllerRows().find(
      (row) =>
        !row.hidden &&
        window.getComputedStyle(row).display !== 'none' &&
        FORMAT_TYPES.every(
          (type) => row.querySelector(`${JMA_SELECTORS.radioButton}[data-type="${type}"]`) !== null,
        ),
    ) ?? null
  )
}

export function getGraphObservationRow(): HTMLTableRowElement | null {
  return isGraphFormat()
    ? (getControllerRows().find(
        (row) =>
          !row.hidden &&
          window.getComputedStyle(row).display !== 'none' &&
          row.querySelector(JMA_SELECTORS.graphObservationButton) !== null,
      ) ?? null)
    : null
}

export function getGraphControlContainer(): HTMLElement | null {
  return getGraphObservationRow()?.querySelector<HTMLElement>('td') ?? null
}
