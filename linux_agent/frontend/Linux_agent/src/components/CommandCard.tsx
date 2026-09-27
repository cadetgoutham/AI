interface Props {
  command: string;
  explanation: string;
  risk: string;
  allowed: boolean;
  onExecute: () => void;
  executing: boolean;
}

export default function CommandCard({
  command,
  explanation,
  risk,
  allowed,
  onExecute,
  executing,
}: Props) {

  return (
    <div className="command-card">

      <div className="section-title">
        Proposed command
      </div>

      <div className="terminal-command">
        $ {command}
      </div>

      <div className="explanation">
        <strong>Explanation:</strong>

        <p>{explanation}</p>
      </div>

      <div className="command-meta">

        <span className={`risk ${risk}`}>
          Risk: {risk}
        </span>

        <span
          className={
            allowed
              ? "status allowed"
              : "status blocked"
          }
        >
          {allowed
            ? "Allowed"
            : "Blocked"}
        </span>

      </div>

      {allowed && (
        <button
          className="execute-button"
          onClick={onExecute}
          disabled={executing}
        >
          {executing
            ? "Executing..."
            : "Execute command"}
        </button>
      )}

    </div>
  );
}