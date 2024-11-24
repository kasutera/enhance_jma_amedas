/**
 *
 *  */
import {
  generate1stContentsHeaderElement,
  generate2ndContentsHeaderElement,
  generateAmdTableTdElement,
  generateSimpleTableHiddenTr
} from './dom_generators'

function getSeriestables (): HTMLTableElement[] {
  return Array.from(document.querySelectorAll('.amd-table-seriestable'))
}

interface SeriestableRow {
  class: string
  headerValue: string
  headerUnit: string
  values: string[]
}

function appendColumnToSeriestable (seriestable: HTMLTableElement, row: SeriestableRow): void {
  const old = seriestable.querySelector('.simple-table-hidden-tr')
  const length = old === null ? row.values.length : old.children.length - 1 // 「日時」を除くが、そこに新しく追加されるので -2 + 1 = -1

  const simpleTableHiddenTr = generateSimpleTableHiddenTr(length)
  if (old !== null) {
    old.remove()
  }
  seriestable.prepend(simpleTableHiddenTr)

  const trContentsHeaders: HTMLTableRowElement[] = Array.from(seriestable.querySelectorAll('.contents-header'))
  if (trContentsHeaders.length % 2 !== 0) {
    throw new Error(`contents-headerの数が不正です: ${trContentsHeaders.length}`)
  }
  for (let i = 0; i < trContentsHeaders.length; i += 2) {
    // contents-header はデータの途中にペアで挟まれていることがあるため、その全てに対して処理を行う
    const trContentsHeader1st = trContentsHeaders[i]
    trContentsHeader1st.append(generate1stContentsHeaderElement(row.class, row.headerValue))
    const trContentsHeader2nd = trContentsHeaders[i + 1]
    trContentsHeader2nd.append(generate2ndContentsHeaderElement(row.class, row.headerUnit))
  }

  const amdTableTrs: HTMLTableRowElement[] = Array.from(seriestable.querySelectorAll('.amd-table-tr-onthedot, .amd-table-tr-notonthedot'))
  let i = 0
  amdTableTrs.forEach(tr => {
    tr.append(generateAmdTableTdElement(row.class, row.values[i]))
    i++
  })
}

export { getSeriestables, appendColumnToSeriestable, type SeriestableRow }
