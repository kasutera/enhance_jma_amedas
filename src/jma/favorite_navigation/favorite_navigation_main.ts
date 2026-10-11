import type { Feature } from '../feature'
import {
  getFormatRow,
  getGraphObservationRow,
  JMA_CLASSES,
  JMA_SELECTORS,
} from '../integration/dom'
import { getJmaRoute, navigateToStation } from '../integration/route'

const FAVORITES_STORAGE_KEY = 'enhance-jma-amedas-favorite-stations-v1'
const FAVORITES_ROW_ID = 'enhanced-favorite-stations-row'
const FAVORITES_LIST_ID = 'enhanced-favorite-stations'
const FAVORITE_AMDNO_ATTRIBUTE = 'data-enhanced-favorite-amdno'
const FAVORITE_TOGGLE_ID = 'enhanced-favorite-toggle'
const FAVORITE_TITLE_LAYOUT_CLASS = 'enhanced-favorite-title-layout'
const FAVORITES_STATE_ATTRIBUTE = 'data-enhanced-favorites-state'
const ACTIVE_ROW_ATTRIBUTE = 'data-enhanced-keyboard-active'
const STYLE_ID = 'enhanced-favorite-navigation-style'

type NavigationRow = 'favorites' | 'format' | 'observation'

interface FavoriteStation {
  amdno: string
  name: string
  areaType?: string
  areaCode?: string
}

interface NavigationState {
  activeRow: NavigationRow
  keyboardStarted: boolean
  disposed: boolean
}

function isFavoriteStation(value: unknown): value is FavoriteStation {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.amdno === 'string' &&
    /^\d+$/.test(candidate.amdno) &&
    typeof candidate.name === 'string' &&
    candidate.name.length > 0 &&
    (candidate.areaType === undefined || typeof candidate.areaType === 'string') &&
    (candidate.areaCode === undefined || typeof candidate.areaCode === 'string')
  )
}

function loadFavoriteStations(): FavoriteStation[] {
  try {
    const stored = localStorage.getItem(FAVORITES_STORAGE_KEY)
    if (stored === null) {
      return []
    }
    const parsed: unknown = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed.filter(isFavoriteStation) : []
  } catch (error) {
    console.warn('お気に入り地点を読み込めませんでした:', error)
    return []
  }
}

function saveFavoriteStations(stations: FavoriteStation[]): boolean {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(stations))
    return true
  } catch (error) {
    console.warn('お気に入り地点を保存できませんでした:', error)
    return false
  }
}

function getCurrentStation(): FavoriteStation | null {
  const route = getJmaRoute()
  const amdno = route.stationId
  const nameElement = document.querySelector<HTMLElement>(JMA_SELECTORS.stationName)
  if (amdno === null || nameElement === null) {
    return null
  }
  const fullName = nameElement.textContent?.trim() ?? amdno
  const name = fullName.split('(')[0]?.trim() || fullName
  return {
    amdno,
    name,
    areaType: route.areaType ?? undefined,
    areaCode: route.areaCode ?? undefined,
  }
}

function createRadioButton(label: string): HTMLDivElement {
  const button = document.createElement('div')
  button.classList.add(JMA_CLASSES.radioButton, JMA_CLASSES.radioEnabled, JMA_CLASSES.radioOff)
  button.role = 'button'
  button.tabIndex = 0
  button.title = label
  button.textContent = label
  return button
}

function updateCurrentFavorite(
  current: FavoriteStation,
  isFavorite: boolean,
  state: NavigationState,
): void {
  if (state.disposed) {
    return
  }
  const favorites = loadFavoriteStations()
  const updated = isFavorite
    ? favorites.filter(({ amdno }) => amdno !== current.amdno)
    : [...favorites.filter(({ amdno }) => amdno !== current.amdno), current]
  if (saveFavoriteStations(updated)) {
    renderFavoriteToggle(current, updated)
    renderFavoriteRow(getFormatRow(), current, updated)
    synchronizeNavigationHighlight(state)
  }
}

