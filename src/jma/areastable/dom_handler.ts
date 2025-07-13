import {
  generate1stContentsHeaderElement,
  generate2ndContentsHeaderElement,
  generateAmdTableTdElement,
  generateSimpleTableHiddenTr,
} from './dom_generators'

export interface AreastableColumn {
  class: string
  headerValue: string
  headerUnit: string
  values: string[]
}

export function getAreastables(): HTMLTableElement[] {
  return Array.from(document.querySelectorAll('.contents-wide-table-body > * > .amd-areastable'))
}

export function appendColumnToAreastable(
  areastable: HTMLTableElement,
  column: AreastableColumn,
): void {
  const old = areastable.querySelector('.simple-table-hidden-tr')
  if (old === null) {
    throw new Error('.simple-table-hidden-tr does not exist')
  }
  const length = old.children.length + 1

  const simpleTableHiddenTr = generateSimpleTableHiddenTr(length)
  if (old !== null) {
    old.remove()
  }
  areastable.prepend(simpleTableHiddenTr)

  const trContentsHeaders: HTMLTableRowElement[] = Array.from(
    areastable.querySelectorAll('.contents-header'),
  )
  if (trContentsHeaders.length % 2 !== 0) {
    throw new Error(`contents-headerの数が不正です: ${trContentsHeaders.length}`)
  }
  for (let i = 0; i < trContentsHeaders.length; i += 2) {
    // contents-header はデータの途中にペアで挟まれていることがあるため、その全てに対して処理を行う
    const trContentsHeader1st = trContentsHeaders[i]
    trContentsHeader1st.append(generate1stContentsHeaderElement(column.headerValue))
    const trContentsHeader2nd = trContentsHeaders[i + 1]
    trContentsHeader2nd.append(generate2ndContentsHeaderElement(column.headerUnit))
  }

  const amdTableTrs: HTMLTableRowElement[] = Array.from(
    areastable.querySelectorAll('.amd-areastable-tr-pointdata'),
  )
  let i = 0
  amdTableTrs.forEach((tr) => {
    tr.append(generateAmdTableTdElement(column.class, column.values[i]))
    i++
  })
}
