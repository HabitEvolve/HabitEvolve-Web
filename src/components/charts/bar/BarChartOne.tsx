import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { SKY, skyChartBase, skyBarPlotOptions } from "../../../utils/skyChart";

export default function BarChartOne() {
  // Palette + typography come from utils/skyChart — this chart owns no hexes and
  // no font name of its own, so a token change reaches it for free.
  const options: ApexOptions = {
    ...skyChartBase,
    colors: [SKY.deep],
    chart: {
      ...skyChartBase.chart,
      type: "bar",
      height: 180,
    },
    plotOptions: {
      bar: { ...skyBarPlotOptions.bar, horizontal: false, columnWidth: "39%" },
    },
    stroke: {
      show: true,
      width: 4,
      colors: ["transparent"],
    },
    xaxis: {
      ...skyChartBase.xaxis,
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
    },
    legend: {
      ...skyChartBase.legend,
      show: true,
      position: "top",
      horizontalAlign: "left",
    },
    yaxis: {
      ...skyChartBase.yaxis,
      title: {
        text: undefined,
      },
    },
    fill: {
      opacity: 1,
    },

    tooltip: {
      ...skyChartBase.tooltip,
      x: {
        show: false,
      },
      y: {
        formatter: (val: number) => `${val}`,
      },
    },
  };
  const series = [
    {
      name: "Sales",
      data: [168, 385, 201, 298, 187, 195, 291, 110, 215, 390, 280, 112],
    },
  ];
  return (
    <div className="max-w-full overflow-x-auto custom-scrollbar">
      <div id="chartOne" className="min-w-[1000px]">
        <Chart options={options} series={series} type="bar" height={180} />
      </div>
    </div>
  );
}
