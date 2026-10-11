import * as fs from 'node:fs'
import type { DerivedObservationColumn } from '../derived_observations'
import { getTimeSeries, hasCompleteDerivedColumns, renderDerivedColumns } from './table_dom'

function createTable(kind: 'series' | 'area'): HTMLTableElement {
  const table = document.createElement('table')
  const rowClass = kind === 'series' ? 'amd-table-tr-onthedot' : 'amd-areastable-tr-pointdata'
  table.innerHTML = `<tbody>
    <tr class="contents-header"><th ${kind === 'series' ? 'colspan="2"' : ''} rowspan="2">${kind === 'series' ? '日時' : '地点'}</th><th>気温</th></tr>
    <tr class="contents-header"><th>℃</th></tr>
    <tr class="${rowClass}"><td>先頭</td>${kind === 'series' ? '<td>12:00</td>' : ''}<td>20</td></tr>
    <tr class="${rowClass}"><td>次</td>${kind === 'series' ? '<td>11:00</td>' : ''}<td>10</td></tr>
  </tbody>`
  return table
}

const columns: readonly DerivedObservationColumn[] = [
  { class: 'td-dew-point', headerValue: '露点温度', headerUnit: '℃', values: ['9.3', '---'] },
  {
    class: 'td-volumetric-humidity',
    headerValue: '容積絶対湿度',
    headerUnit: 'g/m³',
    values: ['8.7', '4.7'],
  },
]

it.each(['area', 'series'] as const)(
  '%sの標準値・行順を保ち、再描画しても派生列と幅セルを重複させない',
  (kind) => {
    const table = createTable(kind)
    renderDerivedColumns(table, kind, columns)
    expect(
      hasCompleteDerivedColumns(
        table,
        kind,
        columns.map((column) => column.class),
      ),
    ).toBe(true)
    table.querySelector('td.td-dew-point')?.remove()
    expect(
      hasCompleteDerivedColumns(
        table,
        kind,
        columns.map((column) => column.class),
      ),
    ).toBe(false)
    renderDerivedColumns(table, kind, columns)
    expect(
      Array.from(table.querySelectorAll('td.td-dew-point'), (cell) => cell.textContent),
    ).toEqual(['9.3', '---'])
    expect(
      Array.from(table.querySelectorAll('td.td-volumetric-humidity'), (cell) => cell.textContent),
    ).toEqual(['8.7', '4.7'])
    const widthCells = table.querySelectorAll<HTMLTableCellElement>('.simple-table-hidden-tr td')
    expect(widthCells.length).toBe(kind === 'series' ? 5 : 4)
    expect(
      Array.from(widthCells).reduce(
        (total, cell) => total + Number.parseFloat(cell.style.width),
        0,
      ),
    ).toBeCloseTo(100)
    expect(table.querySelector('.contents-header th')?.textContent).toBe(
      kind === 'series' ? '日時' : '地点',
    )
    const firstDataRow = table.querySelector(
      kind === 'series' ? '.amd-table-tr-onthedot' : '.amd-areastable-tr-pointdata',
    )
    expect(
      Array.from(firstDataRow?.querySelectorAll('td') ?? [], (cell) => cell.textContent),
    ).toEqual(
      kind === 'series' ? ['先頭', '12:00', '20', '9.3', '8.7'] : ['先頭', '20', '9.3', '8.7'],
    )
  },
)

it('英語の日付、前日24:00、年またぎをJSTの実時刻として読み取る', () => {
  const table = document.createElement('table')
  table.innerHTML = `<tbody>
    <tr class="amd-table-tr-onthedot"><td rowspan="2">12/31</td><td>24:00</td></tr>
    <tr class="amd-table-tr-notonthedot"><td>23:50</td></tr>
  </tbody>`
  expect(
    getTimeSeries(table, new Date('2026-01-01T00:10:00+09:00')).map((date) => date.toISOString()),
  ).toEqual(['2025-12-31T15:00:00.000Z', '2025-12-31T14:50:00.000Z'])
})

it('実際のJMA表の月またぎの時刻を表示順に読み取る', () => {
  document.body.innerHTML = fs.readFileSync(
    `${__dirname}/../seriestable/testcases/dom_handler/timeseries_case1.html`,
    'utf8',
  )
  const table = document.querySelector<HTMLTableElement>('.amd-table-seriestable')
  if (table === null) {
    throw new Error('fixtureに時系列表がありません')
  }
  const reference = new Date('2024-12-02T00:00:00+09:00')
  const start = new Date('2024-12-01T14:00:00+09:00').getTime()
  expect(getTimeSeries(table, reference)).toEqual(
    Array.from({ length: 9 + 24 + 15 }, (_, index) => new Date(start - index * 60 * 60 * 1000)),
  )
})
