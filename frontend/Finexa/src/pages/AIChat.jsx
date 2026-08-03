import { useEffect, useRef, useState } from "react";
import api from "../lib/axios.js";
import Button from "../components/ui/Button.jsx";
import { Send, Trash2 } from "lucide-react";

const AIChat = () => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  const clear = () => setMessages([]);

  const showMyWeek = async () => {
    try {
      const res = await api.get("/ai/context");
      const { accountBalance, transactions } = res.data;
      const header = `Account balance: $${accountBalance.toFixed(2)}`;
      const lines = transactions.length
        ? transactions
            .map(
              (t) =>
                `${t.date || ""}: ${t.type} $${t.amount.toFixed(2)} — ${t.category || "uncategorized"}${t.description ? ` — ${t.description}` : ""}`,
            )
            .join("\n")
        : "No transactions in the last 7 days.";

      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: `${header}\n\nRecent transactions:\n${lines}`,
        },
      ]);
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || "Failed to fetch context";
      setMessages((m) => [
        ...m,
        { role: "assistant", text: `Error: ${message}` },
      ]);
    }
  };

  const send = async () => {
    if (!prompt.trim()) return;
    const userMsg = { role: "user", text: prompt };
    const pendingId = `pending-${Date.now()}`;
    const pendingAssistant = {
      role: "assistant",
      text: "Thinking...",
      pending: true,
      id: pendingId,
    };
    setMessages((m) => [...m, userMsg, pendingAssistant]);
    setLoading(true);
    try {
      const res = await api.post("/ai/chat", { prompt, includeContext: true });
      const reply = res.data?.reply || "(no response)";
      // replace pending assistant message with the real reply
      setMessages((m) =>
        m.map((msg) =>
          msg.id === pendingId ? { role: "assistant", text: reply } : msg,
        ),
      );
      setPrompt("");
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.details ||
        err.message ||
        "Unable to reach AI";
      // replace pending assistant with error
      setMessages((m) =>
        m.map((msg) =>
          msg.id === pendingId
            ? { role: "assistant", text: `Error: ${message}` }
            : msg,
        ),
      );
      alert(`AI error: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight">AI Chat</h1>
        <p className="text-sm text-text-secondary mt-1.5 max-w-2xl">
          Ask the AI about your finances — budgeting tips, transaction analysis,
          or general money advice.
        </p>
      </div>

      <div className="bg-card-background rounded-3xl border border-border-color p-6 flex flex-col h-[70vh]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="text-sm font-semibold text-text-primary">
              Model:
            </div>
            <select className="px-3 py-1 rounded-md border border-border-color bg-transparent text-sm">
              <option>Default</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={showMyWeek}
              title="Show my week"
              className="text-sm text-text-secondary hover:text-text-primary p-2 rounded-md"
            >
              Show my week
            </button>
            <button
              onClick={clear}
              title="Clear chat"
              className="text-sm text-text-secondary hover:text-text-primary p-2 rounded-md"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div ref={containerRef} className="flex-1 overflow-auto space-y-4 pb-4">
          {messages.length === 0 ? (
            <div className="text-center text-text-secondary mt-12">
              No messages yet. Try asking something like "How can I save $100
              this month?"
            </div>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[80%] mx-4 p-4 rounded-2xl shadow-sm break-words ${
                  m.role === "user"
                    ? "ml-auto bg-violet-600 text-white"
                    : "mr-auto bg-slate-800 text-slate-100"
                }`}
              >
                <div className="whitespace-pre-wrap text-base leading-relaxed">
                  {m.text}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (prompt.trim() && !loading) send();
              }
            }}
            rows={1}
            className="flex-1 resize-none px-4 py-3 rounded-2xl border border-border-color bg-transparent text-sm focus:outline-none"
            placeholder="Ask the AI... (Shift+Enter for newline, Enter to send)"
          />
          <Button onClick={send} disabled={loading || !prompt.trim()}>
            {loading ? (
              "Thinking..."
            ) : (
              <div className="flex items-center gap-2">
                <Send size={14} />
                Send
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
