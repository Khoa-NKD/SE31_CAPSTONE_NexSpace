import React from 'react';
import { Bot, Landmark, Layers, Network, ShoppingBag } from 'lucide-react';

const PARTNERS = [
  { name: 'GrabVentures', icon: Layers },
  { name: 'VNG Campus', icon: Network },
  { name: 'Shopee Hub', icon: ShoppingBag },
  { name: 'VinAI Research', icon: Bot },
  { name: 'Techcombank Agile', icon: Landmark }
];

export function PartnerLogos() {
  return (
    <div className='border-border/60 mx-auto mt-14 max-w-5xl border-t pt-8'>
      <p className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
        Powering flexible work for innovative teams across Southeast Asia
      </p>
      <div className='mt-6 flex flex-wrap items-center justify-center gap-8 opacity-80 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0 lg:gap-14'>
        {PARTNERS.map((partner) => {
          const Icon = partner.icon;
          return (
            <div
              key={partner.name}
              className='text-foreground hover:text-indigo-600 flex items-center gap-2 text-base font-semibold tracking-tight transition-colors'
            >
              <Icon className='text-[#4b41e1] h-5 w-5' />
              <span>{partner.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
