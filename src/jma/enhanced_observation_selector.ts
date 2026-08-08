import { TABLE_CLASS_NAMES } from './table_classes_definition'

/**
 * JMAの観測要素選択とは独立して管理する、派生観測要素の定義。
 *
 * JMAは地点ごとに異なるビットマスクで表示要素を管理しているため、
 * これらを `name="table-elem"` のチェックボックスとして扱わない。
 */
export const ENHANCED_OBSERVATION_ELEMENTS = [
  {
    key: 'volumetricHumidity',
    label: '容積絶対湿度',
    className: TABLE_CLASS_NAMES.volumetricHumidity,
  },
  {
    key: 'dewPoint',
    label: '露点温度',
    className: TABLE_CLASS_NAMES.dewPoint,
  },
  {
    key: 'temperatureHumidityIndex',
    label: '不快指数',
    className: TABLE_CLASS_NAMES.temperatureHumidityIndex,
  },
] as const

export type EnhancedObservationKey = (typeof ENHANCED_OBSERVATION_ELEMENTS)[number]['key']

const ENHANCED_SELECTOR_KEY_ATTRIBUTE = 'data-enhanced-observation-key'
const ENHANCED_SELECTOR_NAME = 'enhanced-table-elem'
const ENHANCED_SELECTOR_BLOCK_SELECTOR = '#amd-selector-div-block-items'
const ENHANCED_TABLE_SELECTOR = '.amd-table-seriestable, .amd-areastable'
const ENHANCED_DATA_ROW_SELECTOR =
  '.amd-table-tr-onthedot, .amd-table-tr-notonthedot, .amd-areastable-tr-pointdata'
const BULK_HANDLER_ATTRIBUTE = 'data-enhanced-bulk-handler-installed'

// 現在のuserscriptの挙動（派生3列を表示）を初期状態とする。
const selectedEnhancedObservationKeys = new Set<EnhancedObservationKey>(
  ENHANCED_OBSERVATION_ELEMENTS.map(({ key }) => key),
)

function isEnhancedObservationKey(value: string | null): value is EnhancedObservationKey {
  return ENHANCED_OBSERVATION_ELEMENTS.some(({ key }) => key === value)
}

function getEnhancedObservationDefinition(
  key: EnhancedObservationKey,
): (typeof ENHANCED_OBSERVATION_ELEMENTS)[number] {
  const definition = ENHANCED_OBSERVATION_ELEMENTS.find((element) => element.key === key)
  if (definition === undefined) {
    throw new Error(`未知の派生観測要素です: ${key}`)
  }
  return definition
}

export function isEnhancedObservationEnabled(key: EnhancedObservationKey): boolean {
  return selectedEnhancedObservationKeys.has(key)
}

function synchronizeEnhancedSelectorInputs(block: HTMLElement): void {
  const inputs = block.querySelectorAll<HTMLInputElement>(
    `input[${ENHANCED_SELECTOR_KEY_ATTRIBUTE}]`,
  )
  inputs.forEach((input) => {
    const key = input.getAttribute(ENHANCED_SELECTOR_KEY_ATTRIBUTE)
    if (isEnhancedObservationKey(key)) {
      input.checked = isEnhancedObservationEnabled(key)
    }
  })
}

function setAllEnhancedObservationEnabled(enabled: boolean): void {
  ENHANCED_OBSERVATION_ELEMENTS.forEach(({ key }) => {
    if (enabled) {
      selectedEnhancedObservationKeys.add(key)
    } else {
      selectedEnhancedObservationKeys.delete(key)
    }
  })
}

function handleBulkButtonClick(selectorContainer: HTMLElement, event: Event): void {
  if (!(event.target instanceof Element)) {
    return
  }

  const button = event.target.closest('.amd-selector-div-button')
  if (!(button instanceof HTMLElement) || !selectorContainer.contains(button)) {
    return
  }

  const label = button.textContent?.replaceAll(/\s+/g, '')
  if (label === 'すべて選択' || label === 'Selectall') {
    setAllEnhancedObservationEnabled(true)
  } else if (label === 'すべて解除' || label === 'Deselectall') {
    setAllEnhancedObservationEnabled(false)
  } else if (label === '初期表示要素を選択' || label === 'Returntoinitialdisplay') {
    setAllEnhancedObservationEnabled(true)
  } else {
    return
  }

  const block = selectorContainer.querySelector<HTMLElement>(ENHANCED_SELECTOR_BLOCK_SELECTOR)
  if (block !== null) {
    synchronizeEnhancedSelectorInputs(block)
  }
  applyEnhancedObservationVisibilityToAllTables()
}

