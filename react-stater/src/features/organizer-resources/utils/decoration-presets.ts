import type { DecorationKind } from '../api/resources';

export const decorationPresets = {
  TABLE: { en: 'Table', vi: 'Bàn', width: 120, height: 80, color: '#b08d68' },
  PLANT: { en: 'Plant', vi: 'Cây xanh', width: 40, height: 40, color: '#58956b' },
  PARTITION: { en: 'Partition', vi: 'Vách ngăn', width: 160, height: 12, color: '#748499' },
  OTHER: { en: 'Other furnishing', vi: 'Vật dụng khác', width: 60, height: 60, color: '#8b7ca8' }
} as const;

interface Draft {
  kind: DecorationKind;
  label: string;
  width: string;
  height: string;
  color: string;
}

/** Switch untouched template values only; retain user-authored labels, dimensions and colors. */
export function changeDecorationKind(
  draft: Draft,
  next: DecorationKind,
  vi: boolean,
  edited: { label: boolean; dimensions: boolean; color: boolean }
): Draft {
  const before = decorationPresets[draft.kind],
    after = decorationPresets[next];
  const automaticName =
    Object.values(decorationPresets).some(
      (preset) => draft.label === preset.en || draft.label === preset.vi
    ) || draft.label === 'Other';
  const automaticSize =
    Number(draft.width) === before.width && Number(draft.height) === before.height;
  return {
    ...draft,
    kind: next,
    label: !edited.label && automaticName ? (vi ? after.vi : after.en) : draft.label,
    width: !edited.dimensions && automaticSize ? String(after.width) : draft.width,
    height: !edited.dimensions && automaticSize ? String(after.height) : draft.height,
    color:
      !edited.color && (draft.color === before.color || draft.color === '#94a3b8')
        ? after.color
        : draft.color
  };
}
