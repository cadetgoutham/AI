import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";

import "./App.css";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  queries?: GeneratedQuery[];
  warning?: boolean;
}

interface GeneratedQuery {
  query: string;
  explanation: string;
}

const API_URL = 'http://127.0.0.1:8000/generate-query';

export const App: React.FC = () => {
  const [thread, setThread] = useState<ChatMessage[]>([]);
  const [awaitingClarification, setAwaitingClarification] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [queryLanguage, setQueryLanguage] = useState("Select language");
  const [schema, setSchema] = useState("");
  const [advancedPrompt, setAdvancedPrompt] = useState("");

  const startNewConversation = () => {
    setThread([]);
    setAwaitingClarification(false);
    setPrompt("");
  };

  const sendPromptValue = async (value: string) => {
    // Backend accepts at most 10 history messages.
    const history = thread.slice(-10).map((message) => ({
      role: message.role,
      content:
        message.queries && message.queries.length > 0
          ? message.queries.map((q) => `${q.query}\n-- ${q.explanation}`).join("\n\n")
          : message.text,
    }));
    setThread((t) => [...t, { role: "user", text: value }]);
    setPrompt("");
    setLoading(true);

    try {
      const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_prompt: value, history }),
        })
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`)
      // const result = await sendPrompt(value, conversationId);
    const result = await res.json();
    const responseQueries = result?.response?.queries;
    const queries = Array.isArray(responseQueries)
      ? responseQueries.filter(
          (query: unknown): query is GeneratedQuery =>
            typeof query === "object" &&
            query !== null &&
            "query" in query &&
            typeof query.query === "string" &&
            "explanation" in query &&
            typeof query.explanation === "string",
        )
      : [];
    const explanation = result?.response?.explanation;
    const needsClarification =
      queries.length === 0 &&
      typeof explanation === "string" &&
      explanation.trim().length > 0;
    setThread((t) => [
      ...t,
      {
        role: "assistant",
        text:
          queries.length > 0
            ? "Generated SQL queries:"
            : explanation ?? "No queries were generated.",
        queries,
        warning: needsClarification,
      },
    ]);
    setAwaitingClarification(needsClarification);

    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const sendOrConfirmPrompt = (value: string) => {
    const normalizedValue = value.trim();
    if (!normalizedValue || loading) return;

    if (/\b(delete|remove|erase|drop|truncate)\b/i.test(normalizedValue)) {
      setPendingPrompt(normalizedValue);
      return;
    }

    void sendPromptValue(normalizedValue);
  };

  const submit = () => {
    const value = prompt.trim();
    if (!value || loading) return;
    sendOrConfirmPrompt(value);
  };

  const submitAdvanced = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const request = advancedPrompt.trim();
    const databaseSchema = schema.trim();
    if (!request || !databaseSchema || loading) return;

    const structuredPrompt = [
      `Generate a query using ${queryLanguage}.`,
      "Use only the tables and columns in the schema below. Do not invent schema elements.",
      "",
      "Schema:",
      databaseSchema,
      "",
      "Request:",
      request,
    ].join("\n");

    setAdvancedOpen(false);
    sendOrConfirmPrompt(structuredPrompt);
  };

  const confirmPrompt = () => {
    if (!pendingPrompt) return;
    const value = pendingPrompt;
    setPendingPrompt(null);
    void sendPromptValue(value);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="page page-narrow">
      <div className="page-wrap">
        <div className="page-header">
        <div>
          <h1>Ask AI</h1>
          <p>
            ask the ai for correct sql query based on your requirement
          </p>
        </div>
      </div>

      {thread.length > 0 && (
        <div className="panel chat-thread" aria-live="polite">
          {thread.map((message, i) => (
            <div
              key={i}
              className={`chat-bubble chat-bubble-${message.role}${message.warning ? " chat-bubble-warning" : ""}`}
              role={message.warning ? "status" : undefined}
            >
              {message.warning && (
                <strong className="query-warning-label">Clarification needed</strong>
              )}
              {message.text}
              {message.queries && message.queries.length > 0 && (
                <ol className="query-list">
                  {message.queries.map((query, queryIndex) => (
                    <li key={queryIndex}>
                      <pre>{query.query}</pre>
                      <p className="query-explanation">{query.explanation}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ))}
          {loading && (
            <div className="chat-bubble chat-bubble-assistant chat-bubble-loading">
              <span className="btn-spinner" aria-hidden="true" />
              Working on it…
            </div>
          )}
        </div>
      )}
      <form onSubmit={handleSubmit} className="panel">
        <textarea
          id="ai-prompt"
          aria-label="Prompt"
          className="prompt-input"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            awaitingClarification
              ? "Type your answer…"
              : "e.g. I want to get all users"
          }
          disabled={loading}
          rows={awaitingClarification ? 2 : 4}
        />
        <p className="prompt-hint">Press Enter to send. Shift + Enter adds a new line.</p>
        <div className="prompt-actions">
          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading || !prompt.trim()}
          >
            {loading ? (
              <>
                <span className="btn-spinner" aria-hidden="true" />
                Working on it…
              </>
            ) : awaitingClarification ? (
              "Send answer"
            ) : (
              "✨ Send prompt"
            )}
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={() => setAdvancedOpen(true)}
            disabled={loading}
          >
            Advanced query generator
          </button>

          {thread.length > 0 && (
            <button
              type="button"
              className="btn btn-secondary btn-block"
              onClick={startNewConversation}
              disabled={loading}
            >
              Start new conversation
            </button>
          )}
        </div>
      </form>

      {advancedOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setAdvancedOpen(false);
          }}
        >
          <section
            className="advanced-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="advanced-generator-title"
          >
            <div className="modal-kicker">Advanced generator</div>
            <h2 id="advanced-generator-title">Generate from your schema</h2>
            <form onSubmit={submitAdvanced}>
              <div className="advanced-fields">
                <div className="advanced-field">
                  <label id="query-language-label">SQL dialect</label>
                  <details
                    className="dialect-picker"
                    aria-labelledby="query-language-label"
                    onBlur={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                        event.currentTarget.open = false;
                      }
                    }}
                  >
                    <summary className="dialect-trigger" autoFocus>
                      <span>{queryLanguage}</span>
                      <span className="dialect-chevron" aria-hidden="true" />
                    </summary>
                    <div className="dialect-options" role="group" aria-label="Available SQL dialects">
                      {["Select language", "PostgreSQL", "MySQL", "SQLite", "Microsoft SQL Server", "Oracle", "Standard SQL"].map((language) => (
                        <button
                          key={language}
                          className="dialect-option"
                          type="button"
                          aria-pressed={queryLanguage === language}
                          onClick={(event) => {
                            setQueryLanguage(language);
                            const picker = event.currentTarget.closest("details");
                            if (picker) {
                              picker.open = false;
                              picker.querySelector("summary")?.focus();
                            }
                          }}
                        >
                          {language}
                        </button>
                      ))}
                    </div>
                  </details>
                </div>
                <div className="advanced-field">
                  <label htmlFor="database-schema">Database schema</label>
                  <textarea
                    id="database-schema"
                    value={schema}
                    onChange={(event) => setSchema(event.target.value)}
                    placeholder={"CREATE TABLE users (\n  id INTEGER PRIMARY KEY,\n  username TEXT,\n  created_at TIMESTAMP\n);"}
                    rows={7}
                    required
                  />
                </div>
                <div className="advanced-field">
                  <label htmlFor="advanced-request">What query do you need?</label>
                  <textarea
                    id="advanced-request"
                    value={advancedPrompt}
                    onChange={(event) => setAdvancedPrompt(event.target.value)}
                    placeholder="Return the 10 most recently created users"
                    rows={3}
                    required
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => setAdvancedOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={loading || !schema.trim() || !advancedPrompt.trim() || queryLanguage.trim() === 'Select language'}
                >
                  Generate query
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {pendingPrompt && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setPendingPrompt(null);
          }}
        >
          <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="ai-confirm-title">
            <div className="modal-kicker">Destructive action</div>
            <h2 id="ai-confirm-title">Send this request?</h2>
            <p className="modal-copy">This request may generate a destructive SQL statement.</p>
            <pre className="modal-command">{pendingPrompt}</pre>
            <div className="modal-actions">
              <button className="btn modal-cancel" type="button" onClick={() => setPendingPrompt(null)}>
                Cancel
              </button>
              <button className="btn modal-confirm" type="button" onClick={confirmPrompt}>
                Continue
              </button>
            </div>
          </section>
        </div>
      )}
      </div>

      
    </div>
  );
};

export default App;