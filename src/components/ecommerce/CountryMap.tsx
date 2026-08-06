// react plugin for creating vector maps
import { VectorMap } from "@react-jvectormap/core";
import { worldMill } from "@react-jvectormap/world";
import { SKY } from "../../utils/skyChart";

// jVectorMap paints into an SVG it owns and cannot read Tailwind utilities, so
// like ApexCharts it needs literal colours — they're pulled from utils/skyChart
// so this file still owns no hexes of its own and a token change reaches it.
// Land is the pale sky tint, active markers/regions the deep operational blue,
// labels navy ink. Onest replaces the stray Space Grotesk reference (no third
// font, §4).
const LAND = SKY.sky2;
const ACTIVE = SKY.deep;
const MARKER = SKY.peachDeep;

// Markers sit on peach-deep, not the same blue as the land-selection state: they
// mark *where the customers are*, and reusing the region hue would make a marker
// on a selected country invisible.
const markerStyle = { fill: MARKER, borderWidth: 1.5, borderColor: SKY.white };

// Define the component props
interface CountryMapProps {
  mapColor?: string;
}

const CountryMap: React.FC<CountryMapProps> = ({ mapColor }) => {
  return (
    <VectorMap
      map={worldMill}
      backgroundColor="transparent"
      markerStyle={{
        initial: {
          fill: MARKER,
          r: 4, // Custom radius for markers
        } as any, // Type assertion to bypass strict CSS property checks
      }}
      markersSelectable={true}
      markers={[
        {
          latLng: [37.2580397, -104.657039],
          name: "United States",
          style: { ...markerStyle, stroke: SKY.white },
        },
        {
          latLng: [20.7504374, 73.7276105],
          name: "India",
          style: markerStyle,
        },
        {
          latLng: [53.613, -11.6368],
          name: "United Kingdom",
          style: markerStyle,
        },
        {
          latLng: [-25.0304388, 115.2092761],
          name: "Sweden",
          style: { ...markerStyle, strokeOpacity: 0 },
        },
      ]}
      zoomOnScroll={false}
      zoomMax={12}
      zoomMin={1}
      zoomAnimate={true}
      zoomStep={1.5}
      regionStyle={{
        initial: {
          fill: mapColor || LAND,
          fillOpacity: 1,
          fontFamily: "Onest, system-ui, sans-serif",
          stroke: "none",
          strokeWidth: 0,
          strokeOpacity: 0,
        },
        hover: {
          fillOpacity: 0.75,
          cursor: "pointer",
          fill: SKY.sky1,
          stroke: "none",
        },
        selected: {
          fill: ACTIVE,
        },
        selectedHover: {},
      }}
      regionLabelStyle={{
        initial: {
          fill: SKY.ink,
          fontWeight: 500,
          fontSize: "13px",
          stroke: "none",
        },
        hover: {},
        selected: {},
        selectedHover: {},
      }}
    />
  );
};

export default CountryMap;
