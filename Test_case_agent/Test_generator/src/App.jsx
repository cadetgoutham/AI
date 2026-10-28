import { useEffect, useRef, useState } from "react";
import prettier from "prettier/standalone.js";
import parserBabel from "prettier/plugins/babel.js";
import estree from "prettier/plugins/estree.js";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
import { FormControl, Select, MenuItem } from "@mui/material";
import { jsPDF } from "jspdf";
import "./App.css";
// import sample from './sample.json'

const API_URL = "http://127.0.0.1:8000/generate-test";

// Mirrors the prism-tomorrow theme used on screen.
const TOKEN_COLORS = {
  comment: "#999999", prolog: "#999999", doctype: "#999999", cdata: "#999999",
  punctuation: "#cccccc",
  tag: "#e2777a", "attr-name": "#e2777a", namespace: "#e2777a", deleted: "#e2777a",
  boolean: "#f08d49", number: "#f08d49", function: "#f08d49",
  property: "#f8c555", "class-name": "#f8c555", constant: "#f8c555", symbol: "#f8c555",
  selector: "#cc99cd", important: "#cc99cd", atrule: "#cc99cd", keyword: "#cc99cd", builtin: "#cc99cd",
  string: "#7ec699", char: "#7ec699", "attr-value": "#7ec699", regex: "#7ec699", variable: "#7ec699",
  "template-string": "#7ec699",
  operator: "#67cdcc", entity: "#67cdcc", url: "#67cdcc",
};
const CATEGORY_COLORS = {
  happy_path: "#2e7d32",
  edge_case: "#ef6c00",
  boundary: "#6a1b9a",
  error_handling: "#c62828",
};

const flattenTokens = (tokens, type) =>
  tokens.flatMap((token) =>
    typeof token === "string"
      ? [{ text: token, type }]
      : flattenTokens(Array.isArray(token.content) ? token.content : [token.content], token.type),
  );

