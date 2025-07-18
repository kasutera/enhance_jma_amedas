import type { AmedasData, Ameid } from './jma_amedas_fetcher'
import { convertAmedasDataToSeriestableRow } from './presentation'

describe('convertAmedasDataToSeriestableRow', () => {
  const testDate = new Date('2024-01-01T12:00:00Z')

  describe('正常なデータでの処理', () => {
    test('3つの列が正しく返されることを確認', () => {
      const amdnos: Ameid[] = ['44132', '44207']
      const amedasDatas: Record<Ameid, AmedasData> = {
        '44132': {
          temperature: 25.0,
          humidity: 60.0,
          pressure: 1013.25,
          date: testDate,
        },
        '44207': {
          temperature: 30.0,
          humidity: 80.0,
          pressure: 1000.0,
          date: testDate,
        },
      }

      const result = convertAmedasDataToSeriestableRow(amdnos, amedasDatas)

      // 3つの列が返されることを確認
      expect(result).toHaveLength(3)

      // 各列の基本構造を確認
      const [volumetricHumidityColumn, dewPointColumn, temperatureHumidityIndexColumn] = result

      expect(volumetricHumidityColumn.class).toBe('td-volumetric-humidity')
      expect(volumetricHumidityColumn.headerValue).toBe('容積絶対湿度')
      expect(volumetricHumidityColumn.headerUnit).toBe('g/㎥')
      expect(volumetricHumidityColumn.values).toHaveLength(2)

      expect(dewPointColumn.class).toBe('td-dew-point')
      expect(dewPointColumn.headerValue).toBe('露点温度')
      expect(dewPointColumn.headerUnit).toBe('℃')
      expect(dewPointColumn.values).toHaveLength(2)

      expect(temperatureHumidityIndexColumn.class).toBe('td-temperature-humidity-index')
      expect(temperatureHumidityIndexColumn.headerValue).toBe('不快指数')
      expect(temperatureHumidityIndexColumn.headerUnit).toBe('')
      expect(temperatureHumidityIndexColumn.values).toHaveLength(2)
    })

    test('不快指数列の値が正しく計算されることを確認', () => {
      const amdnos: Ameid[] = ['44132', '44207', '44208']
      const amedasDatas: Record<Ameid, AmedasData> = {
        '44132': {
          temperature: 25.0,
          humidity: 60.0,
          pressure: 1013.25,
          date: testDate,
        },
        '44207': {
          temperature: 30.0,
          humidity: 80.0,
          pressure: 1000.0,
          date: testDate,
        },
        '44208': {
          temperature: 15.0,
          humidity: 40.0,
          pressure: 1013.25,
          date: testDate,
        },
      }

      const result = convertAmedasDataToSeriestableRow(amdnos, amedasDatas)
      const temperatureHumidityIndexColumn = result[2]

      // 期待値の計算（実際の計算結果）
      // 25°C, 60%: 72.8
      // 30°C, 80%: 82.9
      // 15°C, 40%: 58.7

      expect(temperatureHumidityIndexColumn.values[0]).toBe('72.8')
      expect(temperatureHumidityIndexColumn.values[1]).toBe('82.9')
      expect(temperatureHumidityIndexColumn.values[2]).toBe('58.7')
    })
  })

  describe('欠損データでの処理', () => {
    test('気温欠損時の"---"表示テスト', () => {
      const amdnos: Ameid[] = ['44132', '44207']
      const amedasDatas: Record<Ameid, AmedasData> = {
        '44132': {
          temperature: 25.0,
          humidity: 60.0,
          pressure: 1013.25,
          date: testDate,
        },
        // 44207は気温が欠損（temperatureプロパティなし）
      }

      // 44207のデータを気温欠損として作成
      const amedasDataWithMissingTemp = {
        ...amedasDatas,
        '44207': {
          humidity: 80.0,
          pressure: 1000.0,
          date: testDate,
        } as any, // temperatureが欠損
      }

      const result = convertAmedasDataToSeriestableRow(amdnos, amedasDataWithMissingTemp)

      // 全ての列で欠損値が"---"として表示されることを確認
      expect(result[0].values[0]).toBe('13.8') // 正常データ
      expect(result[0].values[1]).toBe('---') // 欠損データ
      expect(result[1].values[0]).toBe('16.7') // 正常データ
      expect(result[1].values[1]).toBe('---') // 欠損データ
      expect(result[2].values[0]).toBe('72.8') // 正常データ
      expect(result[2].values[1]).toBe('---') // 欠損データ
    })

    test('湿度欠損時の"---"表示テスト', () => {
      const amdnos: Ameid[] = ['44132', '44207']
      const amedasDatas: Record<Ameid, AmedasData> = {
        '44132': {
          temperature: 25.0,
          humidity: 60.0,
          pressure: 1013.25,
          date: testDate,
        },
        // 44207は湿度が欠損
      }

      const amedasDataWithMissingHumidity = {
        ...amedasDatas,
        '44207': {
          temperature: 30.0,
          pressure: 1000.0,
          date: testDate,
        } as any, // humidityが欠損
      }

      const result = convertAmedasDataToSeriestableRow(amdnos, amedasDataWithMissingHumidity)

      // 全ての列で欠損値が"---"として表示されることを確認
      expect(result[0].values[0]).toBe('13.8') // 正常データ
      expect(result[0].values[1]).toBe('---') // 欠損データ
      expect(result[1].values[0]).toBe('16.7') // 正常データ
      expect(result[1].values[1]).toBe('---') // 欠損データ
      expect(result[2].values[0]).toBe('72.8') // 正常データ
      expect(result[2].values[1]).toBe('---') // 欠損データ
    })

    test('観測所データ自体が欠損時の"---"表示テスト', () => {
      const amdnos: Ameid[] = ['44132', '44207']
      const amedasDatas: Record<Ameid, AmedasData> = {
        '44132': {
          temperature: 25.0,
          humidity: 60.0,
          pressure: 1013.25,
          date: testDate,
        },
        // 44207のデータが完全に欠損（undefinedになる）
      }

      const result = convertAmedasDataToSeriestableRow(amdnos, amedasDatas)

      // 全ての列で欠損値が"---"として表示されることを確認
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
      const amdnos: Ameid[] = ['44132', '44207']
      const amedasDatas: Record<Ameid, AmedasData> = {
        '44132': {
          temperature: -5.0,
          humidity: 70.0,
          pressure: 1013.25,
          date: testDate,
        },
        '44207': {
          temperature: -10.0,
          humidity: 80.0,
          pressure: 1000.0,
          date: testDate,
        },
      }

      const result = convertAmedasDataToSeriestableRow(amdnos, amedasDatas)

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
      const amdnos: Ameid[] = ['44132']
      const amedasDatas: Record<Ameid, AmedasData> = {
        '44132': {
          temperature: 23.7,
          humidity: 65.3,
          pressure: 1013.25,
          date: testDate,
        },
      }

      const result = convertAmedasDataToSeriestableRow(amdnos, amedasDatas)

      // 全ての値が小数点以下1桁で表示されることを確認
      expect(result[0].values[0]).toMatch(/^\d+\.\d$/)
      expect(result[1].values[0]).toMatch(/^\d+\.\d$/)
      expect(result[2].values[0]).toMatch(/^\d+\.\d$/)
    })
  })
})
