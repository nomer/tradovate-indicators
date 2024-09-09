/**
 * Copyright 2020 nomercode
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

const predef = require("./tools/predef");
const meta = require("./tools/meta");
const typicalPrice = require("./tools/typicalPrice");
const moment = require("moment");

class NOMVWAPBands {
    init() {
        this.prevTradeDate;
        this.prevDayOfWeek;
        this.prevDayOfMonth;
        this.prevMonth;
        this.prevLdomDayOfWeek;
        this.totalVolume = 0;
        this.totalPriceVolume = 0;
        this.totalPriceVolume2 = 0;
    }

    map(d) {
        const tradeDate = d.tradeDate();
        const currDate = new Date(d.timestamp());

        let timeframeReset;
        switch (this.props.timeframe) {
            case "monthly":
                const month = currDate.getMonth();
                const dayOfMonth = currDate.getDate();
                const lastDateOfMonth = (new Date(currDate.getFullYear(), currDate.getMonth() + 1, 0));
                const lastDayOfMonth = lastDateOfMonth.getDate();
                const ldomDayOfWeek = lastDateOfMonth.getDay();
                if (this.prevLdomDayOfWeek == 5 || this.prevLdomDayOfWeek == 6) {
                    // Last day of the month falls on a weekend
                    timeframeReset = month != this.prevMonth;
                } else {
                    timeframeReset = dayOfMonth == lastDayOfMonth;
                }
                this.prevMonth = month;
                this.prevLdomDayOfWeek = ldomDayOfWeek;
                break;
            case "weekly":
            case "twoWeeks":
                const dayOfWeek = currDate.getDay();
                timeframeReset = this.prevDayOfWeek > dayOfWeek;
                if (this.props.timeframe == "twoWeeks") {
                    const weekOfYear = moment(currDate).week();
                    timeframeReset = timeframeReset && weekOfYear % 2 === 0;
                }
                this.prevDayOfWeek = dayOfWeek;
                break;
            default:
                timeframeReset = true;
        }

        if (this.prevTradeDate != tradeDate && timeframeReset) {
            this.totalVolume = 0;
            this.totalPriceVolume = 0;
            this.totalPriceVolume2 = 0;
        }

        this.totalVolume += d.volume();
        this.totalPriceVolume += typicalPrice(d) * d.volume();
        this.totalPriceVolume2 += Math.pow(typicalPrice(d), 2) * d.volume();

        const vwap = this.totalPriceVolume / this.totalVolume;
        const stdDev = Math.sqrt(Math.max(this.totalPriceVolume2 / this.totalVolume - Math.pow(vwap, 2), 0));

        this.prevTradeDate = tradeDate;
        return {
            vwap: vwap,
            upperBand1: this.props.band1Enabled ? vwap + (stdDev * this.props.band1StdDev) : undefined,
            lowerBand1: this.props.band1Enabled ? vwap - (stdDev * this.props.band1StdDev) : undefined,
            upperBand2: this.props.band2Enabled ? vwap + (stdDev * this.props.band2StdDev) : undefined,
            lowerBand2: this.props.band2Enabled ? vwap - (stdDev * this.props.band2StdDev) : undefined,
        }
    }
}

module.exports = {
    name: "NOMVWAPBands",
    description: "NOM VWAP Bands",
    calculator: NOMVWAPBands,
    params: {
        band1StdDev: predef.paramSpecs.number(1, 0.1),
        band1Enabled: predef.paramSpecs.bool(true),
        band2StdDev: predef.paramSpecs.number(2, 0.1),
        band2Enabled: predef.paramSpecs.bool(true),
        timeframe: predef.paramSpecs.enum({
            daily: "Daily",
            weekly: "Weekly",
            twoWeeks: "2 Weeks",
            monthly: "Monthly",
        }, "daily"),
    },
    plots: {
        vwap: { title: "VWAP" },
        upperBand1: { title: "Upper Band 1" },
        lowerBand1: { title: "Lower Band 1" },
        upperBand2: { title: "Upper Band 2" },
        lowerBand2: { title: "Lower Band 2" },
    },
    tags: ["NOM Tools"],
    inputType: meta.InputType.BARS,
    schemeStyles: {
        dark: {
            vwap: predef.styles.plot({ color: "#cfa600", lineStyle: 1, lineWidth: 2 }),
            upperBand1: predef.styles.plot({ color: "#b84bf2", lineStyle: 1, lineWidth: 2 }),
            lowerBand1: predef.styles.plot({ color: "#b84bf2", lineStyle: 1, lineWidth: 2 }),
            upperBand2: predef.styles.plot({ color: "#4894c7", lineStyle: 1, lineWidth: 2 }),
            lowerBand2: predef.styles.plot({ color: "#4894c7", lineStyle: 1, lineWidth: 2 }),
        }
    }
};
