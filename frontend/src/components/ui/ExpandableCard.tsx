import React, { useState, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

export interface ExpandableCardProps {
  id?: string;
  imageSrc?: string;
  visual?: ReactNode;
  icon?: any;
  title: string;
  subtitle?: string;
  tag?: string;
  description?: string;
  content?: ReactNode;
  children?: ReactNode;
  cardClassName?: string;
  expandedClassName?: string;
  accentColor?: string;
  actionText?: string;
  actionLink?: string;
  onAction?: () => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ExpandableCard({
  id,
  imageSrc,
  visual,
  icon: IconComponent,
  title,
  subtitle,
  tag,
  description,
  content,
  children,
  cardClassName = "",
  expandedClassName = "",
  accentColor,
  actionText,
  actionLink,
  onAction,
  isOpen: controlledIsOpen,
  onOpenChange,
}: ExpandableCardProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const setOpen = (val: boolean) => {
    if (!isControlled) {
      setInternalIsOpen(val);
    }
    onOpenChange?.(val);
  };

  const layoutId = id || `expandable-card-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const subText = subtitle || tag;

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      // Lock background scroll
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const renderIcon = () => {
    if (!IconComponent) return null;
    if (React.isValidElement(IconComponent)) return IconComponent;
    const Comp = IconComponent as React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
    return <Comp size={20} style={accentColor ? { color: accentColor } : undefined} />;
  };

  return (
    <>
      {/* TRIGGER CARD */}
      <motion.div
        layoutId={layoutId}
        onClick={() => setOpen(true)}
        whileHover={{ y: -4, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className={`group relative cursor-pointer overflow-hidden rounded-[24px] border border-[#e2d9cc] dark:border-white/10 bg-white dark:bg-[#070c18]/90 p-6 backdrop-blur-xl transition-all duration-300 hover:shadow-xl hover:border-sx-blue/50 dark:hover:border-sx-blue/40 ${cardClassName}`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        aria-expanded={isOpen}
      >
        {children ? (
          children
        ) : (
          <>
            {/* Visual or Image header if supplied */}
            {imageSrc ? (
              <div className="relative mb-4 h-44 w-full overflow-hidden rounded-xl">
                <motion.img
                  layoutId={`image-${layoutId}`}
                  src={imageSrc}
                  alt={title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-70 group-hover:opacity-90 transition-opacity" />
                {subText && (
                  <motion.span
                    layoutId={`subtitle-${layoutId}`}
                    className="absolute bottom-3 left-3 text-[11px] font-semibold tracking-wider uppercase text-white/90 drop-shadow-sm"
                  >
                    {subText}
                  </motion.span>
                )}
              </div>
            ) : visual ? (
              <motion.div layoutId={`visual-${layoutId}`} className="mb-4">
                {visual}
              </motion.div>
            ) : null}

            {/* Icon & Eyebrow */}
            <div className="flex items-center justify-between">
              {IconComponent && (
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-sx-blue/10 text-sx-blue dark:bg-sx-blue/15 transition-transform group-hover:scale-105"
                  style={accentColor ? { backgroundColor: `${accentColor}18`, color: accentColor } : undefined}
                >
                  {renderIcon()}
                </div>
              )}
              {subText && !imageSrc && (
                <motion.span
                  layoutId={`subtitle-${layoutId}`}
                  className="text-[10px] font-bold tracking-wider uppercase text-[#6e7085] dark:text-slate-400"
                >
                  {subText}
                </motion.span>
              )}
            </div>

            {/* Title */}
            <motion.h3
              layoutId={`title-${layoutId}`}
              className="mt-3.5 text-base sm:text-lg font-semibold tracking-tight text-[#282937] dark:text-slate-100 group-hover:text-sx-blue dark:group-hover:text-sx-blue-glow transition-colors"
            >
              {title}
            </motion.h3>

            {/* Description */}
            {description && (
              <p className="mt-2 text-xs sm:text-sm text-[#4a4b5e] dark:text-slate-400 leading-relaxed line-clamp-3">
                {description}
              </p>
            )}

            {/* Card footer hint */}
            <div className="mt-4 pt-3 flex items-center justify-between border-t border-[#e2d9cc]/60 dark:border-white/5 text-[11px] font-medium text-[#6e7085] dark:text-slate-400">
              <span className="flex items-center gap-1 group-hover:text-sx-blue transition-colors">
                <span>Explore details</span>
                <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" />
              </span>
              <span className="font-mono text-[10px] opacity-60">Click to expand</span>
            </div>
          </>
        )}
      </motion.div>

      {/* EXPANDED MODAL OVERLAY */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/60 dark:bg-black/85 backdrop-blur-md"
            />

            {/* Expanded Modal Box */}
            <motion.div
              layoutId={layoutId}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className={`relative z-10 flex w-full max-w-4xl max-h-[90vh] flex-col overflow-hidden rounded-[28px] border border-[#e2d9cc] dark:border-slate-800 bg-[#fefbf4] dark:bg-[#070c18] shadow-[0_25px_80px_rgba(0,0,0,0.4)] ${
                imageSrc ? "md:flex-row" : "flex-col"
              } ${expandedClassName}`}
              role="dialog"
              aria-modal="true"
              aria-label={title}
            >
              {/* Close Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                }}
                className="absolute top-4 right-4 z-30 flex h-9 w-9 items-center justify-center rounded-full border border-[#e2d9cc] dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 text-[#282937] dark:text-slate-200 backdrop-blur-md transition-all hover:scale-105 hover:bg-white dark:hover:bg-slate-800 active:scale-95 shadow-md"
                aria-label="Close details"
              >
                <X size={16} />
              </button>

              {/* Optional Visual / Image Banner */}
              {imageSrc && (
                <div className="relative h-56 w-full shrink-0 overflow-hidden md:h-auto md:w-5/12 bg-slate-950">
                  <motion.img
                    layoutId={`image-${layoutId}`}
                    src={imageSrc}
                    alt={title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent md:bg-gradient-to-r md:from-transparent md:to-black/40" />
                  {subText && (
                    <motion.div
                      layoutId={`subtitle-${layoutId}`}
                      className="absolute bottom-4 left-4 z-10 rounded-full border border-white/20 bg-black/60 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md"
                    >
                      {subText}
                    </motion.div>
                  )}
                </div>
              )}

              {/* Main Content Area */}
              <div className="flex flex-1 flex-col overflow-y-auto p-6 sm:p-8">
                {/* Header Header Info if no image */}
                {!imageSrc && (
                  <div className="mb-4 flex items-center justify-between pr-10">
                    <div className="flex items-center gap-3">
                      {IconComponent && (
                        <div
                          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sx-blue/10 text-sx-blue dark:bg-sx-blue/15"
                          style={accentColor ? { backgroundColor: `${accentColor}18`, color: accentColor } : undefined}
                        >
                          {renderIcon()}
                        </div>
                      )}
                      <div>
                        {subText && (
                          <motion.p
                            layoutId={`subtitle-${layoutId}`}
                            className="text-xs font-bold uppercase tracking-wider text-sx-blue dark:text-sx-blue-glow"
                          >
                            {subText}
                          </motion.p>
                        )}
                        <span className="text-[11px] font-mono text-[#6e7085] dark:text-slate-500">
                          SentinelX Verified Module
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Subtitle if image exists */}
                {imageSrc && subText && (
                  <motion.p
                    layoutId={`subtitle-${layoutId}`}
                    className="text-xs font-bold uppercase tracking-wider text-sx-blue dark:text-sx-blue-glow mb-2"
                  >
                    {subText}
                  </motion.p>
                )}

                {/* Expanded Title */}
                <motion.h2
                  layoutId={`title-${layoutId}`}
                  className="text-2xl sm:text-3xl font-bold tracking-tight text-[#282937] dark:text-white mb-4 pb-3 border-b border-[#e2d9cc] dark:border-slate-800"
                >
                  {title}
                </motion.h2>

                {/* Body Content with smooth fade and upward slide */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ delay: 0.15, duration: 0.3 }}
                  className="text-[#4a4b5e] dark:text-slate-300 text-sm leading-relaxed space-y-4 flex-1"
                >
                  {content || (
                    <div className="space-y-4">
                      {description && <p className="text-base text-[#282937] dark:text-slate-200">{description}</p>}
                      <div className="rounded-2xl border border-[#e2d9cc] dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 p-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#282937] dark:text-slate-200 mb-2">
                          Operational Overview
                        </h4>
                        <p className="text-xs text-[#6e7085] dark:text-slate-400">
                          SentinelX monitors live telemetry with Zero-Day graph intelligence, automated Sigma rules, and context-grounded incident correlation. Every metric is linked to verifiable telemetry.
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>

                {/* Footer Action Row */}
                {(actionText || actionLink || onAction) && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25 }}
                    className="mt-6 pt-4 border-t border-[#e2d9cc] dark:border-slate-800 flex flex-wrap items-center justify-between gap-3"
                  >
                    <span className="text-[11px] text-[#6e7085] dark:text-slate-400">
                      Press <kbd className="px-1.5 py-0.5 rounded border border-[#e2d9cc] dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-[10px]">ESC</kbd> to close
                    </span>

                    {actionLink ? (
                      <Link
                        to={actionLink}
                        onClick={() => setOpen(false)}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:brightness-110 active:scale-95 transition-all"
                      >
                        <span>{actionText || "Launch Module"}</span>
                        <ArrowRight size={14} />
                      </Link>
                    ) : onAction ? (
                      <button
                        onClick={() => {
                          onAction();
                          setOpen(false);
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:brightness-110 active:scale-95 transition-all"
                      >
                        <span>{actionText || "Execute Action"}</span>
                        <ArrowRight size={14} />
                      </button>
                    ) : null}
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default ExpandableCard;
