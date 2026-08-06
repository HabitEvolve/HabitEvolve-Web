interface ComponentCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  desc?: string;
  /**
   * Legacy neo-brutalism flag. Neo-brutalism is retired (design-system §7), so
   * this no longer switches surfaces — both branches are glass now. Kept in the
   * signature so existing `neo` call-sites keep compiling.
   */
  neo?: boolean;
}

const ComponentCard: React.FC<ComponentCardProps> = ({
  title,
  children,
  className = "",
  desc = "",
}) => {
  return (
    <div className={`sky-glass rounded-sky-card ${className}`}>
      {/* Card Header */}
      <div className="px-6 py-5">
        <h3 className="font-display text-base font-semibold text-sky-ink">
          {title}
        </h3>
        {desc && <p className="mt-1 text-sm text-sky-ink-2">{desc}</p>}
      </div>

      {/* Card Body */}
      <div className="p-4 border-t border-white/60 sm:p-6">
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
};

export default ComponentCard;
