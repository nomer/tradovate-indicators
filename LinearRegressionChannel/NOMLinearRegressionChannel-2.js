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
const StdDev = require("./tools/StdDev");
const p = require("./tools/plotting");

class NOMLinearRegressionChannel {
    map(d, i) {
        const y = d.value();

        return {
            x: i,
            y: y
        }
    }
}

function lrcPlotter(canvas, indicatorInstance, history) {
    const periods = indicatorInstance.props.period;
    const band1StdDevs = indicatorInstance.props.band1StdDevs;
    const band2StdDevs = indicatorInstance.props.band2StdDevs;
    const startIndex = Math.max(history.data.length - periods, 0);
    const endIndex = history.data.length - 1;

    if (periods < 2 || history.data.length < 2) {
        return;
    }

    // Get mean of X and Y and stdDev of Y
    const { xMean, yMean, stdDev } = calculateMeanAndStdDev(startIndex, endIndex, periods, history);

    // Calculate least squares linear regression
    const { b1, b0 } = linearRegression(startIndex, endIndex, history, xMean, yMean)

    // Calculate 2 points for the linear regression line
    const x1 = startIndex;
    const x2 = endIndex;
    const y1 = b1 * x1 + b0;
    const y2 = b1 * x2 + b0;

    // Convert x to date format for plotting
    const xDate1 = p.x.get(history.get(startIndex));
    const xDate2 = p.x.get(history.get(endIndex));

    // Draw middle LR line
    const lrPath = p.createPath();
    lrPath.moveTo(xDate1, y1);
    lrPath.lineTo(xDate2, y2);
    canvas.drawPath(lrPath.end(), {
        color: indicatorInstance.props.linearRegression,
        width: indicatorInstance.props.lineWidths
    });

    // Draw first upper and lower bands
    if (indicatorInstance.props.band1Enabled) {
        const band1Upper = p.createPath();
        band1Upper.moveTo(xDate1, y1 + band1StdDevs * stdDev);
        band1Upper.lineTo(xDate2, y2 + band1StdDevs * stdDev);
        canvas.drawPath(band1Upper.end(), {
            color: indicatorInstance.props.band1Color,
            width: indicatorInstance.props.lineWidths
        });

        const band1Lower = p.createPath();
        band1Lower.moveTo(xDate1, y1 - band1StdDevs * stdDev);
        band1Lower.lineTo(xDate2, y2 - band1StdDevs * stdDev);
        canvas.drawPath(band1Lower.end(), {
            color: indicatorInstance.props.band1Color,
            width: indicatorInstance.props.lineWidths
        });
    }

    // Draw second upper and lower bands
    if (indicatorInstance.props.band2Enabled) {
        const band2Upper = p.createPath();
        band2Upper.moveTo(xDate1, y1 + band2StdDevs * stdDev);
        band2Upper.lineTo(xDate2, y2 + band2StdDevs * stdDev);
        canvas.drawPath(band2Upper.end(), {
            color: indicatorInstance.props.band2Color,
            width: indicatorInstance.props.lineWidths
        });

        const band1Lower = p.createPath();
        band1Lower.moveTo(xDate1, y1 - band2StdDevs * stdDev);
        band1Lower.lineTo(xDate2, y2 - band2StdDevs * stdDev);
        canvas.drawPath(band1Lower.end(), {
            color: indicatorInstance.props.band2Color,
            width: indicatorInstance.props.lineWidths
        });
    }
}

function calculateMeanAndStdDev(startIndex, endIndex, periods, history) {
    const stdDevTool = StdDev(periods);
    let xTotal = 0;
    let yTotal = 0;
    let stdDev = 0;

    for (let x = startIndex; x <= endIndex; x++) {
        let item = history.get(x);
        xTotal += x;
        yTotal += item.y;
        stdDev = stdDevTool(item.y);
    }

    return {
        xMean: xTotal / periods,
        yMean: yTotal / periods,
        stdDev: stdDev
    }
}

function linearRegression(startIndex, endIndex, history, xMean, yMean) {
    let num = 0;
    let den = 0;

    for (let x = startIndex; x <= endIndex; x++) {
        let item = history.get(x);
        num += (x - xMean) * (item.y - yMean);
        den += (x - xMean) * (x - xMean);
    }

    const b1 = num / den;
    return {
        b1: b1,
        b0: yMean - b1 * xMean
    }
}

module.exports = {
    name: "NOMLinearRegressionChannel",
    description: "NOM Linear Regression Channel",
    calculator: NOMLinearRegressionChannel,
    params: {
        period: predef.paramSpecs.period(50),
        linearRegression: predef.paramSpecs.color("yellow"),
        band1StdDevs: predef.paramSpecs.number(1, 0.1),
        band1Color: predef.paramSpecs.color("yellow"),
        band1Enabled: predef.paramSpecs.bool(true),
        band2StdDevs: predef.paramSpecs.number(2, 0.1),
        band2Color: predef.paramSpecs.color("yellow"),
        band2Enabled: predef.paramSpecs.bool(true),
        lineWidths: predef.paramSpecs.number(1),
    },
    tags: ["NOM Tools"],
    plotter: [
        predef.plotters.custom(lrcPlotter)
    ]
};
