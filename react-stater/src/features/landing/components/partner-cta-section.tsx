import { Link } from '@tanstack/react-router';
import { ArrowUpRight } from '@/components/ui/hugeicons';
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
          <Link to='/organizer/apply' className='ns-primary-link'>
            {t('partner.cta')}
            <ArrowUpRight size={20} />
          </Link>
        </LandingReveal>
      </div>
    </section>
  );
}
