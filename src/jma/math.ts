export interface DerivedObservations {
  readonly volumetricHumidity: number
  readonly dewPoint: number
  readonly temperatureHumidityIndex: number
}

/** 飽和水蒸気圧 (hPa)。気温 (℃) からTetensの式で計算する。 */
export function calculateSaturatedWaterVaporPressure(temperature: number): number {
  return 6.1078 * 10 ** ((7.5 * temperature) / (237.3 + temperature))
}

function calculateSaturatedWaterVaporAmount(
  saturatedWaterVaporPressure: number,
  temperature: number,
): number {
  return (217 * saturatedWaterVaporPressure) / (273.15 + temperature)
}

function dewPointFromWaterVaporPressure(waterVaporPressure: number): number {
  const logRatio = Math.log10(waterVaporPressure / 6.1078)
  return (237.3 * logRatio) / (7.5 - logRatio)
}

/** 気温 (℃) と相対湿度 (%) から容積絶対湿度 (g/㎥) を計算する。 */
export function calculateVolumetricHumidity(temperature: number, relativeHumidity: number): number {
  const saturatedPressure = calculateSaturatedWaterVaporPressure(temperature)
  return (
    (relativeHumidity / 100) * calculateSaturatedWaterVaporAmount(saturatedPressure, temperature)
  )
}

/** 気温 (℃) と相対湿度 (%) から露点温度 (℃) を計算する。 */
export function calculateDewPoint(temperature: number, relativeHumidity: number): number {
  return dewPointFromWaterVaporPressure(
    (relativeHumidity / 100) * calculateSaturatedWaterVaporPressure(temperature),
  )
}

/** 気温 (℃) と相対湿度 (%) から不快指数を計算する。 */
export function calculateTemperatureHumidityIndex(
  temperature: number,
  relativeHumidity: number,
): number {
  return 0.81 * temperature + 0.01 * relativeHumidity * (0.99 * temperature - 14.3) + 46.3
}

/** 表の3指標を、共通の飽和水蒸気圧を一度だけ計算して求める。 */
export function calculateDerivedObservations(
  temperature: number,
  relativeHumidity: number,
): DerivedObservations {
  const saturatedPressure = calculateSaturatedWaterVaporPressure(temperature)
  return {
    volumetricHumidity:
      (relativeHumidity / 100) * calculateSaturatedWaterVaporAmount(saturatedPressure, temperature),
    dewPoint: dewPointFromWaterVaporPressure((relativeHumidity / 100) * saturatedPressure),
    temperatureHumidityIndex: calculateTemperatureHumidityIndex(temperature, relativeHumidity),
  }
}
