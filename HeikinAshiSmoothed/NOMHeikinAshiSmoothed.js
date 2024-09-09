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
const SMA = require("./tools/SMA");
const EMA = require("./tools/EMA");
const WMA = require("./tools/WMA");
const p = require("./tools/plotting");

class NOMHeikinAshiSmoothed {

    init() {
        switch (this.props.movingAverageType) {
            case 'simple':
                this.openMA = SMA(this.props.period);
                this.highMA = SMA(this.props.period);
                this.lowMA = SMA(this.props.period);
                this.closeMA = SMA(this.props.period);
                break;
            case 'exponential':
                this.openMA = EMA(this.props.period);
                this.highMA = EMA(this.props.period);
                this.lowMA = EMA(this.props.period);
                this.closeMA = EMA(this.props.period);
                break;
            case 'hull':
                this.hmaOpenLong = WMA(this.props.period);
                this.hmaOpenShort = WMA(this.props.period / 2);
                this.hmaOpenSqrt = WMA(Math.sqrt(this.props.period));

                this.hmaHighLong = WMA(this.props.period);
                this.hmaHighShort = WMA(this.props.period / 2);
                this.hmaHighSqrt = WMA(Math.sqrt(this.props.period));

                this.hmaLowLong = WMA(this.props.period);
                this.hmaLowShort = WMA(this.props.period / 2);
                this.hmaLowSqrt = WMA(Math.sqrt(this.props.period));

                this.hmaCloseLong = WMA(this.props.period);
                this.hmaCloseShort = WMA(this.props.period / 2);
                this.hmaCloseSqrt = WMA(Math.sqrt(this.props.period));
            default:
                // Weighted
                this.openMA = WMA(this.props.period);
                this.highMA = WMA(this.props.period);
                this.lowMA = WMA(this.props.period);
                this.closeMA = WMA(this.props.period);
                break;
        }
    }

    map(d) {
        this.prevOpenMA = this.currOpenMA;
        this.prevHighMA = this.currHighMA;
        this.prevLowMA = this.currLowMA;
        this.prevCloseMA = this.currCloseMA;
        this.prevHaOpen = this.currHaOpen;
        this.prevHaClose = this.currHaClose;

        if (this.props.movingAverageType == 'hull') {
            const hmaOpenLong = this.hmaOpenLong(d.open());
            const hmaOpenShort = this.hmaOpenShort(d.open()) * 2;
            this.currOpenMA = this.hmaOpenSqrt(hmaOpenShort - hmaOpenLong);

            const hmaHighLong = this.hmaHighLong(d.high());
            const hmaHighShort = this.hmaHighShort(d.high()) * 2;
            this.currHighMA = this.hmaHighSqrt(hmaHighShort - hmaHighLong);

            const hmaLowLong = this.hmaLowLong(d.low());
            const hmaLowShort = this.hmaLowShort(d.low()) * 2;
            this.currLowMA = this.hmaLowSqrt(hmaLowShort - hmaLowLong);

            const hmaCloseLong = this.hmaCloseLong(d.close());
            const hmaCloseShort = this.hmaCloseShort(d.close()) * 2;
            this.currCloseMA = this.hmaCloseSqrt(hmaCloseShort - hmaCloseLong);
        } else {
            this.currOpenMA = this.openMA(d.open());
            this.currHighMA = this.highMA(d.high());
            this.currLowMA = this.lowMA(d.low());
            this.currCloseMA = this.closeMA(d.close());
        }


        if (isNaN(this.prevOpenMA)) {
            this.prevOpenMA = this.currOpenMA;
        }
        if (isNaN(this.prevHighMA)) {
            this.prevHighMA = this.currHighMA;
        }
        if (isNaN(this.prevLowMA)) {
            this.prevLowMA = this.currLowMA;
        }
        if (isNaN(this.prevCloseMA)) {
            this.prevCloseMA = this.currCloseMA;
        }
        if (isNaN(this.prevHaOpen)) {
            this.prevHaOpen = (this.prevOpenMA + this.prevHighMA + this.prevLowMA + this.prevCloseMA) / 4.0;
        }

        switch (this.props.candleSmoothing) {
            case 'vervoort':
                this.currHaOpen = (this.prevHaOpen + (this.prevOpenMA + this.prevHighMA + this.prevLowMA + this.prevCloseMA) / 4.0) / 2.0;
                this.currHaClose = ((this.currOpenMA + this.currHighMA + this.currLowMA + this.currCloseMA) / 4.0 + this.currHaOpen + Math.max(this.currHighMA, this.currHaOpen) + Math.min(this.currLowMA, this.currHaOpen)) / 4.0;
                break;
            default:
                // Valcu
                this.currHaOpen = (this.prevHaOpen + (this.prevOpenMA + this.prevHighMA + this.prevLowMA + this.prevCloseMA) / 4.0) / 2.0;
                this.currHaClose = (this.currOpenMA + this.currHighMA + this.currLowMA + this.currCloseMA) / 4.0;
                break;
        }

        return {
            haOpen: this.currHaOpen,
            haHigh: Math.max(this.currHighMA, this.currHaOpen),
            haLow: Math.min(this.currLowMA, this.currHaOpen),
            haClose: this.currHaClose,
            candlestick: {
                color: this.props.hideCandles ? "transparent" : null
            },
            style: {
                value: {
                    color: this.props.hideCandles ? "transparent" : null
                }
            },
        };
    }

    filter(d, i) {
        return i > this.props.period;
    }
}

function candlestickPlotter(canvas, indicatorInstance, history) {
    for (let i = 0; i < history.data.length; ++i) {
        const item = history.get(i);
        if (item.haOpen !== undefined
            && item.haHigh !== undefined
            && item.haLow !== undefined
            && item.haClose !== undefined) {
            const x = p.x.get(item);

            // candle body
            canvas.drawLine(
                p.offset(x, item.haOpen),
                p.offset(x, item.haClose),
                {
                    color: item.haOpen > item.haClose ? indicatorInstance.props.fallingColor : indicatorInstance.props.risingColor,
                    relativeWidth: 0.9,
                });

            // candle wicks   
            canvas.drawLine(
                p.offset(x, item.haHigh),
                p.offset(x, item.haLow),
                {
                    color: item.haOpen > item.haClose ? indicatorInstance.props.fallingColor : indicatorInstance.props.risingColor,
                    relativeWidth: 0.2,
                });
        }
    }
}

module.exports = {
    name: "NOMHeikinAshiSmoothed",
    description: "NOM Heikin Ashi Smoothed",
    calculator: NOMHeikinAshiSmoothed,
    params: {
        period: predef.paramSpecs.period(35),
        hideCandles: predef.paramSpecs.bool(false),
        movingAverageType: predef.paramSpecs.enum({
            simple: "Simple Moving Average",
            exponential: "Exponential Moving Average",
            hull: "Hull Moving Average",
            weighted: "Weighted Moving Average",
        }, "weighted"),
        candleSmoothing: predef.paramSpecs.enum({
            valcu: "Valcu",
            vervoort: "Vervoot"
        }, "valcu"),
        risingColor: predef.paramSpecs.color("green"),
        fallingColor: predef.paramSpecs.color("red")
    },
    inputType: meta.InputType.BARS,
    tags: ["NOM Tools"],
    plotter: [
        predef.plotters.custom(candlestickPlotter)
    ]
};
