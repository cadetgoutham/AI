import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { sendPrompt } from "./api";
import { useToast } from "./ToastProvider";
import "./Components.css";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

const EXAMPLES = [
  "Add a 2023 Honda Civic",
  "Show my Toyota cars",
  "Change the year of my Civic to 2024",
  "Delete my Mustang",
];

export const AIPromptBox: React.FC = () => {
  const [thread, setThread] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [awaitingClarification, setAwaitingClarification] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const navigate = useNavigate();
  const toast = useToast();

  const startNewConversation = () => {
    setThread([]);
    setConversationId(undefined);
    setAwaitingClarification(false);
    setPrompt("");
  };

  const sendPromptValue = async (value: string) => {
    setThread((t) => [...t, { role: "user", text: value }]);
    setPrompt("");
    setLoading(true);

    try {
      const result = await sendPrompt(value, conversationId);
      setConversationId(result.conversation_id);
      setThread((t) => [...t, { role: "assistant", text: result.response }]);
      setAwaitingClarification(result.needs_clarification);

      if (!result.needs_clarification) {
        if (result.added || result.updated || result.deleted) {
          toast.success(result.response);
          navigate("/cars");
        } else if (result.viewed) {
          toast.info(result.response);
          navigate("/cars", { state: { aiFilteredCars: result.data ?? null } });
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't process that prompt.");
    } finally {
      setLoading(false);
    }
  };

  const submit = () => {
    const value = prompt.trim();
    if (!value || loading) return;

    if (/\b(delete|remove|erase)\b/i.test(value)) {
      setPendingPrompt(value);
      return;
    }

    void sendPromptValue(value);
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
      <div className="page-header">
        <div>
          <h1>Ask AI</h1>
          <p>
            Add, find, change or remove a car in plain words. It may ask a
            follow-up question if it needs more detail.
          </p>
        </div>
      </div>

      {thread.length > 0 && (
        <div className="panel chat-thread" aria-live="polite">
          {thread.map((message, i) => (
            <div key={i} className={`chat-bubble chat-bubble-${message.role}`}>
              {message.text}
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
              : "e.g. Add a 2023 Honda Civic"
          }
          disabled={loading}
          rows={awaitingClarification ? 2 : 4}
        />
        <p className="prompt-hint">Press Enter to send. Shift + Enter adds a new line.</p>

        {!awaitingClarification && (
          <>
            <p className="chip-label">Try one of these</p>
            <div className="chips">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  className="chip"
                  disabled={loading}
                  onClick={() => setPrompt(example)}
                >
                  {example}
                </button>
              ))}
            </div>
          </>
        )}

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
            <p className="modal-copy">This request may remove a car from your list.</p>
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
  );
};

export default AIPromptBox;