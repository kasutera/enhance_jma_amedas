export class HumidCalculator {
  /**
   * 絶対湿度等の計算を行うクラス
   * @param temperature - 温度 (℃)
   * @param relativeHumidity - 相対湿度 (%, 0-100)
   * @param pressure - 現地気圧 (hPa)
   */
  readonly temperature: number
  readonly relativeHumidity: number
  readonly pressure: number
  readonly saturatedWaterVaporPressure: number
  readonly waterVaporPressure: number
  readonly saturatedWaterVaporAmount: number
  readonly volumetricHumidity: number
  readonly dewPoint: number
  constructor(temperature: number, relativeHumidity: number, pressure: number) {
    // input
    this.temperature = temperature
    this.relativeHumidity = relativeHumidity
    this.pressure = pressure

    // calc
    this.saturatedWaterVaporPressure = this.calcSaturatedWaterVaporPressure(temperature)
    this.waterVaporPressure = this.calcWaterVaporPressure(this.relativeHumidity)
    this.saturatedWaterVaporAmount = this.calcSaturatedWaterVaporAmount(
      this.saturatedWaterVaporPressure,
      temperature,
    )
    this.volumetricHumidity = this.calcVolumetricHumidity(
      this.saturatedWaterVaporAmount,
      this.relativeHumidity,
    )
    this.dewPoint = this.calcDewPoint(this.waterVaporPressure)
  }

  calcSaturatedWaterVaporPressure(temperature: number): number {
    /**
     * 飽和水蒸気圧の計算 (Tetens の式)
     * @param temperature - 温度 (℃)
     * @returns 飽和水蒸気圧 (hPa)
     */
    const a = 6.1078
    const b = 7.5
    const c = 237.3
    return a * 10 ** ((b * temperature) / (c + temperature))
  }

  calcWaterVaporPressure(relativeHumidity: number): number {
    /**
     * 水蒸気圧の計算
     * @param relativeHumidity - 相対湿度 (%, 0-100)
     * @returns 水蒸気圧 (hPa)
     */
    return (relativeHumidity / 100) * this.saturatedWaterVaporPressure
  }

  calcSaturatedWaterVaporAmount(saturatedWaterVaporPressure: number, temperature: number): number {
    /**
     * 飽和水蒸気量の計算
     * @param saturatedWaterVaporPressure - 飽和水蒸気圧 (hPa)
     * @param temperature - 温度 (℃)
     * @returns 飽和水蒸気量 (g/m^3)
     */
    return (217 * saturatedWaterVaporPressure) / (273.15 + temperature)
  }

  calcVolumetricHumidity(saturatedWaterVaporAmount: number, relativeHumidity: number): number {
    /**
     * 容積絶対湿度の計算
     * @param saturatedWaterVaporAmount - 飽和水蒸気量 (g/m^3)
     * @param relativeHumidity - 相対湿度 (%, 0-100)
     * @returns 容積絶対湿度 (g/m^3)
     */
    return (relativeHumidity / 100) * saturatedWaterVaporAmount
  }

  calcDewPoint(waterVaporPressure: number): number {
    /**
     * 露点温度の計算
     */
    const a = Math.log10(waterVaporPressure / 6.1078)
    return (237.3 * a) / (7.5 - a)
  }
}
