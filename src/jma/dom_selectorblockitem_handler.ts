import { generateCheckboxElement } from './dom_generators'

export function getSelectorBlockItems (): HTMLDivElement | null {
  /**
   * 観測要素を選択するチェックボックスを格納する div 要素を取得する
   * @returns 観測要素を選択するチェックボックスを格納する div 要素
   */
  return document.querySelector('#amd-selector-div-block-items')
}

export interface CheckboxItem {
  /**
   * チェックボックスの id 属性値
   */
  id: string
  /**
   * チェックボックスの value 属性値
   */
  value: string
  /**
   * チェックボックスのラベルのテキスト
   */
  headerValue: string
}

export function appendBlockItemToSelectorBlockItems (checkboxItem: CheckboxItem, blockItems: HTMLDivElement): void {
  /**
   * チェックボックスの div 要素を追加する
   * @param checkboxItem - チェックボックスの情報
   * @param blockItems - チェックボックスを格納する div 要素
   */
  const checkboxElement = generateCheckboxElement(checkboxItem.id, checkboxItem.value, checkboxItem.headerValue)
  blockItems.append(checkboxElement)
}
