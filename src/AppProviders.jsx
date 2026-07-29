import { App as AntApp, ConfigProvider } from 'antd';
import { antdThemeConfig } from './theme';
import { useI18n } from './i18n/useT';

/** ConfigProvider sits inside I18nProvider so antd follows the language. */
export default function AppProviders({ children }) {
  const { antdLocale } = useI18n();
  return (
    <ConfigProvider theme={antdThemeConfig} locale={antdLocale}>
      <AntApp>{children}</AntApp>
    </ConfigProvider>
  );
}
