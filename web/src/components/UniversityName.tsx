type UniversityLogoSize = "small" | "medium" | "large";

type UniversityLogoConfig = {
  src: string;
  darkSrc?: string;
  markOnly?: boolean;
  enlargeMark?: boolean;
};

const UNIVERSITY_LOGOS: Readonly<Record<string, UniversityLogoConfig>> = {
  강원대학교: {
    src: "/university-logos/kangwon.svg",
  },
  경북대학교: {
    src: "/university-logos/kyungpook.png",
    darkSrc: "/university-logos/kyungpook-dark.png",
    markOnly: true,
  },
  부경대학교: {
    src: "/university-logos/pukyong.png",
  },
  부산대학교: {
    src: "/university-logos/pusan.png",
    markOnly: true,
  },
  인천대학교: {
    src: "/university-logos/incheon.png",
  },
  전남대학교: {
    src: "/university-logos/chonnam.svg",
    markOnly: true,
    enlargeMark: true,
  },
  전북대학교: {
    src: "/university-logos/jeonbuk.svg",
    markOnly: true,
    enlargeMark: true,
  },
  충남대학교: {
    src: "/university-logos/chungnam.png",
  },
  충북대학교: {
    src: "/university-logos/chungbuk.png",
    markOnly: true,
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
    logo.darkSrc ? "university-logo--theme-variant" : "",
    logo.markOnly ? "university-logo--mark-only" : "",
    logo.enlargeMark ? "university-logo--enlarge-mark" : "",
  ].filter(Boolean).join(" ");

  return (
    <span className={classNames} aria-hidden="true">
      <img
        className={`university-logo-image ${logo.darkSrc ? "university-logo-image--light" : ""}`}
        src={logo.src}
        alt=""
        loading="lazy"
        decoding="async"
      />
      {logo.darkSrc !== undefined && (
        <img
          className="university-logo-image university-logo-image--dark"
          src={logo.darkSrc}
          alt=""
          loading="lazy"
          decoding="async"
        />
      )}
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
