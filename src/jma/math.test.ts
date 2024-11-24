import { HumidCalculator } from './math'

describe('HumidCalculator', () => {
  it('calcSaturatedWaterVaporPressure', () => {
    const humidCalculator = new HumidCalculator(20, 57, 1000)
    expect(humidCalculator.saturatedWaterVaporPressure).toBeCloseTo(23.3809, 4)
  })
  it('calcVolumetricHumidity', () => {
    const humidCalculator = new HumidCalculator(20, 57, 1000)
    expect(humidCalculator.volumetricHumidity).toBeCloseTo(9.8652, 4)
  })
})
