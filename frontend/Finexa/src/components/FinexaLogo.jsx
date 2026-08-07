import logoPng from "../assets/logo.png";

/**
 * FinexaLogo — Brand logo rendered from a PNG asset.
 *
 * @param {object} props - Component props
 * @param {string|number} [props.size=48] - Width and height of the logo
 * @param {string} [props.className=""] - Additional CSS classes
 * @param {string} [props.variant="icon"] - "icon" | "horizontal" | "vertical"
 * @param {string} [props.title="Finexa"] - Accessible title
 */
const FinexaLogo = ({
  size = 50,
  className = "",
  variant = "icon",
  title = "IncomeVisor",
  titleSize,
}) => {
  const logoImg = (
    <img
      src={logoPng}
      alt={title}
      width={size}
      height={size}
      className={`${className} select-none`}
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        display: "block",
      }}
    />
  );

  // Allow the wordmark size to be controlled independently of the icon so the
  // text never becomes disproportionately large when the icon is enlarged.
  const wordmark = (
    <span
      className="font-bold text-transparent bg-clip-text bg-linear-to-b from-[#0F3D91] via-[#1D6CF2] to-[#27D7F8] leading-none whitespace-nowrap"
      style={{
        fontFamily:
          "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontWeight: 700,
        letterSpacing: "-0.02em",
        fontSize:
          titleSize ?? Math.min(32, Math.max(16, Math.round(size * 0.4))),
      }}
    >
      IncomeVisor
    </span>
  );

  if (variant === "icon") {
    return logoImg;
  }

  if (variant === "horizontal") {
    return (
      <div
        className={`inline-flex items-center gap-2.5 ${className}`}
        role="img"
        aria-label={title}
      >
        {logoImg}
        {wordmark}
      </div>
    );
  }

  if (variant === "vertical") {
    return (
      <div
        className={`inline-flex flex-col items-center gap-2 ${className}`}
        role="img"
        aria-label={title}
      >
        {logoImg}
        {wordmark}
      </div>
    );
  }

  return logoImg;
};

export default FinexaLogo;
