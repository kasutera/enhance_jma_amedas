/**
 * それぞれの table における、各観測要素の class name 定義
 */
const BASIC_TABLE_CLASS_NAMES = {
  pressure: 'td-pressure',
  normalPressure: 'td-normalPressure',
  temp: 'td-temp',
  humidity: 'td-humidity',
  precipitation: 'td-precipitation',
  snow1h: 'td-snow1h',
  snow6h: 'td-snow6h',
  snow12h: 'td-snow12h',
  snow24h: 'td-snow24h',
  sun10m: 'td-sun10m',
  sun1h: 'td-sun1h',
  precipitation10m: 'td-precipitation10m',
  precipitation1h: 'td-precipitation1h',
  precipitation3h: 'td-precipitation3h',
  precipitation24h: 'td-precipitation24h',
  windDirection: 'td-windDirection',
  wind: 'td-wind',
} as const

const ENHANCED_TABLE_CLASS_NAMES = {
  volumetricHumidity: 'td-volumetric-humidity',
  dewPoint: 'td-dew-point',
  temperatureHumidityIndex: 'td-temperature-humidity-index',
} as const

export const TABLE_CLASS_NAMES = {
  ...BASIC_TABLE_CLASS_NAMES,
  ...ENHANCED_TABLE_CLASS_NAMES,
} as const
