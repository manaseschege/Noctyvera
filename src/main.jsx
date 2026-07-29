import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import App from './App';
import AppProviders from './AppProviders';
import { I18nProvider } from './i18n';
import { useAuth } from './store/auth';
import './styles/global.css';

dayjs.extend(relativeTime);

// Resolve the session before the first paint so guards don't flicker.
useAuth.getState().boot();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProvider>
      <AppProviders>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AppProviders>
    </I18nProvider>
  </StrictMode>,
);
