import { useEffect, useState } from "react";

import CommandInput from "./components/CommandInput";
import CommandCard from "./components/CommandCard";
import OutputPanel from "./components/OutputPanel";
import History from "./components/History";

import "./App.css";


interface CommandResult {
  command: string;
  explanation: string;
  risk: string;
  allowed: boolean;
  reason?: string;
}


interface ExecutionResult {
  command: string;
  return_code: number;
  stdout: string;
  stderr: string;
  success: boolean;
}


interface HistoryItem {
  command: string;
  success: boolean;
  timestamp: string;
}


function App() {

  const [commandResult, setCommandResult] =
    useState<CommandResult | null>(null);

  const [executionResult, setExecutionResult] =
    useState<ExecutionResult | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [executing, setExecuting] =
    useState(false);

  const [confirmOpen, setConfirmOpen] =
    useState(false);

  const [error, setError] =
    useState("");

  const [history, setHistory] =
    useState<HistoryItem[]>([]);


  const generateCommand = async (
    prompt: string
  ) => {

    setLoading(true);
    setError("");
    setExecutionResult(null);

    try {

      const response = await fetch(
        "http://127.0.0.1:8000/agent",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            prompt,
          }),
        }
      );

      if (!response.ok) {

        const data =
          await response.json();

        throw new Error(
          data.detail ||
          "Failed to generate command"
        );
      }

      const data =
        await response.json();

      setCommandResult(data);

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );

    } finally {

      setLoading(false);
    }
  };


  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !executing) {
        setConfirmOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [executing]);


  const executeCommand = () => {

    if (!commandResult) return;

    setConfirmOpen(true);
  };


  const confirmExecution = async () => {

    if (!commandResult) return;

    setConfirmOpen(false);

    setExecuting(true);
    setError("");

    try {

      const response = await fetch(
        "http://127.0.0.1:8000/agent/execute",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            command:
              commandResult.command,
          }),
        }
      );

      if (!response.ok) {

        const data =
          await response.json();

        throw new Error(
          data.detail ||
          "Command execution failed"
        );
      }

      const data =
        await response.json();

      setExecutionResult(data);

      setHistory((previous) => [
        {
          command:
            data.command,

          success:
            data.success,

          timestamp:
            new Date().toLocaleTimeString(),
        },

        ...previous,
      ]);

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Execution failed"
      );

    } finally {

      setExecuting(false);
    }
  };


  return (
    <div className="app">

      <header className="header">

        <div>
          <h1>
            Linux Command Agent
          </h1>

          <p>
            Describe what you want to do.
            AI will generate a Linux command.
          </p>
        </div>

      </header>


      <main className="container">

        <CommandInput
          loading={loading}
          onGenerate={generateCommand}
        />


        {error && (
          <div className="error-message">
            {error}
          </div>
        )}


        {commandResult && (
          <CommandCard
            command={
              commandResult.command
            }
            explanation={
              commandResult.explanation
            }
            risk={
              commandResult.risk
            }
            allowed={
              commandResult.allowed
            }
            onExecute={
              executeCommand
            }
            executing={
              executing
            }
          />
        )}


        {executionResult && (
          <OutputPanel
            stdout={
              executionResult.stdout
            }
            stderr={
              executionResult.stderr
            }
            returnCode={
              executionResult.return_code
            }
          />
        )}


        <History
          history={history}
        />

      </main>

      {confirmOpen && commandResult && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget && !executing) {
              setConfirmOpen(false);
            }
          }}
        >
          <section
            className="confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
          >
            <div className="modal-kicker">Execution request</div>
            <h2 id="confirm-title">Run this command?</h2>
            <p className="modal-copy">
              This will execute the approved command on the local machine.
            </p>
            <pre className="modal-command">$ {commandResult.command}</pre>
            <div className="modal-actions">
              <button
                className="modal-cancel"
                onClick={() => setConfirmOpen(false)}
                disabled={executing}
              >
                Cancel
              </button>
              <button
                className="modal-confirm"
                onClick={confirmExecution}
                disabled={executing}
              >
                {executing ? "Executing..." : "Run command"}
              </button>
            </div>
          </section>
        </div>
      )}

    </div>
  );
}


export default App;