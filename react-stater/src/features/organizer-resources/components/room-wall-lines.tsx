import type { FloorDecoration } from '../api/resources';
import type { Placement } from '../utils/placement';
import { roomWallSegments } from '../utils/room-door';

/** The enclosing group supplies rotation. Walls stay inside the existing room footprint. */
export function RoomWallLines({
  room,
  decorations = []
}: {
  room: Placement;
  decorations?: readonly FloorDecoration[];
}) {
  const thickness = Math.min(4.8, room.width / 12, room.height / 12);
  return (
    <g
      pointerEvents='none'
      className='stroke-current'
      fill='none'
      strokeWidth={thickness}
      strokeLinecap='butt'
      opacity='.65'
    >
      {roomWallSegments(room, decorations)
        .filter((segment) => !segment.opening)
        .map((segment, index) => {
          const horizontal = segment.side === 'top' || segment.side === 'bottom';
          const fixed =
            segment.side === 'top' || segment.side === 'left'
              ? thickness / 2
              : (horizontal ? room.height : room.width) - thickness / 2;
          return (
            <path
              key={index}
              d={
                horizontal
                  ? `M${room.x + segment.start} ${room.y + fixed}H${room.x + segment.end}`
                  : `M${room.x + fixed} ${room.y + segment.start}V${room.y + segment.end}`
              }
            />
          );
        })}
    </g>
  );
}