function installBulkButtonHandler(block: HTMLElement): void {
  const selectorContainer = block.parentElement ?? block
  if (selectorContainer.getAttribute(BULK_HANDLER_ATTRIBUTE) === 'true') {
    return
  }

  // JMA側の一括操作より先にuserscript側の状態を更新する。
  selectorContainer.addEventListener(
    'click',
    (event) => handleBulkButtonClick(selectorContainer, event),
    true,
  )
  selectorContainer.setAttribute(BULK_HANDLER_ATTRIBUTE, 'true')
}

function createEnhancedSelectorItem(block: HTMLElement, key: EnhancedObservationKey): void {
  const definition = getEnhancedObservationDefinition(key)
  const item = document.createElement('div')
  item.classList.add('amd-selector-div-block-item')
  item.setAttribute(ENHANCED_SELECTOR_KEY_ATTRIBUTE, key)

  const input = document.createElement('input')
  input.type = 'checkbox'
  input.id = `enhanced-table-elem-${key}`
  input.name = ENHANCED_SELECTOR_NAME
  input.value = key
  input.classList.add('amd-selector-input-button')
  input.setAttribute(ENHANCED_SELECTOR_KEY_ATTRIBUTE, key)
  input.checked = isEnhancedObservationEnabled(key)
  input.addEventListener('change', () => {
    if (input.checked) {
      selectedEnhancedObservationKeys.add(key)
    } else {
      selectedEnhancedObservationKeys.delete(key)
    }
    applyEnhancedObservationVisibilityToAllTables()
  })

  const label = document.createElement('label')
  label.htmlFor = input.id
  label.classList.add('amd-selector-label-button')
  label.textContent = definition.label

  item.append(input, label)
  block.append(item)
}

/**
 * JMAが生成した観測要素リストへ派生要素を追加する。
 * JMAの地点別初期ビットマスクや既存チェック状態には触れない。
 */
export function ensureEnhancedObservationSelector(): void {
  const block = document.querySelector<HTMLElement>(ENHANCED_SELECTOR_BLOCK_SELECTOR)
  if (block === null) {
    return
  }

  ENHANCED_OBSERVATION_ELEMENTS.forEach(({ key }) => {
    const item = block.querySelector<HTMLElement>(`[${ENHANCED_SELECTOR_KEY_ATTRIBUTE}="${key}"]`)
    if (item === null) {
      createEnhancedSelectorItem(block, key)
    }
  })

  synchronizeEnhancedSelectorInputs(block)
  installBulkButtonHandler(block)
}

function getEnhancedDataCell(
  table: HTMLTableElement,
  className: string,
): HTMLTableCellElement | null {
  const rows = table.querySelectorAll<HTMLTableRowElement>(ENHANCED_DATA_ROW_SELECTOR)
  for (const row of rows) {
    const dataCell = row.querySelector<HTMLTableCellElement>(`.${className}`)
    if (dataCell !== null) {
      return dataCell
    }
  }
  return null
}

function setEnhancedColumnVisibility(
  table: HTMLTableElement,
  className: string,
  visible: boolean,
): void {
  table.querySelectorAll<HTMLElement>(`.${className}`).forEach((cell) => {
    cell.hidden = !visible
  })

  // simple-table-hidden-trにも同じ列の幅セルがあるため、非表示状態を同期する。
  const dataCell = getEnhancedDataCell(table, className)
  const hiddenRow = table.querySelector<HTMLTableRowElement>('.simple-table-hidden-tr')
  if (dataCell !== null && hiddenRow !== null) {
    const widthCell = hiddenRow.cells[dataCell.cellIndex]
    if (widthCell !== undefined) {
      widthCell.hidden = !visible
    }
  }
}

export function applyEnhancedObservationVisibility(table: HTMLTableElement): void {
  ENHANCED_OBSERVATION_ELEMENTS.forEach(({ key, className }) => {
    setEnhancedColumnVisibility(table, className, isEnhancedObservationEnabled(key))
  })
}

export function applyEnhancedObservationVisibilityToAllTables(): void {
  document.querySelectorAll<HTMLTableElement>(ENHANCED_TABLE_SELECTOR).forEach((table) => {
    applyEnhancedObservationVisibility(table)
  })
}

export function setEnhancedObservationEnabled(key: EnhancedObservationKey, enabled: boolean): void {
  if (enabled) {
    selectedEnhancedObservationKeys.add(key)
  } else {
    selectedEnhancedObservationKeys.delete(key)
  }
  applyEnhancedObservationVisibilityToAllTables()
}
