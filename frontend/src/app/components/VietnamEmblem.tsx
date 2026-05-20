type VietnamEmblemProps = {
  size?: number;
  className?: string;
  showBorder?: boolean;
  onClick?: () => void;
};

export default function VietnamEmblem({ size = 40, className = '', showBorder = true, onClick }: VietnamEmblemProps) {
  return (
    <div
      onClick={onClick}
      className={`overflow-hidden rounded-2xl bg-transparent ${showBorder ? 'border border-white/20 shadow-lg' : ''} ${onClick ? 'cursor-pointer hover:opacity-90 active:scale-95 transition-all' : ''} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <img
        src="/Emblem_of_Vietnam.svg"
        alt=""
        className="h-full w-full object-contain"
        loading="eager"
      />
    </div>
  );
}
