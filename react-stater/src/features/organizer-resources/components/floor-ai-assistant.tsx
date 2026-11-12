import { furnishingIconCatalog } from '../utils/furnishing-icon-catalog';
import {
  readFloorChat,
  writeFloorChat,
  promptWithFloorHistory,
  type FloorChatMessage
} from '../utils/ai-chat-history';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BotMessageSquare,
  CircleAlert,
  Copy,
  Send,
  X,
  LoaderCircle,
  Ruler,
  Library,
  Plus,
  Pencil,
  Archive,
  Check,
  ShieldCheck,
  RotateCcw,
  ImagePlus,
  ChevronDown,
  ChevronUp,
  Eye,
  Info,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/features/landing/context/language-context';
import { DecorationIcon, furnishingIcon } from './decoration-visual';
import { aiTypeIssues, type AiTypeIssue } from '../utils/ai-type-validation';
import { resourceUsageKinds } from '../utils/resource-usage-kinds';
import { decorationPresets } from '../utils/decoration-presets';
import { prepareAiReferenceImage, type AiReferenceImage } from '../utils/ai-reference-image';
import { furnishingPresetKey } from '../utils/furnishing-preset-key';
import type { DecorationKind } from '../api/resources';
import type { FloorDecoration, FloorLayout } from '../api/resources';
import {
  aiStatusOptions,
  designMetricsOptions,
  templateOptions,
  saveDesignMetrics,
  saveLayoutTemplate,
  archiveLayoutTemplate,
  proposeFloorDesign,
  applyFloorDesign,
  type AiProposal,
  type DesignScope,
  type LayoutTemplate,
  type LayoutTemplateInput
} from '../api/floor-design';

const presetKey = (kind: DecorationKind, name: string, icon?: FloorDecoration['icon']) =>
  furnishingPresetKey(kind, name, furnishingIcon(kind, name, icon));

