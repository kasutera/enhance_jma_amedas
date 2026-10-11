import { DERIVED_OBSERVATION_DEFINITIONS, type DerivedObservationKey } from './derived_observations'
import type { Feature } from './feature'
import { JMA_CLASSES, JMA_SELECTORS } from './integration/dom'
import { isGraphFormat } from './integration/route'

// JMAは地点ごとのビットマスクで標準要素を管理する。
// 派生要素は独立した状態と name="enhanced-table-elem" で扱う。

const ENHANCED_SELECTOR_KEY_ATTRIBUTE = 'data-enhanced-observation-key'
const ENHANCED_SELECTOR_NAME = 'enhanced-table-elem'

// 現在のuserscriptの挙動（派生3列を表示）を初期状態とする。
const selectedEnhancedObservationKeys = new Set<DerivedObservationKey>(
  DERIVED_OBSERVATION_DEFINITIONS.map(({ key }) => key),
)

function isEnhancedObservationKey(value: string | null): value is DerivedObservationKey {
  return DERIVED_OBSERVATION_DEFINITIONS.some(({ key }) => key === value)
}

function getEnhancedObservationDefinition(
  key: DerivedObservationKey,
): (typeof DERIVED_OBSERVATION_DEFINITIONS)[number] {
  const definition = DERIVED_OBSERVATION_DEFINITIONS.find((element) => element.key === key)
  if (definition === undefined) {
    throw new Error(`未知の派生観測要素です: ${key}`)
  }
  return definition
}

function isEnhancedObservationEnabled(key: DerivedObservationKey): boolean {
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
  DERIVED_OBSERVATION_DEFINITIONS.forEach(({ key }) => {
    if (enabled) {
      selectedEnhancedObservationKeys.add(key)
    } else {
      selectedEnhancedObservationKeys.delete(key)
    }
  })
}

function handleBulkButtonClick(event: Event): void {
  if (!(event.target instanceof Element)) {
    return
  }

  const button = event.target.closest(JMA_SELECTORS.selectorBulkButton)
  if (!(button instanceof HTMLElement)) {
    return
  }
  let container = button.parentElement
  while (
    container !== null &&
    container.querySelector<HTMLElement>(JMA_SELECTORS.selectorBlock) === null
  ) {
    container = container.parentElement
  }
  const block = container?.querySelector<HTMLElement>(JMA_SELECTORS.selectorBlock)
  if (block === null || block === undefined) {
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

  synchronizeEnhancedSelectorInputs(block)
  applyEnhancedObservationVisibilityToAllTables()
}

function handleEnhancedSelectorChange(event: Event): void {
  if (!(event.target instanceof HTMLInputElement)) {
    return
  }
  const input = event.target
  const key = input.getAttribute(ENHANCED_SELECTOR_KEY_ATTRIBUTE)
  if (!isEnhancedObservationKey(key) || input.closest(JMA_SELECTORS.selectorBlock) === null) {
    return
  }
  if (input.checked) {
    selectedEnhancedObservationKeys.add(key)
  } else {
    selectedEnhancedObservationKeys.delete(key)
  }
  applyEnhancedObservationVisibilityToAllTables()
}

function createEnhancedSelectorItem(block: HTMLElement, key: DerivedObservationKey): void {
  const definition = getEnhancedObservationDefinition(key)
  const item = document.createElement('div')
  item.classList.add(JMA_CLASSES.selectorItem)
  item.setAttribute(ENHANCED_SELECTOR_KEY_ATTRIBUTE, key)

  const input = document.createElement('input')
  input.type = 'checkbox'
  input.id = `enhanced-table-elem-${key}`
  input.name = ENHANCED_SELECTOR_NAME
  input.value = key
  input.classList.add(JMA_CLASSES.selectorInput)
  input.setAttribute(ENHANCED_SELECTOR_KEY_ATTRIBUTE, key)
  input.checked = isEnhancedObservationEnabled(key)

  const label = document.createElement('label')
  label.htmlFor = input.id
  label.classList.add(JMA_CLASSES.selectorLabel)
  label.textContent = definition.label

  item.append(input, label)
  block.append(item)
}

/**
 * JMAが生成した観測要素リストへ派生要素を追加する。
 * JMAの地点別初期ビットマスクや既存チェック状態には触れない。
 */
export function ensureEnhancedObservationSelector(): void {
  // グラフ画面ではgraph_mainが専用の選択UIを生成する。
  if (isGraphFormat()) {
    return
  }
  const block = document.querySelector<HTMLElement>(JMA_SELECTORS.selectorBlock)
  if (block === null) {
    return
  }

  DERIVED_OBSERVATION_DEFINITIONS.forEach(({ key }) => {
    const item = block.querySelector<HTMLElement>(`[${ENHANCED_SELECTOR_KEY_ATTRIBUTE}="${key}"]`)
    if (item === null) {
      createEnhancedSelectorItem(block, key)
    }
  })

  synchronizeEnhancedSelectorInputs(block)
}

function getEnhancedDataCell(
  table: HTMLTableElement,
  className: string,
): HTMLTableCellElement | null {
  const rows = table.querySelectorAll<HTMLTableRowElement>(JMA_SELECTORS.dataRow)
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
  const hidden = !visible
  table.querySelectorAll<HTMLElement>(`.${className}`).forEach((cell) => {
    if (cell.hidden !== hidden) {
      cell.hidden = hidden
    }
  })

  // 幅調整用の非表示行にも同じ列の幅セルがあるため、非表示状態を同期する。
  const dataCell = getEnhancedDataCell(table, className)
  const hiddenRow = table.querySelector<HTMLTableRowElement>(JMA_SELECTORS.widthRow)
  if (dataCell !== null && hiddenRow !== null) {
    const widthCell = hiddenRow.cells[dataCell.cellIndex]
    if (widthCell !== undefined && widthCell.hidden !== hidden) {
      widthCell.hidden = hidden
    }
  }
}

export function applyEnhancedObservationVisibility(table: HTMLTableElement): void {
  DERIVED_OBSERVATION_DEFINITIONS.forEach(({ key, className }) => {
    setEnhancedColumnVisibility(table, className, isEnhancedObservationEnabled(key))
  })
}

function applyEnhancedObservationVisibilityToAllTables(): void {
  document.querySelectorAll<HTMLTableElement>(JMA_SELECTORS.observationTable).forEach((table) => {
    applyEnhancedObservationVisibility(table)
  })
}

/** アプリケーションが所有する派生観測要素UIと委譲イベントのライフサイクル。 */
export function initializeEnhancedObservationSelector(): Feature {
  let disposed = false
  const handleChange = (event: Event) => {
    if (!disposed) {
      handleEnhancedSelectorChange(event)
    }
  }
  const handleBulkClick = (event: Event) => {
    if (!disposed) {
      handleBulkButtonClick(event)
    }
  }
  const refresh = () => {
    if (disposed) {
      return
    }
    ensureEnhancedObservationSelector()
    applyEnhancedObservationVisibilityToAllTables()
  }

  document.addEventListener('change', handleChange)
  document.addEventListener('click', handleBulkClick, true)
  refresh()

  return {
    refresh,
    dispose() {
      if (disposed) {
        return
      }
      disposed = true
      document.removeEventListener('change', handleChange)
      document.removeEventListener('click', handleBulkClick, true)
      document
        .querySelectorAll<HTMLElement>(
          `${JMA_SELECTORS.selectorBlock} > .${JMA_CLASSES.selectorItem}[${ENHANCED_SELECTOR_KEY_ATTRIBUTE}]`,
        )
        .forEach((item) => {
          item.remove()
        })
    },
  }
}
