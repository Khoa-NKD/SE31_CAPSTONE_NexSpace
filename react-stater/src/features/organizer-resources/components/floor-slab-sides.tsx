/** Extruded perimeter follows the same circular corners as the floor plate. */
export function FloorSlabSides({
  width,
  height,
  radius,
  depth,
  label,
  angle = 0
}: {
  width: number;
  height: number;
  radius: number;
  depth: number;
  label?: string;
  angle?: number;
}) {
  const points: { x: number; y: number }[] = [];
  const corners = [
    { x: width - radius, y: radius, start: -Math.PI / 2 },
    { x: width - radius, y: height - radius, start: 0 },
    { x: radius, y: height - radius, start: Math.PI / 2 },
    { x: radius, y: radius, start: Math.PI }
  ];
  if (radius === 0)
    points.push({ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height });
  else
    for (const corner of corners)
      for (let step = 0; step <= 12; step++) {
        const angle = corner.start + (step * Math.PI) / 24;
        points.push({
          x: corner.x + radius * Math.cos(angle),
          y: corner.y + radius * Math.sin(angle)
        });
      }
  const viewAngle = (90 - angle) * Math.PI / 180;
  const viewX = Math.cos(viewAngle), viewY = Math.sin(viewAngle);
  const sideOnX = Math.abs(viewX) > Math.abs(viewY);
  const flatLength = (sideOnX ? height : width) - radius * 2;
  const useCurve = radius > 0 && flatLength < 48;
  const normalX = useCurve ? viewX : sideOnX ? Math.sign(viewX) : 0;
  const normalY = useCurve ? viewY : sideOnX ? 0 : Math.sign(viewY);
  const outward = 0.8;
  const labelX = width / 2 + Math.sign(normalX) * (width / 2 - radius) + normalX * (radius + outward);
  const labelY = height / 2 + Math.sign(normalY) * (height / 2 - radius) + normalY * (radius + outward);
  const tangent = Math.atan2(normalY, normalX) - Math.PI / 2;
  return (
    <span
      aria-hidden='true'
      className='pointer-events-none absolute inset-0'
      style={{ transformStyle: 'preserve-3d' }}
    >
      <span
        className='absolute inset-0 bg-card'
        style={{ borderRadius: radius, transform: 'translateZ(-' + depth + 'px)' }}
      />
      {points.map((point, index) => {
        const next = points[(index + 1) % points.length];
        const dx = next.x - point.x,
          dy = next.y - point.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 0.001) return null;
        return (
          <span
            key={index}
            className='absolute left-0 top-0 border-b border-primary/20'
            style={{
              pointerEvents: 'auto',
              width: distance + 0.25,
              height: depth,
              transformOrigin: '0 0',
              transform: `translate3d(${point.x}px, ${point.y}px, -0.3px) rotateZ(${Math.atan2(dy, dx)}rad) rotateX(-90deg)`,
              background: `linear-gradient(180deg, color-mix(in srgb, var(--primary) ${18 + Math.round(Math.abs(dx / distance) * 14)}%, var(--card)), color-mix(in srgb, var(--primary) 8%, var(--background)))`
            }}
          >
            <span
              className='absolute inset-x-0 top-[28%] h-[43%]'
              style={{
                background:
                  'repeating-linear-gradient(90deg, color-mix(in srgb, var(--primary) 40%, var(--card)) 0px 5px, transparent 5px 8px)',
                opacity: 0.7
              }}
            />
          </span>
        );
      })}
      {label && (
        <span
          className='nexspace-storey-face-label'
          style={{
            transform: `translate3d(${labelX}px, ${labelY}px, ${-depth / 2}px) rotateZ(${tangent}rad) rotateX(-90deg) translate(-50%, -50%)`
          }}
        >
          {label}
        </span>
      )}
    </span>
  );
}
