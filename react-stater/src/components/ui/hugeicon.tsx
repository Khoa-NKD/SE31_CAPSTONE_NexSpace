import {
  forwardRef,
  type ForwardRefExoticComponent,
  type RefAttributes,
  type SVGProps
} from 'react';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'stroke'> {
  size?: number | string;
  absoluteStrokeWidth?: boolean;
  stroke?: number | string;
}

export type AppIcon = ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;

/** Keep sizes, refs, accessibility and state colors while standardizing the icon family. */
export function createAppIcon(artwork: IconSvgElement, name: string): AppIcon {
  const Icon = forwardRef<SVGSVGElement, IconProps>(function AppIcon(
    { className, size = 24, strokeWidth, stroke, ...props },
    ref
  ) {
    const width = strokeWidth ?? (typeof stroke === 'number' ? stroke : 1.75);
    return (
      <HugeiconsIcon
        ref={ref}
        icon={artwork}
        size={size}
        strokeWidth={typeof width === 'number' ? width : Number(width)}
        className={`ns-icon ${className ?? ''}`}
        aria-hidden={props['aria-label'] || props['aria-labelledby'] ? undefined : true}
        data-icon={name}
        {...(typeof stroke === 'string' ? { stroke } : {})}
        {...props}
      />
    );
  });
  Icon.displayName = name;
  return Icon;
}
