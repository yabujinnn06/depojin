import { motion } from "framer-motion";

type Props = { size?: number; className?: string };

export default function DepoJinLogo({ size = 56, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" className={className} aria-label="Depojin">
      <defs>
        <radialGradient id="dj-halo" cx="50%" cy="42%" r="55%">
          <stop offset="0%" stopColor="#FFE2CC" stopOpacity="1" />
          <stop offset="45%" stopColor="#BF6F34" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#BF6F34" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="dj-skin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFD7B0" />
          <stop offset="100%" stopColor="#BF6F34" />
        </linearGradient>
        <linearGradient id="dj-turban" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#16385A" />
          <stop offset="100%" stopColor="#0A1E33" />
        </linearGradient>
        <linearGradient id="dj-chest" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7A4419" />
          <stop offset="100%" stopColor="#3B210B" />
        </linearGradient>
        <linearGradient id="dj-band" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#BF6F34" />
          <stop offset="100%" stopColor="#FFD7B0" />
        </linearGradient>
        <radialGradient id="dj-jewel" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF6C8" />
          <stop offset="60%" stopColor="#F2C44C" />
          <stop offset="100%" stopColor="#A0701B" />
        </radialGradient>
        <filter id="dj-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>

      <motion.circle
        cx="64" cy="50" r="44" fill="url(#dj-halo)"
        animate={{ scale: [1, 1.07, 1], opacity: [0.55, 0.85, 0.55] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
      />

      <g>
        <rect x="22" y="86" width="84" height="32" rx="3" fill="url(#dj-chest)" />
        <rect x="22" y="86" width="84" height="6" fill="#5C3214" />
        <rect x="22" y="106" width="84" height="2" fill="#2A1808" />
        <line x1="38" y1="92" x2="38" y2="118" stroke="#3B210B" strokeWidth="1.2" opacity="0.6" />
        <line x1="64" y1="92" x2="64" y2="118" stroke="#3B210B" strokeWidth="1.2" opacity="0.6" />
        <line x1="90" y1="92" x2="90" y2="118" stroke="#3B210B" strokeWidth="1.2" opacity="0.6" />
        <rect x="22" y="86" width="84" height="32" rx="3" fill="none" stroke="#0F2A44" strokeWidth="2" />
        <g>
          <rect x="58" y="92" width="12" height="14" rx="1.5" fill="#BF6F34" stroke="#5C3214" strokeWidth="0.8" />
          <circle cx="64" cy="98" r="1.6" fill="#3B210B" />
          <rect x="63" y="99" width="2" height="4" fill="#3B210B" />
        </g>
        <text x="64" y="116" textAnchor="middle"
          style={{ fontFamily: "Fraunces, serif", fontSize: 7, fontWeight: 700, letterSpacing: 2 }}
          fill="#BF6F34">DEPOJIN</text>
      </g>

      <motion.path
        d="M64 86 C 56 78, 76 72, 64 60 C 52 50, 76 42, 64 30 C 56 22, 72 16, 64 8"
        stroke="#BF6F34" strokeWidth="2" fill="none" strokeLinecap="round"
        strokeDasharray="4 6" opacity="0.65"
        animate={{ strokeDashoffset: [0, -40] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
      />
      <motion.path
        d="M64 80 C 60 74, 68 68, 64 62"
        stroke="#FFD7B0" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.45"
        animate={{ pathLength: [0, 1, 0] }}
        transition={{ duration: 2.6, repeat: Infinity }}
      />

      <motion.g
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 3.0, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      >
        <ellipse cx="64" cy="50" rx="22" ry="22" fill="url(#dj-skin)" />
        <ellipse cx="56" cy="56" rx="3.5" ry="2" fill="#BF6F34" opacity="0.45" />
        <ellipse cx="72" cy="56" rx="3.5" ry="2" fill="#BF6F34" opacity="0.45" />

        <path d="M40 50 Q 64 18 88 50 Q 88 40 80 32 Q 64 22 48 32 Q 40 40 40 50 Z" fill="url(#dj-turban)" />
        <path d="M44 38 Q 64 24 84 38" stroke="url(#dj-band)" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M40 50 Q 50 44 64 44 Q 78 44 88 50 L 88 52 Q 78 46 64 46 Q 50 46 40 52 Z" fill="#0A1E33" />

        <motion.circle
          cx="64" cy="34" r="3.5" fill="url(#dj-jewel)" filter="url(#dj-glow)"
          animate={{ scale: [1, 1.25, 1], opacity: [1, 0.7, 1] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        />
        <circle cx="64" cy="34" r="1.4" fill="#FFF6C8" />

        <path d="M83 30 L 88 22 Q 90 25 89 30 L 86 36 Z" fill="url(#dj-band)" opacity="0.85" />

        <motion.path d="M48 45 Q 53 42 58 45" stroke="#0F2A44" strokeWidth="1.6" fill="none" strokeLinecap="round"
          animate={{ y: [0, -0.5, 0] }} transition={{ duration: 2.2, repeat: Infinity }} />
        <motion.path d="M70 45 Q 75 42 80 45" stroke="#0F2A44" strokeWidth="1.6" fill="none" strokeLinecap="round"
          animate={{ y: [0, -0.5, 0] }} transition={{ duration: 2.2, repeat: Infinity, delay: 0.1 }} />

        <motion.g
          animate={{ scaleY: [1, 0.08, 1] }}
          transition={{ duration: 4.0, repeat: Infinity, repeatDelay: 2.2, times: [0, 0.5, 1] }}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        >
          <ellipse cx="54" cy="54" rx="2.6" ry="3.2" fill="#0F2A44" />
          <ellipse cx="74" cy="54" rx="2.6" ry="3.2" fill="#0F2A44" />
          <circle cx="54.7" cy="53.2" r="0.8" fill="#fff" />
          <circle cx="74.7" cy="53.2" r="0.8" fill="#fff" />
        </motion.g>

        <path d="M52 66 Q 56 62 60 66 Q 64 70 68 66 Q 72 62 76 66" stroke="#0F2A44" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M58 70 Q 64 76 70 70" stroke="#0F2A44" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </motion.g>

      <motion.g>
        <motion.circle cx="92" cy="42" r="1.8" fill="#BF6F34"
          animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2.6, repeat: Infinity, delay: 0.3 }} />
        <motion.circle cx="32" cy="58" r="1.4" fill="#BF6F34"
          animate={{ y: [0, -10, 0], opacity: [0.3, 0.9, 0.3] }}
          transition={{ duration: 3.2, repeat: Infinity, delay: 0.9 }} />
        <motion.circle cx="98" cy="72" r="1.0" fill="#FFD7B0"
          animate={{ y: [0, -6, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.2, repeat: Infinity, delay: 0.2 }} />
        <motion.circle cx="22" cy="82" r="0.8" fill="#FFD7B0"
          animate={{ y: [0, -5, 0], opacity: [0.3, 0.9, 0.3] }}
          transition={{ duration: 2.0, repeat: Infinity, delay: 1.1 }} />
        <motion.path d="M14 28 L 17 25 L 14 22 L 11 25 Z" fill="#FFD7B0"
          animate={{ rotate: [0, 360], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          style={{ transformBox: "fill-box", transformOrigin: "center" }} />
        <motion.path d="M112 60 L 115 57 L 112 54 L 109 57 Z" fill="#FFD7B0"
          animate={{ rotate: [0, -360], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 7, repeat: Infinity, ease: "linear", delay: 1 }}
          style={{ transformBox: "fill-box", transformOrigin: "center" }} />
      </motion.g>
    </svg>
  );
}
