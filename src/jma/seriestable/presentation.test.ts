import type { AmedasData } from './jma_amedas_fetcher'
import { convertAmedasDataToSeriestableRow } from './presentation'

describe('convertAmedasDataToSeriestableRow', () => {
  const testDate = new Date('2024-01-01T12:00:00Z')

  describe('正常なデータでの処理', () => {
    test('3つの行が正しく返されることを確認', () => {
      const amedasDatas: AmedasData[] = [
        {
          temperature: 25.0,
          humidity: 60.0,
          pressure: 1013.25,
          date: testDate,
        },
        {
          temperature: 30.0,
          humidity: 80.0,
          pressure: 1000.0,
          date: testDate,
        },
      ]

      const result = convertAmedasDataToSeriestableRow(amedasDatas)

      // 3つの行が返されることを確認
      expect(result).toHaveLength(3)

      // 各行の基本構造を確認
      const [volumetricHumidityRow, dewPointRow, temperatureHumidityIndexRow] = result

      expect(volumetricHumidityRow.class).toBe('td-volumetric-humidity')
      expect(volumetricHumidityRow.headerValue).toBe('容積絶対湿度')
      expect(volumetricHumidityRow.headerUnit).toBe('g/㎥')
      expect(volumetricHumidityRow.values).toHaveLength(2)

      expect(dewPointRow.class).toBe('td-dew-point')
      expect(dewPointRow.headerValue).toBe('露点温度')
      expect(dewPointRow.headerUnit).toBe('℃')
      expect(dewPointRow.values).toHaveLength(2)

      expect(temperatureHumidityIndexRow.class).toBe('td-temperature-humidity-index')
      expect(temperatureHumidityIndexRow.headerValue).toBe('不快指数')
      expect(temperatureHumidityIndexRow.headerUnit).toBe('')
      expect(temperatureHumidityIndexRow.values).toHaveLength(2)
    })

    test('不快指数行の値が正しく計算されることを確認', () => {
      const amedasDatas: AmedasData[] = [
        {
          temperature: 25.0,
          humidity: 60.0,
          pressure: 1013.25,
          date: testDate,
        },
        {
          temperature: 30.0,
          humidity: 80.0,
          pressure: 1000.0,
          date: testDate,
        },
        {
          temperature: 15.0,
          humidity: 40.0,
          pressure: 1013.25,
          date: testDate,
        },
      ]

      const result = convertAmedasDataToSeriestableRow(amedasDatas)
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
      const amedasDatas: AmedasData[] = [
        {
          temperature: 25.0,
          humidity: 60.0,
          pressure: 1013.25,
          date: testDate,
        },
        {
          // temperatureが欠損
          humidity: 80.0,
          pressure: 1000.0,
          date: testDate,
        } as any,
      ]

      const result = convertAmedasDataToSeriestableRow(amedasDatas)

      // 全ての行で欠損値が"---"として表示されることを確認
      expect(result[0].values[0]).toBe('13.8') // 正常データ
      expect(result[0].values[1]).toBe('---') // 欠損データ
      expect(result[1].values[0]).toBe('16.7') // 正常データ
      expect(result[1].values[1]).toBe('---') // 欠損データ
      expect(result[2].values[0]).toBe('72.8') // 正常データ
      expect(result[2].values[1]).toBe('---') // 欠損データ
    })

    test('湿度欠損時の"---"表示テスト', () => {
      const amedasDatas: AmedasData[] = [
        {
          temperature: 25.0,
          humidity: 60.0,
          pressure: 1013.25,
          date: testDate,
        },
        {
          temperature: 30.0,
          // humidityが欠損
          pressure: 1000.0,
          date: testDate,
        } as any,
      ]

      const result = convertAmedasDataToSeriestableRow(amedasDatas)

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
      const amedasDatas: AmedasData[] = [
        {
          temperature: -5.0,
          humidity: 70.0,
          pressure: 1013.25,
          date: testDate,
        },
        {
          temperature: -10.0,
          humidity: 80.0,
          pressure: 1000.0,
          date: testDate,
        },
      ]

      const result = convertAmedasDataToSeriestableRow(amedasDatas)

      // 負の気温でも正常に計算されることを確認
      // -5°C, 70%: 28.8
      // -10°C, 80%: 18.8
      expect(result[2].values[0]).toBe('28.8')
      expect(result[2].values[1]).toBe('18.8')

      // 他の計算値も正常に計算されることを確認（"---"ではない）
      expect(result[0].values[0]).not.toBe('---')
      expect(result[0].values[1]).not.toBe('---')
      expect(result[1].values[0]).not.toBe('---')
      expect(result[1].values[1]).not.toBe('---')
    })
  })

  describe('小数点精度の確認', () => {
    test('小数点以下1桁での表示確認', () => {
      const amedasDatas: AmedasData[] = [
        {
          temperature: 23.7,
          humidity: 65.3,
          pressure: 1013.25,
          date: testDate,
        },
      ]

      const result = convertAmedasDataToSeriestableRow(amedasDatas)

      // 全ての値が小数点以下1桁で表示されることを確認
      expect(result[0].values[0]).toMatch(/^\d+\.\d$/)
      expect(result[1].values[0]).toMatch(/^\d+\.\d$/)
      expect(result[2].values[0]).toMatch(/^\d+\.\d$/)
    })
  })
})
