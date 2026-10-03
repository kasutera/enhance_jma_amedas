const favoriteNavigationMain = jest.fn()
const seriesTableMain = jest.fn()
const areaTableMain = jest.fn()
const graphMain = jest.fn()

jest.mock('./favorite_navigation/favorite_navigation_main', () => ({
  favorite_navigation_main: favoriteNavigationMain,
}))
jest.mock('./seriestable/seriestable_main', () => ({
  seriestable_main: seriesTableMain,
}))
jest.mock('./areastable/areastable_main', () => ({
  areastable_main: areaTableMain,
}))
jest.mock('./graph/graph_main', () => ({
  graph_main: graphMain,
}))

describe('initializeApplication', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    document.body.replaceChildren()
  })

  it('waits for the JMA table before starting table features', async () => {
    await import('./main')

    expect(favoriteNavigationMain).toHaveBeenCalledTimes(1)
    expect(graphMain).toHaveBeenCalledTimes(1)
    expect(seriesTableMain).not.toHaveBeenCalled()
    expect(areaTableMain).not.toHaveBeenCalled()

    const table = document.createElement('div')
    table.id = 'amd-table'
    document.body.append(table)
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(seriesTableMain).toHaveBeenCalledTimes(1)
    expect(areaTableMain).toHaveBeenCalledTimes(1)
  })

  it('starts each feature independently when the JMA table is ready', async () => {
    document.body.innerHTML = '<div id="amd-table"></div>'
    seriesTableMain.mockImplementation(() => {
      throw new Error('table initialization failed')
    })
    const error = jest.spyOn(console, 'error').mockImplementation()
    await import('./main')

    expect(favoriteNavigationMain).toHaveBeenCalledTimes(1)
    expect(graphMain).toHaveBeenCalledTimes(1)
    expect(seriesTableMain).toHaveBeenCalledTimes(1)
    expect(areaTableMain).toHaveBeenCalledTimes(1)
    expect(error).toHaveBeenCalledWith(
      '時系列表拡張の初期化中にエラーが発生しました:',
      expect.any(Error),
    )
    error.mockRestore()
  })
})