export function FloorAiAssistant({
  actorId,
  workspaceId,
  previewIssues = [],
  layout,
  selectedKey,
  writable,
  blocked,
  proposal,
  onProposal,
  onSaved,
  onApplied,
  onPlace,
  onClose,
  onFocus,
  onBusy
}: {
  actorId: number;
  workspaceId: number;
  previewIssues?: string[];
  layout: FloorLayout;
  selectedKey: string | null;
  writable: boolean;
  blocked: boolean;
  proposal: AiProposal | null;
  onProposal: (proposal: AiProposal | null) => void;
  onSaved: () => Promise<void>;
  onApplied: () => void;
  onPlace: (item: FloorDecoration) => void;
  onClose: () => void;
  onFocus: (key: string) => void;
  onBusy: (busy: boolean) => void;
}) {
  const { language } = useLanguage();
  const c = (en: string, vi: string) => (language === 'vi' ? vi : en);
  const client = useQueryClient();
  const floorId = layout.floor.id;
  const status = useQuery(aiStatusOptions(actorId, workspaceId, floorId));
  const canGenerate = status.data?.configured === true;
  const metrics = useQuery(designMetricsOptions(actorId, workspaceId, floorId));
  const library = useQuery(templateOptions(actorId));
  const [tab, setTab] = useState<'AI' | 'METRICS' | 'LIBRARY'>('AI');
  const [prompt, setPrompt] = useState('');
  const [scope, setScope] = useState<DesignScope>('WORKSPACE');
  const historyKey = 'nexspace:floor-ai-chat:v1:' + actorId + ':' + workspaceId + ':' + floorId;
  const [messages, setMessages] = useState<FloorChatMessage[]>(() => readFloorChat(historyKey));
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    writeFloorChat(historyKey, messages);
  }, [historyKey, messages]);
  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);
  const [image, setImage] = useState<AiReferenceImage | null>(null);
  const [preparingImage, setPreparingImage] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);
  const chatEnd = useRef<HTMLDivElement>(null);
  const imageRequest = useRef(0);

  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState<'text' | 'image' | null>(null);
  const compactComposer = !composerExpanded;
  useEffect(() => {
    if (tab !== 'AI' || (!messages.length && !generating)) return;
    const frame = requestAnimationFrame(() =>
      chatEnd.current?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
        block: 'nearest'
      })
    );
    return () => cancelAnimationFrame(frame);
  }, [messages, generating, tab]);
  useEffect(
    () => () => {
      imageRequest.current++;
    },
    []
  );
  useEffect(() => {
    onBusy(busy);
    return () => onBusy(false);
  }, [busy, onBusy]);
  const [error, setError] = useState('');
  const [saveTemplates, setSaveTemplates] = useState(true);
  const [confirmedTypeDesign, setConfirmedTypeDesign] = useState<AiProposal['design'] | null>(null);
  const newTypes = proposal?.design.newTypes ?? [];
  const typesConfirmed = newTypes.length === 0 || confirmedTypeDesign === proposal?.design;
  const incompleteTypes = newTypes
    .map((type) => ({ type, issues: aiTypeIssues(type) }))
    .filter((item) => item.issues.length > 0);
  const typesReady = incompleteTypes.length === 0;
  const typeConfiguration = useRef<HTMLElement>(null);
  const iconGroups = new Map<
    string,
    { label: string; kind: DecorationKind; icon: FloorDecoration['icon']; ids: string[] }
  >();
  for (const object of proposal?.design.decorations ?? []) {
    if (
      object.kind !== 'OTHER' ||
      layout.decorations?.some((previous) => previous.id === object.id)
    )
      continue;
    const icon = furnishingIcon(object.kind, object.label, object.icon);
    const key = presetKey(object.kind, object.label, icon);
    const group = iconGroups.get(key);
    if (group) group.ids.push(object.id);
    else iconGroups.set(key, { label: object.label, kind: object.kind, icon, ids: [object.id] });
  }
  const missingIcons = [...iconGroups.values()].filter(
    (group) => !group.icon || group.icon === 'BOX'
  );

  const typeIssueLabel = (issue: AiTypeIssue) =>
    ({
      name: c('type name', 'tên loại chỗ'),
      usage: c('usage', 'kiểu chỗ'),
      dimensions: c('dimensions', 'kích thước'),
      capacity: c('capacity', 'sức chứa'),
      currency: c('currency', 'tiền tệ'),
      price: c('at least one valid price', 'ít nhất một mức giá hợp lệ')
    })[issue];
  const [dimensions, setDimensions] = useState<{
    width: string;
    length: string;
    maximum: string;
    limit: string;
  } | null>(null);
  const [template, setTemplate] = useState<LayoutTemplateInput | null>(null);
  const presetForm = useRef<HTMLFormElement>(null);
  const presetFormOpen = !!template;
  useEffect(() => {
    if (presetFormOpen)
      presetForm.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [presetFormOpen]);
  const [editing, setEditing] = useState<LayoutTemplate | undefined>();
  const [search, setSearch] = useState('');
  const controller = useRef<AbortController | null>(null);
  const saving = useRef(false);
  useEffect(() => () => controller.current?.abort(), []);
  const selectedResource = layout.resources.find((r) => `resource:${r.id}` === selectedKey);
  const selectedObject = layout.decorations?.find((d) => `decoration:${d.id}` === selectedKey);
  const selectionName = selectedResource?.name ?? selectedObject?.label;
  const librarySearch = search.trim().toLocaleLowerCase();
  const savedTypes = new Map<string, LayoutTemplate>();
  for (const item of library.data ?? []) {
    const key = presetKey(item.kind, item.name, item.icon);
    if (item.active && !savedTypes.has(key)) savedTypes.set(key, item);
  }
  const savedPresets = [...savedTypes.values()].filter((item) =>
    item.name.toLocaleLowerCase().includes(librarySearch)
  );
  const placedTypes = new Map<string, FloorDecoration>();
  for (const item of layout.decorations ?? []) {
    const key = presetKey(item.kind, item.label, item.icon);
    if (item.kind === 'OTHER' && !savedTypes.has(key) && !placedTypes.has(key))
      placedTypes.set(key, { ...item, label: key.endsWith(':TV') ? c('TV', 'Tivi') : item.label });
  }
  const placedPresets = [...placedTypes.values()].filter((item) =>
    item.label.toLocaleLowerCase().includes(librarySearch)
  );
  function savePlacedPreset(item: FloorDecoration) {
    const measured = metrics.data;
    if (!measured?.widthM || !measured.lengthM || !layout.width || !layout.height) return;
    setEditing(undefined);
    setTemplate({
      name: item.label,
      kind: item.kind,
      icon: furnishingIcon(item.kind, item.label, item.icon),
      color: item.color,
      widthM: Math.max(0.01, Number(((item.width / layout.width) * measured.widthM).toFixed(2))),
      lengthM: Math.max(0.01, Number(((item.height / layout.height) * measured.lengthM).toFixed(2)))
    });
  }
  const scopeValid =
    scope === 'WORKSPACE' ||
    (scope === 'ROOM' ? selectedResource?.category === 'ROOM' : !!selectionName);
  const canWrite = writable && !blocked && !busy && !preparingImage;
  const applyBlockers = proposal
    ? [
        ...(missingIcons.length
          ? [
              c(
                'Choose a suitable icon for the new furnishings below.',
                'Chọn biểu tượng phù hợp cho đồ bố trí mới bên dưới.'
              )
            ]
          : []),
        ...previewIssues,
        ...(!writable || blocked
          ? [c('This workspace is currently read-only.', 'Workspace hiện chỉ được xem.')]
          : []),
        ...(busy || preparingImage
          ? [c('Wait for the current operation to finish.', 'Đợi thao tác hiện tại hoàn tất.')]
          : []),
        ...(proposal.expectedRevision !== layout.floor.revision
          ? [
              c(
                'The floor changed. Generate a fresh proposal.',
                'Sơ đồ đã thay đổi. Cần tạo đề xuất mới.'
              )
            ]
          : []),
        ...(!proposal.applicable
          ? proposal.issues.length
            ? proposal.issues.map(proposalIssueLabel)
            : [
                c(
                  'Resolve the proposal issues shown above before applying.',
                  'Cần xử lý các vấn đề của đề xuất được hiển thị phía trên.'
                )
              ]
          : []),
        ...incompleteTypes.map(
          ({ type, issues }) =>
            type.name +
            ': ' +
            c('complete ', 'cần hoàn tất ') +
            issues.map(typeIssueLabel).join(', ')
        ),
        ...(typesReady && !typesConfirmed
          ? [
              c(
                'Tick the confirmation for the new types and prices.',
                'Tích xác nhận kiểu chỗ, kích thước và giá mới ở phía trên.'
              )
            ]
          : [])
      ]
    : [];
  const changeProposal = (value: AiProposal | null) => {
    onProposal(value);
  };
  const errorMessage = (value: unknown) =>
    value instanceof Error
      ? value.message
      : c('Request failed. Try again.', 'Thao tác thất bại. Vui lòng thử lại.');
  function proposalIssueLabel(issue: string) {
    const footprintPrefix = 'Resource footprint mismatch: ';
    if (issue.startsWith(footprintPrefix)) {
      return (
        c(
          'The draft size differs from the selected type. Ask AI to use the standard dimensions.',
          'Kích thước bản nháp khác kích thước chuẩn của loại chỗ. Hãy yêu cầu AI dùng đúng kích thước chuẩn.'
        ) +
        '\n' +
        issue.slice(footprintPrefix.length)
      );
    }
    if (
      issue ===
      'The selected type has no confirmed configuration; propose a new type with dimensions and prices'
    ) {
      return c(
        'The selected seat or room type is missing its standard dimensions or usage. Complete it in Seats & Rooms → Resource types, or ask AI to propose a new type and confirm its configuration and prices.',
        'Loại ghế hoặc phòng AI chọn chưa có công năng hoặc kích thước chuẩn. Hãy bổ sung trong Quản lý ghế & phòng → Loại chỗ & giá, hoặc yêu cầu AI đề xuất loại mới rồi xác nhận cấu hình và giá.'
      );
    }
    return issue;
  }
  const report = (value: unknown) => setError(errorMessage(value));
  const appendChat = (...entries: FloorChatMessage[]) =>
    setMessages((items) => [...items, ...entries].slice(-200));
  const warnInChat = (text: string) => appendChat({ role: 'assistant', kind: 'warning', text });
  async function copyReply(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(c('Reply copied.', 'Đã sao chép phản hồi.'));
    } catch {
      toast.error(c('Could not copy the reply.', 'Không thể sao chép phản hồi.'));
    }
  }
  async function attachFiles(files: File[]) {
    if (busy || preparingImage || !writable || blocked) return;
    if (files.length !== 1) {
      setTab('AI');
      warnInChat(c('Attach one image per message.', 'Mỗi tin nhắn chỉ đính kèm một ảnh.'));
      return;
    }
    const serial = ++imageRequest.current;
    setPreparingImage(true);
    setError('');
    setTab('AI');
    try {
      const prepared = await prepareAiReferenceImage(files[0]);
      if (serial === imageRequest.current) setImage(prepared);
    } catch {
      if (serial === imageRequest.current)
        warnInChat(
          c(
            'Use a readable JPG, PNG or WebP image up to 5 MB and 20 megapixels.',
            'Chọn ảnh JPG, PNG hoặc WebP đọc được, tối đa 5 MB và 20 megapixel.'
          )
        );
    } finally {
      if (serial === imageRequest.current) setPreparingImage(false);
    }
  }

  async function generate(event: React.FormEvent) {
    event.preventDefault();
    if (
      !canWrite ||
      !canGenerate ||
      !d?.widthM ||
      controller.current ||
      (!prompt.trim() && !image) ||
      !scopeValid
    )
      return;
    const abort = new AbortController();
    controller.current = abort;
    const text =
      prompt.trim() ||
      c(
        'Create an editable draft directly from the attached image. Infer visible objects, neutral room names and proportional positions using configured dimensions; explain uncertainties without requiring a written description. Preserve existing objects unless a replacement is explicitly requested.',
        'Dựng bản nháp trực tiếp từ ảnh: nhận diện vật dụng, đặt tên phòng trung tính và bố trí theo tỷ lệ với kích thước đã cấu hình. Ghi rõ điểm chưa chắc chắn, không yêu cầu tôi mô tả lại ảnh. Giữ đồ vật hiện có trừ khi tôi yêu cầu thay thế rõ ràng.'
      );
    const referenceImage = image;
    setBusy(true);
    setGenerating(referenceImage ? 'image' : 'text');
    setPrompt('');
    setImage(null);
    setComposerExpanded(false);
    setScopeOpen(false);
    setError('');
    setMessages((items) => [
      ...items.slice(-199).map(({ role, text, kind }) => ({ role, text, kind })),
      {
        role: 'user',
        text: prompt.trim() || c('Design from this image', 'Bố trí theo ảnh này'),
        ...(referenceImage ? { image: referenceImage.preview } : {})
      }
    ]);
    try {
      const result = await proposeFloorDesign(
        workspaceId,
        floorId,
        {
          prompt: promptWithFloorHistory(text, messages),
          scope,
          selectedKey: scope === 'WORKSPACE' ? null : selectedKey,
          language: language === 'vi' ? 'vi' : 'en',
          expectedRevision: layout.floor.revision,
          ...(referenceImage
            ? { image: { mimeType: referenceImage.mimeType, base64: referenceImage.base64 } }
            : {}),
          ...(proposal
            ? {
                previousProposalId: proposal.proposalId,
                ...(proposal.issues.length === 0 ? { draft: proposal.design } : {})
              }
            : {})
        },
        abort.signal
      );
      if (abort.signal.aborted) return;
      const reusableTemplates = new Map<string, LayoutTemplateInput>();
      for (const item of result.design.templates) {
        const key = presetKey(item.kind, item.name, item.icon);
        if (!savedTypes.has(key) && !reusableTemplates.has(key))
          reusableTemplates.set(key, {
            ...item,
            name: key.endsWith(':TV') ? c('TV', 'Tivi') : item.name
          });
      }
      changeProposal({
        ...result,
        design: {
          ...result.design,
          decorations: result.design.decorations.map((object) =>
            layout.decorations?.some((previous) => previous.id === object.id)
              ? object
              : { ...object, icon: furnishingIcon(object.kind, object.label, object.icon) }
          ),
          templates: [...reusableTemplates.values()].map((template) => ({
            ...template,
            icon: furnishingIcon(template.kind, template.name, template.icon)
          }))
        },
        selectedKey: scope === 'WORKSPACE' ? null : selectedKey
      });
      setSaveTemplates(true);
      const reply = [result.design.message, result.design.question].filter(Boolean).join('\n\n');
      appendChat(
        ...(reply ? [{ role: 'assistant', text: reply } as const] : []),
        ...result.issues.map(
          (issue) =>
            ({
              role: 'assistant',
              kind: 'warning',
              text: proposalIssueLabel(issue)
            }) as const
        )
      );
    } catch (e) {
      if (!abort.signal.aborted) warnInChat(errorMessage(e));
    } finally {
      if (controller.current === abort) controller.current = null;
      setGenerating(null);
      setBusy(false);
    }
  }
  async function apply() {
    if (
      missingIcons.length > 0 ||
      previewIssues.length > 0 ||
      !proposal?.applicable ||
      !typesConfirmed ||
      !typesReady ||
      !canWrite ||
      saving.current ||
      proposal.expectedRevision !== layout.floor.revision
    )
      return;
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      await applyFloorDesign(
        workspaceId,
        floorId,
        proposal.proposalId,
        saveTemplates,
        proposal.design,
        newTypes.length > 0 && typesConfirmed
      );
      changeProposal(null);
      appendChat({
        role: 'assistant',
        text: c('Layout saved.', 'Đã lưu sơ đồ.')
      });
      toast.success(c('AI design saved.', 'Đã lưu thiết kế AI.'));
      await onSaved();
      await client.invalidateQueries({ queryKey: ['organizer-resources', actorId] });
      onApplied();
    } catch (e) {
      warnInChat(proposalIssueLabel(errorMessage(e)));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  async function saveMeasurements(event: React.FormEvent) {
    event.preventDefault();
    if (!dimensions || !metrics.data || !canWrite || proposal) return;
    setBusy(true);
    setError('');
    try {
      await saveDesignMetrics(workspaceId, floorId, {
        expectedRevision: metrics.data.revision,
        widthM: Number(dimensions.width),
        lengthM: Number(dimensions.length),
        maxOccupancy: dimensions.maximum ? Number(dimensions.maximum) : null,
        occupancyLimit: dimensions.limit ? Number(dimensions.limit) : null
      });
      setDimensions(null);
      await onSaved();
      await metrics.refetch();
      toast.success(c('Measurements saved.', 'Đã lưu kích thước thực.'));
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  async function savePreset(event: React.FormEvent) {
    event.preventDefault();
    if (!template || !canWrite) return;
    setBusy(true);
    setError('');
    try {
      await saveLayoutTemplate(template, editing);
      setTemplate(null);
      setEditing(undefined);
      await library.refetch();
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  async function archive(item: LayoutTemplate) {
    if (!canWrite) return;
    setBusy(true);
    setError('');
    try {
      await archiveLayoutTemplate(item);
      await library.refetch();
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  function place(item: LayoutTemplate) {
    if (
      !metrics.data?.widthM ||
      !metrics.data.lengthM ||
      !layout.width ||
      !layout.height ||
      !canWrite ||
      proposal
    )
      return;
    const width = Number(((item.widthM / metrics.data.widthM) * layout.width).toFixed(2));
    const height = Number(((item.lengthM / metrics.data.lengthM) * layout.height).toFixed(2));
    if (width > layout.width || height > layout.height) {
      setError(
        c('This object is larger than the workspace area.', 'Vật dụng lớn hơn vùng workspace.')
      );
      return;
    }
    onPlace({
      id: `decor-${crypto.randomUUID()}`,
      kind: item.kind,
      label: item.name,
      posX: Number(((layout.width - width) / 2).toFixed(2)),
      posY: Number(((layout.height - height) / 2).toFixed(2)),
      width,
      height,
      rotation: 0,
      color: item.color,
      icon: furnishingIcon(item.kind, item.name, item.icon)
    });
  }
  const d = metrics.data;
  function placeDefault(kind: DecorationKind) {
    if (!canWrite || proposal || !layout.width || !layout.height) return;
    const preset = decorationPresets[kind];
    if (preset.width > layout.width || preset.height > layout.height) {
      setError(
        c('This object is larger than the workspace area.', 'Vật dụng lớn hơn vùng workspace.')
      );
      return;
    }
    onPlace({
      id: `decor-${crypto.randomUUID()}`,
      kind,
      label: c(preset.en, preset.vi),
      posX: Number(((layout.width - preset.width) / 2).toFixed(2)),
      posY: Number(((layout.height - preset.height) / 2).toFixed(2)),
      width: preset.width,
      height: preset.height,
      rotation: 0,
      color: preset.color
    });
  }
  const inputClass = 'h-9 w-full rounded-lg border border-input bg-background px-2 text-sm';
  const toolsUnavailable = status.isError || metrics.isError || library.isError;
  const toolsNotice = toolsUnavailable && (
    <div
      role='alert'
      className='rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive'
    >
      {c('Could not load the design tools.', 'Không tải được công cụ thiết kế.')}
      <Button
        type='button'
        variant='ghost'
        size='sm'
        onClick={() => {
          void status.refetch();
          void metrics.refetch();
          void library.refetch();
        }}
      >
        {c('Retry', 'Thử lại')}
      </Button>
    </div>
  );
  return (
    <div
      className={
        expanded
          ? 'fixed inset-3 z-50 flex min-h-0 flex-col rounded-2xl border border-border bg-card p-4 shadow-2xl sm:inset-x-[8vw] sm:inset-y-[4vh]'
          : 'relative flex min-h-0 flex-1 flex-col'
      }
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes('Files')) {
          event.preventDefault();
          setDragOver(true);
        }
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragOver(false);
      }}
      onDrop={(event) => {
        if (event.dataTransfer.files.length) {
          event.preventDefault();
          event.stopPropagation();
          setDragOver(false);
          void attachFiles(Array.from(event.dataTransfer.files));
        }
      }}
      onPaste={(event) => {
        const files = Array.from(event.clipboardData.items)
          .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
          .map((item) => item.getAsFile())
          .filter((file): file is File => !!file);
        if (files.length) {
          event.preventDefault();
          void attachFiles(files);
        }
      }}
    >
      {dragOver && (
        <div className='pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary bg-background/90 backdrop-blur-md'>
          <div className='text-center text-primary'>
            <ImagePlus className='mx-auto mb-3 size-12' />
            <p className='text-lg font-semibold'>
              {c('Drop your reference image', 'Thả ảnh tham chiếu vào đây')}
            </p>
            <p className='mt-1 text-xs text-muted-foreground'>JPG · PNG · WebP · 5 MB</p>
          </div>
        </div>
      )}
      <div className='relative -mx-4 -mt-4 mb-3 shrink-0 overflow-hidden border-b border-primary/20 bg-gradient-to-br from-primary/20 via-sky-500/10 to-background p-4'>
        <div className='flex items-center justify-between gap-2'>
          <div className='flex items-center gap-2.5'>
            <span className='relative flex size-12 items-center justify-center rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/25 to-sky-500/15 text-primary shadow-[0_0_28px_-10px_var(--primary)]'>
              <BotMessageSquare className='size-6' aria-hidden='true' />
            </span>
            <div>
              <h2 className='text-sm font-semibold'>
                {c('NexSpace AI Studio', 'Trợ lý thiết kế AI')}
              </h2>
            </div>
          </div>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='ml-auto size-8 shrink-0'
            onClick={() => setExpanded((value) => !value)}
            aria-label={c(
              expanded ? 'Collapse assistant' : 'Expand assistant',
              expanded ? 'Thu gọn trợ lý' : 'Mở rộng trợ lý'
            )}
            title={c(
              expanded ? 'Collapse assistant' : 'Expand assistant',
              expanded ? 'Thu gọn trợ lý' : 'Mở rộng trợ lý'
            )}
          >
            {expanded ? <Minimize2 className='size-4' /> : <Maximize2 className='size-4' />}
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='size-7'
            disabled={busy}
            onClick={() => {
              setExpanded(false);
              onClose();
            }}
            aria-label={c('Close assistant', 'Đóng trợ lý')}
          >
            <X className='size-4' />
          </Button>
        </div>
        <p className='mt-2 text-[10px] text-muted-foreground'>
          {c(
            'Recent text history is saved on this browser per floor. Images are not stored.',
            'Lưu lịch sử văn bản theo sơ đồ trên trình duyệt này. Không lưu ảnh lâu dài.'
          )}
        </p>
        <div className='mt-3 grid grid-cols-3 gap-1 rounded-xl bg-background/70 p-1'>
          {(
            [
              ['AI', BotMessageSquare, c('Assistant', 'Trợ lý')],
              ['METRICS', Ruler, c('Dimensions', 'Kích thước')],
              ['LIBRARY', Library, c('Library', 'Kho đồ')]
            ] as const
          ).map(([value, Icon, label]) => (
            <button
              key={value}
              type='button'
              onClick={() => {
                setTab(value);
                setError('');
              }}
              className={`flex items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] transition ${tab === value ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
            >
              <Icon className='size-3.5' />
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className='min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pb-4 pr-1 [scrollbar-width:thin]'>
        {tab !== 'AI' && toolsNotice}
        {error && (
          <p
            role='alert'
            className='rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive'
          >
            {error}
          </p>
        )}
        {tab === 'AI' && (
          <>
            <div
              className='mx-auto w-full max-w-3xl space-y-5 px-1 py-3 sm:px-2'
              role='log'
              aria-label={c('Conversation', 'Hội thoại')}
            >
              {!messages.length && (
                <div className='px-3 py-8 text-center'>
                  <span className='mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/15 to-sky-500/10 text-primary shadow-sm'>
                    <BotMessageSquare className='size-7' aria-hidden='true' />
                  </span>
                  <p className='text-base font-semibold'>
                    {c('What would you like to design?', 'Bạn muốn thiết kế gì?')}
                  </p>
                  <p className='mt-2 text-sm text-muted-foreground'>
                    {c(
                      'Describe a layout or attach a reference image.',
                      'Mô tả bố trí hoặc gửi ảnh tham chiếu.'
                    )}
                  </p>
                </div>
              )}
              {messages.map((message, index) =>
                message.role === 'user' ? (
                  <div key={index} className='flex justify-end'>
                    <div
                      aria-label={c('Your message', 'Tin nhắn của bạn')}
                      className='max-w-[88%] min-w-0 rounded-2xl rounded-br-md border border-primary/15 bg-primary/10 px-4 py-2.5 text-sm text-foreground'
                    >
                      {message.image && (
                        <img
                          src={message.image}
                          alt={c('Reference image', 'Ảnh tham chiếu')}
                          className='mb-2 max-h-48 rounded-xl object-contain'
                        />
                      )}
                      <p className='whitespace-pre-wrap break-words'>{message.text}</p>
                    </div>
                  </div>
                ) : (
                  <div key={index} className='flex items-start gap-2.5'>
                    <span className='mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-gradient-to-br from-primary/15 to-sky-500/10 text-primary'>
                      <BotMessageSquare className='size-4' aria-hidden='true' />
                    </span>
                    <div className='min-w-0 flex-1'>
                      <p className='mb-1 text-xs font-semibold text-muted-foreground'>
                        NexSpace AI
                      </p>
                      {message.kind === 'warning' ? (
                        <div className='flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive'>
                          <CircleAlert className='mt-0.5 size-4 shrink-0' aria-hidden='true' />
                          <p className='min-w-0 whitespace-pre-wrap break-words'>{message.text}</p>
                        </div>
                      ) : (
                        <p className='whitespace-pre-wrap break-words text-sm leading-relaxed'>
                          {message.text}
                        </p>
                      )}
                      <Button
                        type='button'
                        size='icon'
                        variant='ghost'
                        className='mt-1 size-8 text-muted-foreground hover:text-primary'
                        aria-label={c('Copy reply', 'Sao chép phản hồi')}
                        title={c('Copy reply', 'Sao chép phản hồi')}
                        onClick={() => void copyReply(message.text)}
                      >
                        <Copy className='size-4' aria-hidden='true' />
                      </Button>
                    </div>
                  </div>
                )
              )}
              {generating && (
                <div
                  role='status'
                  className='flex items-center gap-2.5 text-sm text-muted-foreground'
                >
                  <span className='flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'>
                    <LoaderCircle className='size-4 motion-safe:animate-spin' aria-hidden='true' />
                  </span>
                  <span>
                    {generating === 'image'
                      ? c('Analyzing your image…', 'Đang phân tích ảnh…')
                      : c('Designing your space…', 'Đang bố trí không gian…')}
                  </span>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='ml-auto'
                    onClick={() => {
                      controller.current?.abort();
                      warnInChat(c('Request canceled.', 'Đã hủy yêu cầu.'));
                    }}
                  >
                    {c('Cancel', 'Hủy')}
                  </Button>
                </div>
              )}
            </div>
            {toolsNotice}
            {blocked && (
              <p className='rounded-xl bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300'>
                {c(
                  'Save or discard manual changes before using the assistant.',
                  'Lưu hoặc bỏ các thay đổi thủ công trước khi dùng trợ lý.'
                )}
              </p>
            )}
            {status.data && !status.data.configured && (
              <p className='rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs'>
                {c(
                  'Set up a Gemini API key to use the assistant.',
                  'Cấu hình API key Gemini để dùng trợ lý.'
                )}
              </p>
            )}
            {d && !d.widthM && (
              <button
                type='button'
                onClick={() => setTab('METRICS')}
                className='w-full rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-left text-xs'
              >
                {c('Set real dimensions to use AI →', 'Thiết lập kích thước thực để dùng AI →')}
              </button>
            )}
            <div ref={chatEnd} />
            {proposal && (
              <div className='space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-3'>
                <div className='flex items-center justify-between text-xs font-semibold'>
                  <span>{c('Draft proposal', 'Đề xuất chưa lưu')}</span>
                  <span>
                    {proposal.design.resources.length + proposal.design.removeResourceIds.length}{' '}
                    {c('resource changes', 'thay đổi chỗ')}
                  </span>
                </div>
                {newTypes.length > 0 && (!typesReady || !typesConfirmed) && (
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='h-auto w-full justify-between whitespace-normal rounded-xl border-primary/25 bg-primary/5 py-3 text-left text-xs'
                    onClick={() =>
                      typeConfiguration.current?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                      })
                    }
                  >
                    <span>
                      {newTypes.length}{' '}
                      {c(
                        'new types · complete & confirm prices',
                        'loại chỗ mới · điền và xác nhận giá'
                      )}
                    </span>
                    <ChevronDown className='size-4 shrink-0' />
                  </Button>
                )}
                {proposal.design.resources.map((item, index) => (
                  <button
                    key={item.key}
                    type='button'
                    title={c(
                      'View this object in the preview; it is not saved yet.',
                      'Xem đối tượng trên bản nháp, chưa lưu dữ liệu.'
                    )}
                    onClick={() => onFocus(`resource:${item.id ?? -(index + 1)}`)}
                    className='flex w-full justify-between rounded-lg border border-border bg-background/70 p-2 text-left text-xs'
                  >
                    <span>{item.name}</span>
                    <span className='ml-2 flex shrink-0 items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[10px] text-primary'>
                      <Eye className='size-3' />
                      {item.id
                        ? c('Change · View', 'Thay đổi · Xem')
                        : c('New · View', 'Chỗ mới · Xem')}
                    </span>
                  </button>
                ))}
                {proposal.design.removeResourceIds.map((id) => (
                  <p key={id} className='text-xs text-destructive'>
                    {c('Remove', 'Xóa')}: {layout.resources.find((r) => r.id === id)?.name ?? id}
                  </p>
                ))}
                <p className='text-[11px] text-muted-foreground'>
                  {c('Furnishings in proposed layout', 'Đồ bố trí trong sơ đồ đề xuất')}:{' '}
                  {proposal.design.decorations.length}
                </p>
                {newTypes.length > 0 && (
                  <section
                    ref={typeConfiguration}
                    className='scroll-mt-3 space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-3'
                  >
                    <h3 className='text-sm font-semibold'>
                      {c('Confirm new seat / room types', 'Xác nhận loại ghế / phòng mới')}
                    </h3>
                    <p className='text-xs text-muted-foreground'>
                      {c(
                        'Created with the layout only after confirmation. Enter at least one price per type.',
                        'Chỉ tạo cùng sơ đồ sau khi xác nhận. Nhập ít nhất một mức giá cho mỗi loại.'
                      )}
                    </p>
                    {newTypes.map((type, index) => {
                      const update = (patch: Partial<typeof type>) => {
                        const updated = { ...type, ...patch };
                        const measured = metrics.data;
                        changeProposal({
                          ...proposal,
                          design: {
                            ...proposal.design,
                            resources: proposal.design.resources.map((resource) =>
                              resource.id == null && resource.resourceTypeId === type.tempId
                                ? {
                                    ...resource,
                                    usageKind: updated.usageKind,
                                    capacity: updated.capacity,
                                    ...(measured?.widthM &&
                                    measured.lengthM &&
                                    layout.width &&
                                    layout.height
                                      ? {
                                          width: Number(
                                            (
                                              (updated.standardWidthM / measured.widthM) *
                                              layout.width
                                            ).toFixed(2)
                                          ),
                                          height: Number(
                                            (
                                              (updated.standardLengthM / measured.lengthM) *
                                              layout.height
                                            ).toFixed(2)
                                          )
                                        }
                                      : {})
                                  }
                                : resource
                            ),
                            newTypes: newTypes.map((t, i) => (i === index ? updated : t))
                          }
                        });
                      };
                      return (
                        <div
                          key={type.tempId}
                          className='space-y-2 rounded-xl border border-border bg-card p-3'
                        >
                          <label className='block text-xs'>
                            {c('Name', 'Tên loại chỗ')}
                            <Input
                              disabled={busy}
                              value={type.name}
                              maxLength={100}
                              onChange={(e) => update({ name: e.target.value })}
                            />
                          </label>
                          <div className='grid grid-cols-3 gap-2'>
                            <label className='text-xs'>
                              {c('Category', 'Nhóm')}
                              <select
                                disabled={busy}
                                className='h-9 w-full rounded-md border bg-background text-xs'
                                value={type.category}
                                onChange={(e) =>
                                  update({
                                    category: e.target.value as 'DESK' | 'ROOM',
                                    usageKind:
                                      e.target.value === 'DESK' ? 'WORK_SEAT' : 'MEETING_ROOM',
                                    capacity: e.target.value === 'DESK' ? 1 : type.capacity
                                  })
                                }
                              >
                                <option value='DESK'>{c('Seat', 'Ghế')}</option>
                                <option value='ROOM'>{c('Room', 'Phòng')}</option>
                              </select>
                            </label>
                            <label className='text-xs'>
                              {c('Capacity', 'Sức chứa')}
                              <Input
                                type='number'
                                min={1}
                                max={10000}
                                disabled={busy || type.category === 'DESK'}
                                value={type.capacity}
                                onChange={(e) => update({ capacity: Number(e.target.value) })}
                              />
                            </label>
                            <label className='text-xs'>
                              {c('Currency', 'Tiền tệ')}
                              <select
                                disabled={busy}
                                className='h-9 w-full rounded-md border bg-background text-xs'
                                value={type.currency}
                                onChange={(e) =>
                                  update({ currency: e.target.value as 'VND' | 'USD' })
                                }
                              >
                                <option>VND</option>
                                <option>USD</option>
                              </select>
                            </label>
                          </div>
                          <div className='grid grid-cols-3 gap-2'>
                            <label className='text-xs'>
                              {c('Usage', 'Kiểu chỗ')}
                              <select
                                className='h-9 w-full rounded-md border bg-background text-xs'
                                disabled={busy}
                                value={type.usageKind}
                                onChange={(e) =>
                                  update({ usageKind: e.target.value as typeof type.usageKind })
                                }
                              >
                                {resourceUsageKinds
                                  .filter((item) => item.category === type.category)
                                  .map((item) => (
                                    <option key={item.value} value={item.value}>
                                      {c(item.en, item.vi)}
                                    </option>
                                  ))}
                              </select>
                            </label>
                            {(['standardWidthM', 'standardLengthM'] as const).map(
                              (field, index) => (
                                <label key={field} className='text-xs'>
                                  {index === 0
                                    ? c('Width (m)', 'Rộng (m)')
                                    : c('Length (m)', 'Dài (m)')}
                                  <Input
                                    disabled={busy}
                                    type='number'
                                    min='.01'
                                    max='10000'
                                    step='.01'
                                    value={type[field] ?? ''}
                                    onChange={(e) => update({ [field]: Number(e.target.value) })}
                                  />
                                </label>
                              )
                            )}
                          </div>
                          <div className='grid grid-cols-3 gap-2'>
                            {(['pricePerHour', 'pricePerDay', 'pricePerMonth'] as const).map(
                              (field, i) => (
                                <label key={field} className='text-xs'>
                                  {[c('Hour', 'Giờ'), c('Day', 'Ngày'), c('Month', 'Tháng')][i]} (
                                  {type.currency})
                                  <Input
                                    disabled={busy}
                                    type='number'
                                    min='.01'
                                    step='.01'
                                    value={type[field] ?? ''}
                                    onChange={(e) =>
                                      update({
                                        [field]:
                                          e.target.value === '' ? null : Number(e.target.value)
                                      })
                                    }
                                  />
                                </label>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <label className='flex items-start gap-2 text-xs'>
                      <input
                        type='checkbox'
                        disabled={busy || !typesReady}
                        checked={typesConfirmed}
                        onChange={(e) =>
                          setConfirmedTypeDesign(e.target.checked ? proposal.design : null)
                        }
                        className='mt-0.5 accent-primary'
                      />
                      {c(
                        'I confirm the new types, usage, dimensions, capacity, currency and prices.',
                        'Tôi xác nhận kiểu chỗ, kích thước, sức chứa, tiền tệ và các mức giá mới.'
                      )}
                    </label>
                  </section>
                )}
                {iconGroups.size > 0 && (
                  <section className='space-y-2 rounded-xl border border-border bg-muted/20 p-3'>
                    <h3 className='text-xs font-semibold'>
                      {c('Furnishing symbols', 'Biểu tượng đồ bố trí')}
                    </h3>
                    <p className='text-[11px] text-muted-foreground'>
                      {c(
                        'Check or change the symbol before saving.',
                        'Kiểm tra hoặc đổi biểu tượng trước khi lưu.'
                      )}
                    </p>
                    {[...iconGroups.entries()].map(([key, group]) => (
                      <label key={key} className='flex items-center gap-2 text-xs'>
                        <DecorationIcon
                          kind={group.kind}
                          icon={group.icon}
                          className='size-5 shrink-0 text-primary'
                        />
                        <span className='min-w-0 flex-1 truncate' title={group.label}>
                          {group.label}
                        </span>
                        <select
                          disabled={busy}
                          aria-label={c('Symbol for ', 'Biểu tượng cho ') + group.label}
                          value={group.icon ?? ''}
                          className='h-8 min-w-0 max-w-[55%] rounded-lg border bg-background px-2 text-xs'
                          onChange={(event) => {
                            const icon = event.target.value as NonNullable<FloorDecoration['icon']>;
                            const ids = new Set(group.ids);
                            changeProposal({
                              ...proposal,
                              design: {
                                ...proposal.design,
                                decorations: proposal.design.decorations.map((object) =>
                                  ids.has(object.id) ? { ...object, icon } : object
                                ),
                                templates: proposal.design.templates.map((template) =>
                                  presetKey(template.kind, template.name, template.icon) === key
                                    ? { ...template, icon }
                                    : template
                                )
                              }
                            });
                          }}
                        >
                          {(!group.icon || group.icon === 'BOX') && (
                            <option value={group.icon ?? ''}>
                              {c('Choose icon', 'Chọn biểu tượng')}
                            </option>
                          )}
                          {furnishingIconCatalog.map((item) => (
                            <option key={item.value} value={item.value}>
                              {c(item.en, item.vi)}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </section>
                )}
                {proposal.design.templates.length > 0 && (
                  <label className='flex items-start gap-2 text-xs'>
                    <input
                      type='checkbox'
                      checked={saveTemplates}
                      onChange={(e) => setSaveTemplates(e.target.checked)}
                      className='mt-0.5 accent-primary'
                    />
                    {c('Save new presets to my library', 'Lưu mẫu vật dụng mới vào kho của tôi')}:{' '}
                    {proposal.design.templates.map((t) => t.name).join(', ')}
                  </label>
                )}
                {applyBlockers.length > 0 && (
                  <div
                    role='status'
                    className='space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs'
                  >
                    <p className='flex items-center gap-2 font-semibold'>
                      <Info className='size-4 shrink-0 text-primary' />
                      {c('Before saving this proposal', 'Cần hoàn tất trước khi lưu')}
                    </p>
                    <ul className='list-disc space-y-1 pl-4 text-muted-foreground'>
                      {applyBlockers.map((reason, index) => (
                        <li key={index}>{reason}</li>
                      ))}
                    </ul>
                    {newTypes.length > 0 && (!typesReady || !typesConfirmed) && (
                      <Button
                        type='button'
                        size='sm'
                        variant='outline'
                        className='w-full text-xs'
                        onClick={() =>
                          typeConfiguration.current?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                          })
                        }
                      >
                        {c('Complete types & confirm prices', 'Điền loại chỗ và xác nhận giá')}
                        <ChevronUp className='size-3.5' />
                      </Button>
                    )}
                  </div>
                )}
                <Button
                  className='w-full rounded-xl'
                  disabled={
                    missingIcons.length > 0 ||
                    previewIssues.length > 0 ||
                    !canWrite ||
                    !proposal.applicable ||
                    !typesConfirmed ||
                    !typesReady ||
                    proposal.expectedRevision !== layout.floor.revision
                  }
                  onClick={() => void apply()}
                >
                  {busy ? (
                    <LoaderCircle className='size-4 animate-spin' />
                  ) : (
                    <Check className='size-4' />
                  )}
                  {c('Apply & save to database', 'Áp dụng và lưu dữ liệu')}
                </Button>
                <Button
                  variant='ghost'
                  className='w-full text-xs'
                  disabled={busy}
                  onClick={() => changeProposal(null)}
                >
                  <RotateCcw className='size-3.5' />
                  {c('Discard proposal', 'Bỏ đề xuất')}
                </Button>
              </div>
            )}
          </>
        )}
        {tab === 'METRICS' && d && (
          <>
            <div className='rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 to-transparent p-4'>
              <p className='text-[11px] text-muted-foreground'>
                {c('This workspace area', 'Vùng workspace này')}
              </p>
              <p className='mt-1 text-2xl font-semibold'>
                {d.areaSqm == null ? '—' : Number(d.areaSqm).toLocaleString(language)}{' '}
                <span className='text-sm text-muted-foreground'>m²</span>
              </p>
              <p className='mt-2 text-xs text-muted-foreground'>
                {c('Design capacity', 'Sức chứa thiết kế')}: {d.designOccupancy}
                {d.occupancyLimit ? ` / ${d.occupancyLimit}` : ''}
              </p>
            </div>
            <div className='space-y-2 rounded-xl bg-muted/30 p-3 text-xs'>
              <p>
                {c('Workspace declared area', 'Diện tích workspace khai báo')}:{' '}
                {d.workspaceDeclaredAreaSqm ?? '—'} m²
              </p>
              <p>
                {c('Measured linked areas', 'Tổng vùng đã đo')}: {d.workspaceMappedAreaSqm} m²
              </p>
              <p className='text-muted-foreground'>
                {!d.allAreasMeasured
                  ? c(
                      'Some linked floors still need real dimensions.',
                      'Một số tầng liên kết chưa có kích thước thực.'
                    )
                  : c(
                      'Compare this total with the declared workspace area.',
                      'Đối chiếu tổng này với diện tích workspace đã khai báo.'
                    )}
              </p>
            </div>
            {!dimensions ? (
              <Button
                variant='outline'
                className='w-full'
                disabled={!canWrite || !!proposal}
                onClick={() =>
                  setDimensions({
                    width: String(d.physicalWidthM ?? ''),
                    length: String(d.physicalLengthM ?? ''),
                    maximum: String(d.maxOccupancy ?? ''),
                    limit: String(d.occupancyLimit ?? '')
                  })
                }
              >
                <Ruler className='size-4' />
                {c('Set real dimensions', 'Thiết lập kích thước thực')}
              </Button>
            ) : (
              <form
                onSubmit={saveMeasurements}
                className='space-y-3 rounded-xl border border-border p-3'
              >
                <p className='text-xs leading-relaxed text-muted-foreground'>
                  {c(
                    'Width and length describe the whole physical floor, shared by all workspaces. Existing pixel positions stay unchanged.',
                    'Rộng và dài là kích thước toàn tầng vật lý, dùng chung cho các workspace. Tọa độ pixel cũ được giữ nguyên.'
                  )}
                </p>
                {(
                  [
                    ['width', c('Physical floor width (m)', 'Rộng toàn tầng (m)')],
                    ['length', c('Physical floor length (m)', 'Dài toàn tầng (m)')],
                    [
                      'maximum',
                      c(
                        'Maximum people on floor (optional)',
                        'Số người tối đa toàn tầng (tùy chọn)'
                      )
                    ],
                    [
                      'limit',
                      c(
                        'People allocated to this area (optional)',
                        'Hạn mức người vùng này (tùy chọn)'
                      )
                    ]
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className='block space-y-1 text-xs'>
                    <span>{label}</span>
                    <Input
                      type='number'
                      min={key === 'width' || key === 'length' ? '.01' : '1'}
                      max={key === 'width' || key === 'length' ? '10000' : '100000'}
                      step={key === 'width' || key === 'length' ? '.01' : '1'}
                      required={key === 'width' || key === 'length'}
                      value={dimensions[key]}
                      onChange={(e) => setDimensions({ ...dimensions, [key]: e.target.value })}
                    />
                  </label>
                ))}
                <div className='flex gap-2'>
                  <Button type='submit' size='sm' disabled={!canWrite || !!proposal}>
                    {c('Save', 'Lưu')}
                  </Button>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={() => setDimensions(null)}
                  >
                    {c('Cancel', 'Hủy')}
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
        {tab === 'LIBRARY' && (
          <>
            <p className='text-xs leading-relaxed text-muted-foreground'>
              {c(
                'Your reusable furnishings, shared across your workspaces. Placed objects keep independent attributes.',
                'Kho vật dụng riêng dùng lại ở các workspace của bạn. Đồ đã đặt giữ thuộc tính riêng.'
              )}
            </p>
            <Input
              placeholder={c('Search my library…', 'Tìm trong kho…')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className='space-y-2'>
              <h3 className='text-xs font-semibold'>{c('Furnishings', 'Vật dụng')}</h3>
              <div className='grid grid-cols-2 gap-2'>
                {(Object.keys(decorationPresets) as DecorationKind[])
                  .filter((kind) => {
                    const item = decorationPresets[kind];
                    return `${item.en} ${item.vi}`
                      .toLocaleLowerCase()
                      .includes(search.trim().toLocaleLowerCase());
                  })
                  .map((kind) => {
                    const item = decorationPresets[kind];
                    return (
                      <button
                        key={kind}
                        type='button'
                        disabled={!canWrite || !!proposal}
                        onClick={() => placeDefault(kind)}
                        className='group flex flex-col items-start gap-2 rounded-xl border border-primary/15 bg-gradient-to-br from-primary/10 to-transparent p-3 text-left transition hover:border-primary/40 hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50'
                      >
                        <span
                          className='flex size-9 items-center justify-center rounded-xl bg-background/80'
                          style={{ color: item.color }}
                        >
                          <DecorationIcon kind={kind} className='size-5' />
                        </span>
                        <span className='text-xs font-medium'>{c(item.en, item.vi)}</span>
                        <span className='flex items-center gap-1 text-[10px] text-muted-foreground'>
                          <Plus className='size-3' />
                          {c('Place on floor', 'Đặt vào sơ đồ')}
                        </span>
                      </button>
                    );
                  })}
                {savedPresets.map((item) => (
                  <div
                    key={`saved-${item.id}`}
                    className='group flex min-w-0 flex-col gap-2 rounded-xl border border-primary/15 bg-gradient-to-br from-primary/10 to-transparent p-3'
                  >
                    <div className='flex items-center justify-between gap-1'>
                      <span
                        className='flex size-9 items-center justify-center rounded-xl bg-background/80'
                        style={{ color: item.color }}
                      >
                        <DecorationIcon
                          kind={item.kind}
                          icon={furnishingIcon(item.kind, item.name, item.icon)}
                          className='size-5'
                        />
                      </span>
                      <span className='text-[9px] text-muted-foreground'>
                        {c('Saved preset', 'Mẫu đã lưu')}
                      </span>
                    </div>
                    <p className='break-words text-xs font-medium'>{item.name}</p>
                    <p className='text-[10px] text-muted-foreground'>
                      {item.widthM} × {item.lengthM} m
                    </p>
                    <Button
                      size='sm'
                      variant='ghost'
                      className='mt-auto h-7 justify-start px-0 text-[10px]'
                      disabled={!canWrite || !!proposal || !d?.widthM}
                      onClick={() => place(item)}
                    >
                      <Plus className='size-3' />
                      {c('Place on floor', 'Đặt vào sơ đồ')}
                    </Button>
                    <div className='flex gap-1 border-t border-border/50 pt-1'>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='size-6'
                        aria-label={c('Edit preset', 'Sửa mẫu')}
                        disabled={!canWrite}
                        onClick={() => {
                          setEditing(item);
                          setTemplate({
                            ...item,
                            icon: furnishingIcon(item.kind, item.name, item.icon)
                          });
                        }}
                      >
                        <Pencil className='size-3' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='size-6'
                        aria-label={c('Archive preset', 'Ẩn mẫu')}
                        disabled={!canWrite}
                        onClick={() => void archive(item)}
                      >
                        <Archive className='size-3' />
                      </Button>
                    </div>
                  </div>
                ))}
                {placedPresets.map((item) => (
                  <div
                    key={`placed-${item.id}`}
                    className='flex min-w-0 flex-col gap-2 rounded-xl border border-primary/15 bg-gradient-to-br from-primary/10 to-transparent p-3'
                  >
                    <div className='flex items-center justify-between gap-1'>
                      <span
                        className='flex size-9 items-center justify-center rounded-xl bg-background/80'
                        style={{ color: item.color }}
                      >
                        <DecorationIcon
                          kind={item.kind}
                          icon={furnishingIcon(item.kind, item.label, item.icon)}
                          className='size-5'
                        />
                      </span>
                      <span className='text-[9px] text-muted-foreground'>
                        {c('On this layout', 'Trên sơ đồ')}
                      </span>
                    </div>
                    <p className='break-words text-xs font-medium'>{item.label}</p>
                    <p className='text-[10px] text-muted-foreground'>
                      {c('Not saved as a preset yet', 'Chưa lưu thành mẫu')}
                    </p>
                    <Button
                      size='sm'
                      variant='ghost'
                      className='mt-auto h-7 justify-start px-0 text-[10px]'
                      disabled={!canWrite || !!proposal}
                      onClick={() =>
                        onPlace({
                          ...item,
                          id: `decor-${crypto.randomUUID()}`,
                          icon: furnishingIcon(item.kind, item.label, item.icon)
                        })
                      }
                    >
                      <Plus className='size-3' />
                      {c('Place a copy', 'Đặt thêm vào sơ đồ')}
                    </Button>
                    <Button
                      size='sm'
                      variant='outline'
                      className='h-7 text-[10px]'
                      disabled={!canWrite || !d?.widthM || !d?.lengthM}
                      onClick={() => savePlacedPreset(item)}
                    >
                      <Library className='size-3' />
                      {c('Save to library', 'Lưu vào kho')}
                    </Button>
                  </div>
                ))}
              </div>
              <p className='text-[10px] leading-relaxed text-muted-foreground'>
                {c(
                  'Built-in objects, saved presets and objects on this layout share one list. Save a preset to reuse it across workspaces.',
                  'Dùng cùng mẫu mặc định trên thanh công cụ. Bạn có thể chỉnh kích thước và vị trí sau khi đặt.'
                )}
              </p>
            </div>
            <Button
              variant='outline'
              className='w-full'
              disabled={!canWrite}
              onClick={() => {
                setEditing(undefined);
                setTemplate({ name: '', kind: 'OTHER', widthM: 1, lengthM: 1, color: '#94a3b8' });
              }}
            >
              <Plus className='size-4' />
              {c('New furnishing preset', 'Tạo mẫu vật dụng')}
            </Button>
            {template && (
              <form
                ref={presetForm}
                onSubmit={savePreset}
                className='space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-3'
              >
                <label className='block space-y-1 text-xs'>
                  <span>{c('Name', 'Tên')}</span>
                  <Input
                    required
                    maxLength={100}
                    value={template.name}
                    onChange={(e) => setTemplate({ ...template, name: e.target.value })}
                  />
                </label>
                <label className='block space-y-1 text-xs'>
                  <span>{c('Type', 'Loại')}</span>
                  <select
                    className={inputClass}
                    value={template.kind}
                    onChange={(e) =>
                      setTemplate({
                        ...template,
                        kind: e.target.value as LayoutTemplateInput['kind']
                      })
                    }
                  >
                    {(['TABLE', 'PLANT', 'PARTITION', 'OTHER'] as const).map((kind) => (
                      <option key={kind} value={kind}>
                        {
                          {
                            TABLE: c('Table', 'Bàn'),
                            PLANT: c('Plant', 'Cây xanh'),
                            PARTITION: c('Partition', 'Vách ngăn'),
                            OTHER: c('Other', 'Vật dụng khác')
                          }[kind]
                        }
                      </option>
                    ))}
                  </select>
                </label>
                <div className='grid grid-cols-2 gap-2'>
                  {(['widthM', 'lengthM'] as const).map((key) => (
                    <label key={key} className='space-y-1 text-xs'>
                      <span>
                        {key === 'widthM' ? c('Width (m)', 'Rộng (m)') : c('Length (m)', 'Dài (m)')}
                      </span>
                      <Input
                        type='number'
                        required
                        min='.01'
                        max='1000'
                        step='.01'
                        value={template[key]}
                        onChange={(e) =>
                          setTemplate({ ...template, [key]: Number(e.target.value) })
                        }
                      />
                    </label>
                  ))}
                </div>
                <label className='flex items-center justify-between text-xs'>
                  {c('Icon', 'Biểu tượng')}
                  <select
                    className='h-9 max-w-40 rounded-md border border-input bg-background px-2'
                    value={template.icon ?? ''}
                    onChange={(e) =>
                      setTemplate({
                        ...template,
                        icon: (e.target.value || null) as LayoutTemplateInput['icon']
                      })
                    }
                  >
                    <option value=''>{c('Default by category', 'Mặc định theo nhóm')}</option>
                    {furnishingIconCatalog.map((item) => (
                      <option key={item.value} value={item.value}>
                        {c(item.en, item.vi)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className='flex items-center justify-between text-xs'>
                  {c('Color', 'Màu')}
                  <input
                    type='color'
                    value={template.color}
                    onChange={(e) => setTemplate({ ...template, color: e.target.value })}
                  />
                </label>
                <div className='flex gap-2'>
                  <Button type='submit' size='sm' disabled={!canWrite}>
                    {c('Save preset', 'Lưu mẫu')}
                  </Button>
                  <Button type='button' size='sm' variant='ghost' onClick={() => setTemplate(null)}>
                    {c('Cancel', 'Hủy')}
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
      {tab === 'AI' && (
        <form
          onSubmit={generate}
          className='relative mx-auto w-full max-w-3xl shrink-0 space-y-2 border-t border-border/70 pt-2'
        >
          <input
            ref={imageInput}
            type='file'
            accept='image/jpeg,image/png,image/webp'
            className='hidden'
            disabled={!canWrite}
            aria-label={c('Choose a reference image', 'Chọn ảnh tham chiếu')}
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              event.target.value = '';
              if (files.length) void attachFiles(files);
            }}
          />
          <div className='flex items-center justify-between gap-2'>
            <button
              type='button'
              disabled={busy}
              onClick={() => setScopeOpen((value) => !value)}
              className='flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted'
            >
              <Ruler className='size-3' />
              <span className='max-w-40 truncate sm:max-w-60'>
                {scope === 'WORKSPACE'
                  ? c('Entire area', 'Toàn vùng')
                  : (selectionName ??
                    (scope === 'ROOM'
                      ? c('Selected room', 'Phòng đang chọn')
                      : c('Selected object', 'Đối tượng đang chọn')))}
              </span>
              <ChevronDown className='size-3' />
            </button>
            {(!compactComposer || prompt.length > 0) && (
              <button
                type='button'
                onClick={() => setComposerExpanded((value) => !value)}
                className='flex items-center gap-1 px-2 text-[11px] text-muted-foreground hover:text-primary'
                aria-expanded={!compactComposer}
              >
                {compactComposer ? (
                  <ChevronUp className='size-3' />
                ) : (
                  <ChevronDown className='size-3' />
                )}
                {compactComposer
                  ? c('Expand composer', 'Mở rộng ô soạn')
                  : c('Collapse', 'Thu gọn')}
              </button>
            )}
          </div>
          {scopeOpen && (
            <label className='block text-[11px] text-muted-foreground'>
              {c('Design scope', 'Phạm vi thao tác')}
              <select
                value={scope}
                disabled={busy}
                className={`${inputClass} mt-1`}
                onChange={(event) => {
                  setScope(event.target.value as DesignScope);
                  changeProposal(null);
                }}
              >
                <option value='WORKSPACE'>
                  {c('Entire workspace area', 'Toàn vùng workspace')}
                </option>
                <option value='ROOM'>
                  {c('Selected room and its contents', 'Phòng đang chọn và bên trong')}
                </option>
                <option value='OBJECT'>
                  {c('Selected object only', 'Chỉ đối tượng đang chọn')}
                </option>
              </select>
            </label>
          )}
          {image && (
            <div className='flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-2'>
              <img
                src={image.preview}
                alt={c('Attached reference', 'Ảnh tham chiếu đính kèm')}
                className={`${compactComposer ? 'size-9' : 'size-14'} rounded-lg bg-background object-cover`}
              />
              <div className='min-w-0 flex-1'>
                <p className='truncate text-xs font-medium'>{image.name}</p>
                <p className='text-[10px] text-muted-foreground'>
                  {c('Reference only · Not stored', 'Ảnh tham chiếu · Không lưu trữ')}
                </p>
              </div>
              <Button
                type='button'
                size='icon'
                variant='ghost'
                className='size-7 shrink-0'
                disabled={busy}
                aria-label={c('Remove image', 'Bỏ ảnh')}
                onClick={() => setImage(null)}
              >
                <X className='size-3.5' />
              </Button>
            </div>
          )}
          <div className='flex flex-wrap items-end gap-1 rounded-[1.65rem] border border-border bg-background/80 p-1.5 shadow-sm transition focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10'>
            <Button
              type='button'
              size='icon'
              variant='ghost'
              className='size-9 shrink-0 rounded-full text-muted-foreground hover:text-primary'
              disabled={!canWrite}
              aria-label={c('Attach an image', 'Đính kèm ảnh')}
              title={c('Attach an image', 'Đính kèm ảnh')}
              onClick={() => imageInput.current?.click()}
            >
              {preparingImage ? (
                <LoaderCircle className='size-4 motion-safe:animate-spin' />
              ) : (
                <Plus className='size-5' />
              )}
            </Button>
            <textarea
              aria-label={c('Describe your design', 'Mô tả thiết kế')}
              maxLength={4000}
              rows={compactComposer ? 1 : 3}
              value={prompt}
              disabled={preparingImage}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
                if (event.shiftKey) {
                  setComposerExpanded(true);
                } else {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder={
                image
                  ? c('What should I create from this image?', 'Bạn muốn tạo gì từ ảnh này?')
                  : proposal
                    ? c('Tell me what to change…', 'Bạn muốn sửa gì tiếp…')
                    : c(
                        'Describe a layout, paste or drop an image…',
                        'Mô tả bố trí, dán hoặc kéo ảnh vào đây…'
                      )
              }
              className={`min-w-0 resize-none bg-transparent px-1 py-2 text-sm leading-5 outline-none ${compactComposer ? 'min-h-9 flex-1' : '-order-1 basis-full px-3 pt-2.5'}`}
            />
            <Button
              type='submit'
              size='icon'
              className='ml-auto size-9 shrink-0 rounded-full shadow-sm shadow-primary/20'
              aria-label={
                proposal ? c('Refine proposal', 'Chỉnh đề xuất') : c('Send message', 'Gửi tin nhắn')
              }
              title={c('Send · Enter', 'Gửi · Enter')}
              disabled={
                !canWrite || !scopeValid || !canGenerate || !d?.widthM || (!prompt.trim() && !image)
              }
            >
              {generating ? (
                <LoaderCircle className='size-4 motion-safe:animate-spin' />
              ) : (
                <Send className='size-4' />
              )}
            </Button>
          </div>
          {!compactComposer && (
            <p className='px-2 text-[10px] text-muted-foreground'>
              {c(
                'Enter to send · Shift+Enter for a new line',
                'Enter để gửi · Shift+Enter để xuống dòng'
              )}
            </p>
          )}
          <p className='flex items-center justify-center gap-1 text-[10px] text-muted-foreground'>
            <ShieldCheck className='size-3' />
            {c(
              'Preview first. Save only when you apply.',
              'Luôn xem trước. Chỉ lưu khi bạn nhấn Áp dụng.'
            )}
          </p>
        </form>
      )}
    </div>
  );
}
