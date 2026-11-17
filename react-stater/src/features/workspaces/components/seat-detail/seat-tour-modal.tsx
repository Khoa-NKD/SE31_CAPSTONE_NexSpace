import { useState } from 'react';
import { X, RotateCcw, View, Eye, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose
} from '@/components/ui/dialog';

interface SeatTourModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SeatTourModal({ open, onOpenChange }: SeatTourModalProps) {
  const [activeAngle, setActiveAngle] = useState<'sunset' | 'ergonomic' | 'overhead'>('sunset');

  const angles = {
    sunset: {
      title: 'West Window View (Sunset Skyline)',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuABy9Ssp5A7AA8ZqBbHHPTnt3vwlcsSKqp5nCfD149Xth-1vi_F51o-4y5MuouSA2PfnQtiFGstpRJYzVrvlrReikmGDGHt9ZdjSl2fnL1bzsUXBHyYlTHiBmGO7uE8UpCSjLaAupxW7bvdBhIrKH54WvO0akAjrhlu0itjpDww5-xUfPB8rkWdJTdZmbnb_nBFYRcrEcgda8OCNO1HYbJZFQMOPyLpafuz_jQBTxGU'
    },
    ergonomic: {
      title: 'Ergonomic Task Seating & Herman Miller Aeron',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAoigSMii3ULjhpcVlAYsWAoiHuY_8eYStw4oUQUys8JhwuKdzWKUU1h48wHiWQc4TP0miTNXuk1eX_W4XQUZrwbD1SsTeKvNv6caK6hzUt1tZOTxTII6Vsk_5pMOhtNw4HHv0Xt5EY-5P8d06Y-iH7hPlxiwcHVkEMQjvOVmBf79ZTCrX-sE9dZtdJ0dyz4XHS1g1dp3tEb3zHqGWlP9t8sp20JKszz0yi_Y329SVg'
    },
    overhead: {
      title: 'Acoustic Ceiling & Ambient Lighting (<45dB)',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBCYip2-BnONrzrpM21YGF99a6gp9KdrsbXdndL15Ui28R8gPEZHlJDX9uZ-oBzMPsxLHvGuOyyzvozsMKzBK3dyhrHbBX96V0Vn63KV3uYeFv0DTn7bT7E0xgnuTLolMdimzyzcoAvXTLlrTajVX2__NHDyMjA6u2px3528SaMwIc36DzRp_7H_MKhAUXGFa78OTeE15QLeI05mixfwKzbLTI7ALHz7yq9miMI38_k'
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='bg-card border-border sm:max-w-[700px] gap-0 overflow-hidden rounded-2xl p-0 shadow-2xl [&>button]:hidden'>
        <div className='border-border/60 flex items-center justify-between border-b p-4'>
          <DialogHeader className='p-0 text-left'>
            <DialogTitle className='text-foreground flex items-center gap-2 text-base font-bold'>
              <View className='h-4 w-4 text-primary' />
              360° Virtual Tour &amp; Spatial View — Desk A-04
            </DialogTitle>
            <DialogDescription className='text-muted-foreground text-xs'>
              Inspect real workstation ergonomics, sightlines, and ambient illumination.
            </DialogDescription>
          </DialogHeader>
          <DialogClose asChild>
            <button
              type='button'
              aria-label='Close tour'
              className='text-muted-foreground hover:bg-muted hover:text-foreground flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors active:scale-95'
            >
              <X className='h-4 w-4' />
            </button>
          </DialogClose>
        </div>

        <div className='p-4 space-y-4'>
          {/* Main Visualizer Canvas */}
          <div className='relative h-[360px] w-full overflow-hidden rounded-xl border border-border bg-black'>
            <img
              src={angles[activeAngle].image}
              alt={angles[activeAngle].title}
              className='h-full w-full object-cover transition-opacity duration-300'
            />
            {/* View angle badge */}
            <div className='absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-background/85 px-3 py-1.5 text-xs font-semibold backdrop-blur-md'>
              <Sparkles className='h-3.5 w-3.5 text-primary' />
              <span>{angles[activeAngle].title}</span>
            </div>
            {/* 360 drag hint */}
            <div className='absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-background/80 px-2.5 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur-md'>
              <RotateCcw className='h-3 w-3' />
              <span>Interactive View</span>
            </div>
          </div>

          {/* Angle switcher buttons */}
          <div className='grid grid-cols-3 gap-2.5'>
            <button
              type='button'
              onClick={() => setActiveAngle('sunset')}
              className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border p-2 text-xs font-medium transition-all ${
                activeAngle === 'sunset'
                  ? 'border-primary bg-primary/10 text-primary font-semibold shadow-xs'
                  : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Eye className='h-3.5 w-3.5' />
              <span>Sunset View</span>
            </button>
            <button
              type='button'
              onClick={() => setActiveAngle('ergonomic')}
              className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border p-2 text-xs font-medium transition-all ${
                activeAngle === 'ergonomic'
                  ? 'border-primary bg-primary/10 text-primary font-semibold shadow-xs'
                  : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Eye className='h-3.5 w-3.5' />
              <span>Aeron Chair &amp; Desk</span>
            </button>
            <button
              type='button'
              onClick={() => setActiveAngle('overhead')}
              className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border p-2 text-xs font-medium transition-all ${
                activeAngle === 'overhead'
                  ? 'border-primary bg-primary/10 text-primary font-semibold shadow-xs'
                  : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Eye className='h-3.5 w-3.5' />
              <span>Acoustic Ceiling</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

