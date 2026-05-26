import { motion } from "framer-motion";

type Props = { size?: number; className?: string };

export default function DepoJinLogo({ size = 40, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-label="Depojin">
      <defs>
        <radialGradient id="djl-glow" cx="50%" cy="55%" r="50%">
          <stop offset="0%" stopColor="#FFE2CC" stopOpacity="0.95" />
          <stop offset="60%" stopColor="#BF6F34" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#BF6F34" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="djl-jin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFD7B0" />
          <stop offset="100%" stopColor="#BF6F34" />
        </linearGradient>
        <linearGradient id="djl-box" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1B3956" />
          <stop offset="100%" stopColor="#0A1E33" />
        </linearGradient>
      </defs>

      <motion.circle
        cx="32" cy="24" r="22" fill="url(#djl-glow)"
        animate={{ scale: [1, 1.08, 1], opacity: [0.55, 0.85, 0.55] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
      />

      <g>
        <rect x="14" y="44" width="36" height="16" rx="2" fill="url(#djl-box)" />
        <rect x="14" y="44" width="36" height="3" fill="#16385A" />
        <line x1="14" y1="52" x2="50" y2="52" stroke="#BF6F34" strokeWidth="0.8" opacity="0.7" />
        <text x="32" y="58" textAnchor="middle"
          style={{ fontFamily: "Fraunces, serif", fontSize: 8, fontWeight: 700 }}
          fill="#BF6F34">DEPOJIN</text>
      </g>

      <motion.path
        d="M32 44 C 26 38, 38 32, 30 26 C 22 20, 38 14, 32 8"
        stroke="#BF6F34" strokeWidth="1.4" fill="none" strokeLinecap="round"
        strokeDasharray="3 4"
        animate={{ strokeDashoffset: [0, -28] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
        opacity="0.65"
      />

      <motion.g
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      >
        <ellipse cx="32" cy="22" rx="9" ry="9.5" fill="url(#djl-jin)" />
        <path d="M22 21 Q32 8 42 21 L42 19 Q32 9 22 19 Z" fill="#0F2A44" />
        <ellipse cx="32" cy="19" rx="3.2" ry="2.4" fill="#16385A" />
        <motion.circle
          cx="32" cy="16.5" r="1.2" fill="#FFD700"
          animate={{ opacity: [1, 0.55, 1], scale: [1, 1.25, 1] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
        <motion.g
          animate={{ scaleY: [1, 0.1, 1] }}
          transition={{ duration: 3.6, repeat: Infinity, repeatDelay: 1.4, times: [0, 0.5, 1] }}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        >
          <ellipse cx="29" cy="23" rx="1.1" ry="1.4" fill="#0F2A44" />
          <ellipse cx="35" cy="23" rx="1.1" ry="1.4" fill="#0F2A44" />
        </motion.g>
        <path d="M28 27 Q32 29 36 27" stroke="#0F2A44" strokeWidth="1" fill="none" strokeLinecap="round" />
      </motion.g>

      <motion.circle
        cx="48" cy="22" r="1" fill="#BF6F34"
        animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2.4, repeat: Infinity, delay: 0.4 }}
      />
      <motion.circle
        cx="18" cy="28" r="0.8" fill="#BF6F34"
        animate={{ y: [0, -6, 0], opacity: [0.3, 0.9, 0.3] }}
        transition={{ duration: 2.8, repeat: Infinity, delay: 0.9 }}
      />
      <motion.circle
        cx="44" cy="36" r="0.6" fill="#FFD7B0"
        animate={{ y: [0, -3, 0], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2.0, repeat: Infinity, delay: 0.2 }}
      />
    </svg>
  );
}
