import { renderEnhancedGraph, renderEnhancedGraphError } from './graph_renderer'

describe('派生観測要素グラフ', () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<div class="amd-content-graph-title"></div><div id="amd-graph"></div>'
  })

  test('気象庁のグラフ用classを使って派生値の折れ線を描画する', () => {
    const container = document.querySelector<HTMLElement>('#amd-graph')
    if (container === null) {
      throw new Error('グラフコンテナーがありません')
    }

    renderEnhancedGraph(container, '露点温度', '℃', [
      { date: new Date('2026-08-09T00:00:00+09:00'), value: 20 },
      { date: new Date('2026-08-09T00:10:00+09:00'), value: null },
      { date: new Date('2026-08-09T00:20:00+09:00'), value: 22 },
    ])

    expect(document.querySelector('.amd-content-graph-title')?.textContent).toBe(
      '10分毎の露点温度時系列図',
    )
    expect(container.querySelector('#enhanced-amd-graph')).not.toBeNull()
    expect(container.querySelector('.amd-graph-path-data')?.getAttribute('d')).toContain('M')
    expect(container.querySelector('.amd-graph-legend')?.textContent).toBe('露点温度')
    expect(container.textContent).toContain('08/09 00:00')
  })

  test('有効な観測値がない場合は理由を表示する', () => {
    const container = document.querySelector<HTMLElement>('#amd-graph')
    if (container === null) {
      throw new Error('グラフコンテナーがありません')
    }

    renderEnhancedGraph(container, '不快指数', '', [
      { date: new Date('2026-08-09T00:00:00+09:00'), value: null },
    ])

    expect(container.textContent).toContain('グラフを作成できる観測値がありません')
  })

  test('取得失敗時は再選択を促すメッセージを表示する', () => {
    const container = document.querySelector<HTMLElement>('#amd-graph')
    if (container === null) {
      throw new Error('グラフコンテナーがありません')
    }

    renderEnhancedGraphError(container)

    expect(container.querySelector('#enhanced-amd-graph-error')?.textContent).toContain(
      '観測要素を選び直してください',
    )
  })
})
