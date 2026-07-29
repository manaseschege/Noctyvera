import { Dropdown, Segmented } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { LANGUAGES } from '../i18n/context';
import { useI18n } from '../i18n/useT';

/**
 * English / French switch.
 * `variant="segmented"` for roomy surfaces, `"compact"` for a header.
 */
export default function LanguageToggle({ variant = 'compact' }) {
  const { lang, setLang, t } = useI18n();

  if (variant === 'segmented') {
    return (
      <Segmented
        size="small"
        value={lang}
        onChange={setLang}
        options={LANGUAGES.map((l) => ({ value: l.code, label: l.short }))}
        aria-label={t('nav.language')}
      />
    );
  }

  return (
    <Dropdown
      trigger={['click']}
      placement="bottomRight"
      menu={{
        selectable: true,
        selectedKeys: [lang],
        items: LANGUAGES.map((l) => ({ key: l.code, label: l.label })),
        onClick: ({ key }) => setLang(key),
      }}
    >
      <button
        type="button"
        aria-label={t('nav.language')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'transparent',
          border: '1px solid var(--line)',
          borderRadius: 9,
          padding: '5px 10px',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          font: 'inherit',
          fontSize: 12.5,
          fontWeight: 600,
          letterSpacing: '0.04em',
        }}
      >
        <GlobalOutlined />
        {LANGUAGES.find((l) => l.code === lang)?.short}
      </button>
    </Dropdown>
  );
}
