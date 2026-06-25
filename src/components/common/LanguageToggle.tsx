import { useTranslation } from 'react-i18next';
import { LANGUAGE_KEY } from '../../i18n';

type Lang = 'en' | 'vi';

export default function LanguageToggle() {
  const { i18n } = useTranslation();
  const current: Lang = i18n.language?.startsWith('vi') ? 'vi' : 'en';

  const handleSelect = (lang: Lang) => {
    if (lang === current) return;
    i18n.changeLanguage(lang);
    localStorage.setItem(LANGUAGE_KEY, lang);
  };

  const baseBtn =
    'flex items-center justify-center gap-1.5 px-3 py-1.5 font-bold text-sm border-2 border-black transition-all duration-100 select-none cursor-pointer';

  const activeStyle =
    'bg-black text-white translate-x-[2px] translate-y-[2px] shadow-none';

  const inactiveStyle =
    'bg-white text-black shadow-[3px_3px_0_0_#1A1D20] hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_0_#1A1D20] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none';

  return (
    <div className="inline-flex rounded-lg border-2 border-black shadow-[3px_3px_0_0_#1A1D20] overflow-hidden">
      <button
        type="button"
        aria-pressed={current === 'en'}
        onClick={() => handleSelect('en')}
        className={`${baseBtn} ${current === 'en' ? activeStyle : inactiveStyle}`}
      >
        <span aria-hidden="true">🇺🇸</span>
        <span>EN</span>
      </button>

      <div className="w-[2px] bg-black shrink-0" aria-hidden="true" />

      <button
        type="button"
        aria-pressed={current === 'vi'}
        onClick={() => handleSelect('vi')}
        className={`${baseBtn} ${current === 'vi' ? activeStyle : inactiveStyle}`}
      >
        <span aria-hidden="true">🇻🇳</span>
        <span>VI</span>
      </button>
    </div>
  );
}
