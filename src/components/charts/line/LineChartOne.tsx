import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { SKY, skyChartBase, skyAreaFill } from "../../../utils/skyChart";

export default function LineChartOne() {
  // Palette + typography come from utils/skyChart — the two series are the cool
  // primary and its lighter sibling, so neither reads as a status colour.
  const options: ApexOptions = {
    ...skyChartBase,
    legend: {
      ...skyChartBase.legend,
      show: false, // Hide legend
      position: "top",
      horizontalAlign: "left",
    },
    colors: [SKY.deep, SKY.sky1], // Define line colors
    chart: {
      ...skyChartBase.chart,
      height: 310,
      type: "line", // Set the chart type to 'line'
    },
    stroke: {
      curve: "smooth", // Define the line style (straight, smooth, or step)
      width: [2, 2], // Line width for each dataset
    },

    fill: skyAreaFill,
    markers: {
      size: 0, // Size of the marker points
      strokeColors: SKY.white, // Marker border color
      strokeWidth: 2,
      hover: {
        size: 6, // Marker size on hover
      },
    },
    tooltip: {
      ...skyChartBase.tooltip,
      enabled: true, // Enable tooltip
      x: {
        format: "dd MMM yyyy", // Format for x-axis tooltip
      },
    },
    xaxis: {
      ...skyChartBase.xaxis,
      type: "category", // Category-based x-axis
      categories: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ],
      tooltip: {
        enabled: false, // Disable tooltip for x-axis points
      },
    },
    yaxis: {
      ...skyChartBase.yaxis,
      title: {
        text: "", // Remove y-axis title
        style: {
          fontSize: "0px",
        },
      },
    },
  };

  const series = [
    {
      name: "Sales",
      data: [180, 190, 170, 160, 175, 165, 170, 205, 230, 210, 240, 235],
    },
    {
      name: "Revenue",
      data: [40, 30, 50, 40, 55, 40, 70, 100, 110, 120, 150, 140],
    },
  ];
  return (
    <div className="max-w-full overflow-x-auto custom-scrollbar">
      <div id="chartEight" className="min-w-[1000px]">
        <Chart options={options} series={series} type="area" height={310} />
      </div>
    </div>
  );
}
