const FAVORITES_STORAGE_KEY = 'enhance-jma-amedas-favorite-stations-v1'
const FAVORITES_ROW_ID = 'enhanced-favorite-stations-row'
const FAVORITES_LIST_ID = 'enhanced-favorite-stations'
const FAVORITE_AMDNO_ATTRIBUTE = 'data-enhanced-favorite-amdno'
const FAVORITES_STATE_ATTRIBUTE = 'data-enhanced-favorites-state'
const ACTIVE_ROW_ATTRIBUTE = 'data-enhanced-keyboard-active'
const STYLE_ID = 'enhanced-favorite-navigation-style'

const FORMAT_TYPES = ['table1h', 'table10min', 'graph'] as const

type NavigationRow = 'favorites' | 'format' | 'observation'

interface FavoriteStation {
  amdno: string
  name: string
  areaType?: string
  areaCode?: string
}

let activeNavigationRow: NavigationRow = 'format'
let keyboardNavigationStarted = false
let activeStop: (() => void) | undefined

function normalizeText(value: string | null | undefined): string {
  return value?.replaceAll(/\s+/g, '') ?? ''
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
  const parameters = new URLSearchParams(window.location.hash.slice(1))
  const amdno = parameters.get('amdno')
  const nameElement = document.querySelector<HTMLElement>('.amd-content-amdname')
  if (amdno === null || nameElement === null) {
    return null
  }
  const fullName = nameElement.textContent?.trim() ?? amdno
  const name = fullName.split('(')[0]?.trim() || fullName
  return {
    amdno,
    name,
    areaType: parameters.get('area_type') ?? undefined,
    areaCode: parameters.get('area_code') ?? undefined,
  }
}

function getControllerRows(): HTMLTableRowElement[] {
  return Array.from(document.querySelectorAll<HTMLTableRowElement>('tr')).filter(
    (row) => row.querySelector('.amd-content-controller-item-head') !== null,
  )
}

function getFormatRow(): HTMLTableRowElement | null {
  return (
    getControllerRows().find((row) =>
      FORMAT_TYPES.every(
        (type) => row.querySelector(`.contents-radio-button[data-type="${type}"]`) !== null,
      ),
    ) ?? null
  )
}

function getGraphObservationRow(): HTMLTableRowElement | null {
  if (new URLSearchParams(window.location.hash.slice(1)).get('format') !== 'graph') {
    return null
  }
  return (
    getControllerRows().find(
      (row) =>
        row.style.display !== 'none' &&
        normalizeText(row.querySelector('th')?.textContent) === '観測要素' &&
        row.querySelector('.contents-radio-button') !== null &&
        !FORMAT_TYPES.some(
          (type) => row.querySelector(`.contents-radio-button[data-type="${type}"]`) !== null,
        ),
    ) ?? null
  )
}

function createRadioButton(label: string): HTMLDivElement {
  const button = document.createElement('div')
  button.classList.add(
    'contents-radio-button',
    'contents-radio-button-enabled',
    'contents-radio-button-off',
  )
  button.role = 'button'
  button.tabIndex = 0
  button.title = label
  button.textContent = label
  return button
}

function installKeyboardActivation(button: HTMLElement, activate: () => void): void {
  button.addEventListener('click', activate)
  button.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }
    event.preventDefault()
    activate()
  })
}

function navigateToFavorite(station: FavoriteStation): void {
  const parameters = new URLSearchParams(window.location.hash.slice(1))
  parameters.set('amdno', station.amdno)
  if (station.areaType !== undefined) {
    parameters.set('area_type', station.areaType)
  }
  if (station.areaCode !== undefined) {
    parameters.set('area_code', station.areaCode)
  }
  window.location.hash = parameters.toString()
}

