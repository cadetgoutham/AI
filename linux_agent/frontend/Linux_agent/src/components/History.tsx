interface HistoryItem {
  command: string;
  success: boolean;
  timestamp: string;
}

interface Props {
  history: HistoryItem[];
}

export default function History({
  history,
}: Props) {

  return (
    <div className="history">

      <div className="section-title">
        Command history
      </div>

      {history.length === 0 && (
        <p className="empty">
          No commands executed yet.
        </p>
      )}

      {history.map((item, index) => (

        <div
          className="history-item"
          key={`${item.timestamp}-${index}`}
        >

          <div className="history-command">
            $ {item.command}
          </div>

          <div className="history-status">

            <span>
              {item.success
                ? "✓ Success"
                : "✗ Failed"}
            </span>

            <span>
              {item.timestamp}
            </span>

          </div>

        </div>

      ))}

    </div>
  );
}