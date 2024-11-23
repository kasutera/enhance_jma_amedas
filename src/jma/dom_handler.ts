/**
 * 
 *  */
import { generate1stContentsHeaderElement, generate2ndContentsHeaderElement, generateAmdTableTdOnTheDotElement, generateSimpleTableHiddenTr } from './dom_generators'

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
  const simpleTableHiddenTr = generateSimpleTableHiddenTr(row.values.length)
  const old = seriestable.querySelector('.simple-table-hidden-tr')
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
    trContentsHeader1st.appendChild(generate1stContentsHeaderElement(row.class, row.headerValue))
    const trContentsHeader2nd = trContentsHeaders[i + 1]
    trContentsHeader2nd.appendChild(generate2ndContentsHeaderElement(row.class, row.headerUnit))
  }

  const amdTableTrOnTheDots: HTMLTableRowElement[] = Array.from(seriestable.querySelectorAll('.amd-table-tr-onthedot'))
  let i = 0
  amdTableTrOnTheDots.forEach(tr => {
    tr.appendChild(generateAmdTableTdOnTheDotElement(row.class, row.values[i]))
    i++
  })
}

export { getSeriestables, appendColumnToSeriestable, SeriestableRow }
