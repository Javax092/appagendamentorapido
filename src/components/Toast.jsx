import { AnimatePresence, motion } from "framer-motion";

// ALTERACAO: componente de toast reutilizavel para substituir alerts.
export function Toast({ toast }) {
  return (
    <AnimatePresence>
      {toast ? (
        <motion.aside
          key={toast.id}
          className={`toast toast-${toast.type}`}
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          role="status"
          aria-live="polite"
        >
          <strong>{toast.title}</strong>
          <span>{toast.message}</span>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
