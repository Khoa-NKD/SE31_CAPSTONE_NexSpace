import { useState } from 'react';
import { Sun, RotateCcw } from 'lucide-react';
import { SeatTourModal } from './seat-tour-modal';

export function SeatPhotoGallery() {
  const [tourOpen, setTourOpen] = useState(false);

  return (
    <>
      <div className='bg-card border-border shadow-xs relative overflow-hidden rounded-xl border p-3'>
        <div className='grid h-[380px] grid-cols-1 gap-3 sm:h-[420px] md:grid-cols-3'>
          {/* Primary Main Shot */}
          <div className='group relative overflow-hidden rounded-lg md:col-span-2'>
            <img
              alt='Desk A-04 Executive Hot Desk Station'
              className='h-full w-full object-cover transition-transform duration-500 group-hover:scale-105'
              src='https://lh3.googleusercontent.com/aida-public/AB6AXuABy9Ssp5A7AA8ZqBbHHPTnt3vwlcsSKqp5nCfD149Xth-1vi_F51o-4y5MuouSA2PfnQtiFGstpRJYzVrvlrReikmGDGHt9ZdjSl2fnL1bzsUXBHyYlTHiBmGO7uE8UpCSjLaAupxW7bvdBhIrKH54WvO0akAjrhlu0itjpDww5-xUfPB8rkWdJTdZmbnb_nBFYRcrEcgda8OCNO1HYbJZFQMOPyLpafuz_jQBTxGU'
            />
            {/* Overlay Badges */}
            <div className='absolute top-4 left-4 flex flex-wrap gap-2'>
              <span className='inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50/90 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 shadow-sm backdrop-blur-md dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400'>
                <span className='h-2 w-2 rounded-full bg-emerald-500 animate-pulse' />
                Hot Desk • Live Available
              </span>
              <span className='bg-background/85 text-foreground inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md border border-border/50'>
                <Sun className='text-amber-500 h-3 w-3' />
                Level 14 • Window View (Facing West)
              </span>
            </div>

            {/* 360 Virtual Tour Button */}
            <button
              type='button'
              onClick={() => setTourOpen(true)}
              className='bg-background/90 border-border text-foreground hover:bg-muted active:scale-95 absolute bottom-4 left-4 inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold shadow-md backdrop-blur-md transition-all'
            >
              <RotateCcw className='text-primary h-3.5 w-3.5' />
              <span>360° Virtual Tour &amp; AR Preview</span>
            </button>
          </div>

          {/* Side Secondary Shots Stack */}
          <div className='hidden grid-rows-2 gap-3 md:grid'>
            {/* Side 1 */}
            <div className='group relative overflow-hidden rounded-lg'>
              <img
                alt='Herman Miller Aeron and electric height adjustment'
                className='h-full w-full object-cover transition-transform duration-500 group-hover:scale-105'
                src='https://lh3.googleusercontent.com/aida-public/AB6AXuAoigSMii3ULjhpcVlAYsWAoiHuY_8eYStw4oUQUys8JhwuKdzWKUU1h48wHiWQc4TP0miTNXuk1eX_W4XQUZrwbD1SsTeKvNv6caK6hzUt1tZOTxTII6Vsk_5pMOhtNw4HHv0Xt5EY-5P8d06Y-iH7hPlxiwcHVkEMQjvOVmBf79ZTCrX-sE9dZtdJ0dyz4XHS1g1dp3tEb3zHqGWlP9t8sp20JKszz0yi_Y329SVg'
              />
              <span className='bg-background/80 text-foreground border-border/60 absolute bottom-2 left-2 rounded border px-2 py-0.5 text-[10px] font-medium backdrop-blur-xs'>
                Ergonomic Suite
              </span>
            </div>

            {/* Side 2 */}
            <div className='group relative overflow-hidden rounded-lg'>
              <img
                alt='Acoustic ceiling baffles and lighting'
                className='h-full w-full object-cover transition-transform duration-500 group-hover:scale-105'
                src='https://lh3.googleusercontent.com/aida-public/AB6AXuBCYip2-BnONrzrpM21YGF99a6gp9KdrsbXdndL15Ui28R8gPEZHlJDX9uZ-oBzMPsxLHvGuOyyzvozsMKzBK3dyhrHbBX96V0Vn63KV3uYeFv0DTn7bT7E0xgnuTLolMdimzyzcoAvXTLlrTajVX2__NHDyMjA6u2px3528SaMwIc36DzRp_7H_MKhAUXGFa78OTeE15QLeI05mixfwKzbLTI7ALHz7yq9miMI38_k'
              />
              <span className='bg-background/80 text-foreground border-border/60 absolute bottom-2 left-2 rounded border px-2 py-0.5 text-[10px] font-medium backdrop-blur-xs'>
                Acoustic Zone (&lt;45dB)
              </span>
              <button
                type='button'
                onClick={() => setTourOpen(true)}
                className='bg-background/90 text-foreground border-border/70 hover:bg-muted absolute right-2 bottom-2 cursor-pointer rounded border px-2.5 py-1 text-[10px] font-semibold'
              >
                +4 Photos
              </button>
            </div>
          </div>
        </div>
      </div>

      <SeatTourModal open={tourOpen} onOpenChange={setTourOpen} />
    </>
  );
}