function renderFavoriteToggle(current: FavoriteStation, favorites: FavoriteStation[]): void {
  const titleCell = document.querySelector<HTMLElement>(JMA_SELECTORS.stationName)?.closest('th')
  if (!(titleCell instanceof HTMLTableCellElement)) {
    return
  }

  let layout = Array.from(titleCell.children).find((child) =>
    child.classList.contains(FAVORITE_TITLE_LAYOUT_CLASS),
  )
  if (!(layout instanceof HTMLElement)) {
    const content = Array.from(titleCell.children).find(
      (child) =>
        child instanceof HTMLElement &&
        child.querySelector(JMA_SELECTORS.stationNameContent) !== null,
    )
    if (!(content instanceof HTMLElement)) {
      return
    }
    layout = document.createElement('div')
    layout.classList.add(FAVORITE_TITLE_LAYOUT_CLASS)
    titleCell.append(layout)
    layout.append(content)
  }

  let toggle = layout.querySelector<HTMLButtonElement>(`#${FAVORITE_TOGGLE_ID}`)
  if (toggle === null) {
    toggle = document.createElement('button')
    toggle.id = FAVORITE_TOGGLE_ID
    toggle.type = 'button'
    toggle.classList.add('enhanced-favorite-toggle')
    layout.append(toggle)
  }

  const isFavorite = favorites.some(({ amdno }) => amdno === current.amdno)
  const symbol = isFavorite ? '★' : '☆'
  const label = isFavorite ? 'お気に入りから解除' : 'お気に入りに追加'
  if (toggle.textContent !== symbol) {
    toggle.textContent = symbol
  }
  if (toggle.getAttribute('aria-label') !== label) {
    toggle.setAttribute('aria-label', label)
  }
  if (toggle.getAttribute('aria-pressed') !== `${isFavorite}`) {
    toggle.setAttribute('aria-pressed', `${isFavorite}`)
  }
}

function renderFavoriteRow(
  formatRow: HTMLTableRowElement | null,
  current: FavoriteStation,
  favorites: FavoriteStation[],
): void {
  if (formatRow === null) {
    return
  }
  if (favorites.length === 0) {
    document.querySelector(`#${FAVORITES_ROW_ID}`)?.remove()
    return
  }
  let row = document.querySelector<HTMLTableRowElement>(`#${FAVORITES_ROW_ID}`)
  if (row === null) {
    row = document.createElement('tr')
    row.id = FAVORITES_ROW_ID
    formatRow.before(row)
  } else if (row.nextElementSibling !== formatRow) {
    formatRow.before(row)
  }

  // ハッシュ変更直後はJMA側の地点名DOMがまだ旧地点のことがある。
  // current全体を比較対象にし、地点名の再描画後もお気に入り状態を同期する。
  const favoritesState = JSON.stringify({ current, favorites })
  if (row.getAttribute(FAVORITES_STATE_ATTRIBUTE) === favoritesState) {
    return
  }
  row.setAttribute(FAVORITES_STATE_ATTRIBUTE, favoritesState)

  const heading = document.createElement('th')
  heading.classList.add(JMA_CLASSES.controllerHeading)
  heading.scope = 'row'
  heading.textContent = 'お気に入り'

  const cell = document.createElement('td')
  const list = document.createElement('div')
  list.id = FAVORITES_LIST_ID

  favorites.forEach((station) => {
    const button = createRadioButton(station.name)
    button.setAttribute(FAVORITE_AMDNO_ATTRIBUTE, station.amdno)
    const selected = station.amdno === current.amdno
    button.classList.toggle(JMA_CLASSES.radioOn, selected)
    button.classList.toggle(JMA_CLASSES.radioOff, !selected)
    button.setAttribute('aria-pressed', `${selected}`)

    list.append(button)
  })

  cell.append(list)
  row.replaceChildren(heading, cell)
}

function removeFavoriteToggle(): void {
  document.querySelectorAll<HTMLButtonElement>(`#${FAVORITE_TOGGLE_ID}`).forEach((toggle) => {
    const layout = toggle.parentElement
    if (layout?.classList.contains(FAVORITE_TITLE_LAYOUT_CLASS)) {
      const titleCell = layout.parentElement
      const content = Array.from(layout.children).find((child) => child !== toggle)
      if (titleCell !== null && content !== undefined) {
        titleCell.insertBefore(content, layout)
      }
      layout.remove()
      return
    }
    toggle.remove()
  })
}

