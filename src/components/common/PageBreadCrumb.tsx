import { Link } from "react-router";
import { ChevronRight } from "lucide-react";

interface BreadcrumbProps {
  pageTitle: string;
}

const PageBreadcrumb: React.FC<BreadcrumbProps> = ({ pageTitle }) => {
  return (
    <div className="sky-in flex flex-wrap items-center justify-between gap-3 mb-6">
      <h2 className="font-display text-sky-h2 font-semibold text-sky-ink" x-text="pageName">
        {pageTitle}
      </h2>
      <nav aria-label="Breadcrumb">
        {/* The trail sits in a recessed glass chip so it reads as chrome rather
            than as content, and the current page is the only segment carrying
            full ink — position in the hierarchy is legible at a glance. */}
        <ol className="flex items-center gap-1 rounded-sky-chip bg-white/55 ring-1 ring-white/75 px-3 py-1.5">
          <li>
            <Link
              className="inline-flex items-center gap-1 text-sm font-medium text-sky-ink-3 transition-colors hover:text-sky-deep"
              to="/"
            >
              Home
              <ChevronRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            </Link>
          </li>
          <li className="text-sm font-semibold text-sky-ink" aria-current="page">
            {pageTitle}
          </li>
        </ol>
      </nav>
    </div>
  );
};

export default PageBreadcrumb;
