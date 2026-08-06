import { HTMLAttributes, ReactNode } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export type SkyCardVariant = "mentor" | "admin";

interface SkyCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** 'mentor': full liquid-glass. 'admin': same language, lighter blur/higher opacity so dense tables underneath stay crisp (design-system §5). */
  variant?: SkyCardVariant;
  className?: string;
}

// Both utilities bake in their own box-shadow and border-radius (src/index.css);
// `rounded-sky-card` is re-stated here as a real Tailwind utility so a caller's
// className can still override the radius predictably via twMerge.
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
