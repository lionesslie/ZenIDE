import { useEffect, useRef } from "react";
import { useStore } from "../store";
import { killTask } from "../services/taskService";
import { StopIcon, TrashIcon } from "./Icons";

export function OutputPanel() {
  const tasks = useStore((state) => state.tasks);
  const activeTaskId = useStore((state) => state.activeTaskId);
  const outputRef = useRef<HTMLPreElement>(null);
  const activeTask =
    tasks.find((task) => task.id === activeTaskId) ?? tasks[tasks.length - 1];

  useEffect(() => {
    const element = outputRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [activeTask?.output]);

  if (tasks.length === 0) {
    return (
      <div className="empty-panel">
        <p>Henüz görev çıktısı yok.</p>
        <p className="welcome-muted">
          Derle, çalıştır veya test et komutlarıyla bir görev başlatın.
        </p>
      </div>
    );
  }

  return (
    <div className="output-panel">
      <div className="output-toolbar">
        <div className="output-tasks">
          {tasks.map((task) => (
            <button
              key={task.id}
              className={`output-task ${
                task.id === activeTask?.id ? "active" : ""
              }`}
              onClick={() => useStore.setState({ activeTaskId: task.id })}
              title={task.name}
            >
              <span className="output-task-name">{task.name}</span>
              <span
                className={`output-task-status ${
                  task.running
                    ? "running"
                    : task.code === 0
                      ? "success"
                      : "failed"
                }`}
              >
                {task.running ? "…" : task.code ?? "?"}
              </span>
            </button>
          ))}
        </div>
        <div className="output-actions">
          {activeTask?.running && (
            <button
              className="icon-button small"
              title="Görevi durdur"
              onClick={() => void killTask(activeTask.id)}
            >
              <StopIcon size={13} />
            </button>
          )}
          <button
            className="icon-button small"
            title="Görevleri temizle"
            onClick={() => useStore.getState().clearTasks()}
          >
            <TrashIcon size={13} />
          </button>
        </div>
      </div>
      <pre className="output-content" ref={outputRef}>
        {activeTask?.output ?? ""}
        {activeTask && !activeTask.running && (
          <span className="output-exit">
            {`\n[Görev ${activeTask.code === 0 ? "başarıyla" : "hatayla"} sona erdi (kod ${activeTask.code ?? "?"})]`}
          </span>
        )}
      </pre>
    </div>
  );
}
