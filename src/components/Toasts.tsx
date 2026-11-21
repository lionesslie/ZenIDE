import { useStore } from "../store";
import { CloseIcon, ErrorIcon, InfoIcon } from "./Icons";

export function Toasts() {
  const toasts = useStore((state) => state.toasts);
  const dismiss = useStore((state) => state.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div className="toasts">
      {toasts.map((toast) => (
        <div className={`toast ${toast.kind}`} key={toast.id} role="status">
          <span className="toast-icon">
            {toast.kind === "error" ? (
              <ErrorIcon size={15} />
            ) : (
              <InfoIcon size={15} />
            )}
          </span>
          <span className="toast-message">{toast.message}</span>
          <button
            className="toast-close"
            title="Kapat"
            onClick={() => dismiss(toast.id)}
          >
            <CloseIcon size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
