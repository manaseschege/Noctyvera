import { useNavigate } from 'react-router-dom';
import { Button, Steps } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import Brand from '../../components/Brand';
import { NEXT_STEP } from '../../api/config';
import { useAuth } from '../../store/auth';
import LanguageToggle from '../../components/LanguageToggle';
import { useT } from '../../i18n/useT';

const ORDER = [NEXT_STEP.CREATE_PROFILE, NEXT_STEP.SUBMIT_KYC, NEXT_STEP.AWAIT_REVIEW];

/** Frame for the three onboarding screens, with the server's step highlighted. */
export default function OnboardingShell({ children, width = 640 }) {
  const t = useT();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // DONE but still on the funnel means the activation payment is outstanding.
  const step =
    user?.nextStep === NEXT_STEP.RESUBMIT_KYC
      ? 1
      : user?.nextStep === NEXT_STEP.DONE
        ? 3
        : Math.max(0, ORDER.indexOf(user?.nextStep));

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="site-header">
        <div className="shell site-header-inner">
          <Brand />
          <div style={{ flex: 1 }} />
          <LanguageToggle />
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={async () => {
              await logout();
              navigate('/');
            }}
            style={{ color: 'var(--text-muted)' }}
          >
            {t('common.signOut')}
          </Button>
        </div>
      </header>

      <main style={{ flex: 1, padding: '44px 20px 80px' }}>
        <div style={{ maxWidth: width, margin: '0 auto' }}>
          <Steps
            size="small"
            current={step}
            style={{ marginBottom: 34 }}
            items={[
              { title: t('onboarding.stepProfile') },
              { title: t('onboarding.stepVerify') },
              { title: t('onboarding.stepReview') },
              { title: t('onboarding.stepActivate') },
            ]}
          />
          {children}
        </div>
      </main>
    </div>
  );
}