function updateCurrentFavorite(current: FavoriteStation, isFavorite: boolean): void {
  const favorites = loadFavoriteStations()
  const updated = isFavorite
    ? favorites.filter(({ amdno }) => amdno !== current.amdno)
    : [...favorites.filter(({ amdno }) => amdno !== current.amdno), current]
  if (saveFavoriteStations(updated)) {
    renderFavoriteRow(getFormatRow(), current, updated)
    synchronizeNavigationHighlight()
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
  let row = document.querySelector<HTMLTableRowElement>(`#${FAVORITES_ROW_ID}`)
  if (row === null) {
    row = document.createElement('tr')
    row.id = FAVORITES_ROW_ID
    formatRow.before(row)
  } else if (row.nextElementSibling !== formatRow) {
    formatRow.before(row)
  }

  // ハッシュ変更直後はJMA側の地点名DOMがまだ旧地点のことがある。
  // current全体を比較対象にし、地点名の再描画後にイベントハンドラーも更新する。
  const state = JSON.stringify({ current, favorites })
  if (row.getAttribute(FAVORITES_STATE_ATTRIBUTE) === state) {
    return
  }
  row.setAttribute(FAVORITES_STATE_ATTRIBUTE, state)

  const heading = document.createElement('th')
  heading.classList.add('amd-content-controller-item-head')
  heading.scope = 'row'
  heading.textContent = 'お気に入り地点'

  const cell = document.createElement('td')
  const list = document.createElement('div')
  list.id = FAVORITES_LIST_ID

  favorites.forEach((station) => {
    const button = createRadioButton(station.name)
    button.setAttribute(FAVORITE_AMDNO_ATTRIBUTE, station.amdno)
    const selected = station.amdno === current.amdno
    button.classList.toggle('contents-radio-button-on', selected)
    button.classList.toggle('contents-radio-button-off', !selected)
    button.setAttribute('aria-pressed', `${selected}`)
    installKeyboardActivation(button, () => navigateToFavorite(station))
    list.append(button)
  })

  const isFavorite = favorites.some(({ amdno }) => amdno === current.amdno)
  const toggleLabel = isFavorite ? '★ 現在地を解除' : '☆ 現在地を追加'
  const toggle = createRadioButton(toggleLabel)
  toggle.classList.add('enhanced-favorite-toggle')
  toggle.setAttribute('aria-pressed', `${isFavorite}`)
  installKeyboardActivation(toggle, () => updateCurrentFavorite(current, isFavorite))
  list.append(toggle)

  cell.append(list)
  row.replaceChildren(heading, cell)
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
    #${FAVORITES_LIST_ID} .contents-radio-button {
      margin: 0;
    }
    #${FAVORITES_LIST_ID} .enhanced-favorite-toggle {
      opacity: 0.8;
    }
    tr[${ACTIVE_ROW_ATTRIBUTE}="true"] > th,
    tr[${ACTIVE_ROW_ATTRIBUTE}="true"] > td {
      box-shadow: inset 0 0 0 2px #1a73e8;
    }
  `
  document.head.append(style)
}

function ensureFavoriteNavigationUi(): void {
  const current = getCurrentStation()
  const formatRow = getFormatRow()
  if (current === null || formatRow === null) {
    return
  }
  installStyle()
  renderFavoriteRow(formatRow, current, loadFavoriteStations())
  synchronizeNavigationHighlight()
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

function synchronizeNavigationHighlight(): void {
  document.querySelectorAll<HTMLTableRowElement>(`tr[${ACTIVE_ROW_ATTRIBUTE}]`).forEach((row) => {
    row.removeAttribute(ACTIVE_ROW_ATTRIBUTE)
  })
  if (!keyboardNavigationStarted) {
    return
  }
  const rows = getNavigationRows()
  const active = rows.find(({ name }) => name === activeNavigationRow)
  const fallback = rows.find(({ name }) => name === 'format') ?? rows[0]
  const target = active ?? fallback
  if (target !== undefined) {
    activeNavigationRow = target.name
    target.row.setAttribute(ACTIVE_ROW_ATTRIBUTE, 'true')
  }
}

function moveBetweenRows(direction: -1 | 1): void {
  const rows = getNavigationRows()
  if (rows.length === 0) {
    return
  }
  const currentIndex = rows.findIndex(({ name }) => name === activeNavigationRow)
  const defaultIndex = Math.max(
    0,
    rows.findIndex(({ name }) => name === 'format'),
  )
  const index = currentIndex < 0 ? defaultIndex : currentIndex
  const nextIndex = Math.min(rows.length - 1, Math.max(0, index + direction))
  activeNavigationRow = rows[nextIndex]?.name ?? activeNavigationRow
  synchronizeNavigationHighlight()
}

function getButtonsForActiveRow(): HTMLElement[] {
  if (activeNavigationRow === 'favorites') {
    return Array.from(
      document.querySelectorAll<HTMLElement>(`#${FAVORITES_ROW_ID} [${FAVORITE_AMDNO_ATTRIBUTE}]`),
    )
  }
  if (activeNavigationRow === 'format') {
    const row = getFormatRow()
    return row === null
      ? []
      : Array.from(row.querySelectorAll<HTMLElement>('.contents-radio-button[data-type]'))
  }
  const row = getGraphObservationRow()
  return row === null ? [] : Array.from(row.querySelectorAll<HTMLElement>('.contents-radio-button'))
}

function getSelectedButtonIndex(buttons: HTMLElement[]): number {
  if (activeNavigationRow === 'favorites') {
    const amdno = new URLSearchParams(window.location.hash.slice(1)).get('amdno')
    return buttons.findIndex((button) => button.getAttribute(FAVORITE_AMDNO_ATTRIBUTE) === amdno)
  }
  return buttons.findIndex((button) => button.classList.contains('contents-radio-button-on'))
}

function moveWithinRow(direction: -1 | 1): void {
  const buttons = getButtonsForActiveRow()
  if (buttons.length === 0) {
    return
  }
  const selectedIndex = getSelectedButtonIndex(buttons)
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

function handleKeyboardNavigation(event: KeyboardEvent): void {
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
  keyboardNavigationStarted = true
  if (event.key === 'ArrowUp') {
    moveBetweenRows(-1)
  } else if (event.key === 'ArrowDown') {
    moveBetweenRows(1)
  } else {
    synchronizeNavigationHighlight()
    moveWithinRow(event.key === 'ArrowLeft' ? -1 : 1)
  }
}

/** お気に入り地点と、上下左右キーによる表示切り替えを管理する。 */
export function favorite_navigation_main(): () => void {
  activeStop?.()
  activeNavigationRow = 'format'
  keyboardNavigationStarted = false
  ensureFavoriteNavigationUi()

  const observer = new MutationObserver(() => ensureFavoriteNavigationUi())
  observer.observe(document.body, { childList: true, subtree: true })
  const handleHashChange = () => ensureFavoriteNavigationUi()
  const handleStorage = (event: StorageEvent) => {
    if (event.key === FAVORITES_STORAGE_KEY) {
      ensureFavoriteNavigationUi()
    }
  }
  window.addEventListener('hashchange', handleHashChange)
  window.addEventListener('storage', handleStorage)
  document.addEventListener('keydown', handleKeyboardNavigation)

  const stop = () => {
    observer.disconnect()
    window.removeEventListener('hashchange', handleHashChange)
    window.removeEventListener('storage', handleStorage)
    document.removeEventListener('keydown', handleKeyboardNavigation)
    document.querySelector(`#${FAVORITES_ROW_ID}`)?.remove()
    document.querySelector(`#${STYLE_ID}`)?.remove()
    if (activeStop === stop) {
      activeStop = undefined
    }
  }
  activeStop = stop
  return stop
}
