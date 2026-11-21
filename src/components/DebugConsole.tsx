import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { evaluateConsole } from "../services/debugService";

export function DebugConsole() {
  const output = useStore((state) => state.debugOutput);
  const debugActive = useStore((state) => state.debugActive);
  const debugPaused = useStore((state) => state.debugPaused);
  const [input, setInput] = useState("");
  const outputRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const element = outputRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [output]);

  const submit = () => {
    const expression = input.trim();
    if (!expression) return;
    setInput("");
    void evaluateConsole(expression);
  };

  return (
    <div className="debug-console">
      <pre className="debug-console-output" ref={outputRef}>
        {output || "Hata ayıklama konsolu. Oturum başlatıldığında çıktı burada görünür."}
      </pre>
      <form
        className="debug-console-input"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <span className="debug-console-prompt">{">"}</span>
        <input
          placeholder={
            debugActive
              ? debugPaused
                ? "İfade değerlendir…"
                : "Program çalışıyor…"
              : "Hata ayıklama oturumu yok"
          }
          value={input}
          disabled={!debugActive}
          onChange={(event) => setInput(event.target.value)}
        />
        <button className="small-button" type="submit" disabled={!debugActive || !input.trim()}>
          Gönder
        </button>
      </form>
    </div>
  );
}
