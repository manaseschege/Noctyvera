import { useCallback, useEffect, useState } from 'react';
import { App, Button, Empty, Input, Spin, Table, Tag } from 'antd';
import { CopyOutlined, GiftOutlined, TeamOutlined, WalletOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { referralApi } from '../../api';
import { formatDisplay } from '../../api/currency';
import { PageHeader, StatCard } from '../../components/ui';
import { useI18n } from '../../i18n/useT';

/**
 * The invite screen.
 *
 * Two numbers matter and they are deliberately separate: how many people used
 * the code, and how many of those actually bought something. Only the second
 * earned anything, and collapsing them into one flattering total would make the
 * programme feel broken the first time somebody invited ten friends and saw no
 * credit.
 */
export default function Referrals() {
  const { t, lang } = useI18n();
  const { message } = App.useApp();

  const [summary, setSummary] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([
        referralApi.summary(),
        referralApi.credit().catch(() => ({ content: [] })),
      ]);
      setSummary(s);
      setLedger(c.content ?? []);
    } catch (e) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    load();
  }, [load]);

  const copy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success(t('referrals.copied', { what: label }));
    } catch {
      // Clipboard is blocked outside a secure context, and on a bare-IP dev
      // server that is most of the time. The text is selectable either way.
      message.info(t('referrals.copyFailed'));
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;
  if (!summary) return null;

  const money = (display) => formatDisplay(display, summary.currency, lang);

  return (
    <>
      <PageHeader
        title={t('referrals.title')}
        subtitle={t('referrals.subtitle', { bonus: money(summary.bonusPerReferralDisplay) })}
      />

      <div className="stat-row">
        <StatCard
          label={t('referrals.credit')}
          value={money(summary.creditBalanceDisplay)}
          icon={<WalletOutlined />}
          hint={t('referrals.creditHint')}
        />
        <StatCard
          label={t('referrals.invited')}
          value={summary.invited}
          icon={<TeamOutlined />}
          hint={t('referrals.invitedHint')}
        />
        <StatCard
          label={t('referrals.converted')}
          value={summary.converted}
          icon={<GiftOutlined />}
          hint={t('referrals.convertedHint')}
        />
      </div>

      <div className="glass" style={{ padding: 24, marginTop: 22, maxWidth: 620 }}>
        <div className="eyebrow">{t('referrals.yourCode')}</div>
        <div className="referral-code">{summary.code}</div>

        <div style={{ marginTop: 18 }}>
          <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>{t('referrals.yourLink')}</div>
          <Input.Group compact style={{ display: 'flex' }}>
            <Input readOnly value={summary.shareLink} onFocus={(e) => e.target.select()} />
            <Button icon={<CopyOutlined />} onClick={() => copy(summary.shareLink, t('referrals.link'))}>
              {t('referrals.copy')}
            </Button>
          </Input.Group>
        </div>

        <p className="faint" style={{ fontSize: 12.5, lineHeight: 1.7, margin: '18px 0 0' }}>
          {t('referrals.explain', { bonus: money(summary.bonusPerReferralDisplay) })}
        </p>
      </div>

      <h2 className="section-title" style={{ margin: '30px 0 14px' }}>{t('referrals.ledger')}</h2>

      {ledger.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('referrals.noCreditYet')} />
      ) : (
        <Table
          dataSource={ledger}
          rowKey="id"
          pagination={false}
          size="middle"
          columns={[
            {
              title: t('referrals.what'),
              dataIndex: 'reason',
              render: (reason, row) => (
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{t(`enums.credit.${reason}`)}</div>
                  {row.referredUsername && (
                    <div className="faint" style={{ fontSize: 12 }}>@{row.referredUsername}</div>
                  )}
                </div>
              ),
            },
            {
              title: t('referrals.when'),
              dataIndex: 'createdAt',
              render: (d) => <span className="muted">{dayjs(d).format('D MMM YYYY')}</span>,
            },
            {
              title: t('referrals.amount'),
              dataIndex: 'amountDisplay',
              align: 'right',
              render: (display, row) => (
                // Sign carries the meaning here, so it is coloured rather than
                // buried in a label.
                <Tag color={row.amountMinor >= 0 ? 'green' : 'default'} style={{ marginInlineEnd: 0 }}>
                  {row.amountMinor >= 0 ? '+' : ''}{money(display)}
                </Tag>
              ),
            },
          ]}
        />
      )}
    </>
  );
}