function App() {
  const [userPrompt, setUserPrompt] = useState("");
  const [draft, setDraft] = useState("");
  const [framework, setFramework] = useState("");
  const [response, setResponse] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!isModalOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setIsModalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    textareaRef.current?.focus();
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isModalOpen]);

  const openModal = () => {
    setDraft(userPrompt);
    setIsModalOpen(true);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setDraft(String(reader.result ?? ""));
      setIsModalOpen(true);
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const handleGenerateTest = async (sourceCode) => {
    const code = (sourceCode ?? userPrompt).trim();
    if (!code) {
      setError("Add some code before generating tests.");
      return;
    }
    const selectedFramework = framework.trim();
    if (!selectedFramework) {
      setError("Select a test framework before generating tests.");
      return;
    }
    const payload = `Source code to test:\n${code}`;
    setLoading(true);
    setError("");
    setResponse(null);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_prompt: payload,
          framework: selectedFramework,
        }),
      });
      if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
      const data = await res.json();
      const result = data?.response;
      const testCases = await Promise.all(
        (result?.test_cases ?? []).map(async (testCase) => ({
          ...testCase,
          formatted_code: await prettier.format(testCase.test_code ?? "", {
            parser: "babel",
            plugins: [parserBabel, estree],
          }),
        })),
      );
      setResponse({ ...result, test_cases: testCases });
      console.log(testCases);
    } catch (err) {
      setError(err.message || "Error generating test");
    } finally {
      setLoading(false);
    }
  };
  const runFromModal = () => {
    if (!framework.trim()) {
      setError("Select a test framework before generating tests.");
      return;
    }
    setUserPrompt(draft);
    setIsModalOpen(false);
    handleGenerateTest(draft);
  };

  const copyResponse = async () => {
    const code = response.test_cases
      .map(({ formatted_code }) => formatted_code)
      .join("\n");
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const exportPdf = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 40;
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
    let y = margin;

    const write = (text, { size = 10, font = "helvetica", style = "normal", gap = 4 } = {}) => {
      doc.setFont(font, style);
      doc.setFontSize(size);
      const lineHeight = size * 1.3;
      for (const line of doc.splitTextToSize(String(text), maxWidth)) {
        if (y + lineHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += lineHeight;
      }
      y += gap;
    };

    const ensureSpace = (height) => {
      if (y + height > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    };

    const writeTestHeader = (title, category) => {
      const height = 24;
      ensureSpace(height + 30);
      doc.setFillColor(CATEGORY_COLORS[category] ?? "#007acc");
      doc.rect(margin, y, maxWidth, height, "F");
      doc.setTextColor("#ffffff");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      const label = category ? category.replaceAll("_", " ").toUpperCase() : "";
      const labelWidth = label ? doc.getTextWidth(label) + 16 : 0;
      const titleText = doc.splitTextToSize(title, maxWidth - labelWidth - 16)[0];
      doc.text(titleText, margin + 8, y + height / 2, { baseline: "middle" });
      if (label) doc.text(label, margin + maxWidth - 8, y + height / 2, { baseline: "middle", align: "right" });
      doc.setTextColor("#000000");
      y += height;
    };

    const writeCode = (code) => {
      const size = 8.5;
      const lineHeight = size * 1.45;
      const padding = 8;
      doc.setFont("courier", "normal");
      doc.setFontSize(size);
      const charWidth = doc.getTextWidth("M");
      const maxChars = Math.floor((maxWidth - padding * 2) / charWidth);

      const lines = [[]];
      for (const { text, type } of flattenTokens(Prism.tokenize(code, Prism.languages.javascript))) {
        text.split("\n").forEach((part, idx) => {
          if (idx > 0) lines.push([]);
          if (part) lines[lines.length - 1].push({ text: part, color: TOKEN_COLORS[type] ?? "#cccccc" });
        });
      }

      const rows = [];
      for (const line of lines) {
        let row = [];
        let used = 0;
        for (const seg of line) {
          let text = seg.text;
          while (text.length > 0) {
            if (used === maxChars) {
              rows.push(row);
              row = [];
              used = 0;
            }
            const take = text.slice(0, maxChars - used);
            row.push({ text: take, color: seg.color });
            used += take.length;
            text = text.slice(take.length);
          }
        }
        rows.push(row);
      }

      const fillBlock = (height) => {
        doc.setFillColor("#2d2d2d");
        doc.rect(margin, y, maxWidth, height, "F");
      };
      ensureSpace(padding + lineHeight);
      fillBlock(padding);
      y += padding;
      for (const row of rows) {
        ensureSpace(lineHeight);
        fillBlock(lineHeight);
        let x = margin + padding;
        for (const { text, color } of row) {
          doc.setTextColor(color);
          doc.text(text, x, y + lineHeight / 2, { baseline: "middle" });
          x += text.length * charWidth;
        }
        y += lineHeight;
      }
      ensureSpace(padding);
      fillBlock(padding);
      y += padding + 14;
      doc.setTextColor("#000000");
    };

    write("Generated Test Cases", { size: 18, style: "bold", gap: 8 });
    write(`Framework: ${framework || "-"}`);
    write("Test analysis", { size: 13, style: "bold" });
    write(
      [
        `No of functions: ${response.No_of_functions}`,
        `No of test cases: ${response.No_of_test_cases}`,
        `No of edge cases: ${response.No_of_edge_cases}`,
        `No of boundary cases: ${response.No_of_boundary_cases}`,
        `No of error handling cases: ${response.No_of_error_handling_cases}`,
        `No of skipped tests: ${response.No_of_skipped_tests}`,
      ].join("\n"),
      { gap: 8 },
    );
    if (response.summary) {
      write("Summary", { size: 13, style: "bold" });
      write(response.summary, { gap: 10 });
    }
    response.test_cases?.forEach(({ test_name, category, formatted_code }, i) => {
      writeTestHeader(`${i + 1}. ${test_name || `Test ${i + 1}`}`, category);
      writeCode(formatted_code);
    });

    doc.save("generated-tests.pdf");
  };
  function combineTestCases(tests) {
    // Option A: Join all formatted_code values directly
    return tests?.map((t) => t.formatted_code.trim()).join("\n\n");
  }

  const singleString = combineTestCases(response?.test_cases);
  console.log(singleString);
  console.log(response?.test_cases);

  return (
    <div className="vs-app">
      <header className="title-bar">
        <span className="traffic red" />
        <span className="traffic yellow" />
        <span className="traffic green" />
        <span className="title-bar-text">
          <span className="unicorn-mark" aria-hidden="true">
            🦄
          </span>
          Test Case Agent — Visual Studio Code
        </span>
      </header>

      <div className="workbench">
        <aside className="activity-bar">
          <button
            className="activity-icon active"
            title="Source code"
            onClick={openModal}
            type="button"
          >
            {"</>"}
          </button>
          <button
            className="activity-icon"
            title="Upload file"
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            ⭱
          </button>
        </aside>

        <main className="editor-area">
          <div className="tab-bar">
            <div className="tab active">
              <span className="tab-dot" />
              generated.test.js
            </div>
          </div>

          <section className="toolbar">
            <button className="vs-button" onClick={openModal} type="button">
              View / Upload Code
            </button>
            <button
              className="vs-button primary"
              onClick={() => handleGenerateTest()}
              disabled={loading}
              type="button"
            >
              {loading ? "Generating…" : "Generate Test"}
            </button>
            {userPrompt && (
              <span className="chip">
                {userPrompt.split("\n").length} lines loaded
              </span>
            )}
          </section>

          <section className="result-pane">
            {error && <div className="banner error">{error}</div>}
            {!loading && response && (
              <div className="test-analysis">
                <div className="analysis-content">
                  <p>Test analysis</p>
                  <ul>
                    <li>No of functions: {response.No_of_functions}</li>
                    <li>No of test cases: {response.No_of_test_cases}</li>
                    <li>No of edge cases: {response.No_of_edge_cases}</li>
                    <li>
                      No of boundary cases: {response.No_of_boundary_cases}
                    </li>
                    <li>
                      No of error handling cases:{" "}
                      {response.No_of_error_handling_cases}
                    </li>
                    <li>No of skipped tests: {response.No_of_skipped_tests}</li>
                  </ul>
                </div>
              </div>
            )}
            {loading && (
              <div className="skeleton">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    className="skeleton-line"
                    key={i}
                    style={{ animationDelay: `${i * 0.12}s` }}
                  />
                ))}
              </div>
            )}

            {!loading && !response && !error && (
              <div className="empty-state">
                <div className="empty-glyph">{"{ }"}</div>
                <p>Paste or upload a function, then generate its test suite.</p>
              </div>
            )}

            {!loading && response && (
              <div className="code-card">
                <div className="code-card-head">
                  <span>Generated tests</span>
                  <button
                    className="vs-button ghost"
                    onClick={copyResponse}
                    type="button"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                  <button
                    className="vs-button ghost"
                    onClick={exportPdf}
                    type="button"
                  >
                    Export PDF
                  </button>
                </div>
                {response.summary && (
                  <p className="test-summary">{response.summary}</p>
                )}
                <div className="test-list">
                  {response.test_cases?.map(
                    ({ test_name, category, formatted_code }, i) => (
                      <article
                        className="test-case"
                        key={`${test_name}-${i}`}
                        style={{
                          animationDelay: `${Math.min(i * 0.03, 1.2)}s`,
                        }}
                      >
                        <div className="test-case-head">
                          <h3>{test_name || `Test ${i + 1}`}</h3>
                          {category && (
                            <span className="test-category">
                              {category.replaceAll("_", " ")}
                            </span>
                          )}
                        </div>
                        <pre className="code-block">
                          <code
                            className="language-javascript"
                            dangerouslySetInnerHTML={{
                              __html: Prism.highlight(
                                formatted_code,
                                Prism.languages.javascript,
                                "javascript",
                              ),
                            }}
                          />
                        </pre>
                      </article>
                    ),
                  )}
                </div>
              </div>
            )}
          </section>
        </main>
      </div>

      <footer className="status-bar">
        <span className={`status-item ${loading ? "busy" : ""}`}>
          {loading ? "⟳ Running agent" : "✓ Ready"}
        </span>
        <span className="status-item">JavaScript</span>
        <span className="status-item">UTF-8</span>
      </footer>

      <input
        ref={fileInputRef}
        type="file"
        accept=".js,.jsx,.ts,.tsx,.py,.txt"
        onChange={handleFileUpload}
        hidden
      />

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <span
                style={{
                  color: "rgb(19 147 196)",
                  fontWeight: "1000",
                  fontSize: "larger",
                }}
              >
                Source code
              </span>
              <FormControl
                size="small"
                sx={{
                  minWidth: 200,
                  maxWidth: 300,
                  width: "100%",

                  "& .MuiOutlinedInput-root": {
                    color: "#000000",
                    backgroundColor: "#c9c9d6",
                    borderRadius: "4px",
                    fontSize: "13px",

                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#3e3e42",
                    },

                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#5a5d5e",
                    },

                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#007acc",
                    },

                    "& .MuiSelect-icon": {
                      color: "#858585",
                    },
                  },
                }}
              >
                <Select
                  id="framework-select"
                  value={framework}
                  displayEmpty
                  onChange={(e) => setFramework(e.target.value)}
                  renderValue={(selected) => {
                    if (!selected) {
                      return (
                        <span style={{ color: "#858585" }}>
                          Select Test framework
                        </span>
                      );
                    }

                    const labels = {
                      jest: "Jest",
                      cypress: "Cypress",
                      playwright: "Playwright",
                    };

                    return labels[selected] || selected;
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        backgroundColor: "#252526",
                        color: "#cccccc",
                        border: "1px solid #3e3e42",
                        "& .MuiMenuItem-root": {
                          fontSize: "13px",
                          minHeight: "32px",
                          "&:hover": {
                            backgroundColor: "#2a2d2e",
                          },
                          "&.Mui-selected": {
                            backgroundColor: "#094771",
                            "&:hover": {
                              backgroundColor: "#094771",
                            },
                          },
                        },
                      },
                    },
                  }}
                >
                  <MenuItem value="jest">Jest</MenuItem>
                  <MenuItem value="cypress">Cypress</MenuItem>
                  <MenuItem value="playwright">Playwright</MenuItem>
                </Select>
              </FormControl>

              <button
                className="icon-button"
                onClick={() => setIsModalOpen(false)}
                type="button"
              >
                ✕
              </button>
            </div>
            <textarea
              ref={textareaRef}
              className="modal-textarea"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Enter your JavaScript function here"
              spellCheck={false}
              name="source-code"
            />
            <div className="modal-foot">
              <button
                className="vs-button"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                Upload file
              </button>
              <div className="spacer" />
              <button
                className="vs-button ghost"
                onClick={() => setIsModalOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="vs-button primary"
                onClick={runFromModal}
                type="button"
              >
                Generate Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
