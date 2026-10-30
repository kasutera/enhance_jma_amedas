export const OBSERVATION_UNITS = Object.freeze({
  temperature: '°C',
  humidity: '%',
  pressure: 'hPa',
} as const)

export interface ObservationQuality {
  readonly temperature?: number | null | undefined
  readonly humidity?: number | null | undefined
  readonly pressure?: number | null | undefined
}

/** A normalized JMA AMeDAS observation at one actual instant. */
export interface Observation {
  readonly stationId: string
  readonly date: Date
  readonly temperature?: number | undefined
  readonly humidity?: number | undefined
  readonly pressure?: number | undefined
  readonly quality: ObservationQuality
  readonly units: typeof OBSERVATION_UNITS
}
