type BrandMarkProps = {
  size?: number;
  className?: string;
  showBorder?: boolean;
};

export default function BrandMark({ size = 40, className = '' }: BrandMarkProps) {
  return (
    <img
      src="/logo-doan.png"
      alt="Huy hiệu Đoàn TNCS Hồ Chí Minh"
      className={`object-contain shrink-0 drop-shadow-sm select-none ${className}`}
      style={{ width: size, height: size }}
      loading="eager"
    />
  );
}