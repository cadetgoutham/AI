import { useState } from "react";

interface Props {
  loading: boolean;
  onGenerate: (prompt: string) => void;
}

export default function CommandInput({
  loading,
  onGenerate,
}: Props) {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = () => {
    if (!prompt.trim()) return;

    onGenerate(prompt);

    setPrompt("");
  };

  return (
    <div className="input-section">

      <textarea
        value={prompt}
        onChange={(event) =>
          setPrompt(event.target.value)
        }
        placeholder="Example: Show me the files in the current directory"
        rows={4}
      />

      <button
        onClick={handleSubmit}
        disabled={loading || !prompt.trim()}
      >
        {loading
          ? "Generating..."
          : "Generate command"}
      </button>

    </div>
  );
}