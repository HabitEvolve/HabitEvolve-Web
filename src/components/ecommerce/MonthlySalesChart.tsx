import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { MoreHorizontal } from "lucide-react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { useState } from "react";
import { SKY, skyChartBase, skyBarPlotOptions } from "../../utils/skyChart";

export default function MonthlySalesChart() {
  // Palette + typography come from utils/skyChart — no hexes, no local font name.
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
  const [isOpen, setIsOpen] = useState(false);

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }
  const menuItem =
    "flex w-full font-medium text-left text-sky-ink-2 rounded-sky-chip hover:bg-white/70 hover:text-sky-ink transition-colors";
  return (
    <div className="overflow-hidden rounded-sky-card sky-glass-admin px-5 pt-5 sm:px-6 sm:pt-6">
      <div className="relative flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-sky-ink">
          Monthly Sales
        </h3>
        <div className="relative inline-block">
          <button
            type="button"
            aria-label="Chart options"
            className="dropdown-toggle inline-grid place-items-center w-8 h-8 rounded-sky-chip text-sky-ink-3 hover:bg-white/70 hover:text-sky-ink transition-colors"
            onClick={toggleDropdown}
          >
            <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
          </button>
          <Dropdown
            isOpen={isOpen}
            onClose={closeDropdown}
            className="w-40 p-2"
          >
            <DropdownItem onItemClick={closeDropdown} className={menuItem}>
              View More
            </DropdownItem>
            <DropdownItem onItemClick={closeDropdown} className={menuItem}>
              Delete
            </DropdownItem>
          </Dropdown>
        </div>
      </div>

      <div className="relative max-w-full overflow-x-auto custom-scrollbar">
        <div className="-ml-5 min-w-[650px] xl:min-w-full pl-2">
          <Chart options={options} series={series} type="bar" height={180} />
        </div>
      </div>
    </div>
  );
}
