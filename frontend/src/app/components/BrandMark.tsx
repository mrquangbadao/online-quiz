type BrandMarkProps = {
  size?: number;
  className?: string;
  showBorder?: boolean;
};

export default function BrandMark({ size = 40, className = '', showBorder = true }: BrandMarkProps) {
  return (
    <div
      className={`overflow-hidden rounded-2xl bg-transparent ${showBorder ? 'border border-white/20 shadow-lg' : ''} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <img
        src="/brand-emblem.svg"
        alt=""
        className="h-full w-full object-contain"
        loading="eager"
      />
    </div>
  );
}