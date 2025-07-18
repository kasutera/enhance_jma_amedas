// ==UserScript==
// @name         Enhance JMA Amedas
// @namespace    https://github.com/kasutera
// @version      1.0.0
// @description  Enhance JMA Amedas
// @author       https://github.com/kasutera
// @homepage     https://github.com/kasutera/enhance_jma_amedas
// @homepageURL  https://github.com/kasutera/enhance_jma_amedas
// @updateURL    https://github.com/kasutera/enhance_jma_amedas/raw/refs/heads/main/dist/jma.user.js
// @downloadURL  https://github.com/kasutera/enhance_jma_amedas/raw/refs/heads/main/dist/jma.user.js
// @supportURL   https://github.com/kasutera/enhance_jma_amedas/issues
// @match        *://www.jma.go.jp/bosai/amedas/*
// @grant        none
// ==/UserScript==

;(() => {
  const latestTimeUrl = 'https://www.jma.go.jp/bosai/amedas/data/latest_time.txt'
  function getAmdnoFromUrl(url) {
    const pattern = /[#&]amdno=(\d+)/
    const matched = url.match(pattern)
    if (matched === null) {
      throw new Error(`amdno not found in URL: ${url}`)
    }
    return matched[1]
  }

  async function fetchLatestTime() {
    const responseLatestTime = await fetch(latestTimeUrl)
    const text = (await responseLatestTime.text()).trim()
    return new Date(text)
  }

  function generateTd$1(widthRatio, minWidth) {
    const td = document.createElement('td')
    td.style.width = `${widthRatio * 100}%`
    td.style.minWidth = `${minWidth}px`
    td.style.padding = '0px'
    td.style.borderBottom = 'hidden'
    return td
  }
  function generateSimpleTableHiddenTr$1(elementCount) {
    const tr = document.createElement('tr')
    tr.classList.add('simple-table-hidden-tr')
    const headerCellWidthRatio = 65 / (65 + 42 * elementCount)
    const otherCellsWidthRatio = (1 - headerCellWidthRatio) / elementCount
    tr.append(generateTd$1(headerCellWidthRatio, 65))
    for (let i = 0; i < elementCount; i++) {
      tr.append(generateTd$1(otherCellsWidthRatio, 42))
    }
    return tr
  }
  function generate1stContentsHeaderElement$1(headerValue) {
    const th = document.createElement('th')
    const div1 = document.createElement('div')
    const div2 = document.createElement('div')
    div2.classList.add('amd-table-div-elemname', 'amd-table-elemname-resize-responsive')
    div2.textContent = headerValue
    div1.append(div2)
    th.append(div1)
    return th
  }
  function generate2ndContentsHeaderElement$1(headerUnit) {
    const th = document.createElement('th')
    const div = document.createElement('div')
    div.classList.add('amd-table-elemunit-resize-responsive')
    div.textContent = headerUnit
    th.append(div)
    return th
  }
  function generateAmdTableTdElement$1(className, value) {
    const td = document.createElement('td')
    td.classList.add(className)
    td.textContent = value
    return td
  }

  const TARGET_TABLE_CLASS = 'contents-wide-table-scroll'
  function getAmdAreastableLinks() {
    const objs = Array.from(
      document.querySelectorAll(`.${TARGET_TABLE_CLASS} .amd-areastable-a-pointlink`),
    )
    for (const obj of objs) {
      if (!(obj instanceof HTMLAnchorElement)) {
        throw new Error('amd-areastable-a-pointlink is not an HTMLAnchorElement')
      }
      if (!obj.href.includes('#amdno=')) {
        throw new Error(`amd-areastable-a-pointlink href does not include #amdno= ${obj}`)
      }
    }
    return objs
  }
  function _getAmdnos(obj) {
    const amdno = obj.href.match(/#amdno=(\d+)/)
    if (amdno === null) {
      throw new Error(`amd-areastable-a-pointlink href does not match #amdno= pattern: ${obj.href}`)
    }
    if (amdno[1] === undefined) {
      throw new Error(`amd-areastable-a-pointlink href does not contain amdno: ${obj.href}`)
    }
    return amdno[1]
  }
  function getAmdnos() {
    return getAmdAreastableLinks().map(_getAmdnos)
  }
  function appendColumnToAreastable(areastable, column) {
    if (!areastable.classList.contains('amd-areastable')) {
      throw new Error('areastable is not class of amd-areastable')
    }
    const old = areastable.querySelector('.simple-table-hidden-tr')
    if (old === null) {
      throw new Error('.simple-table-hidden-tr does not exist')
    }
    const length = old.children.length
    const simpleTableHiddenTr = generateSimpleTableHiddenTr$1(length)
    if (old !== null) {
      old.remove()
    }
    areastable.prepend(simpleTableHiddenTr)
    const trContentsHeaders = Array.from(areastable.querySelectorAll('.contents-header'))
    if (trContentsHeaders.length % 2 !== 0) {
      throw new Error(`contents-headerの数が不正です: ${trContentsHeaders.length}`)
    }
    for (let i = 0; i < trContentsHeaders.length; i += 2) {
      const trContentsHeader1st = trContentsHeaders[i]
      trContentsHeader1st.append(generate1stContentsHeaderElement$1(column.headerValue))
      const trContentsHeader2nd = trContentsHeaders[i + 1]
      trContentsHeader2nd.append(generate2ndContentsHeaderElement$1(column.headerUnit))
    }
    const amdTableTrs = Array.from(areastable.querySelectorAll('.amd-areastable-tr-pointdata'))
    amdTableTrs.forEach((tr, index) => {
      tr.append(generateAmdTableTdElement$1(column.class, column.values[index]))
    })
  }

  function dateToAmedasUrl$1(date) {
    const yyyymmddhhmmss =
      `${date.getFullYear()}` +
      `${(date.getMonth() + 1).toString().padStart(2, '0')}` +
      `${date.getDate().toString().padStart(2, '0')}` +
      `${date.getHours().toString().padStart(2, '0')}` +
      `${date.getMinutes().toString().padStart(2, '0')}` +
      '00'
    return `https://www.jma.go.jp/bosai/amedas/data/map/${yyyymmddhhmmss}.json`
  }
  function toAmedasData$1(fetched, date) {
    const record = {}
    for (const ameid in fetched) {
      const point = fetched[ameid]
      if (!point.temp || !point.humidity) {
        continue
      }
      record[ameid] = {
        pressure: point.pressure?.[0],
        temperature: point.temp[0],
        humidity: point.humidity[0],
        date,
      }
    }
    return record
  }
  const AmedasFetcher$1 = class AmedasFetcher {
    cache = new Map()
    async fetchAmedasData(date) {
      const url = dateToAmedasUrl$1(date)
      const cached = this.cache.get(url)
      if (cached !== undefined) {
        return toAmedasData$1(cached, date)
      }
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch data from ${url}`)
      }
      const json = await response.json()
      this.cache.set(url, json)
      return toAmedasData$1(json, date)
    }
  }

  class HumidCalculator {
    temperature
    relativeHumidity
    pressure
    saturatedWaterVaporPressure
    waterVaporPressure
    saturatedWaterVaporAmount
    volumetricHumidity
    dewPoint
    temperatureHumidityIndex
    constructor(temperature, relativeHumidity, pressure) {
      this.temperature = temperature
      this.relativeHumidity = relativeHumidity
      this.pressure = pressure
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
      this.temperatureHumidityIndex = this.calcTemperatureHumidityIndex(
        temperature,
        relativeHumidity,
      )
    }
    calcSaturatedWaterVaporPressure(temperature) {
      const a = 6.1078
      const b = 7.5
      const c = 237.3
      return a * 10 ** ((b * temperature) / (c + temperature))
    }
    calcWaterVaporPressure(relativeHumidity) {
      return (relativeHumidity / 100) * this.saturatedWaterVaporPressure
    }
    calcSaturatedWaterVaporAmount(saturatedWaterVaporPressure, temperature) {
      return (217 * saturatedWaterVaporPressure) / (273.15 + temperature)
    }
    calcVolumetricHumidity(saturatedWaterVaporAmount, relativeHumidity) {
      return (relativeHumidity / 100) * saturatedWaterVaporAmount
    }
    calcDewPoint(waterVaporPressure) {
      const a = Math.log10(waterVaporPressure / 6.1078)
      return (237.3 * a) / (7.5 - a)
    }
    calcTemperatureHumidityIndex(temperature, relativeHumidity) {
      return 0.81 * temperature + 0.01 * relativeHumidity * (0.99 * temperature - 14.3) + 46.3
    }
  }

  const VOLUMETRIC_HUMIDITY_CLASS$1 = 'td-volumetric-humidity'
  const DEW_POINT_CLASS$1 = 'td-dew-point'
  const TEMPERATURE_HUMIDITY_INDEX_CLASS$1 = 'td-temperature-humidity-index'
  const STANDARD_PRESSURE$1 = 1013.25
  const VALUES_PRECISION$1 = 1
  function convertAmedasDataToSeriestableRow$1(amdnos, amedasDatas) {
    const volumetricHumidityValues = []
    const dewPointValues = []
    const temperatureHumidityIndexValues = []
    for (const amdno of amdnos) {
      const amedasData = amedasDatas[amdno]
      if (
        amedasData === undefined ||
        amedasData.temperature === undefined ||
        amedasData.humidity === undefined
      ) {
        volumetricHumidityValues.push(null)
        dewPointValues.push(null)
        temperatureHumidityIndexValues.push(null)
        continue
      }
      const pressure = amedasData.pressure ?? STANDARD_PRESSURE$1
      const humidCalculator = new HumidCalculator(
        amedasData.temperature,
        amedasData.humidity,
        pressure,
      )
      volumetricHumidityValues.push(humidCalculator.volumetricHumidity)
      dewPointValues.push(humidCalculator.dewPoint)
      temperatureHumidityIndexValues.push(humidCalculator.temperatureHumidityIndex)
    }
    const volumetricHumidityRow = {
      class: VOLUMETRIC_HUMIDITY_CLASS$1,
      headerValue: '容積絶対湿度',
      headerUnit: 'g/㎥',
      values: volumetricHumidityValues.map((value) => value?.toFixed(VALUES_PRECISION$1) || '---'),
    }
    const dewPointRow = {
      class: DEW_POINT_CLASS$1,
      headerValue: '露点温度',
      headerUnit: '℃',
      values: dewPointValues.map((value) => value?.toFixed(VALUES_PRECISION$1) || '---'),
    }
    const temperatureHumidityIndexRow = {
      class: TEMPERATURE_HUMIDITY_INDEX_CLASS$1,
      headerValue: '不快指数',
      headerUnit: '',
      values: temperatureHumidityIndexValues.map(
        (value) => value?.toFixed(VALUES_PRECISION$1) || '---',
      ),
    }
    return [volumetricHumidityRow, dewPointRow, temperatureHumidityIndexRow]
  }

  function areastable_main() {
    const fetcher = new AmedasFetcher$1()
    async function renderAreastable(areastable) {
      const amdnos = getAmdnos()
      const latestTime = await fetchLatestTime()
      const fetched = await fetcher.fetchAmedasData(latestTime)
      const [volumetricHumidityRow, dewPointRow, temperatureHumidityIndexRow] =
        convertAmedasDataToSeriestableRow$1(amdnos, fetched)
      appendColumnToAreastable(areastable, volumetricHumidityRow)
      appendColumnToAreastable(areastable, dewPointRow)
      appendColumnToAreastable(areastable, temperatureHumidityIndexRow)
    }
    const observationTarget = document.querySelector('#amd-table')
    if (observationTarget !== null) {
      const observer = new MutationObserver((mutationList) => {
        void (async () => {
          for (const mutation of mutationList) {
            for (const addedNode of mutation.addedNodes) {
              if (
                addedNode instanceof HTMLElement &&
                addedNode.classList.contains('amd-areastable') &&
                addedNode.classList.contains('amd-table-responsive')
              ) {
                if (addedNode.parentElement?.style.display === 'none') {
                  continue
                }
                observer.disconnect()
                await renderAreastable(addedNode)
                observer.observe(observationTarget, observeOptions)
              }
            }
          }
        })()
      })
      const observeOptions = { attributes: true, childList: true, subtree: true }
      observer.observe(observationTarget, observeOptions)
    }
  }

  function generateTd(widthRatio, minWidth) {
    const td = document.createElement('td')
    td.style.width = `${widthRatio * 100}%`
    td.style.minWidth = `${minWidth}px`
    td.style.padding = '0px'
    td.style.borderBottom = 'hidden'
    return td
  }
  function generateSimpleTableHiddenTr(elementCount) {
    const tr = document.createElement('tr')
    tr.classList.add('simple-table-hidden-tr')
    const headerCellWidthRatio = 29 / (29 + 21 * elementCount)
    const firstCellWidthRatio = (9 / (9 + 16)) * headerCellWidthRatio
    const secondCellWidthRatio = (16 / (9 + 16)) * headerCellWidthRatio
    const otherCellsWidthRatio = (1 - headerCellWidthRatio) / elementCount
    tr.append(generateTd(firstCellWidthRatio, 20))
    tr.append(generateTd(secondCellWidthRatio, 35))
    for (let i = 0; i < elementCount; i++) {
      tr.append(generateTd(otherCellsWidthRatio, 40))
    }
    return tr
  }
  function generate1stContentsHeaderElement(className, headerValue) {
    const th = document.createElement('th')
    th.classList.add(className)
    const div1 = document.createElement('div')
    const div2 = document.createElement('div')
    div2.classList.add('amd-table-div-elemname', 'amd-table-elemname-resize-responsive')
    div2.textContent = headerValue
    div1.append(div2)
    th.append(div1)
    return th
  }
  function generate2ndContentsHeaderElement(className, headerUnit) {
    const th = document.createElement('th')
    th.classList.add(className)
    const div = document.createElement('div')
    div.classList.add('amd-table-elemunit-resize-responsive')
    div.textContent = headerUnit
    th.append(div)
    return th
  }
  function generateAmdTableTdElement(className, value) {
    const td = document.createElement('td')
    td.classList.add(className)
    td.textContent = value
    return td
  }

  function getLatestDateFromDay(dateOfMonth, now = undefined) {
    const date = now ?? new Date()
    return date.getDate() < dateOfMonth
      ? new Date(date.getFullYear(), date.getMonth() - 1, dateOfMonth)
      : new Date(date.getFullYear(), date.getMonth(), dateOfMonth)
  }
  function getTimeSeries(seriestable, now = undefined) {
    const amdTableTrs = Array.from(
      seriestable.querySelectorAll('.amd-table-tr-onthedot, .amd-table-tr-notonthedot'),
    )
    const timeSeries = []
    let date
    for (const tr of amdTableTrs) {
      const dayTd = tr.querySelector('td[rowspan]')
      if (dayTd !== null) {
        const dayOfMonth = dayTd.textContent?.match(/\d{1,2}日/)?.[0]
        if (dayOfMonth !== undefined) {
          date = getLatestDateFromDay(Number.parseInt(dayOfMonth), now)
        }
      }
      const timeTd = tr.querySelector('td:not([rowspan])')
      if (timeTd !== null && date !== undefined) {
        const time = timeTd.textContent?.match(/(\d{2}):(\d{2})/)?.map(Number)
        if (time === undefined) {
          throw new Error(`時刻の取得に失敗しました: ${timeTd.textContent}`)
        }
        const [, hh, mm] = time
        const datetime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hh, mm)
        timeSeries.push(datetime)
      }
    }
    return timeSeries
  }
  function appendColumnToSeriestable(seriestable, row) {
    const old = seriestable.querySelector('.simple-table-hidden-tr')
    const length = old === null ? row.values.length : old.children.length - 1
    const simpleTableHiddenTr = generateSimpleTableHiddenTr(length)
    if (old !== null) {
      old.remove()
    }
    seriestable.prepend(simpleTableHiddenTr)
    const trContentsHeaders = Array.from(seriestable.querySelectorAll('.contents-header'))
    if (trContentsHeaders.length % 2 !== 0) {
      throw new Error(`contents-headerの数が不正です: ${trContentsHeaders.length}`)
    }
    for (let i = 0; i < trContentsHeaders.length; i += 2) {
      const trContentsHeader1st = trContentsHeaders[i]
      trContentsHeader1st.append(generate1stContentsHeaderElement(row.class, row.headerValue))
      const trContentsHeader2nd = trContentsHeaders[i + 1]
      trContentsHeader2nd.append(generate2ndContentsHeaderElement(row.class, row.headerUnit))
    }
    const amdTableTrs = Array.from(
      seriestable.querySelectorAll('.amd-table-tr-onthedot, .amd-table-tr-notonthedot'),
    )
    let i = 0
    amdTableTrs.forEach((tr) => {
      tr.append(generateAmdTableTdElement(row.class, row.values[i]))
      i++
    })
  }

  function getAmedasUrl(code, yyyymmdd, hh) {
    return `https://www.jma.go.jp/bosai/amedas/data/point/${code}/${yyyymmdd}_${hh}.json`
  }
  function dateToAmedasUrl(code, date) {
    const yyyymmdd =
      `${date.getFullYear()}` +
      `${(date.getMonth() + 1).toString().padStart(2, '0')}` +
      `${date.getDate().toString().padStart(2, '0')}`
    const hh = date.getHours()
    const hh3 = Math.floor(hh / 3) * 3
    const hh3str = hh3.toString().padStart(2, '0')
    return getAmedasUrl(code, yyyymmdd, hh3str)
  }
  function toAmedasData(fetched, date) {
    if (date.getMinutes() % 10 !== 0) {
      throw new Error(`date must be 10 minutes unit: ${date.toISOString()}`)
    }
    const yyyymmdd =
      `${date.getFullYear()}` +
      `${(date.getMonth() + 1).toString().padStart(2, '0')}` +
      `${date.getDate().toString().padStart(2, '0')}`
    const hhmmss =
      date.getHours().toString().padStart(2, '0') +
      date.getMinutes().toString().padStart(2, '0') +
      '00'
    const timestamp = `${yyyymmdd}${hhmmss}`
    const timePoint = fetched[timestamp]
    return {
      pressure: timePoint.pressure?.[0],
      temperature: timePoint.temp[0],
      humidity: timePoint.humidity[0],
      date,
    }
  }
  class AmedasFetcher {
    cache = new Map()
    async fetchAmedasData(code, date) {
      const url = dateToAmedasUrl(code, date)
      const cached = this.cache.get(url)
      if (cached !== undefined) {
        return toAmedasData(cached, date)
      }
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch data from ${url}`)
      }
      const json = await response.json()
      this.cache.set(url, json)
      return toAmedasData(json, date)
    }
  }

  const VOLUMETRIC_HUMIDITY_CLASS = 'td-volumetric-humidity'
  const DEW_POINT_CLASS = 'td-dew-point'
  const TEMPERATURE_HUMIDITY_INDEX_CLASS = 'td-temperature-humidity-index'
  const STANDARD_PRESSURE = 1013.25
  const VALUES_PRECISION = 1
  function convertAmedasDataToSeriestableRow(amedasDatas) {
    const volumetricHumidityValues = []
    const dewPointValues = []
    const temperatureHumidityIndexValues = []
    for (const amedasData of amedasDatas) {
      if (amedasData.temperature === undefined || amedasData.humidity === undefined) {
        volumetricHumidityValues.push(null)
        dewPointValues.push(null)
        temperatureHumidityIndexValues.push(null)
        continue
      }
      const pressure = amedasData.pressure ?? STANDARD_PRESSURE
      const humidCalculator = new HumidCalculator(
        amedasData.temperature,
        amedasData.humidity,
        pressure,
      )
      volumetricHumidityValues.push(humidCalculator.volumetricHumidity)
      dewPointValues.push(humidCalculator.dewPoint)
      temperatureHumidityIndexValues.push(humidCalculator.temperatureHumidityIndex)
    }
    const volumetricHumidityRow = {
      class: VOLUMETRIC_HUMIDITY_CLASS,
      headerValue: '容積絶対湿度',
      headerUnit: 'g/㎥',
      values: volumetricHumidityValues.map((value) => value?.toFixed(VALUES_PRECISION) || '---'),
    }
    const dewPointRow = {
      class: DEW_POINT_CLASS,
      headerValue: '露点温度',
      headerUnit: '℃',
      values: dewPointValues.map((value) => value?.toFixed(VALUES_PRECISION) || '---'),
    }
    const temperatureHumidityIndexRow = {
      class: TEMPERATURE_HUMIDITY_INDEX_CLASS,
      headerValue: '不快指数',
      headerUnit: '',
      values: temperatureHumidityIndexValues.map(
        (value) => value?.toFixed(VALUES_PRECISION) || '---',
      ),
    }
    return [volumetricHumidityRow, dewPointRow, temperatureHumidityIndexRow]
  }

  function seriestable_main() {
    const fetcher = new AmedasFetcher()
    async function render(seriestable) {
      const code = getAmdnoFromUrl(window.location.href)
      const timeseries = getTimeSeries(seriestable)
      const amedasDatas = []
      for (const date of timeseries) {
        const data = await fetcher.fetchAmedasData(code, date)
        amedasDatas.push(data)
      }
      const [volumetricHumidityRow, dewPointRow, temperatureHumidityIndexRow] =
        convertAmedasDataToSeriestableRow(amedasDatas)
      appendColumnToSeriestable(seriestable, volumetricHumidityRow)
      appendColumnToSeriestable(seriestable, dewPointRow)
      appendColumnToSeriestable(seriestable, temperatureHumidityIndexRow)
    }
    const observationTarget = document.querySelector('#amd-table')
    if (observationTarget === null) {
      throw new Error('amd-table not found')
    }
    const observer = new MutationObserver((mutationList) => {
      void (async () => {
        for (const mutation of mutationList) {
          for (const addedNode of mutation.addedNodes) {
            if (
              addedNode instanceof HTMLElement &&
              addedNode.classList.contains('amd-table-seriestable')
            ) {
              if (addedNode.parentElement?.style.display === 'none') {
                continue
              }
              observer.disconnect()
              await render(addedNode)
              observer.observe(observationTarget, observeOptions)
            }
          }
        }
      })()
    })
    const observeOptions = { attributes: true, childList: true, subtree: true }
    observer.observe(observationTarget, observeOptions)
  }

  seriestable_main()
  areastable_main()
})()
