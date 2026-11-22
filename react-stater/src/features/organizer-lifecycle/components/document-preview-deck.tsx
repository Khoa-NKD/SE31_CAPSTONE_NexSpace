import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, FileText } from '@/components/ui/hugeicons';
import CardSwap, { Card, type CardSwapHandle } from '@/components/react-bits/CardSwap';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/features/landing/context/language-context';

function LocalPhoto({ file }: { file: File }) {
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const element = image.current;
    if (!element) return;
    const url = URL.createObjectURL(file);
    element.src = url;
    return () => {
      element.removeAttribute('src');
      URL.revokeObjectURL(url);
    };
  }, [file]);
  return <img ref={image} alt={file.name} className='min-h-0 flex-1 object-contain' />;
}
/** Local previews only: no remote fetches or document uploads are performed by this view. */
export function DocumentPreviewDeck({ files }: { files: File[] }) {
  const { language } = useLanguage();
  const vi = language === 'vi';
  const deck = useRef<CardSwapHandle>(null);
  const [active, setActive] = useState(0);
  const current = files[Math.min(active, files.length - 1)];
  if (files.length < 2) return null;
  return (
    <section
      className='rounded-2xl border bg-muted/20 p-4'
      aria-label={vi ? 'Xem bộ giấy tờ đã chọn' : 'Selected document previews'}
    >
      <div className='mb-3 flex items-center justify-between gap-3'>
        <p className='text-sm font-medium'>{vi ? 'Xem nhanh bộ giấy tờ' : 'Document preview'}</p>
        <span className='text-xs text-muted-foreground' aria-live='polite'>
          {active + 1} / {files.length}
        </span>
      </div>
      <div className='h-60 overflow-hidden rounded-xl'>
        <CardSwap
          ref={deck}
          width={350}
          height={220}
          autoplay={false}
          intro={false}
          skewAmount={0}
          cardDistance={18}
          verticalDistance={12}
          visibleCards={3}
          parallax={0}
          hoverSpread={0}
          onChange={setActive}
        >
          {files.map((file, i) => (
            <Card key={i} customClass='overflow-hidden border border-border bg-background'>
              <div className='flex h-full flex-col p-3'>
                {/^image\/(jpeg|png)$/.test(file.type) ? (
                  <LocalPhoto file={file} />
                ) : (
                  <div className='grid flex-1 place-items-center bg-muted'>
                    <FileText className='size-10 text-muted-foreground' />
                  </div>
                )}
                <p className='mt-2 truncate text-xs font-medium'>{file.name}</p>
              </div>
            </Card>
          ))}
        </CardSwap>
      </div>
      <div className='mt-3 flex items-center justify-between gap-3'>
        <p className='min-w-0 truncate text-xs text-muted-foreground' title={current?.name}>
          {current?.name}
        </p>
        <div className='flex shrink-0 gap-2'>
          <Button
            type='button'
            variant='outline'
            size='icon'
            aria-label={vi ? 'Giấy tờ trước' : 'Previous document'}
            onClick={() => deck.current?.prev()}
          >
            <ArrowLeft className='size-4' />
          </Button>
          <Button
            type='button'
            variant='outline'
            size='icon'
            aria-label={vi ? 'Giấy tờ tiếp theo' : 'Next document'}
            onClick={() => deck.current?.next()}
          >
            <ArrowRight className='size-4' />
          </Button>
        </div>
      </div>
      <p className='mt-2 text-[11px] text-muted-foreground'>
        {vi
          ? 'Bản xem trước. Trạng thái kiểm tra và nút bỏ từng tệp ở bên dưới.'
          : 'Preview only. Validation status and individual removal controls remain below.'}
      </p>
    </section>
  );
}
