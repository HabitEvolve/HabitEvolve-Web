import { HTMLAttributes, ReactNode } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export type SkyCardVariant = "mentor" | "admin";

interface SkyCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** 'mentor': full liquid-glass surface. 'admin': restrained glass for container chrome only — see PRODUCT.md's data-density rule. */
  variant?: SkyCardVariant;
  className?: string;
}

// `sky-glass` / `sky-glass-admin` already bake in their own box-shadow and
// border-radius (see src/index.css); `rounded-sky-card` is added explicitly
// as a real Tailwind utility (not baked-in CSS) so a caller's className can
// still override it predictably via twMerge.
const variantClasses: Record<SkyCardVariant, string> = {
  mentor: "sky-glass",
  admin: "sky-glass-admin",
};

const SkyCard: React.FC<SkyCardProps> = ({
  children,
  variant = "mentor",
  className,
  ...rest
}) => {
  return (
    <div
      className={clsx(
        twMerge("relative rounded-sky-card p-6", variantClasses[variant], className),
      )}
      {...rest}
    >
      {children}
    </div>
  );
};

export default SkyCard;
