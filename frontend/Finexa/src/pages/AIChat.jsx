import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../lib/axios.js";
import Button from "../components/ui/Button.jsx";
import {
  Send,
  Trash2,
  StopCircle,
  Square,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Plus,
  MessageSquare,
  Bot,
  User,
  Sparkles,
  History,
  Loader2,
  ImagePlus,
  X,
  Mic,
} from "lucide-react";

const STORAGE_KEY = "nexus_ai_chats";
const MAX_IMAGE_SIZE_MB = 20;
const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

const SUGGESTIONS = [
  "How can I save more this month?",
  "Give me a budget plan",
  "Financial tips for beginners",
  "Explain my spending habits",
];

/* ============================================================
   Helpers
   ============================================================ */

const getTime = (ts) => {
  try {
    return new Date(ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

const getDateLabel = (ts) =>
  new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });

const isSameDay = (a, b) =>
  new Date(a).toDateString() === new Date(b).toDateString();

const formatDuration = (totalSeconds) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const makeId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const createConversation = () => ({
  id: makeId("chat"),
  title: "New chat",
  createdAt: Date.now(),
  messages: [],
});

const loadChats = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const stopSpeech = () => {
  try {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
  if (audioRef) {
    audioRef.pause();
    audioRef.currentTime = 0;
  }
};

let audioRef = null;

/* ------------------------------------------------------------------
   Text-to-speech via Gemini's neural voices (backend).
   The browser's Web Speech API produces the flat, robotic voices, so we
   route speech through the backend Gemini TTS model for a natural,
   human-sounding result. Falls back to the Web Speech API if the
   backend TTS is unavailable.
   ------------------------------------------------------------------ */
const speakText = async (text, onEnd) => {
  stopSpeech();

  try {
    const res = await api.post("/ai/tts", { text }, { responseType: "blob" });

    if (res.status !== 200) {
      throw new Error("TTS request failed");
    }

    const url = URL.createObjectURL(res.data);
    const audio = new Audio(url);
    audioRef = audio;

    audio.onended = () => {
      URL.revokeObjectURL(url);
      audioRef = null;
      onEnd?.();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      audioRef = null;
      onEnd?.();
    };

    await audio.play();
  } catch (err) {
    // Fallback to the browser's built-in speech synthesis if the backend
    // TTS is unavailable (e.g. no GEMINI_API_KEY or network error).
    audioRef = null;
    if (!("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = 0.9;
    utterance.rate = 1;
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
    window.speechSynthesis.speak(utterance);
  }
};

const isMediaRecorderSupported = () =>
  typeof window !== "undefined" &&
  !!navigator.mediaDevices?.getUserMedia &&
  typeof window.MediaRecorder !== "undefined";

/* Typewriter effect for assistant replies.
   Smoothly reveals text character-by-character for a polished, professional feel. */
const useTypewriter = (text, enabled = true) => {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const [displayed, setDisplayed] = useState(() =>
    !enabled || reduceMotion ? text || "" : "",
  );
  const [done, setDone] = useState(() => !enabled || reduceMotion);

  useEffect(() => {
    if (!enabled || reduceMotion) return;
    setDisplayed("");
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        setDone(true);
      }
    }, 12);
    return () => clearInterval(id);
  }, [text, enabled, reduceMotion]);

  return { displayed, done };
};

/* ============================================================
   Reusable UI pieces
   ============================================================ */

const Avatar = ({ role }) =>
  role === "user" ? (
    <div className="h-9 w-9 shrink-0 rounded-full bg-accent flex items-center justify-center text-white shadow-md shadow-accent/20">
      <User size={16} />
    </div>
  ) : (
    <div className="relative h-9 w-9 shrink-0 rounded-full bg-accent-bg flex items-center justify-center text-accent chat-avatar-bot">
      <Bot size={16} />
      <Sparkles
        size={9}
        className="absolute -top-1 -right-1 text-accent chat-sparkle"
      />
    </div>
  );

const MessageActions = ({ isUser, copied, speaking, onCopy, onSpeak }) => {
  if (isUser) return null;
  return (
    <div className="flex items-center gap-2 mt-2 text-[10px] text-text-secondary">
      <button
        onClick={onCopy}
        title="Copy"
        className="inline-flex items-center gap-1 opacity-60 hover:opacity-100 transition"
      >
        {copied ? <Check size={11} /> : <Copy size={11} />}
        {copied && <span>Copied</span>}
      </button>
      <button
        onClick={onSpeak}
        title={speaking ? "Stop speaking" : "Read aloud"}
        className="inline-flex items-center gap-1 opacity-60 hover:opacity-100 transition"
      >
        {speaking ? <VolumeX size={11} /> : <Volume2 size={11} />}
      </button>
    </div>
  );
};

const MessageBubble = ({ message, copiedId, speakingId, onCopy, onSpeak }) => {
  const isUser = message.role === "user";
  const isPending = message.pending;
  const isSpeaking = speakingId === message.id;
  const isCopied = copiedId === message.id;

  // Only assistant messages get the typewriter effect, and only when they're
  // a completed (non-pending) reply.
  const { displayed, done } = useTypewriter(
    isUser || isPending ? "" : message.text || "",
    !isUser && !isPending,
  );

  const content = isUser || isPending ? message.text : displayed;
  const showCaret = !isUser && !isPending && !done;

  return (
    <div
      className={`flex items-end gap-2 chat-message-pop ${
        isUser ? "flex-row-reverse" : ""
      }`}
    >
      <Avatar role={message.role} />
      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl shadow-sm break-words whitespace-pre-wrap text-base leading-relaxed ${
          isUser
            ? "ml-auto bg-accent text-white rounded-br-sm"
            : "mr-auto bg-surface-alt text-text-primary rounded-bl-sm chat-bubble-lift"
        }`}
      >
        {message.image && (
          <img
            src={message.image}
            alt="Uploaded"
            className="max-h-48 rounded-xl mb-2 chat-image-pop"
          />
        )}
        {isPending ? (
          <div className="flex items-center gap-1.5">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        ) : (
          <>
            {content}
            {showCaret && <span className="chat-caret" />}
          </>
        )}
        {!isPending && (
          <>
            <div className="flex items-center gap-2 mt-2 text-[10px] text-text-secondary">
              <span className={isUser ? "text-white/60" : ""}>
                {getTime(message.ts)}
              </span>
            </div>
            <MessageActions
              isUser={isUser}
              copied={isCopied}
              speaking={isSpeaking}
              onCopy={onCopy}
              onSpeak={onSpeak}
            />
          </>
        )}
      </div>
    </div>
  );
};

/* ============================================================
   Main component
   ============================================================ */

const AIChat = () => {
  const [chats, setChats] = useState(loadChats);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  /* Voice states */
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const voiceSupported = useMemo(() => isMediaRecorderSupported(), []);

  /* Misc UI */
  const [speakingId, setSpeakingId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [attachedImage, setAttachedImage] = useState(null);

  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const promptRef = useRef("");
  const sendRef = useRef(null);

  /* Keep prompt in a ref so async handlers always read current value */
  useEffect(() => {
    promptRef.current = prompt;
  }, [prompt]);

  /* Keep latest send function in a ref to avoid stale closures */
  const send = useCallback(
    async (textOverride) => {
      const currentText = (textOverride ?? promptRef.current ?? "").trim();
      if (!currentText || sendRef.current) return;

      const startSend = async () => {
        /* Build the user message */
        const userMsg = {
          role: "user",
          text: currentText,
          image: attachedImage?.dataUrl || null,
          ts: Date.now(),
        };
        const pendingMsg = {
          role: "assistant",
          text: "",
          pending: true,
          id: makeId("pending"),
          ts: Date.now(),
        };

        const next = [...messages, userMsg, pendingMsg];
        setMessages(next);
        setPrompt("");
        setAttachedImage(null);
        setLoading(true);

        /* Auto-title the conversation from the first user message */
        if (activeId) {
          setChats((prev) =>
            prev.map((c) =>
              c.id === activeId && c.title === "New chat"
                ? {
                    ...c,
                    title: (currentText.split("\n")[0] || "New chat").slice(
                      0,
                      40,
                    ),
                  }
                : c,
            ),
          );
        }

        try {
          const res = await api.post("/ai/chat", {
            prompt: currentText,
            includeContext: true,
            image: userMsg.image || undefined,
          });
          const reply = res.data?.reply || "(no response)";
          const final = next.map((m) =>
            m.id === pendingMsg.id
              ? { role: "assistant", text: reply, ts: Date.now() }
              : m,
          );
          setMessages(final);
        } catch (err) {
          const message =
            err.response?.data?.message ||
            err.response?.data?.details ||
            err.message ||
            "Unable to reach AI";
          const final = next.map((m) =>
            m.id === pendingMsg.id
              ? { role: "assistant", text: `Error: ${message}`, ts: Date.now() }
              : m,
          );
          setMessages(final);
        } finally {
          setLoading(false);
        }
      };

      sendRef.current = true;
      startSend().finally(() => {
        sendRef.current = false;
      });
    },
    [messages, attachedImage],
  );

  /* Persist chats whenever they change (and title auto-rename) */
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
    } catch {
      /* ignore */
    }
  }, [chats]);

  useEffect(() => {
    if (!activeId) return;
    setChats((prev) =>
      prev.map((c) => {
        if (c.id !== activeId) return c;
        const firstUser = c.messages.find((m) => m.role === "user");
        if (!firstUser) return c;
        const title = firstUser.text?.split("\n")[0].slice(0, 40) || "New chat";
        return c.title === "New chat" ? { ...c, title } : c;
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, messages]);

  /* Auto-scroll to bottom */
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, loading, recordingSeconds]);

  /* Cleanup on unmount */
  useEffect(() => {
    return () => {
      stopSpeech();
      audioStreamRef.current?.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  /* Auto-grow the textarea */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [prompt]);

  /* Recording ticker */
  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => {
      setRecordingSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [recording]);

  /* ---------- Chat actions ---------- */

  const newChat = useCallback(() => {
    stopSpeech();
    const convo = createConversation();
    setChats((prev) => [convo, ...prev]);
    setActiveId(convo.id);
    setMessages([]);
    setAttachedImage(null);
    setShowHistory(false);
  }, []);

  const openChat = useCallback(
    (id) => {
      stopSpeech();
      const convo = chats.find((c) => c.id === id);
      if (!convo) return;
      setActiveId(id);
      setMessages(convo.messages || []);
      setAttachedImage(null);
      setShowHistory(false);
    },
    [chats],
  );

  const deleteChat = useCallback(
    (id) => {
      stopSpeech();
      setChats((prev) => prev.filter((c) => c.id !== id));
      if (id === activeId) {
        setActiveId(null);
        setMessages([]);
      }
    },
    [activeId],
  );

  const clearChat = useCallback(() => {
    stopSpeech();
    setMessages([]);
    setAttachedImage(null);
    setChats((prev) =>
      prev.map((c) =>
        c.id === activeId ? { ...c, messages: [], title: "New chat" } : c,
      ),
    );
  }, [activeId]);

  /* ---------- Copy / Speech ---------- */

  const copyMessage = useCallback(async (id, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleSpeak = useCallback(
    (id, text) => {
      if (speakingId === id) {
        stopSpeech();
        setSpeakingId(null);
        return;
      }
      stopSpeech();
      setSpeakingId(id);
      speakText(text, () => setSpeakingId(null));
    },
    [speakingId],
  );

  /* ---------- Image upload ---------- */

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setVoiceError?.(); // no-op placeholder
      alert("Please select a PNG, JPG, JPEG, or WEBP image.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      alert(`Image must be under ${MAX_IMAGE_SIZE_MB}MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () =>
      setAttachedImage({ name: file.name, dataUrl: reader.result });
    reader.onerror = () => alert("Failed to read the image file.");
    reader.readAsDataURL(file);
  }, []);

  const removeImage = useCallback(() => setAttachedImage(null), []);

  /* ---------- Voice (MediaRecorder) ---------- */

  const startRecording = useCallback(async () => {
    setVoiceError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        // Stop the stream tracks once recording is done.
        stream.getTracks().forEach((t) => t.stop());
        audioStreamRef.current = null;

        if (blob.size === 0) {
          setRecording(false);
          setRecordingSeconds(0);
          return;
        }

        setUploading(true);
        try {
          const form = new FormData();
          form.append(
            "audio",
            blob,
            `recording.${mimeType.includes("mp4") ? "m4a" : "webm"}`,
          );
          const res = await api.post("/ai/transcribe", form, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          const text = (res.data?.text || "").trim();
          if (text) {
            setPrompt((prev) => (prev ? `${prev.trimEnd()} ${text}` : text));
          } else {
            setVoiceError("No speech detected. Please try again.");
          }
        } catch (err) {
          setVoiceError(
            err.response?.data?.message ||
              err.response?.data?.details ||
              "Transcription failed. Please try again.",
          );
        } finally {
          setUploading(false);
          setRecording(false);
          setRecordingSeconds(0);
        }
      };

      recorder.start();
      setRecording(true);
      setRecordingSeconds(0);
    } catch (err) {
      let msg = "Unable to access microphone.";
      if (err?.name === "NotAllowedError") {
        msg =
          "Microphone permission denied. Please allow access in your browser settings.";
      } else if (err?.name === "NotFoundError") {
        msg = "No microphone found on this device.";
      } else if (
        err?.name === "NotReadableError" ||
        err?.name === "AbortError"
      ) {
        msg = "Microphone is in use by another app. Please close it and retry.";
      }
      setVoiceError(msg);
    }
  }, []);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      // Nothing active — just reset UI.
      audioStreamRef.current?.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
      setRecording(false);
      setRecordingSeconds(0);
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (recording) stopRecording();
    else startRecording();
  }, [recording, startRecording, stopRecording]);

  /* ---------- Derived ---------- */

  const activeChat = useMemo(
    () => chats.find((c) => c.id === activeId),
    [chats, activeId],
  );

  const canSend =
    !loading && !uploading && (prompt.trim().length > 0 || !!attachedImage);

  const busy = loading || uploading;

  /* ---------- Render ---------- */

  return (
    <div className="h-full flex flex-col gap-5 min-h-0">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <Bot className="text-accent" size={28} />
            AI Assistant
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Ask about your finances, get insights, chat with images — all in one
            place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeChat && messages.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearChat}
              disabled={busy}
              title="Clear conversation"
            >
              <Trash2 size={14} />
              Clear
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowHistory((s) => !s)}
          >
            <History size={14} />
            History
          </Button>
          <Button variant="primary" size="sm" onClick={newChat}>
            <Plus size={14} />
            New Chat
          </Button>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Sidebar */}
        {showHistory && (
          <aside className="chat-panel-in w-64 shrink-0 bg-card-background rounded-3xl p-3 flex flex-col min-h-0 max-h-full shadow-soft ring-1 ring-border-color/50">
            <div className="flex items-center justify-between px-2 py-2">
              <span className="text-sm font-semibold text-text-primary">
                Conversations
              </span>
              <span className="text-xs text-text-secondary">
                {chats.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {chats.length === 0 ? (
                <p className="text-xs text-text-secondary px-2 py-4 text-center">
                  No conversations yet.
                </p>
              ) : (
                chats.map((c) => (
                  <div
                    key={c.id}
                    className={`chat-history-item group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition ${
                      c.id === activeId
                        ? "bg-accent-bg text-accent shadow-sm"
                        : "hover:bg-surface-alt text-text-primary"
                    }`}
                    onClick={() => openChat(c.id)}
                  >
                    <MessageSquare size={14} className="shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {c.title}
                      </div>
                      <div className="text-[10px] text-text-secondary">
                        {getDateLabel(c.createdAt)}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteChat(c.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-rose-500 transition"
                      title="Delete conversation"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </aside>
        )}

        {/* Chat panel */}
        <section className="flex-1 bg-card-background rounded-3xl flex flex-col min-h-0 overflow-hidden shadow-soft ring-1 ring-border-color/50">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border-color/60">
            <div className="flex items-center gap-2">
              <div
                className={`chat-status-dot h-2 w-2 rounded-full ${
                  recording ? "bg-rose-500 animate-pulse" : "bg-emerald-500"
                }`}
              />
              <span className="text-sm text-text-secondary">
                {recording
                  ? "Recording..."
                  : activeChat
                    ? activeChat.title
                    : "New chat"}
              </span>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={containerRef}
            className="flex-1 overflow-y-auto p-5 space-y-4"
          >
            {messages.length === 0 ? (
              <div className="relative h-full flex flex-col items-center justify-center text-center px-6">
                {/* Floating decorative sparkles */}
                <Sparkles
                  size={16}
                  className="absolute top-[18%] left-[22%] text-accent opacity-40 chat-sparkle-float"
                />
                <Sparkles
                  size={12}
                  className="absolute top-[28%] right-[20%] text-accent opacity-30 chat-sparkle-float"
                  style={{ animationDelay: "0.8s" }}
                />
                <Sparkles
                  size={18}
                  className="absolute bottom-[22%] left-[28%] text-accent opacity-25 chat-sparkle-float"
                  style={{ animationDelay: "1.4s" }}
                />
                <Sparkles
                  size={11}
                  className="absolute bottom-[30%] right-[26%] text-accent opacity-35 chat-sparkle-float"
                  style={{ animationDelay: "2s" }}
                />

                <div className="h-16 w-16 rounded-2xl bg-accent-bg flex items-center justify-center mb-4 chat-avatar-bot">
                  <Sparkles className="text-accent" size={28} />
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-2">
                  How can I help you today?
                </h3>
                <p className="text-sm text-text-secondary max-w-md mb-6">
                  Ask about your finances, upload a screenshot, or try one of
                  these suggestions.
                </p>
                <div className="flex flex-wrap justify-center gap-2 max-w-xl">
                  {SUGGESTIONS.map((s, idx) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      disabled={busy}
                      className="chat-chip px-3.5 py-2 rounded-full text-sm bg-surface-alt text-text-primary hover:bg-accent-bg hover:text-accent transition disabled:opacity-50"
                      style={{ animationDelay: `${idx * 0.12}s` }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((m, i) => {
                  const showDate =
                    i === 0 || !isSameDay(messages[i - 1].ts, m.ts);
                  return (
                    <div key={m.id || `msg-${i}`}>
                      {showDate && (
                        <div className="flex items-center gap-3 my-4">
                          <div className="flex-1 h-px bg-border-color/50" />
                          <span className="text-[11px] text-text-secondary">
                            {getDateLabel(m.ts)}
                          </span>
                          <div className="flex-1 h-px bg-border-color/50" />
                        </div>
                      )}
                      <MessageBubble
                        message={m}
                        copiedId={copiedId}
                        speakingId={speakingId}
                        onCopy={() => copyMessage(m.id, m.text)}
                        onSpeak={() => toggleSpeak(m.id, m.text)}
                      />
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Input */}
          <div className="p-4">
            {/* Attached image preview */}
            {attachedImage && (
              <div className="relative inline-block mb-2 chat-image-pop">
                <img
                  src={attachedImage.dataUrl}
                  alt="Attached"
                  className="h-24 w-24 object-cover rounded-xl shadow-soft"
                />
                <button
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md hover:bg-rose-600 transition"
                  title="Remove image"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Voice error */}
            {voiceError && (
              <div className="mb-2 flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                <span>{voiceError}</span>
                <button
                  onClick={() => setVoiceError(null)}
                  className="shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <div className="flex items-end gap-2 bg-surface-alt rounded-2xl p-2 shadow-inner">
              {/* Voice / stop button */}
              {recording ? (
                <button
                  onClick={toggleRecording}
                  title="Stop recording"
                  className="h-11 w-11 shrink-0 rounded-xl flex items-center justify-center bg-rose-500 text-white shadow-lg shadow-rose-500/30"
                >
                  <Square size={18} />
                </button>
              ) : (
                <button
                  onClick={toggleRecording}
                  disabled={!voiceSupported || uploading}
                  title={
                    voiceSupported
                      ? "Record voice message"
                      : "Voice input not supported in this browser"
                  }
                  className="h-11 w-11 shrink-0 rounded-xl flex items-center justify-center text-text-secondary hover:text-accent hover:bg-surface transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <MicIcon upload={uploading} />
                </button>
              )}

              {/* Image upload */}
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Upload image"
                disabled={busy || recording}
                className="h-11 w-11 shrink-0 rounded-xl flex items-center justify-center text-text-secondary hover:text-accent hover:bg-surface transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ImagePlus size={18} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpg,image/jpeg,image/webp"
                className="hidden"
                onChange={handleFileSelect}
              />

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (canSend) send();
                  }
                }}
                rows={1}
                className="flex-1 resize-none bg-transparent px-2 py-3 text-sm focus:outline-none placeholder:text-tertiary max-h-40"
                placeholder={
                  recording
                    ? "Recording... speak now"
                    : "Ask about your finances, or upload an image..."
                }
              />

              {/* Send */}
              <Button
                onClick={() => send()}
                disabled={!canSend}
                title="Send message"
                className={`h-11 shrink-0 ${canSend ? "chat-send-glow" : ""}`}
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </Button>
            </div>

            {/* Status line */}
            <div className="flex items-center justify-center gap-2 text-[10px] text-text-tertiary mt-2">
              {uploading ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 size={11} className="animate-spin" />
                  Transcribing audio...
                </span>
              ) : recording ? (
                <span className="inline-flex items-center gap-1.5 text-rose-500">
                  <StopCircle size={11} />
                  Recording {formatDuration(recordingSeconds)} — press stop to
                  transcribe
                </span>
              ) : (
                <span>
                  {voiceSupported
                    ? "Nexus AI can make mistakes. Verify important information."
                    : "Voice input is not supported in this browser."}
                </span>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

/* Small mic icon helper that shows a spinner while uploading */
const MicIcon = ({ upload }) =>
  upload ? <Loader2 size={18} className="animate-spin" /> : <Mic size={18} />;

export default AIChat;