function installStyle(): void {
  if (document.querySelector(`#${STYLE_ID}`) !== null) {
    return
  }
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    #${FAVORITES_LIST_ID} {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.25rem;
    }
    #${FAVORITES_LIST_ID} .${JMA_CLASSES.radioButton} {
      margin: 0;
    }
    .${FAVORITE_TITLE_LAYOUT_CLASS} {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }
    .${FAVORITE_TITLE_LAYOUT_CLASS} > :first-child {
      min-width: 0;
    }
    #${FAVORITE_TOGGLE_ID} {
      flex: 0 0 auto;
      min-width: 3.5rem;
      min-height: 3.5rem;
      padding: 0.25rem 0.5rem;
      border: 2px solid #ffd700;
      border-radius: 0.375rem;
      background: rgba(0, 0, 0, 0.28);
      color: #ffd700;
      cursor: pointer;
      font: inherit;
      font-size: 2.5rem;
      line-height: 1;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
      transition:
        background-color 120ms ease,
        box-shadow 120ms ease,
        transform 120ms ease;
    }
    #${FAVORITE_TOGGLE_ID}:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    #${FAVORITE_TOGGLE_ID}[aria-pressed="true"] {
      background: rgba(255, 215, 0, 0.22);
    }
    #${FAVORITE_TOGGLE_ID}:active {
      transform: translateY(1px);
      box-shadow: 0 0 1px rgba(0, 0, 0, 0.35);
    }
    #${FAVORITE_TOGGLE_ID}:focus-visible {
      outline: 3px solid #fff;
      outline-offset: 2px;
    }
    tr[${ACTIVE_ROW_ATTRIBUTE}="true"] > th,
    tr[${ACTIVE_ROW_ATTRIBUTE}="true"] > td {
      box-shadow: inset 0 0 0 2px #1a73e8;
    }
  `
  document.head.append(style)
}

function ensureFavoriteNavigationUi(state: NavigationState): void {
  if (state.disposed) {
    return
  }
  const current = getCurrentStation()
  if (current === null) {
    removeFavoriteToggle()
    document.querySelector(`#${FAVORITES_ROW_ID}`)?.remove()
    document.querySelector(`#${STYLE_ID}`)?.remove()
    document.querySelectorAll<HTMLTableRowElement>(`tr[${ACTIVE_ROW_ATTRIBUTE}]`).forEach((row) => {
      row.removeAttribute(ACTIVE_ROW_ATTRIBUTE)
    })
    state.activeRow = 'format'
    state.keyboardStarted = false
    return
  }
  const formatRow = getFormatRow()
  if (formatRow === null) {
    return
  }
  installStyle()
  const favorites = loadFavoriteStations()
  renderFavoriteToggle(current, favorites)
  renderFavoriteRow(formatRow, current, favorites)
  synchronizeNavigationHighlight(state)
}

function getNavigationRows(): Array<{ name: NavigationRow; row: HTMLTableRowElement }> {
  const rows: Array<{ name: NavigationRow; row: HTMLTableRowElement }> = []
  const favorites = document.querySelector<HTMLTableRowElement>(`#${FAVORITES_ROW_ID}`)
  const format = getFormatRow()
  const observation = getGraphObservationRow()
  if (favorites !== null) {
    rows.push({ name: 'favorites', row: favorites })
  }
  if (format !== null) {
    rows.push({ name: 'format', row: format })
  }
  if (observation !== null) {
    rows.push({ name: 'observation', row: observation })
  }
  return rows
}

function synchronizeNavigationHighlight(state: NavigationState): void {
  document.querySelectorAll<HTMLTableRowElement>(`tr[${ACTIVE_ROW_ATTRIBUTE}]`).forEach((row) => {
    row.removeAttribute(ACTIVE_ROW_ATTRIBUTE)
  })
  if (!state.keyboardStarted) {
    return
  }
  const rows = getNavigationRows()
  const active = rows.find(({ name }) => name === state.activeRow)
  const fallback = rows.find(({ name }) => name === 'format') ?? rows[0]
  const target = active ?? fallback
  if (target !== undefined) {
    state.activeRow = target.name
    target.row.setAttribute(ACTIVE_ROW_ATTRIBUTE, 'true')
  }
}

function moveBetweenRows(direction: -1 | 1, state: NavigationState): void {
  const rows = getNavigationRows()
  if (rows.length === 0) {
    return
  }
  const currentIndex = rows.findIndex(({ name }) => name === state.activeRow)
  const defaultIndex = Math.max(
    0,
    rows.findIndex(({ name }) => name === 'format'),
  )
  const index = currentIndex < 0 ? defaultIndex : currentIndex
  const nextIndex = Math.min(rows.length - 1, Math.max(0, index + direction))
  state.activeRow = rows[nextIndex]?.name ?? state.activeRow
  synchronizeNavigationHighlight(state)
}

function getButtonsForActiveRow(state: NavigationState): HTMLElement[] {
  if (state.activeRow === 'favorites') {
    return Array.from(
      document.querySelectorAll<HTMLElement>(`#${FAVORITES_ROW_ID} [${FAVORITE_AMDNO_ATTRIBUTE}]`),
    )
  }
  if (state.activeRow === 'format') {
    const row = getFormatRow()
    return row === null
      ? []
      : Array.from(row.querySelectorAll<HTMLElement>(JMA_SELECTORS.typedRadioButton))
  }
  const row = getGraphObservationRow()
  return row === null
    ? []
    : Array.from(row.querySelectorAll<HTMLElement>(JMA_SELECTORS.radioButton))
}

