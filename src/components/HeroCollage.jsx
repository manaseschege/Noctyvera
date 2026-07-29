import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthedImage } from './AuthedFile';
import { fallbackDataUri } from './placeholder';
import { coverOf, toFetchPath } from '../api/members';

/**
 * The floating card stack on the landing hero.
 *
 * Photos come from real members' free preview images. The browse endpoint
 * is currently authenticated, so a signed-out visitor gets nothing back and
 * the cards fall through to gradient placeholders — the layout is identical
 * either way. Once /members is public, real faces appear here for everyone
 * with no change to this file.
 */
const SLOTS = [
  { top: 0, right: 40, width: 232, height: 310, rotate: 0 },
  { top: 150, right: 268, width: 196, height: 260, rotate: -3 },
  { top: 292, right: 78, width: 208, height: 224, rotate: 2 },
];

export default function HeroCollage({ members = [] }) {
  return (
    <div className="hero-collage">
      {SLOTS.map((slot, i) => {
        const member = members[i];
        const path = toFetchPath(coverOf(member));
        const { rotate, ...box } = slot;

        return (
          <motion.div
            key={member?.userId ?? i}
            className="hero-card"
            style={box}
            initial={{ opacity: 0, y: 40, rotate }}
            animate={{ opacity: 1, y: 0, rotate }}
            transition={{ delay: 0.25 + i * 0.14, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            {member ? (
              <Link to={`/m/${member.userId}`} style={{ display: 'block', width: '100%', height: '100%' }}>
                {path ? (
                  <AuthedImage
                    path={path}
                    alt={member.username}
                    seed={member.userId}
                    label={member.username}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <img src={fallbackDataUri(member.userId, member.username)} alt={member.username} />
                )}
                <div className="hero-card-label">
                  <div>{member.username}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 400 }}>
                    {[member.city, member.age].filter(Boolean).join(' · ')}
                  </div>
                </div>
                {member.liveNow && (
                  <span className="pill pill-live" style={{ position: 'absolute', top: 12, left: 12, zIndex: 3 }}>
                    <span className="live-dot" /> LIVE
                  </span>
                )}
              </Link>
            ) : (
              <img src={fallbackDataUri(`hero-${i}`, 'N')} alt="" />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
