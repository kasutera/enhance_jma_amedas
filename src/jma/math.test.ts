import {
  calculateDewPoint,
  calculateSaturatedWaterVaporPressure,
  calculateTemperatureHumidityIndex,
  calculateVolumetricHumidity,
} from './math'

describe('気象計算', () => {
  it('Tetensの式で飽和水蒸気圧を求める', () => {
    expect(calculateSaturatedWaterVaporPressure(20)).toBeCloseTo(23.3809, 4)
  })
  it('容積絶対湿度を求める', () => {
    expect(calculateVolumetricHumidity(20, 57)).toBeCloseTo(9.8652, 4)
  })
  it('露点温度を求める', () => {
    expect(calculateDewPoint(20, 57)).toBeCloseTo(11.22858, 4)
  })
  it('不快指数を求める', () => {
    expect(calculateTemperatureHumidityIndex(20, 57)).toBeCloseTo(65.6, 1)
  })
})
