import { getSeriestableObservationTime } from './series_observation_time'

function createTable(day: string, time: string): HTMLElement {
  const root = document.createElement('div')
  root.innerHTML = `
    <div class="contents-wide-table-scroll">
      <table class="amd-table-seriestable"><tbody>
        <tr class="amd-table-tr-notonthedot"><td rowspan="1">${day}</td><td>${time}</td></tr>
        <tr class="amd-table-tr-onthedot"><td rowspan="1">02日</td><td>24:00</td></tr>
      </tbody></table>
    </div>`
  return root
}

describe('getSeriestableObservationTime', () => {
  it.each([
    ['04日', '15:30', '2026-10-04T15:40:00+09:00', '2026-10-04T06:30:00.000Z'],
    ['10/04', '15:30', '2026-10-04T15:40:00+09:00', '2026-10-04T06:30:00.000Z'],
    ['31日', '24:00', '2026-01-01T00:10:00+09:00', '2025-12-31T15:00:00.000Z'],
    ['12/31', '24:00', '2026-01-01T00:10:00+09:00', '2025-12-31T15:00:00.000Z'],
    ['29日', '24:00', '2024-03-01T00:10:00+09:00', '2024-02-29T15:00:00.000Z'],
    ['10/03', '23:50', '2026-10-04T00:00:00+09:00', '2026-10-03T14:50:00.000Z'],
  ])(
    'reads the newest %s %s row relative to publication time',
    (day, time, reference, expected) => {
      expect(
        getSeriestableObservationTime(new Date(reference), createTable(day, time))?.toISOString(),
      ).toBe(expected)
    },
  )

  it.each([
    ['unknown', '15:30'],
    ['00日', '15:30'],
    ['04日', '25:00'],
    ['04日', '24:10'],
    ['04日', '15:35'],
    ['02/30', '15:30'],
    ['13/04', '15:30'],
  ])('rejects unreadable dates or times %s %s', (day, time) => {
    expect(
      getSeriestableObservationTime(new Date('2026-10-04T15:40:00+09:00'), createTable(day, time)),
    ).toBeNull()
  })

  it('rejects an impossible Japanese date in the preceding month', () => {
    expect(
      getSeriestableObservationTime(
        new Date('2026-05-01T00:10:00+09:00'),
        createTable('31日', '24:00'),
      ),
    ).toBeNull()
  })

  it('does not infer a timestamp before the newest row exists', () => {
    expect(
      getSeriestableObservationTime(
        new Date('2026-10-04T15:40:00+09:00'),
        document.createElement('div'),
      ),
    ).toBeNull()
  })
})
