import Image from "next/image";

// Intrinsic dimensions of /logo-ivk.png — used to keep the aspect ratio when
// the logo is rendered at a fixed height (including inside flex containers,
// where the default `align-items: stretch` would otherwise distort it).
const LOGO_WIDTH = 1130;
const LOGO_HEIGHT = 753;

export function BrandLogo({
  height = 40,
  inverted = false,
  priority = false,
}: {
  height?: number;
  inverted?: boolean;
  priority?: boolean;
}) {
  return (
    <Image
      src="/logo-ivk.png"
      alt="IVKE — Islamitische Vereniging Kanaleneiland"
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      priority={priority}
      className={inverted ? "mosque-header-logo" : undefined}
      style={{
        height,
        width: Math.round((height * LOGO_WIDTH) / LOGO_HEIGHT),
        display: "block",
      }}
    />
  );
}
