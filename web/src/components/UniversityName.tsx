type UniversityLogoSize = "small" | "medium" | "large";

type UniversityLogoConfig = {
  src: string;
  themeTint?: boolean;
};

const UNIVERSITY_LOGOS: Readonly<Record<string, UniversityLogoConfig>> = {
  강원대학교: {
    src: "/university-logos/kangwon-cutout.png",
  },
  경북대학교: {
    src: "/university-logos/kyungpook-cutout.png",
  },
  부경대학교: {
    src: "/university-logos/pukyong-cutout.png",
  },
  부산대학교: {
    src: "/university-logos/pusan.png",
    themeTint: true,
  },
  인천대학교: {
    src: "/university-logos/incheon-cutout.png",
  },
  전남대학교: {
    src: "/university-logos/chonnam-cutout.png",
  },
  전북대학교: {
    src: "/university-logos/jeonbuk-cutout.png",
  },
  충남대학교: {
    src: "/university-logos/chungnam-cutout.png",
  },
  충북대학교: {
    src: "/university-logos/chungbuk.svg",
  },
};

type UniversityLogoProps = {
  university: string;
  size?: UniversityLogoSize;
};

export function UniversityLogo({
  university,
  size = "medium",
}: UniversityLogoProps) {
  const logo = UNIVERSITY_LOGOS[university];

  if (logo === undefined) {
    return null;
  }

  const classNames = [
    "university-logo",
    `university-logo--${size}`,
    logo.themeTint ? "university-logo--theme-tint" : "",
  ].filter(Boolean).join(" ");

  return (
    <span className={classNames} aria-hidden="true">
      <img
        className="university-logo-image"
        src={logo.src}
        alt=""
        loading="lazy"
        decoding="async"
      />
    </span>
  );
}

type UniversityNameProps = {
  university: string;
  className?: string;
  logoSize?: UniversityLogoSize;
};

export default function UniversityName({
  university,
  className,
  logoSize = "medium",
}: UniversityNameProps) {
  return (
    <span className={["university-name-with-logo", className].filter(Boolean).join(" ")}>
      <UniversityLogo university={university} size={logoSize} />
      <span className="university-name-text">{university}</span>
    </span>
  );
}
