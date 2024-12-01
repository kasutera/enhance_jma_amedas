// ==UserScript==
// @name         Enhance JMA Amedas
// @namespace    https://github.com/kasutera
// @version      1.0.0
// @description  Enhance JMA Amedas
// @author       https://github.com/kasutera
// @homepage     https://github.com/kasutera/enhance_jma_amedas
// @homepageURL  https://github.com/kasutera/enhance_jma_amedas
// @updateURL    https://github.com/kasutera/enhance_jma_amedas/raw/master/dist/jma.user.js
// @downloadURL  https://github.com/kasutera/enhance_jma_amedas/raw/master/dist/jma.user.js
// @supportURL   https://github.com/kasutera/enhance_jma_amedas/issues
// @match        *://www.jma.go.jp/bosai/amedas/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    function generateTd(widthRatio, minWidth) {
        const td = document.createElement('td');
        td.style.width = `${widthRatio * 100}%`;
        td.style.minWidth = `${minWidth}px`;
        td.style.padding = '0px';
        td.style.borderBottom = 'hidden';
        return td;
    }
    function generateSimpleTableHiddenTr(elementCount) {
        const tr = document.createElement('tr');
        tr.classList.add('simple-table-hidden-tr');
        const headerCellWidthRatio = 29 / (29 + 21 * elementCount);
        const firstCellWidthRatio = 9 / (9 + 16) * headerCellWidthRatio;
        const secondCellWidthRatio = 16 / (9 + 16) * headerCellWidthRatio;
        const otherCellsWidthRatio = (1 - headerCellWidthRatio) / elementCount;
        tr.append(generateTd(firstCellWidthRatio, 20));
        tr.append(generateTd(secondCellWidthRatio, 35));
        for (let i = 0; i < elementCount; i++) {
            tr.append(generateTd(otherCellsWidthRatio, 40));
        }
        return tr;
    }
    function generate1stContentsHeaderElement(className, headerValue) {
        const th = document.createElement('th');
        th.classList.add(className);
        const div1 = document.createElement('div');
        const div2 = document.createElement('div');
        div2.classList.add('amd-table-div-elemname', 'amd-table-elemname-resize-responsive');
        div2.textContent = headerValue;
        div1.append(div2);
        th.append(div1);
        return th;
    }
    function generate2ndContentsHeaderElement(className, headerUnit) {
        const th = document.createElement('th');
        th.classList.add(className);
        const div = document.createElement('div');
        div.classList.add('amd-table-elemunit-resize-responsive');
        div.textContent = headerUnit;
        th.append(div);
        return th;
    }
    function generateAmdTableTdElement(className, value) {
        const td = document.createElement('td');
        td.classList.add(className);
        td.textContent = value;
        return td;
    }

    function getLatestDateFromDay(dateOfMonth, now = undefined) {
        const date = now ?? new Date();
        return date.getDate() < dateOfMonth
            ? new Date(date.getFullYear(), date.getMonth() - 1, dateOfMonth)
            : new Date(date.getFullYear(), date.getMonth(), dateOfMonth);
    }
    function getTimeSeries(seriestable) {
        const amdTableTrs = Array.from(seriestable.querySelectorAll('.amd-table-tr-onthedot, .amd-table-tr-notonthedot'));
        const timeSeries = [];
        let date;
        for (const tr of amdTableTrs) {
            const dayTd = tr.querySelector('td[rowspan]');
            if (dayTd !== null) {
                const dayOfMonth = dayTd.textContent?.match(/\d{1,2}日/)?.[0];
                if (dayOfMonth !== undefined) {
                    date = getLatestDateFromDay(Number.parseInt(dayOfMonth));
                }
            }
            const timeTd = tr.querySelector('td:not([rowspan])');
            if (timeTd !== null && date !== undefined) {
                const time = timeTd.textContent?.match(/(\d{2}):(\d{2})/)?.map(Number);
                if (time === undefined) {
                    throw new Error(`時刻の取得に失敗しました: ${timeTd.textContent}`);
                }
                const [, hh, mm] = time;
                const datetime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hh, mm);
                timeSeries.push(datetime);
            }
        }
        return timeSeries;
    }
    function appendColumnToSeriestable(seriestable, row) {
        const old = seriestable.querySelector('.simple-table-hidden-tr');
        const length = old === null ? row.values.length : old.children.length - 1;
        const simpleTableHiddenTr = generateSimpleTableHiddenTr(length);
        if (old !== null) {
            old.remove();
        }
        seriestable.prepend(simpleTableHiddenTr);
        const trContentsHeaders = Array.from(seriestable.querySelectorAll('.contents-header'));
        if (trContentsHeaders.length % 2 !== 0) {
            throw new Error(`contents-headerの数が不正です: ${trContentsHeaders.length}`);
        }
        for (let i = 0; i < trContentsHeaders.length; i += 2) {
            const trContentsHeader1st = trContentsHeaders[i];
            trContentsHeader1st.append(generate1stContentsHeaderElement(row.class, row.headerValue));
            const trContentsHeader2nd = trContentsHeaders[i + 1];
            trContentsHeader2nd.append(generate2ndContentsHeaderElement(row.class, row.headerUnit));
        }
        const amdTableTrs = Array.from(seriestable.querySelectorAll('.amd-table-tr-onthedot, .amd-table-tr-notonthedot'));
        let i = 0;
        amdTableTrs.forEach(tr => {
            tr.append(generateAmdTableTdElement(row.class, row.values[i]));
            i++;
        });
    }

    function getAmedasUrl(code, yyyymmdd, hh) {
        return `https://www.jma.go.jp/bosai/amedas/data/point/${code}/${yyyymmdd}_${hh}.json`;
    }
    function getAmdnoFromUrl(url) {
        const pattern = /[#&]amdno=(\d+)/;
        const matched = url.match(pattern);
        if (matched === null) {
            throw new Error(`amdno not found in URL: ${url}`);
        }
        return matched[1];
    }

    function dateToAmedasUrl(code, date) {
        const yyyymmdd = `${date.getFullYear()}` +
            `${(date.getMonth() + 1).toString().padStart(2, '0')}` +
            `${date.getDate().toString().padStart(2, '0')}`;
        const hh = date.getHours();
        const hh3 = Math.floor(hh / 3) * 3;
        const hh3str = hh3.toString().padStart(2, '0');
        return getAmedasUrl(code, yyyymmdd, hh3str);
    }
    function toAmedasData(fetched, date) {
        if (date.getMinutes() % 10 !== 0) {
            throw new Error(`date must be 10 minutes unit: ${date.toISOString()}`);
        }
        const yyyymmdd = `${date.getFullYear()}` +
            `${(date.getMonth() + 1).toString().padStart(2, '0')}` +
            `${date.getDate().toString().padStart(2, '0')}`;
        const hhmmss = date.getHours().toString().padStart(2, '0') + date.getMinutes().toString().padStart(2, '0') + '00';
        const timestamp = `${yyyymmdd}${hhmmss}`;
        const timePoint = fetched[timestamp];
        return {
            pressure: timePoint.pressure?.[0],
            temperature: timePoint.temp[0],
            humidity: timePoint.humidity[0],
            date
        };
    }
    class AmedasFetcher {
        cache = new Map();
        async fetchAmedasData(code, date) {
            const url = dateToAmedasUrl(code, date);
            const cached = this.cache.get(url);
            if (cached !== undefined) {
                return toAmedasData(cached, date);
            }
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch data from ${url}`);
            }
            const json = await response.json();
            this.cache.set(url, json);
            return toAmedasData(json, date);
        }
    }

    class HumidCalculator {
        temperature;
        relativeHumidity;
        pressure;
        saturatedWaterVaporPressure;
        waterVaporPressure;
        saturatedWaterVaporAmount;
        volumetricHumidity;
        dewPoint;
        constructor(temperature, relativeHumidity, pressure) {
            this.temperature = temperature;
            this.relativeHumidity = relativeHumidity;
            this.pressure = pressure;
            this.saturatedWaterVaporPressure = this.calcSaturatedWaterVaporPressure(temperature);
            this.waterVaporPressure = this.calcWaterVaporPressure(this.relativeHumidity);
            this.saturatedWaterVaporAmount = this.calcSaturatedWaterVaporAmount(this.saturatedWaterVaporPressure, temperature);
            this.volumetricHumidity = this.calcVolumetricHumidity(this.saturatedWaterVaporAmount, this.relativeHumidity);
            this.dewPoint = this.calcDewPoint(this.waterVaporPressure);
        }
        calcSaturatedWaterVaporPressure(temperature) {
            const a = 6.1078;
            const b = 7.5;
            const c = 237.3;
            return a * Math.pow(10, (b * temperature) / (c + temperature));
        }
        calcWaterVaporPressure(relativeHumidity) {
            return (relativeHumidity / 100) * this.saturatedWaterVaporPressure;
        }
        calcSaturatedWaterVaporAmount(saturatedWaterVaporPressure, temperature) {
            return 217 * saturatedWaterVaporPressure / (273.15 + temperature);
        }
        calcVolumetricHumidity(saturatedWaterVaporAmount, relativeHumidity) {
            return (relativeHumidity / 100) * saturatedWaterVaporAmount;
        }
        calcDewPoint(waterVaporPressure) {
            const a = Math.log10(waterVaporPressure / 6.1078);
            return 237.3 * a / (7.5 - a);
        }
    }

    const VOLUMETRIC_HUMIDITY_CLASS = 'td-volumetric-humidity';
    const DEW_POINT_CLASS = 'td-dew-point';
    const STANDARD_PRESSURE = 1013.25;
    const VALUES_PRECISION = 2;
    function convertAmedasDataToSeriestableRow(amedasDatas) {
        const volumetricHumidityValues = [];
        const dewPointValues = [];
        for (const amedasData of amedasDatas) {
            const pressure = amedasData.pressure ?? STANDARD_PRESSURE;
            const humidCalculator = new HumidCalculator(amedasData.temperature, amedasData.humidity, pressure);
            volumetricHumidityValues.push(humidCalculator.volumetricHumidity);
            dewPointValues.push(humidCalculator.dewPoint);
        }
        const volumetricHumidityRow = {
            class: VOLUMETRIC_HUMIDITY_CLASS,
            headerValue: '容積絶対湿度',
            headerUnit: 'g/㎥',
            values: volumetricHumidityValues.map(value => value.toFixed(VALUES_PRECISION))
        };
        const dewPointRow = {
            class: DEW_POINT_CLASS,
            headerValue: '露点温度',
            headerUnit: '℃',
            values: dewPointValues.map(value => value.toFixed(VALUES_PRECISION))
        };
        return [volumetricHumidityRow, dewPointRow];
    }

    const fetcher = new AmedasFetcher();
    async function render(seriestable) {
        const code = getAmdnoFromUrl(window.location.href);
        const timeseries = getTimeSeries(seriestable);
        const amedasDatas = [];
        for (const date of timeseries) {
            const data = await fetcher.fetchAmedasData(code, date);
            amedasDatas.push(data);
        }
        const [volumetricHumidityRow, dewPointRow] = convertAmedasDataToSeriestableRow(amedasDatas);
        appendColumnToSeriestable(seriestable, volumetricHumidityRow);
        appendColumnToSeriestable(seriestable, dewPointRow);
    }
    const observationTarget = document.querySelector('#amd-table');
    if (observationTarget === null) {
        throw new Error('amd-table not found');
    }
    const observer = new MutationObserver((mutationList) => {
        void (async () => {
            for (const mutation of mutationList) {
                for (const addedNode of mutation.addedNodes) {
                    if (addedNode instanceof HTMLElement && addedNode.classList.contains('amd-table-seriestable')) {
                        if (addedNode.parentElement?.style.display === 'none') {
                            continue;
                        }
                        observer.disconnect();
                        await render(addedNode);
                        observer.observe(observationTarget, observeOptions);
                    }
                }
            }
        })();
    });
    const observeOptions = { attributes: true, childList: true, subtree: true };
    observer.observe(observationTarget, observeOptions);

})();
