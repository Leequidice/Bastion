import React from "react";
import { CheckCircle2, XCircle, Loader2, Info, X } from "lucide-react";

export type ToastVariant = "info" | "success" | "error" | "pending";

export interface ToastAction {
  label: string;
  href: string;
}

export interface ToastMessage {
  id: string;
  variant: ToastVariant;
  message: string;
  action?: ToastAction;
}

interface ToastStackProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

const ICONS: Record<ToastVariant, React.ReactNode> = {
  info: <Info className="w-4 h-4" />,
  success: <CheckCircle2 className="w-4 h-4" />,
  error: <XCircle className="w-4 h-4" />,
  pending: <Loader2 className="w-4 h-4 animate-spin" />,
};

const VARIANT_ACCENT: Record<ToastVariant, string> = {
  info: "var(--color-accent-500)",
  success: "var(--color-accent-700)",
  error: "#7a2318",
  pending: "var(--color-ink-faint)",
};

const VARIANT_TEXT_CLASS: Record<ToastVariant, string> = {
  info: "text-accent-700",
  success: "text-accent-700",
  error: "text-[#7a2318]",
  pending: "text-ink-soft",
};

export const ToastStack: React.FC<ToastStackProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[70] flex flex-col gap-2 w-[calc(100%-2rem)] sm:w-full sm:max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          style={{ borderLeftColor: VARIANT_ACCENT[toast.variant], borderLeftWidth: 4 }}
          className="panel-parchment rounded-md shadow-2xl px-3.5 py-3 flex items-start gap-2.5 text-xs animate-[toast-in_0.18s_ease-out]"
        >
          <span className={`mt-0.5 shrink-0 ${VARIANT_TEXT_CLASS[toast.variant]}`}>{ICONS[toast.variant]}</span>
          <div className="flex-1 flex flex-col gap-1.5 min-w-0">
            <p className="leading-relaxed text-ink break-words">{toast.message}</p>
            {toast.action && (
              <a
                href={toast.action.href}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-semibold text-accent-700 hover:text-accent-900 underline self-start"
              >
                {toast.action.label}
              </a>
            )}
          </div>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="text-ink-faint hover:text-ink transition-colors cursor-pointer shrink-0"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
