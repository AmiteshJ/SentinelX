import type { ReactNode } from "react";
import { motion } from "framer-motion";

export function BentoCard({
  title,
  children,
  span = 1,
  accent,
}: {
  title: string;
  children: ReactNode;
  span?: 1 | 2 | 3;
  accent?: "blue" | "gold" | "neutral";
}) {
  const spanClass = span === 3 ? "col-span-3" : span === 2 ? "col-span-2" : "col-span-1";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`glass-panel p-5 ${spanClass}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
        {accent && (
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              accent === "blue" ? "bg-sx-blue" : accent === "gold" ? "bg-sx-gold" : "bg-slate-500"
            }`}
          />
        )}
      </div>
      {children}
    </motion.div>
  );
}
