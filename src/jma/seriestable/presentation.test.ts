import type { ObservationInput } from '../derived_observations'
import { convertAmedasDataToSeriestableColumns } from './presentation'

type PresentationObservation = ObservationInput

describe('時系列表の派生観測列', () => {
  describe('正常なデータでの処理', () => {
    test('不快指数行の値が正しく計算されることを確認', () => {
      const amedasDatas: PresentationObservation[] = [
        {
          temperature: 25.0,
          humidity: 60.0,
        },
        {
          temperature: 30.0,
          humidity: 80.0,
        },
        {
          temperature: 15.0,
          humidity: 40.0,
        },
      ]

      const result = convertAmedasDataToSeriestableColumns(amedasDatas)
      const temperatureHumidityIndexRow = result[2]

      // 期待値の計算（実際の計算結果）
      // 25°C, 60%: 72.8
      // 30°C, 80%: 82.9
      // 15°C, 40%: 58.7

      expect(temperatureHumidityIndexRow.values[0]).toBe('72.8')
      expect(temperatureHumidityIndexRow.values[1]).toBe('82.9')
      expect(temperatureHumidityIndexRow.values[2]).toBe('58.7')
    })
  })

  describe('欠損データでの処理', () => {
    test('気温欠損時の"---"表示テスト', () => {
      const amedasDatas: PresentationObservation[] = [
        {
          temperature: 25.0,
          humidity: 60.0,
        },
        {
          // temperatureが欠損
          humidity: 80.0,
        },
      ]

      const result = convertAmedasDataToSeriestableColumns(amedasDatas)

      // 全ての行で欠損値が"---"として表示されることを確認
      expect(result[0].values[0]).toBe('13.8') // 正常データ
      expect(result[0].values[1]).toBe('---') // 欠損データ
      expect(result[1].values[0]).toBe('16.7') // 正常データ
      expect(result[1].values[1]).toBe('---') // 欠損データ
      expect(result[2].values[0]).toBe('72.8') // 正常データ
      expect(result[2].values[1]).toBe('---') // 欠損データ
    })

    test('湿度欠損時の"---"表示テスト', () => {
      const amedasDatas: PresentationObservation[] = [
        {
          temperature: 25.0,
          humidity: 60.0,
        },
        {
          temperature: 30.0,
          // humidityが欠損
        },
      ]

      const result = convertAmedasDataToSeriestableColumns(amedasDatas)

      // 全ての行で欠損値が"---"として表示されることを確認
      expect(result[0].values[0]).toBe('13.8') // 正常データ
      expect(result[0].values[1]).toBe('---') // 欠損データ
      expect(result[1].values[0]).toBe('16.7') // 正常データ
      expect(result[1].values[1]).toBe('---') // 欠損データ
      expect(result[2].values[0]).toBe('72.8') // 正常データ
      expect(result[2].values[1]).toBe('---') // 欠損データ
    })
  })

  describe('負の値での処理', () => {
    test('負の気温での正常計算テスト', () => {
      const amedasDatas: PresentationObservation[] = [
        {
          temperature: -5.0,
          humidity: 70.0,
        },
        {
          temperature: -10.0,
          humidity: 80.0,
        },
      ]

      const result = convertAmedasDataToSeriestableColumns(amedasDatas)

      // 負の気温でも正常に計算されることを確認
      // -5°C, 70%: 28.8
      // -10°C, 80%: 18.8
      expect(result[2].values[0]).toBe('28.8')
      expect(result[2].values[1]).toBe('18.8')
    })
  })

  describe('小数点精度の確認', () => {
    test('小数点以下1桁での表示確認', () => {
      const amedasDatas: PresentationObservation[] = [
        {
          temperature: 23.7,
          humidity: 65.3,
        },
      ]

      const result = convertAmedasDataToSeriestableColumns(amedasDatas)

      // 全ての値が小数点以下1桁で表示されることを確認
      expect(result[0].values[0]).toMatch(/^\d+\.\d$/)
      expect(result[1].values[0]).toMatch(/^\d+\.\d$/)
      expect(result[2].values[0]).toMatch(/^\d+\.\d$/)
    })
  })
})
