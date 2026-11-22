import BuildingIcon from '@hugeicons/core-free-icons/Building02Icon';
import StarIcon from '@hugeicons/core-free-icons/StarIcon';

const escapeAttribute = (value: string | number) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!
  );

/** Map SDKs accept HTML strings; reuse the same Hugeicons artwork without a React root. */
export function mapMarkerIcon(
  name: 'building' | 'star',
  {
    size = 16,
    color = 'currentColor',
    fill = 'none'
  }: { size?: number; color?: string; fill?: string } = {}
) {
  const artwork = name === 'building' ? BuildingIcon : StarIcon;
  const paths = artwork
    .map(([tag, attributes]) => {
      const attrs = Object.entries({ ...attributes, strokeWidth: 1.75 })
        .filter(([key]) => key !== 'key')
        .map(
          ([key, value]) =>
            `${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}="${escapeAttribute(value)}"`
        )
        .join(' ');
      return `<${tag} ${attrs}/>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${escapeAttribute(fill)}" style="color:${escapeAttribute(color)};flex-shrink:0" aria-hidden="true" data-map-icon="${name}">${paths}</svg>`;
}
