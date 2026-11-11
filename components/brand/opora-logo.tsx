import Image from "next/image";
import Link from "next/link";

interface OporaLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  subtitle?: string;
  href?: string;
  className?: string;
  priority?: boolean;
}

const SIZE_CONFIGS = {
  sm: {
    width: 28,
    height: 24,
    textSize: "text-base",
    subtitleSize: "text-[9px]",
  },
  md: {
    width: 36,
    height: 30,
    textSize: "text-lg",
    subtitleSize: "text-[10px]",
  },
  lg: {
    width: 44,
    height: 37,
    textSize: "text-xl",
    subtitleSize: "text-[11px]",
  },
  xl: {
    width: 56,
    height: 47,
    textSize: "text-2xl",
    subtitleSize: "text-xs",
  },
};

export function OporaLogo({
  size = "md",
  showText = true,
  subtitle,
  href,
  className = "",
  priority = false,
}: OporaLogoProps) {
  const config = SIZE_CONFIGS[size];

  const content = (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <div className="relative shrink-0 flex items-center justify-center">
        <Image
          src="/images/opora-logo.png"
          alt="OPORA logo"
          width={config.width}
          height={config.height}
          priority={priority}
          className="object-contain"
        />
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span
            className={`font-['Manrope'] font-extrabold tracking-tight text-[#6F1D35] ${config.textSize}`}
          >
            OPORA
          </span>
          {subtitle && (
            <span
              className={`font-['Manrope'] uppercase tracking-[0.14em] font-bold text-[#7E2D43] mt-1 ${config.subtitleSize}`}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6F1D35] rounded-lg transition-opacity hover:opacity-95"
      >
        {content}
      </Link>
    );
  }

  return content;
}
