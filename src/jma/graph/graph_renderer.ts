import { getJstDateParts } from '../jma_datetime'

export interface GraphDataPoint {
  date: Date
  value: number | null
}

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
const WIDTH = 1100
const HEIGHT = 550
const MARGIN = { top: 35, right: 60, bottom: 50, left: 80 }
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom

function createSvgElement(name: string): SVGElement {
  return document.createElementNS(SVG_NAMESPACE, name)
}

function createGraphSvg(graphContainer: HTMLElement, divId: string, svgId: string): SVGElement {
  graphContainer.replaceChildren()
  const graphDiv = document.createElement('div')
  graphDiv.id = divId
  const svg = createSvgElement('svg')
  svg.setAttribute('width', `${WIDTH}`)
  svg.setAttribute('height', `${HEIGHT}`)
  svg.setAttribute('viewBox', `0 0 ${WIDTH} ${HEIGHT}`)
  svg.setAttribute('preserveAspectRatio', 'xMidYMid')
  svg.setAttribute('id', svgId)
  svg.style.display = 'block'
  svg.style.maxWidth = '100%'
  svg.style.height = 'auto'
  graphDiv.append(svg)
  graphContainer.append(graphDiv)
  return svg
}

function appendText(
  parent: SVGElement,
  text: string,
  x: number,
  y: number,
  attributes: Record<string, string> = {},
): void {
  const element = createSvgElement('text')
  element.textContent = text
  element.setAttribute('x', `${x}`)
  element.setAttribute('y', `${y}`)
  Object.entries(attributes).forEach(([name, value]) => {
    element.setAttribute(name, value)
  })
  parent.append(element)
}

function formatDate(date: Date): string {
  const parts = getJstDateParts(date)
  const month = `${parts.month}`.padStart(2, '0')
  const day = `${parts.day}`.padStart(2, '0')
  const hour = `${parts.hour}`.padStart(2, '0')
  const minute = `${parts.minute}`.padStart(2, '0')
  return `${month}/${day} ${hour}:${minute}`
}

function getDomain(values: number[]): [number, number] {
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  const span = maximum - minimum
  const padding = span === 0 ? Math.max(Math.abs(maximum) * 0.1, 1) : span * 0.1
  return [minimum - padding, maximum + padding]
}

/** 気象庁の既存SVG用classを再利用し、派生値の折れ線グラフを生成する。 */
export function renderEnhancedGraph(
  graphContainer: HTMLElement,
  title: string,
  unit: string,
  data: GraphDataPoint[],
): void {
  const titleElement = document.querySelector<HTMLElement>('.amd-content-graph-title')
  if (titleElement !== null) {
    titleElement.textContent = `10分毎の${title}時系列図`
  }

  const svg = createGraphSvg(graphContainer, 'enhanced-amd-graph-div', 'enhanced-amd-graph')

  const values = data.flatMap(({ value }) => (value === null ? [] : [value]))
  if (values.length === 0) {
    appendText(svg, 'グラフを作成できる観測値がありません', WIDTH / 2, HEIGHT / 2, {
      'text-anchor': 'middle',
    })
    return
  }

  const plot = createSvgElement('g')
  plot.setAttribute('transform', `translate(${MARGIN.left} ${MARGIN.top})`)
  svg.append(plot)

  const [minimum, maximum] = getDomain(values)
  const x = (index: number): number => (index / (data.length - 1)) * PLOT_WIDTH
  const y = (value: number): number =>
    PLOT_HEIGHT - ((value - minimum) / (maximum - minimum)) * PLOT_HEIGHT

  for (let tick = 0; tick <= 5; tick++) {
    const tickY = (tick / 5) * PLOT_HEIGHT
    const gridLine = createSvgElement('line')
    gridLine.setAttribute('x1', '0')
    gridLine.setAttribute('x2', `${PLOT_WIDTH}`)
    gridLine.setAttribute('y1', `${tickY}`)
    gridLine.setAttribute('y2', `${tickY}`)
    gridLine.setAttribute('class', 'amd-graph-line-gridline')
    plot.append(gridLine)
    appendText(plot, `${(maximum - ((maximum - minimum) * tick) / 5).toFixed(1)}`, -8, tickY + 4, {
      'text-anchor': 'end',
    })
  }

  const xAxis = createSvgElement('line')
  xAxis.setAttribute('x1', '0')
  xAxis.setAttribute('x2', `${PLOT_WIDTH}`)
  xAxis.setAttribute('y1', `${PLOT_HEIGHT}`)
  xAxis.setAttribute('y2', `${PLOT_HEIGHT}`)
  xAxis.setAttribute('stroke', 'currentColor')
  plot.append(xAxis)

  const yAxis = createSvgElement('line')
  yAxis.setAttribute('x1', '0')
  yAxis.setAttribute('x2', '0')
  yAxis.setAttribute('y1', '0')
  yAxis.setAttribute('y2', `${PLOT_HEIGHT}`)
  yAxis.setAttribute('stroke', 'currentColor')
  plot.append(yAxis)

  for (let tick = 0; tick <= 8; tick++) {
    const index = Math.round((tick / 8) * (data.length - 1))
    appendText(plot, formatDate(data[index].date), x(index), PLOT_HEIGHT + 23, {
      'text-anchor': 'middle',
    })
  }

  appendText(plot, unit === '' ? title : `${title}(${unit})`, -50, -15)
  appendText(plot, '日時', PLOT_WIDTH / 2, PLOT_HEIGHT + 48, { 'text-anchor': 'middle' })

  let pathData = ''
  data.forEach(({ value }, index) => {
    if (value === null) {
      return
    }
    pathData += `${pathData === '' || data[index - 1]?.value === null ? 'M' : 'L'}${x(index)},${y(value)}`
  })
  const path = createSvgElement('path')
  path.setAttribute('class', 'amd-graph-path-data')
  path.setAttribute('d', pathData)
  plot.append(path)

  const legend = document.createElement('div')
  legend.className = 'amd-graph-legend'
  const legendLine = document.createElement('span')
  legendLine.className = 'amd-graph-legend-line'
  legend.append(legendLine, title)
  graphContainer.append(legend)
}

export function renderEnhancedGraphError(graphContainer: HTMLElement): void {
  const svg = createGraphSvg(
    graphContainer,
    'enhanced-amd-graph-error-div',
    'enhanced-amd-graph-error',
  )
  appendText(
    svg,
    'グラフデータの取得に失敗しました。観測要素を選び直してください。',
    WIDTH / 2,
    HEIGHT / 2,
    { 'text-anchor': 'middle' },
  )
}
