import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Radio, X } from "lucide-react";
import { ChatMesaji, SayimWS, SesMesaji } from "../lib/ws";
import { useAuth } from "../lib/auth";
import TelsizPanel from "./TelsizPanel";

type Props = {
  ws: SayimWS | null;
  son: ChatMesaji | SesMesaji | null;
  oturumId: number;
};

export default function TelsizFloating({ ws, son, oturumId }: Props) {
  const { user } = useAuth();
  const [acik, setAcik] = useState(false);
  const [okunmamis, setOkunmamis] = useState(0);

  useEffect(() => {
    if (!son) return;
    if (son.kullanici_id === user?.id) return;
    if (acik) return;
    setOkunmamis(n => Math.min(99, n + 1));
  }, [son, acik, user?.id]);

  useEffect(() => {
    if (acik) setOkunmamis(0);
  }, [acik]);

  return (
    <>
      <button
        onClick={() => setAcik(true)}
        className="fixed bottom-4 right-4 z-[60] h-14 w-14 rounded-full bg-deep text-accent shadow-2xl shadow-deep/40 flex items-center justify-center hover:bg-deeper transition active:scale-95"
        title="Telsiz"
      >
        <Radio size={22} />
        {okunmamis > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[22px] h-5 px-1 rounded-full bg-bad text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-cream">
            {okunmamis}
          </span>
        )}
      </button>

      <AnimatePresence>
        {acik && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setAcik(false)}
            className="fixed inset-0 z-[70] bg-deep/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4"
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", damping: 22, stiffness: 220 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <div className="flex justify-between items-center mb-2 px-1">
                <span className="text-white/80 text-sm font-medium flex items-center gap-1.5">
                  <Radio size={14} className="text-accent" /> Telsiz
                </span>
                <button onClick={() => setAcik(false)}
                  className="p-2 rounded-md bg-white/10 text-white hover:bg-white/20">
                  <X size={16} />
                </button>
              </div>
              <TelsizPanel ws={ws} son={son} oturumId={oturumId} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
