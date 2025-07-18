// 観測値の表のためのDOM要素を生成する関数群
// DOMの変更は行わない

function generateTd(widthRatio: number, minWidth: number): Element {
  const td = document.createElement('td')
  td.style.width = `${widthRatio * 100}%`
  td.style.minWidth = `${minWidth}px`
  td.style.padding = '0px'
  td.style.borderBottom = 'hidden'
  return td
}

export function generateSimpleTableHiddenTr(elementCount: number): Element {
  /**
   * 要素数に対応する <tr class="simple-table-hidden-tr"> を生成する
   * ルール:
   * - 最左は地点を表すヘッダ列で、他の要素と長さが異なる。
   *   elementCount はこれを除く要素数
   * - ヘッダ列とそれ以外の列の長さの比は 65:42
   * - min-width は固定 (65px, 42px, 42px, ...)
   */
  const tr = document.createElement('tr')
  tr.classList.add('simple-table-hidden-tr')
  const headerCellWidthRatio = 65 / (65 + 42 * elementCount)
  const otherCellsWidthRatio = (1 - headerCellWidthRatio) / elementCount

  tr.append(generateTd(headerCellWidthRatio, 65))
  for (let i = 0; i < elementCount; i++) {
    tr.append(generateTd(otherCellsWidthRatio, 42))
  }
  return tr
}

export function generate1stContentsHeaderElement(headerValue: string): HTMLTableCellElement {
  /** contents-header の1段目 (観測要素の名称) に使用できる下記を生成する
   * <th>
   *    <div>
   *        <div class="amd-table-div-elemname amd-table-elemname-resize-responsive">{headerValue}</div>
   *    </div>
   * </th>
   * @param className - 追加する <th> 要素の class 属性値
   * @param headerValue - ヘッダの値
   */
  const th = document.createElement('th')
  const div1 = document.createElement('div')
  const div2 = document.createElement('div')
  div2.classList.add('amd-table-div-elemname', 'amd-table-elemname-resize-responsive')
  div2.textContent = headerValue
  div1.append(div2)
  th.append(div1)
  return th
}

export function generate2ndContentsHeaderElement(headerUnit: string): HTMLTableCellElement {
  /** contents-header の2段目 (観測要素の単位) に使用できる下記を生成する
   * <th>
   *    <div>
   *        <div class="amd-table-elemunit-resize-responsive">{headerUnit}</div>
   *    </div>
   * </th>
   */
  const th = document.createElement('th')
  const div = document.createElement('div')
  div.classList.add('amd-table-elemunit-resize-responsive')
  div.textContent = headerUnit
  th.append(div)
  return th
}

export function generateAmdTableTdElement(className: string, value: string): HTMLTableCellElement {
  /** 次に示す "観測値を表す td 要素" に使用できる下記を生成する
   *  - 対象: amd-areastable-tr-pointdata (エリアごとのデータ)
   *  - 構造: <td class={className}>{value}</td>
   * @param className - 追加する <td> 要素の class 属性値
   * @param value - 値
   */
  const td = document.createElement('td')
  td.classList.add(className)
  td.textContent = value
  return td
}
