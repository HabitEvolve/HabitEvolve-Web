// A photo already has its own hard edge, so the frame's job is only to seat it
// on the glass: a white hairline plus the same navy-tinted lift every other
// surface carries. A grey border would cut a dark line across the pastel field.
const imgCls = "w-full rounded-sky-md ring-1 ring-white/80 shadow-sky-chip";

export default function ThreeColumnImageGrid() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      <div>
        <img
          src="/images/grid-image/image-04.png"
          alt=" grid"
          className={imgCls}
        />
      </div>

      <div>
        <img
          src="/images/grid-image/image-05.png"
          alt=" grid"
          className={imgCls}
        />
      </div>

      <div>
        <img
          src="/images/grid-image/image-06.png"
          alt=" grid"
          className={imgCls}
        />
      </div>
    </div>
  );
}
