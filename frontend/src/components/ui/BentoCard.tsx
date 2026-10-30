import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Maximize2 } from "lucide-react";

export function BentoCard({
  title,
  children,
  span = 1,
  accent,
  expandable = false,
  expandedContent,
  id,
}: {
  title: string;
  children: ReactNode;
  span?: 1 | 2 | 3;
  accent?: "blue" | "gold" | "neutral";
  expandable?: boolean;
  expandedContent?: ReactNode;
  id?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const layoutId = id || `bento-card-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const spanClass = span === 3 ? "col-span-3" : span === 2 ? "col-span-2" : "col-span-1";

  const isClickable = expandable || Boolean(expandedContent);

  return (
    <>
      <motion.div
        layoutId={isClickable ? layoutId : undefined}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={isClickable ? { y: -3, scale: 1.005 } : undefined}
        transition={{ duration: 0.25, ease: "easeOut" }}
        onClick={isClickable ? () => setIsOpen(true) : undefined}
        className={`glass-panel p-5 ${spanClass} ${isClickable ? "cursor-pointer group hover:border-sx-blue/50 transition-all" : ""}`}
      >
        <div className="mb-3 flex items-center justify-between">
          <motion.h3
            layoutId={isClickable ? `title-${layoutId}` : undefined}
            className="text-xs font-semibold uppercase tracking-wider text-slate-400 group-hover:text-sx-blue transition-colors flex items-center gap-1.5"
          >
            {title}
            {isClickable && (
              <Maximize2 size={10} className="opacity-0 group-hover:opacity-70 transition-opacity" />
            )}
          </motion.h3>
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

      <AnimatePresence>
        {isClickable && isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md"
            />
            <motion.div
              layoutId={layoutId}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-[#e2d9cc] dark:border-slate-800 bg-[#fefbf4] dark:bg-[#070c18] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#e2d9cc] dark:border-slate-800 mb-4">
                <motion.h3
                  layoutId={`title-${layoutId}`}
                  className="text-base font-bold uppercase tracking-wider text-[#282937] dark:text-white"
                >
                  {title}
                </motion.h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e2d9cc] dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                transition={{ delay: 0.1 }}
                className="space-y-4"
              >
                {expandedContent || children}
              </motion.div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
