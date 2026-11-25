import { Link } from '@tanstack/react-router';
import { Handshake } from 'lucide-react';
import { useLanguage } from '../context/language-context';
import { LandingReveal } from './landing-effects';
export function PartnerCtaSection() {
  const { t, language } = useLanguage();
  return (
    <section id='list-space' className='ns-partner scroll-mt-20'>
      <div className='ns-shell'>
        <LandingReveal className='ns-partner-panel'>
          <div>
            <p className='ns-eyebrow'>
              {language === 'vi' ? 'DÀNH CHO ĐỐI TÁC NEXSPACE' : 'FOR NEXSPACE PARTNERS'}
            </p>
            <h2>{t('partner.title')}</h2>
            <p>{t('partner.subtitle')}</p>
          </div>
          <Link to='/organizer/apply' className='ns-primary-link group'>
            {t('partner.cta')}
            <Handshake size={20} className='transition-transform duration-200 group-hover:scale-110' />
          </Link>
        </LandingReveal>
      </div>
    </section>
  );
}
