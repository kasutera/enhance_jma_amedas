// 観測値の表のためのDOM要素を生成する関数群
// DOMの変更は行わない

function generateTd (widthRatio: number, minWidth: number): Element {
  const td = document.createElement('td')
  td.style.width = `${widthRatio * 100}%`
  td.style.minWidth = `${minWidth}px`
  td.style.padding = '0px'
  td.style.borderBottom = 'hidden'
  return td
}

function generateSimpleTableHiddenTr (elementCount: number): Element {
  /**
     * 要素数に対応する <tr class="simple-table-hidden-tr"> を生成する
     * ルール:
     * - 最左の2つは日時を表すヘッダ列で、他の要素と長さが異なる。
     *   elementCount はこの2つを除く要素数
     * - 2つのヘッダ列の長さの比は 9:16
     * - ヘッダ列とそれ以外の列の長さの比は 29:21
     * - min-width は固定 (20px, 35px, 40px, 40px, ...)
     */
  const tr = document.createElement('tr')
  tr.classList.add('simple-table-hidden-tr')
  const headerCellWidthRatio = 29 / (29 + 21 * elementCount)
  const firstCellWidthRatio = 9 / (9 + 16) * headerCellWidthRatio
  const secondCellWidthRatio = 16 / (9 + 16) * headerCellWidthRatio
  const otherCellsWidthRatio = (1 - headerCellWidthRatio) / elementCount

  tr.append(generateTd(firstCellWidthRatio, 20))
  tr.append(generateTd(secondCellWidthRatio, 35))
  for (let i = 0; i < elementCount; i++) {
    tr.append(generateTd(otherCellsWidthRatio, 40))
  }
  return tr
}

function generate1stContentsHeaderElement (className: string, headerValue: string): HTMLTableCellElement {
  /** contents-header の1段目 (観測要素の名称) に使用できる下記を生成する
        * <th class="{className}">
        *    <div>
        *        <div class="amd-table-div-elemname amd-table-elemname-resize-responsive">{headerValue}</div>
        *    </div>
        * </th>
        * @param className - 追加する <th> 要素の class 属性値
        * @param headerValue - ヘッダの値
    */
  const th = document.createElement('th')
  th.classList.add(className)
  const div1 = document.createElement('div')
  const div2 = document.createElement('div')
  div2.classList.add('amd-table-div-elemname', 'amd-table-elemname-resize-responsive')
  div2.textContent = headerValue
  div1.append(div2)
  th.append(div1)
  return th
}

function generate2ndContentsHeaderElement (className: string, headerUnit: string): HTMLTableCellElement {
  /** contents-header の2段目 (観測要素の単位) に使用できる下記を生成する
     * <th class="{className}">
     *    <div>
     *        <div class="amd-table-elemunit-resize-responsive">{headerUnit}</div>
     *    </div>
     * </th>
     */
  const th = document.createElement('th')
  th.classList.add(className)
  const div = document.createElement('div')
  div.classList.add('amd-table-elemunit-resize-responsive')
  div.textContent = headerUnit
  th.append(div)
  return th
}

function generateAmdTableTdElement (className: string, value: string): HTMLTableCellElement {
  /** 次に示す "観測値を表す td 要素" に使用できる下記を生成する
   *  - 対象: amd-table-tr-onthedot (1時間おきのデータ), amd-table-tr-notonthedot (それ以外の10分おきのデータ)
   *  - 構造: <td class={className}>{value}</td>
   * @param className - 追加する <td> 要素の class 属性値
   * @param value - 値
   */
  const td = document.createElement('td')
  td.classList.add(className)
  td.textContent = value
  return td
}

export { generateSimpleTableHiddenTr, generate1stContentsHeaderElement, generate2ndContentsHeaderElement, generateAmdTableTdElement }
