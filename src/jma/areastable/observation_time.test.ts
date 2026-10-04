import { getAreastableObservationTime } from './observation_time'

describe('getAreastableObservationTime', () => {
  test.each([
    ['2026年10月04日15時40分 現在', '2026-10-04T06:40:00.000Z'],
    ['As of 15:40 JST, 04 Oct. 2026', '2026-10-04T06:40:00.000Z'],
    ['As of 15:40 JST, 04 October 2026', '2026-10-04T06:40:00.000Z'],
  ])('%s を端末タイムゾーンに依存せず解析する', (text, expected) => {
    const root = document.createElement('div')
    root.innerHTML = `<span class="amd-areastable-span-obstime">${text}</span>`
    expect(getAreastableObservationTime(root)?.toISOString()).toBe(expected)
  })

  test('JSTの日付境界を正しくUTCの実時刻へ繰り上げ・繰り下げする', () => {
    const root = document.createElement('div')
    root.innerHTML = `
      <span class="amd-areastable-span-obstime">2026年01月01日00時00分 現在</span>
      <span class="other"></span>`
    expect(getAreastableObservationTime(root)?.toISOString()).toBe('2025-12-31T15:00:00.000Z')

    const observationTimeElement = root.querySelector('.amd-areastable-span-obstime')
    if (observationTimeElement === null) {
      throw new Error('日時spanが見つかりません')
    }
    observationTimeElement.textContent = '2024年02月29日00時10分 現在'
    expect(getAreastableObservationTime(root)?.toISOString()).toBe('2024-02-28T15:10:00.000Z')
  })

  test.each([
    '2026年02月29日15時40分 現在',
    '2026年10月04日15時41分 現在',
    '2026年10月04日24時00分 現在',
    '2026年10月04日15時60分 現在',
    'As of 15:41 JST, 04 Oct. 2026',
    'As of 15:40 UTC, 04 Oct. 2026',
    'As of 15:40 JST, 04 Octoops 2026',
    'not a JMA observation time',
  ])('不正または10分刻みでない日時 %s は拒否する', (text) => {
    const root = document.createElement('div')
    root.innerHTML = `<span class="amd-areastable-span-obstime">${text}</span>`
    expect(getAreastableObservationTime(root)).toBeNull()
  })
})
