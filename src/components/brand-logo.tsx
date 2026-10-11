import Image from "next/image";

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
      width={1130}
      height={753}
      priority={priority}
      className={inverted ? "mosque-header-logo" : undefined}
      style={{ height, width: "auto", display: "block" }}
    />
  );
}
