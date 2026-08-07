import { Tooltip } from 'antd';
import { CheckCircleFilled } from '@ant-design/icons';
import { useT } from '../i18n/useT';

/**
 * Marks an account whose identity documents were checked by a human.
 *
 * <p>Deliberately says "identity verified" and nothing more. It is not an
 * endorsement, a quality rating, or a statement about anything the account
 * posts — those would be claims the platform has not actually checked, and a
 * badge people read as approval is worse than no badge.
 */
export default function VerifiedBadge({ size = 13, style }) {
  const t = useT();
  return (
    <Tooltip title={t('common.verifiedTip')}>
      <CheckCircleFilled
        aria-label={t('common.verified')}
        style={{ color: 'var(--gold)', fontSize: size, marginInlineStart: 6, ...style }}
      />
    </Tooltip>
  );
}
