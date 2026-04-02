import Image from "next/image";
import logoSrc from "./logo.svg";

export const appLogoSrc = logoSrc;

type AppLogoProps = {
  alt?: string;
  className?: string;
  height?: number;
  priority?: boolean;
  width?: number;
};

export function AppLogo({
  alt = "",
  className,
  height = 32,
  priority = false,
  width = 32,
}: AppLogoProps) {
  return (
    <Image
      alt={alt}
      className={className}
      height={height}
      priority={priority}
      src={appLogoSrc}
      unoptimized
      width={width}
    />
  );
}
