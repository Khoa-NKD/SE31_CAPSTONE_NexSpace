import { useEffect, useState } from 'react';
import { ChevronUp } from 'lucide-react';
import { useLanguage } from '../context/language-context';

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

export function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);
  const { language } = useLanguage();
  const vi = language === 'vi';

  useEffect(() => {
    const handleScroll = () => {
      // Show button once user scrolls past 300px
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Check initial scroll position
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <button
      type='button'
      onClick={scrollToTop}
      aria-label={vi ? 'Trở lại đầu trang' : 'Back to top'}
      title={vi ? 'Trở lại đầu trang' : 'Back to top'}
      className='fixed bottom-24 right-5 sm:bottom-22 sm:right-6 z-30 group flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-indigo-500/40 bg-[#121429]/90 text-indigo-200 shadow-xl shadow-indigo-950/70 backdrop-blur-md transition-all duration-300 hover:scale-110 hover:border-indigo-400 hover:bg-indigo-600/40 hover:text-white active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 cursor-pointer animate-in fade-in zoom-in-95 duration-200'
    >
      <ChevronUp className='h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-200 group-hover:-translate-y-0.5' />
      <span className='sr-only'>{vi ? 'Trở lại đầu trang' : 'Back to top'}</span>
    </button>
  );
}
