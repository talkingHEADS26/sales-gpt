"use client";

import {
  FormEvent,
  KeyboardEvent,
  useLayoutEffect,
  MouseEvent,
  useRef,
  useState,
} from "react";

import {
  formatDurationLabel,
  MAX_AUDIO_SECONDS_PER_SESSION,
} from "@/lib/usage-limits";
import { useVoiceRecorder } from "./use-voice-recorder";

type ChatInputFormProps = {
  audioSecondsUsed: number;
  disabled?: boolean;
  isAudioLimitReached?: boolean;
  isSending: boolean;
  onAudioUsageUpdate: (audioSecondsUsed: number, limitReached: boolean) => void;
  onSubmitMessage: (content: string) => Promise<boolean>;
  sessionId: string;
};

const TEXTAREA_MIN_HEIGHT = 48;
const TEXTAREA_MAX_HEIGHT = 192;

export function ChatInputForm({
  audioSecondsUsed,
  disabled = false,
  isAudioLimitReached = false,
  isSending,
  onAudioUsageUpdate,
  onSubmitMessage,
  sessionId,
}: ChatInputFormProps) {
  const [content, setContent] = useState("");
  const [isTextareaScrollable, setIsTextareaScrollable] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const voiceRecorder = useVoiceRecorder({
    disabled: disabled || isSending || isAudioLimitReached,
    onTranscription: (text, usage) => {
      setContent((currentContent) =>
        currentContent.trim() ? `${currentContent.trimEnd()} ${text}` : text
      );
      onAudioUsageUpdate(usage.audioSecondsUsed, usage.audioLimitReached);
      textareaRef.current?.focus();
    },
    sessionId,
  });

  useLayoutEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";

    const nextHeight = Math.min(
      Math.max(textarea.scrollHeight, TEXTAREA_MIN_HEIGHT),
      TEXTAREA_MAX_HEIGHT
    );

    textarea.style.height = `${nextHeight}px`;
    setIsTextareaScrollable(textarea.scrollHeight > TEXTAREA_MAX_HEIGHT);
  }, [content]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedContent = content.trim();

    if (!trimmedContent || disabled || isSending) {
      return;
    }

    const wasSent = await onSubmitMessage(trimmedContent);

    if (wasSent) {
      setContent("");
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const handleVoiceButtonClick = (event: MouseEvent<HTMLButtonElement>) => {
    console.log("[voice-recorder] click handler entered");
    console.log("[voice-recorder] preventing default submit");
    event.preventDefault();
    event.stopPropagation();
    void voiceRecorder.toggleRecording();
  };

  const voiceButtonLabel =
    voiceRecorder.status === "recording"
      ? "Aufnahme beenden"
      : voiceRecorder.status === "requesting_permission"
        ? "Mikrofon wird vorbereitet"
      : voiceRecorder.status === "transcribing"
        ? "Transkription laeuft"
        : "Sprachaufnahme starten";

  const voiceStatusText =
    voiceRecorder.status === "requesting_permission"
      ? "Mikrofonberechtigung wird angefragt..."
      : voiceRecorder.status === "recording"
      ? "Aufnahme laeuft..."
      : voiceRecorder.status === "transcribing"
        ? "Sprache wird transkribiert..."
        : voiceRecorder.status === "error"
          ? voiceRecorder.errorMessage
          : "";
  const audioUsageLabel = `${formatDurationLabel(audioSecondsUsed)} / ${formatDurationLabel(
    MAX_AUDIO_SECONDS_PER_SESSION
  )}`;

  return (
    <form
      className="border-t border-white/80 bg-white/88 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 backdrop-blur sm:px-6"
      onSubmit={(event) => void handleSubmit(event)}
    >
      <div className="rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f7faff_100%)] p-3 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
        <div className="flex items-end gap-3">
          <button
            type="button"
            onClick={handleVoiceButtonClick}
            disabled={
              disabled ||
              isSending ||
              isAudioLimitReached ||
              voiceRecorder.status === "requesting_permission" ||
              voiceRecorder.status === "transcribing" ||
              !voiceRecorder.isSupported
            }
            aria-label={voiceButtonLabel}
            aria-pressed={voiceRecorder.status === "recording"}
            className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${
              voiceRecorder.status === "recording"
                ? "border-red-200 bg-red-600 text-white shadow-[0_0_0_6px_rgba(220,38,38,0.12)]"
                : voiceRecorder.status === "requesting_permission"
                  ? "border-slate-200 bg-slate-100 text-[#707070]"
                : voiceRecorder.status === "transcribing"
                  ? "border-slate-200 bg-slate-100 text-[#707070]"
                  : "border-slate-200 bg-white text-[#707070] hover:border-[#0e51a0]/30 hover:text-[#0e51a0]"
            }`}
          >
            <span
              className={
                voiceRecorder.status === "recording"
                  ? "animate-pulse"
                  : undefined
              }
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 1 0 6 0V6a3 3 0 0 0-3-3Z" />
                <path d="M19 10a7 7 0 0 1-14 0" />
                <path d="M12 17v4" />
                <path d="M8 21h8" />
              </svg>
            </span>
          </button>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nachricht schreiben..."
            rows={1}
            disabled={
              disabled ||
              isSending ||
              voiceRecorder.status === "requesting_permission" ||
              voiceRecorder.status === "transcribing"
            }
            style={{
              minHeight: `${TEXTAREA_MIN_HEIGHT}px`,
              maxHeight: `${TEXTAREA_MAX_HEIGHT}px`,
            }}
            className={`flex-1 resize-none rounded-[1.4rem] border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-[#707070] outline-none transition placeholder:text-slate-400 focus:border-[#0e51a0] focus:ring-4 focus:ring-[#0e51a0]/10 disabled:cursor-not-allowed disabled:bg-slate-100 ${
              isTextareaScrollable ? "overflow-y-auto" : "overflow-y-hidden"
            }`}
          />
          <button
            type="submit"
            disabled={disabled || isSending || !content.trim()}
            className="inline-flex h-12 shrink-0 self-end items-center justify-center rounded-full bg-[#0e51a0] px-5 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(14,81,160,0.28)] transition hover:bg-[#0b478b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSending ? "Sende..." : "Senden"}
          </button>
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:flex-nowrap">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              FOKUSSIERTES SALES-TRAINING
            </p>
            <p className="text-[0.7rem] font-medium text-slate-400 sm:text-xs">
              Du trainierst mit einer KI. Auch diese kann mal Fehler machen.
            </p>
            <p className="text-[0.7rem] font-medium text-slate-500 sm:text-xs">
              Audio in dieser Session: {audioUsageLabel}
            </p>
          </div>
          {voiceStatusText ? (
            <p
              className={`text-sm ${
                voiceRecorder.status === "error"
                  ? "text-red-700"
                  : "text-slate-600"
              }`}
            >
              {voiceStatusText}
            </p>
          ) : null}

          {isAudioLimitReached && !voiceStatusText ? (
            <p className="text-sm text-red-700">
              Das Audio-Limit dieser Session wurde erreicht. Textnachrichten sind
              weiterhin möglich.
            </p>
          ) : null}

          {!voiceRecorder.isSupported && voiceRecorder.status === "idle" ? (
            <p className="text-sm text-slate-500">
              Sprachaufnahme wird von diesem Browser nicht unterstuetzt.
            </p>
          ) : null}
        </div>
      </div>
    </form>
  );
}
