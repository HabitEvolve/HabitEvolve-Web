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

  // Segmented control: one glass track, the active segment carries the deep
  // fill. The flag emoji are gone (§4 forbids emoji-as-icon) — "EN"/"VI" is
  // the whole message, and the two-letter codes keep the control compact.
  const baseBtn =
    'flex items-center justify-center px-3 py-1.5 font-display font-semibold text-sm ' +
    'rounded-sky-chip transition select-none cursor-pointer';

  const activeStyle =
    'bg-linear-to-b from-sky-deep-lo to-sky-deep text-white shadow-sky-fill';

  const inactiveStyle = 'text-sky-ink-2 hover:text-sky-deep hover:bg-white/60';

  return (
    <div className="inline-flex gap-0.5 p-1 sky-glass-chip">
      <button
        type="button"
        aria-pressed={current === 'en'}
        onClick={() => handleSelect('en')}
        className={`${baseBtn} ${current === 'en' ? activeStyle : inactiveStyle}`}
      >
        EN
      </button>

      <button
        type="button"
        aria-pressed={current === 'vi'}
        onClick={() => handleSelect('vi')}
        className={`${baseBtn} ${current === 'vi' ? activeStyle : inactiveStyle}`}
      >
        VI
      </button>
    </div>
  );
}
