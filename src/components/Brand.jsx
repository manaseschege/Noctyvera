import { Link } from 'react-router-dom';
import { BRAND } from '../brand';

export default function Brand({ to = '/', compact = false }) {
  return (
    <Link to={to} className="brand" aria-label={`${BRAND.name} home`}>
      <img className="brand-logo" src={BRAND.logo} alt="" width={34} height={34} />
      {!compact && <span className="brand-word">{BRAND.name}</span>}
    </Link>
  );
}
