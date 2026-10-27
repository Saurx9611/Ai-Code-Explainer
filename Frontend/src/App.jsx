import React, { useState, useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import {
  Play,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Copy,
  Check,
  Sparkles,
  Code2,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Zap,
  Info,
  Layers,
  X,
  ExternalLink,
  Settings,
  Server,
  Wifi,
  WifiOff,
  Key,
  HelpCircle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import {
  analyzeCode,
  checkBackendHealth,
  getBackendUrl,
  setBackendUrl,
  getGeminiApiKey,
  setGeminiApiKey,
} from "./services/api";

const DEFAULT_PYTHON_CODE = `import sqlite3

def get_user_transactions(user_id, status_filter):
    # WARNING: Vulnerable to SQL Injection
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()
    
    query = "SELECT * FROM transactions WHERE user_id = '" + str(user_id) + "' AND status = '" + status_filter + "'"
    cursor.execute(query)
    records = cursor.fetchall()
    
    # Inefficient O(N^2) duplication check
    unique_records = []
    for r in records:
        is_duplicate = False
        for u in unique_records:
            if r[0] == u[0] and r[1] == u[1]:
                is_duplicate = True
                break
        if not is_duplicate:
            unique_records.append(r)
            
    conn.close()
    return unique_records
`;

const SAMPLE_PRESETS = [
  {
    name: "First",
    description: "Vulnerable query concatenation & nested loop deduplication",
    code: DEFAULT_PYTHON_CODE,
  },
  {
    name: "Second",
    description: "Unmemoized recursive Fibonacci calls causing CPU explosion",
    code: `def calculate_fibonacci(n):
    # Inefficient unmemoized recursion with exponential O(2^N) runtime
    if n <= 0:
        return 0
    elif n == 1:
        return 1
    else:
        return calculate_fibonacci(n - 1) + calculate_fibonacci(n - 2)

def process_batch(items):
    results = []
    for item in items:
        # Repetitive unbounded computation
        val = calculate_fibonacci(item["count"])
        results.append({"id": item["id"], "fib": val})
    return results
`,
  },
  {
    name: "Third",
    description: "Unsanitized file paths and unclosed file handlers",
    code: `import os

def read_user_file(username, filename):
    # CRITICAL: Path Traversal vulnerability (e.g. filename = '../../etc/passwd')
    base_dir = "/var/app/userdata"
    filepath = os.path.join(base_dir, username, filename)
    
    # Resource leak: unclosed file descriptor
    f = open(filepath, "r")
    content = f.read()
    
    lines = content.split("\\n")
    matching = []
    for line in lines:
        if "error" in line.lower():
            matching.append(line)
            
    return matching
`,
  },
];

export default function App() {
  const [code, setCode] = useState(DEFAULT_PYTHON_CODE);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorToast, setErrorToast] = useState(null);
  const [toastType, setToastType] = useState("error");
  const [copiedCode, setCopiedCode] = useState(false);
  const [selectedIssueIndex, setSelectedIssueIndex] = useState(null);

  // Backend connection & Settings state
  const [backendStatus, setBackendStatus] = useState({ connected: false, loading: true });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [customBackendUrl, setCustomBackendUrl] = useState(getBackendUrl());
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState(getGeminiApiKey());
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState(null);

  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);

  // Auto-detect backend status on mount
  useEffect(() => {
    checkBackendHealth().then((res) => {
      setBackendStatus(res);
    });
  }, []);

  // Save settings handler
  const handleSaveSettings = () => {
    setBackendUrl(customBackendUrl);
    setGeminiApiKey(geminiApiKeyInput);
    setIsSettingsOpen(false);
    checkBackendHealth(customBackendUrl).then(setBackendStatus);
    setToastType("info");
    setErrorToast("API configuration saved successfully.");
  };

  // Test connection handler
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionTestResult(null);
    const res = await checkBackendHealth(customBackendUrl);
    setTestingConnection(false);
    setConnectionTestResult(res);
    if (res.connected) {
      setBackendStatus(res);
    }
  };

  // Capture editor instance when Monaco mounts
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  };

  // Map issues to Monaco editor line decorations and glyph margins
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const editor = editorRef.current;
    const monaco = monacoRef.current;

    if (!analysis || !analysis.issues || analysis.issues.length === 0) {
      // Clear decorations
      if (editor.deltaDecorations) {
        decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
      }
      return;
    }

    const newDecorations = analysis.issues.map((issue) => {
      const isHigh = issue.severity === "HIGH";
      const isMedium = issue.severity === "MEDIUM";

      return {
        range: new monaco.Range(
          issue.line_start,
          1,
          issue.line_end,
          1
        ),
        options: {
          isWholeLine: true,
          className: isHigh
            ? "monaco-issue-high-line"
            : isMedium
              ? "monaco-issue-medium-line"
              : "monaco-issue-low-line",
          glyphMarginClassName: isHigh
            ? "monaco-issue-high-glyph"
            : isMedium
              ? "monaco-issue-medium-glyph"
              : "monaco-issue-low-glyph",
          hoverMessage: {
            value: `**[${issue.severity} SEVERITY ISSUE]**\n\n${issue.description}\n\n**Recommendation:**\n${issue.recommendation}`,
          },
        },
      };
    });

    if (editor.deltaDecorations) {
      decorationsRef.current = editor.deltaDecorations(
        decorationsRef.current,
        newDecorations
      );
    }
  }, [analysis]);

  // Jump to specific issue lines in the editor
  const jumpToIssue = (issue, index) => {
    setSelectedIssueIndex(index);
    if (editorRef.current) {
      editorRef.current.revealLineInCenter(issue.line_start);
      editorRef.current.setPosition({ lineNumber: issue.line_start, column: 1 });
      editorRef.current.focus();
    }
  };

  // Copy refactored code to clipboard
  const handleCopyRefactored = () => {
    if (!analysis?.refactored_code) return;
    navigator.clipboard.writeText(analysis.refactored_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Main Analysis function with fallback and engine reporting
  const runAnalysis = async () => {
    if (!code.trim()) {
      setErrorToast("Please enter or paste Python code to analyze.");
      setToastType("error");
      return;
    }

    setLoading(true);
    setErrorToast(null);
    setSelectedIssueIndex(null);

    try {
      const result = await analyzeCode(code, "python");
      setAnalysis(result);
      if (result._engineNotice) {
        setToastType("info");
        setErrorToast(result._engineNotice);
      }
    } catch (err) {
      console.warn("Analysis error:", err.message);
      setToastType("error");
      setErrorToast(err.message || "Failed to inspect code snippet.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="app-root"
      className="h-screen w-full bg-slate-950 text-slate-200 flex flex-col font-sans overflow-hidden select-text"
    >
      {/* Toast Notification */}
      {errorToast && (
        <div
          id="status-toast"
          className={`fixed top-16 right-6 z-50 max-w-md p-4 rounded-xl border shadow-2xl flex items-start gap-3 backdrop-blur-md transition-all duration-300 ${toastType === "error"
            ? "bg-red-950/80 border-red-800/80 text-red-200"
            : "bg-slate-900/90 border-slate-700/80 text-slate-200"
            }`}
        >
          {toastType === "error" ? (
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          ) : (
            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-sm leading-relaxed">
            <p className="font-semibold mb-0.5">
              {toastType === "error" ? "Connection Notice" : "Live AI Analysis"}
            </p>
            <p className="text-xs opacity-90">{errorToast}</p>
          </div>
          <button
            id="dismiss-toast-btn"
            onClick={() => setErrorToast(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header / Navbar */}
      <header
        id="navbar"
        className="h-16 px-6 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md flex items-center justify-between shrink-0 z-10"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Code2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              AI Code Explainer & Refactorer
            </h1>
            <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Python AST & Complexity Inspector
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2.5">
          {/* Preset Selector */}
          <div className="hidden md:flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
            <span className="text-xs text-slate-400 px-2 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Presets:
            </span>
            {SAMPLE_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                id={`preset-btn-${idx}`}
                onClick={() => {
                  setCode(preset.code);
                  setAnalysis(null);
                }}
                title={preset.description}
                className="px-2.5 py-1 text-xs rounded-md font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              >
                {preset.name.split(" ")[0]}
              </button>
            ))}
          </div>

          {/* Connection Status Badge */}
          <button
            id="connection-status-btn"
            onClick={() => setIsSettingsOpen(true)}
            title="Click to configure Backend URL or Gemini API Key"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer bg-slate-900 hover:bg-slate-850"
          >
            {backendStatus.connected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-emerald-300">FastAPI: Online</span>
              </>
            ) : geminiApiKeyInput ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-purple-300">Gemini: Client API</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                <span className="text-blue-300">GitHub Pages Mode</span>
              </>
            )}
          </button>

          {/* Settings Button */}
          <button
            id="open-settings-btn"
            onClick={() => {
              setCustomBackendUrl(getBackendUrl());
              setGeminiApiKeyInput(getGeminiApiKey());
              setConnectionTestResult(null);
              setIsSettingsOpen(true);
            }}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all cursor-pointer"
            title="API & Backend Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Analyze Code Primary Button */}
          <button
            id="analyze-code-btn"
            onClick={runAnalysis}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 active:scale-[0.98] text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Analyzing Code...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current text-white" />
                <span>Analyze Code</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Body: Two-Pane Split View */}
      <main id="main-content" className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 min-h-0 overflow-hidden">

        {/* LEFT PANE: Monaco Code Editor */}
        <section
          id="editor-panel"
          className="flex flex-col bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl"
        >
          {/* Editor Subheader */}
          <div className="h-10 px-4 bg-slate-950/70 border-b border-slate-800/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
              <Terminal className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-semibold text-slate-200">main.py</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/50">
                Python 3
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="reset-code-btn"
                onClick={() => {
                  setCode(DEFAULT_PYTHON_CODE);
                  setAnalysis(null);
                  setSelectedIssueIndex(null);
                }}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-800/70 transition-colors"
                title="Reset to default vulnerable function"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>
          </div>

          {/* Monaco Editor Container */}
          <div id="monaco-container" className="flex-1 w-full min-h-0 relative">
            <Editor
              height="100%"
              defaultLanguage="python"
              language="python"
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || "")}
              onMount={handleEditorDidMount}
              options={{
                fontSize: 13.5,
                lineHeight: 22,
                fontFamily: "JetBrains Mono, Fira Code, Menlo, monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 14, bottom: 14 },
                glyphMargin: true,
                renderLineHighlight: "all",
                cursorBlinking: "smooth",
                smoothScrolling: true,
                tabSize: 4,
                suggestOnTriggerCharacters: true,
              }}
            />
          </div>

          {/* Editor Footer Status Bar */}
          <div className="h-7 px-4 bg-slate-950/90 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-slate-500 shrink-0">
            <div className="flex items-center gap-3">
              <span>Lines: {code.split("\n").length}</span>
              <span>Characters: {code.length}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
              Monaco Editor (vs-dark)
            </div>
          </div>
        </section>

        {/* RIGHT PANE: Analysis Results */}
        <section
          id="results-panel"
          className="flex flex-col bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl min-h-0"
        >
          {/* Results Header */}
          <div className="h-10 px-4 bg-slate-950/70 border-b border-slate-800/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Inspection & Refactor Report</span>
            </div>

            {analysis && (
              <div className="flex items-center gap-2 text-[11px]">
                {analysis._engine && (
                  <span
                    className={`px-2 py-0.5 rounded font-mono font-medium border ${
                      analysis._engine === "backend"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                        : analysis._engine === "gemini-direct"
                          ? "bg-purple-500/10 border-purple-500/30 text-purple-300"
                          : "bg-blue-500/10 border-blue-500/30 text-blue-300"
                    }`}
                  >
                    {analysis._engine === "backend" && "⚡ FastAPI"}
                    {analysis._engine === "gemini-direct" && "✨ Gemini Direct"}
                    {analysis._engine === "demo-preset" && "🛡️ Verified Preset"}
                    {analysis._engine === "demo-heuristic" && "🔍 Static Heuristic"}
                  </span>
                )}
                <span className="flex items-center gap-1 text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                  <AlertTriangle className="w-3 h-3" />
                  {analysis.issues.length} {analysis.issues.length === 1 ? "Issue" : "Issues"}
                </span>
              </div>
            )}
          </div>

          {/* Scrollable Results Area */}
          <div id="results-scroll-container" className="flex-1 overflow-y-auto p-5 space-y-6">
            {loading ? (
              // Loading Skeleton State
              <div id="analysis-loading" className="h-full min-h-[360px] flex flex-col items-center justify-center text-center p-8">
                <div className="relative mb-4">
                  <div className="w-16 h-16 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin flex items-center justify-center"></div>
                  <Sparkles className="w-6 h-6 text-purple-400 absolute inset-0 m-auto animate-pulse" />
                </div>
                <h3 className="text-base font-semibold text-slate-200 mb-1">
                  Inspecting Python AST & Complexity...
                </h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  Detecting runtime bottlenecks, auditing memory profiles, and synthesizing clean refactored code.
                </p>
              </div>
            ) : analysis ? (
              // Analysis Content (3 Distinct Sections)
              <>
                {/* SECTION 1: Explanation & Complexity */}
                <div id="section-explanation" className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-blue-400" />
                      1. Explanation & Complexity
                    </h2>
                  </div>

                  {/* Summary Card */}
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-sm leading-relaxed text-slate-300">
                    <p>{analysis.summary}</p>
                  </div>

                  {/* Badges: Time & Space Complexity */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Time Complexity Badge */}
                    <div
                      id="time-complexity-badge"
                      className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center gap-3"
                    >
                      <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-mono font-medium text-slate-400 block">
                          Time Complexity
                        </span>
                        <span className="text-sm font-bold text-amber-300 font-mono truncate block">
                          {analysis.time_complexity}
                        </span>
                      </div>
                    </div>

                    {/* Space Complexity Badge */}
                    <div
                      id="space-complexity-badge"
                      className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center gap-3"
                    >
                      <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                        <Database className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-mono font-medium text-slate-400 block">
                          Space Complexity
                        </span>
                        <span className="text-sm font-bold text-blue-300 font-mono truncate block">
                          {analysis.space_complexity}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: Detected Issues */}
                <div id="section-detected-issues" className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      2. Detected Issues ({analysis.issues.length})
                    </h2>
                    <span className="text-[11px] text-slate-500">
                      Click any card to highlight in editor
                    </span>
                  </div>

                  {analysis.issues.length === 0 ? (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-3 text-sm">
                      <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                      <span>No critical issues or vulnerabilities detected in this snippet.</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {analysis.issues.map((issue, idx) => {
                        const isHigh = issue.severity === "HIGH";
                        const isMedium = issue.severity === "MEDIUM";
                        const isSelected = selectedIssueIndex === idx;

                        return (
                          <div
                            key={idx}
                            id={`issue-card-${idx}`}
                            onClick={() => jumpToIssue(issue, idx)}
                            className={`p-4 rounded-xl border transition-all cursor-pointer ${isSelected
                              ? "ring-2 ring-indigo-500 border-transparent shadow-lg"
                              : ""
                              } ${isHigh
                                ? "bg-red-500/10 border-red-500/20 hover:border-red-500/40 text-red-400"
                                : isMedium
                                  ? "bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40 text-amber-300"
                                  : "bg-blue-500/10 border-blue-500/20 hover:border-blue-500/40 text-blue-300"
                              }`}
                          >
                            {/* Issue Header */}
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono tracking-wide ${isHigh
                                    ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                    : isMedium
                                      ? "bg-amber-500/20 text-amber-200 border border-amber-500/30"
                                      : "bg-blue-500/20 text-blue-200 border border-blue-500/30"
                                    }`}
                                >
                                  {issue.severity} SEVERITY
                                </span>
                                <span className="text-xs font-mono text-slate-400">
                                  Lines {issue.line_start}–{issue.line_end}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400 hover:text-slate-200 underline flex items-center gap-1 font-mono">
                                Jump to line →
                              </span>
                            </div>

                            {/* Issue Description */}
                            <p className="text-sm font-medium text-slate-200 mb-2 leading-relaxed">
                              {issue.description}
                            </p>

                            {/* Issue Recommendation */}
                            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 leading-relaxed font-sans">
                              <span className="font-semibold text-indigo-300 block mb-0.5">
                                Recommendation:
                              </span>
                              {issue.recommendation}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* SECTION 3: Refactored Code */}
                <div id="section-refactored-code" className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      3. Refactored Code
                    </h2>
                    <button
                      id="copy-refactored-btn"
                      onClick={handleCopyRefactored}
                      className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Code</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Refactored Code Block */}
                  <div className="rounded-xl border border-slate-800 overflow-hidden bg-black shadow-2xl">
                    <div className="px-4 py-2 bg-slate-950 border-b border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Optimized & Sanitized Output
                      </span>
                      <span>python</span>
                    </div>
                    <pre className="p-4 text-xs sm:text-sm font-mono overflow-x-auto leading-relaxed text-emerald-400 max-h-[380px] selection:bg-emerald-950 selection:text-emerald-200">
                      <code>{analysis.refactored_code}</code>
                    </pre>
                  </div>
                </div>
              </>
            ) : (
              // Empty State before analysis is executed
              <div id="results-empty-state" className="h-full min-h-[380px] flex flex-col items-center justify-center text-center p-8 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600/20 to-purple-600/20 border border-indigo-500/20 flex items-center justify-center">
                  <Play className="w-6 h-6 text-indigo-400 fill-indigo-400/30 ml-0.5" />
                </div>
                <div className="max-w-sm space-y-1">
                  <h3 className="text-base font-semibold text-slate-200">
                    Ready for Code Inspection
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Click the <strong className="text-indigo-300">"Analyze Code"</strong> button above to inspect this snippet for algorithmic complexity, security vulnerabilities, and generate clean refactored code.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-left w-full max-w-sm pt-2">
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs">
                    <span className="font-semibold text-slate-300 block mb-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" /> Big-O Complexity
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Analyzes worst-case time & memory bounds
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs">
                    <span className="font-semibold text-slate-300 block mb-0.5 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-red-400" /> Security Audit
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Pinpoints SQLi, injection & path traversal
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div
          id="settings-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsSettingsOpen(false)}
        >
          <div
            id="settings-modal"
            className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-950/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">API & Backend Settings</h3>
                  <p className="text-xs text-slate-400">Configure connection mode for local development and GitHub Pages</p>
                </div>
              </div>
              <button
                id="close-settings-btn"
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* SECTION 1: FastAPI Backend */}
              <div className="space-y-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Server className="w-4 h-4 text-emerald-400" />
                    1. FastAPI Backend Server
                  </label>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-medium flex items-center gap-1.5 ${
                      backendStatus.connected
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-slate-800 text-slate-400 border border-slate-700"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        backendStatus.connected ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
                      }`}
                    ></span>
                    {backendStatus.connected ? "Connected" : "Offline"}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Default local endpoint is <code className="text-indigo-300 font-mono">http://127.0.0.1:8000</code>. In Vite dev mode, requests to <code className="text-indigo-300 font-mono">/api</code> are automatically proxied to this backend.
                </p>

                <div className="flex items-center gap-2">
                  <input
                    id="backend-url-input"
                    type="text"
                    value={customBackendUrl}
                    onChange={(e) => setCustomBackendUrl(e.target.value)}
                    placeholder="e.g. http://127.0.0.1:8000 or custom deployed URL"
                    className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    id="test-connection-btn"
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs font-medium text-slate-200 border border-slate-700 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {testingConnection ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    <span>Test</span>
                  </button>
                </div>

                {/* Connection Test Feedback */}
                {connectionTestResult && (
                  <div
                    className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                      connectionTestResult.connected
                        ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                        : "bg-red-500/10 border border-red-500/30 text-red-300"
                    }`}
                  >
                    {connectionTestResult.connected ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                        <span>Successfully connected to FastAPI! Model: {connectionTestResult.model}</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                        <span>Could not reach backend at this URL ({connectionTestResult.error})</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* SECTION 2: Direct Gemini API (Client-side) */}
              <div className="space-y-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Key className="w-4 h-4 text-purple-400" />
                    2. Direct Google Gemini API Key (Client-Side)
                  </label>
                  <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                    GitHub Pages Ready
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  When deployed on GitHub Pages (or whenever your backend is offline), you can provide your own Gemini API Key to run live, real-time code inspections directly in the browser. Stored only in your local browser storage.
                </p>

                <input
                  id="gemini-key-input"
                  type="password"
                  value={geminiApiKeyInput}
                  onChange={(e) => setGeminiApiKeyInput(e.target.value)}
                  placeholder="Paste your Google Gemini API Key (AIzaSy...)"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />

                <div className="flex items-center justify-between pt-1">
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 underline underline-offset-2"
                  >
                    <span>Get a free Gemini API key on Google AI Studio</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* SECTION 3: GitHub Pages Showcase Info */}
              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200 space-y-1.5">
                <div className="font-semibold flex items-center gap-1.5 text-blue-300">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  GitHub Pages Showcase & Demo Mode
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  The 3 preset examples (<strong className="text-white">SQL Injection</strong>, <strong className="text-white">Fibonacci O(2^N)</strong>, and <strong className="text-white">Path Traversal</strong>) are pre-verified to deliver comprehensive AST inspections, complexity breakdowns, and refactored code instantly with zero setup!
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-800/80 bg-slate-950/70 flex items-center justify-between">
              <button
                id="reset-settings-btn"
                onClick={() => {
                  setCustomBackendUrl("");
                  setGeminiApiKeyInput("");
                  setBackendUrl("");
                  setGeminiApiKey("");
                  setConnectionTestResult(null);
                  checkBackendHealth("").then(setBackendStatus);
                }}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                Reset to Defaults
              </button>
              <div className="flex items-center gap-2">
                <button
                  id="cancel-settings-btn"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="save-settings-btn"
                  onClick={handleSaveSettings}
                  className="px-5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}