function getSelectedButtonIndex(buttons: HTMLElement[], state: NavigationState): number {
  if (state.activeRow === 'favorites') {
    const amdno = getJmaRoute().stationId
    return buttons.findIndex((button) => button.getAttribute(FAVORITE_AMDNO_ATTRIBUTE) === amdno)
  }
  return buttons.findIndex((button) => button.classList.contains(JMA_CLASSES.radioOn))
}

function moveWithinRow(direction: -1 | 1, state: NavigationState): void {
  const buttons = getButtonsForActiveRow(state)
  if (buttons.length === 0) {
    return
  }
  const selectedIndex = getSelectedButtonIndex(buttons, state)
  const nextIndex =
    selectedIndex < 0
      ? direction > 0
        ? 0
        : buttons.length - 1
      : (selectedIndex + direction + buttons.length) % buttons.length
  buttons[nextIndex]?.click()
}

function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  )
}

function handleFavoriteClick(state: NavigationState, event: MouseEvent): void {
  if (state.disposed || !(event.target instanceof Element)) {
    return
  }
  const toggle = event.target.closest(`#${FAVORITE_TOGGLE_ID}`)
  if (toggle instanceof HTMLButtonElement) {
    const current = getCurrentStation()
    if (current !== null) {
      const isFavorite = loadFavoriteStations().some(({ amdno }) => amdno === current.amdno)
      updateCurrentFavorite(current, isFavorite, state)
    }
    return
  }
  const button = event.target.closest(`#${FAVORITES_ROW_ID} [${FAVORITE_AMDNO_ATTRIBUTE}]`)
  if (!(button instanceof HTMLElement)) {
    return
  }
  const amdno = button.getAttribute(FAVORITE_AMDNO_ATTRIBUTE)
  const station = loadFavoriteStations().find((favorite) => favorite.amdno === amdno)
  if (station !== undefined) {
    navigateToStation(station)
  }
}

function handleKeyboardNavigation(state: NavigationState, event: KeyboardEvent): void {
  if (state.disposed) {
    return
  }
  if ((event.key === 'Enter' || event.key === ' ') && event.target instanceof Element) {
    const button = event.target.closest(`#${FAVORITES_ROW_ID} [${FAVORITE_AMDNO_ATTRIBUTE}]`)
    if (button instanceof HTMLElement) {
      const amdno = button.getAttribute(FAVORITE_AMDNO_ATTRIBUTE)
      const station = loadFavoriteStations().find((favorite) => favorite.amdno === amdno)
      if (station !== undefined) {
        event.preventDefault()
        navigateToStation(station)
      }
      return
    }
  }
  if (
    event.defaultPrevented ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    isEditableTarget(event.target) ||
    !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key) ||
    getFormatRow() === null
  ) {
    return
  }
  event.preventDefault()
  state.keyboardStarted = true
  if (event.key === 'ArrowUp') {
    moveBetweenRows(-1, state)
  } else if (event.key === 'ArrowDown') {
    moveBetweenRows(1, state)
  } else {
    synchronizeNavigationHighlight(state)
    moveWithinRow(event.key === 'ArrowLeft' ? -1 : 1, state)
  }
}

/** お気に入り地点と、上下左右キーによる表示切り替えを管理する。 */
export function favorite_navigation_main(): Feature {
  const state: NavigationState = {
    activeRow: 'format',
    keyboardStarted: false,
    disposed: false,
  }
  const refresh = () => ensureFavoriteNavigationUi(state)
  const handleStorage = (event: StorageEvent) => {
    if (!state.disposed && event.key === FAVORITES_STORAGE_KEY) {
      refresh()
    }
  }
  const handleClick = (event: MouseEvent) => handleFavoriteClick(state, event)
  const handleKeydown = (event: KeyboardEvent) => handleKeyboardNavigation(state, event)

  window.addEventListener('storage', handleStorage)
  document.addEventListener('click', handleClick)
  document.addEventListener('keydown', handleKeydown)
  refresh()

  return {
    refresh,
    dispose() {
      if (state.disposed) {
        return
      }
      state.disposed = true
      window.removeEventListener('storage', handleStorage)
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleKeydown)
      removeFavoriteToggle()
      document.querySelector(`#${FAVORITES_ROW_ID}`)?.remove()
      document.querySelector(`#${STYLE_ID}`)?.remove()
      document
        .querySelectorAll<HTMLTableRowElement>(`tr[${ACTIVE_ROW_ATTRIBUTE}]`)
        .forEach((row) => {
          row.removeAttribute(ACTIVE_ROW_ATTRIBUTE)
        })
    },
  }
}
