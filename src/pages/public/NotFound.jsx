import { useNavigate } from 'react-router-dom';
import { Button, Result, Space } from 'antd';
import { useT } from '../../i18n/useT';

export default function NotFound() {
  const t = useT();
  const navigate = useNavigate();
  return (
    <div className="center-page">
      <Result
        status="404"
        title={<span className="serif" style={{ fontSize: 34 }}>{t('notFound.title')}</span>}
        subTitle={t('notFound.sub')}
        extra={
          <Space>
            <Button type="primary" onClick={() => navigate('/')}>{t('notFound.home')}</Button>
            <Button onClick={() => navigate('/discover')}>{t('notFound.discover')}</Button>
          </Space>
        }
      />
    </div>
  );
}
