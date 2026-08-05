# Nexus — AI Chat Rewrite Plan

## Goal

Completely rewrite `AIChat.jsx` into a production-ready, ChatGPT-style interface with a professional MediaRecorder-based voice input (no SpeechRecognition reconnect loop). Add the missing `/ai/transcribe` backend endpoint so voice works end-to-end.

## Steps

- [x] Gather context (read AIChat, gemini util, aiController, aiRoutes, axios, Button, Layout, index.css)
- [x] Confirm design direction
- [x] Add `/ai/transcribe` backend endpoint (Groq Whisper) + multer + route
- [x] Rewrite `src/pa/AgesIChat.jsx` from scratch (ChatGPT-style UI, MediaRecorder voice, image upload, persistence, TTS, copy, typing, auto-scroll)
- [x] Install multer dependency
- [x] Verify build passes

## Follow-up: Image/Vision Fix (Groq decommission)

- [x] Diagnose `400 model_decommissioned` for `llama-3.2-90b-vision-preview`
- [x] Confirmed Groq has NO vision-capable models anymore (verified live API)
- [x] Routed image analysis to Google Gemini via `@google/genai` (already a dependency)
- [x] Added `GEMINI_API_KEY` to `backend/.env`
- [x] Rewrote `chatRawWithImage` in `backend/utils/gemini.js` with model fallback list (`gemini-flash-latest`, `gemini-2.0-flash`)
- [x] Live-tested: image analysis returns correct replies (e.g. "Pink", "Coral")
- [x] Verified frontend build passes

## Follow-up: Gemini Neural TTS (Fix robotic AI voice)

- [x] Diagnosed bad voice = browser Web Speech API (`speechSynthesis`)
- [x] Added `textToSpeech()` to `backend/utils/gemini.js` using Gemini `gemini-2.5-flash-preview-tts` (voice: Aoede)
- [x] Added `POST /ai/tts` endpoint (controller + route, protected)
- [x] Rewrote frontend `speakText()` to call backend Gemini TTS and play MP3 via `Audio` element
- [x] Browser Web Speech API kept as fallback if Gemini TTS is unavailable
- [x] Verified backend syntax checks pass
- [x] Live-tested: Gemini TTS returned 182KB of audio (working, free tier, no purchase needed)
