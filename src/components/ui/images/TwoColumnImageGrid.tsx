// Matches ThreeColumnImageGrid: white hairline + navy lift, never a grey rule.
const imgCls = "w-full rounded-sky-md ring-1 ring-white/80 shadow-sky-chip";

export default function TwoColumnImageGrid() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <div>
        <img
          src="/images/grid-image/image-02.png"
          alt=" grid"
          className={imgCls}
        />
      </div>

      <div>
        <img
          src="/images/grid-image/image-03.png"
          alt=" grid"
          className={imgCls}
        />
      </div>
    </div>
  );
}
