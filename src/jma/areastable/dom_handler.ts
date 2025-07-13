import {
  generate1stContentsHeaderElement,
  generate2ndContentsHeaderElement,
  generateAmdTableTdElement,
  generateSimpleTableHiddenTr,
} from './dom_generators'
import type { Ameid } from './jma_amedas_fetcher'

export interface AreastableColumn {
  class: string
  headerValue: string
  headerUnit: string
  values: string[]
}

const TARGET_TABLE_CLASS = 'contents-wide-table-scroll'

export function getAreastables(): HTMLTableElement[] {
  return Array.from(document.querySelectorAll(`.${TARGET_TABLE_CLASS} .amd-areastable`))
}

export type HTMLAmdAreastableAPointLink = HTMLAnchorElement

function getAmdAreastableLinks(): HTMLAmdAreastableAPointLink[] {
  /**
   * 下記のようなリンクを持つ要素を取得する
   * <a href="#amdno=44207" title="ニイジマ：新島空港" class="amd-areastable-a-pointlink">新島</a>
   */
  const objs = Array.from(
    document.querySelectorAll(`.${TARGET_TABLE_CLASS} .amd-areastable-a-pointlink`),
  )
  for (const obj of objs) {
    if (!(obj instanceof HTMLAnchorElement)) {
      throw new Error('amd-areastable-a-pointlink is not an HTMLAnchorElement')
    }
    if (!obj.href.startsWith('#amdno=')) {
      throw new Error('amd-areastable-a-pointlink href does not start with #amdno=')
    }
  }
  return objs as HTMLAmdAreastableAPointLink[]
}

export function _getAmdnos(obj: HTMLAmdAreastableAPointLink): Ameid {
  /**
   * amd-areastable-a-pointlink クラスを持つリンクの href 属性から amdno を取得する
   * <a href="#amdno=44207" title="ニイジマ：新島空港" class="amd-areastable-a-pointlink">新島</a>
   * @param objs - amd-areastable-a-pointlink クラスを持つリンクの配列
   */
  const amdno = obj.href.match(/#amdno=(\d+)/)
  if (amdno === null) {
    throw new Error(`amd-areastable-a-pointlink href does not match #amdno= pattern: ${obj.href}`)
  }
  if (amdno[1] === undefined) {
    throw new Error(`amd-areastable-a-pointlink href does not contain amdno: ${obj.href}`)
  }
  return amdno[1]
}

export function getAmdnos(): Ameid[] {
  /**
   * amd-areastable-a-pointlink クラスを持つリンクの href 属性から amdno を取得する
   */
  return getAmdAreastableLinks().map(_getAmdnos)
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
