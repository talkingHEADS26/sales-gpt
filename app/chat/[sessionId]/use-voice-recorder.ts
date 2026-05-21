"use client";

import { useEffect, useRef, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase";
import { MAX_AUDIO_SECONDS_PER_SESSION } from "@/lib/usage-limits";

type VoiceRecorderStatus =
  | "idle"
  | "requesting_permission"
  | "recording"
  | "transcribing"
  | "error";

type TranscribeSuccessResponse = {
  audioLimitReached: boolean;
  audioLimitSeconds: number;
  audioSecondsUsed: number;
  remainingAudioSeconds: number;
  success: true;
  text: string;
};

type TranscribeErrorResponse = {
  code?: string;
  error?: string;
  remainingAudioSeconds?: number;
  success?: false;
};

type AudioUsageUpdate = {
  audioLimitReached: boolean;
  audioLimitSeconds: number;
  audioSecondsUsed: number;
  remainingAudioSeconds: number;
};

type UseVoiceRecorderOptions = {
  disabled?: boolean;
  onTranscription: (text: string, usage: AudioUsageUpdate) => void;
  sessionId: string;
};

type UseVoiceRecorderResult = {
  errorMessage: string;
  isSupported: boolean;
  startRecording: () => Promise<void>;
  status: VoiceRecorderStatus;
  stopRecording: () => void;
  toggleRecording: () => Promise<void>;
};

function logVoice(message: string, details?: Record<string, unknown>) {
  if (details) {
    console.log(`[voice-recorder] ${message}`, details);
    return;
  }

  console.log(`[voice-recorder] ${message}`);
}

function createTimeoutError(message: string) {
  const error = new Error(message);
  error.name = "TimeoutError";
  return error;
}

function stopMediaStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function useVoiceRecorder({
  disabled = false,
  onTranscription,
  sessionId,
}: UseVoiceRecorderOptions): UseVoiceRecorderResult {
  const [status, setStatus] = useState<VoiceRecorderStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const audioChunksRef = useRef<BlobPart[]>([]);
  const disabledRef = useRef(disabled);
  const isMountedRef = useRef(true);
  const isStartingRef = useRef(false);
  const isStoppingRef = useRef(false);
  const isTranscribingRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mimeTypeRef = useRef("audio/webm");
  const recordingStartedAtRef = useRef<number | null>(null);
  const statusRef = useRef<VoiceRecorderStatus>("idle");
  const stopRequestedDuringStartRef = useRef(false);

  const isSupported =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices !== "undefined" &&
    typeof navigator.mediaDevices.getUserMedia === "function" &&
    typeof MediaRecorder !== "undefined";

  const setRecorderStatus = (nextStatus: VoiceRecorderStatus) => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
  };

  const cleanupRecorder = () => {
    stopMediaStream(mediaStreamRef.current);
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    mimeTypeRef.current = "audio/webm";
    recordingStartedAtRef.current = null;
    isStartingRef.current = false;
    isStoppingRef.current = false;
    stopRequestedDuringStartRef.current = false;
    logVoice("cleanup complete");
  };

  const handleError = (error: unknown, fallbackMessage: string) => {
    const message =
      error instanceof Error ? error.message : fallbackMessage;
    const stack = error instanceof Error ? error.stack : undefined;

    console.error("[voice-recorder] error", error);
    logVoice("error", { message, stack });
    setErrorMessage(message);
    setRecorderStatus("error");
  };

  const transcribeAudio = async (audioBlob: Blob, audioDurationSeconds: number) => {
    const formData = new FormData();
    const extension = mimeTypeRef.current.includes("mp4") ? "m4a" : "webm";
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      throw new Error(
        "Supabase konnte nicht initialisiert werden. Pruefe die Konfiguration."
      );
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const accessToken = session?.access_token;

    if (!accessToken) {
      throw new Error("Keine aktive Session fuer die Sprachaufnahme gefunden.");
    }

    formData.append("audio", audioBlob, `voice-input.${extension}`);
    formData.append("audioDurationSeconds", `${audioDurationSeconds}`);
    formData.append("sessionId", sessionId);

    logVoice("transcribing started", {
      bytes: audioBlob.size,
      type: audioBlob.type,
    });

    const response = await fetch("/api/transcribe", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    const responseBody = (await response.json()) as
      | TranscribeSuccessResponse
      | TranscribeErrorResponse;

    if (!response.ok || !responseBody.success) {
      const errorMessage =
        responseBody.success === false
          ? responseBody.error
          : "Die Sprachaufnahme konnte nicht transkribiert werden.";

      throw new Error(errorMessage);
    }

    const text = responseBody.text.trim();

    if (!text) {
      throw new Error("Die Aufnahme konnte nicht in Text umgewandelt werden.");
    }

    onTranscription(text, {
      audioLimitReached: responseBody.audioLimitReached,
      audioLimitSeconds:
        responseBody.audioLimitSeconds ?? MAX_AUDIO_SECONDS_PER_SESSION,
      audioSecondsUsed: responseBody.audioSecondsUsed,
      remainingAudioSeconds: responseBody.remainingAudioSeconds,
    });
    logVoice("transcribing finished", { textLength: text.length });
  };

  const finalizeStoppedRecording = async () => {
    if (isTranscribingRef.current) {
      return;
    }

    isTranscribingRef.current = true;

    const audioBlob = new Blob(audioChunksRef.current, {
      type: mimeTypeRef.current,
    });

    logVoice("recorder stopped", {
      chunks: audioChunksRef.current.length,
      bytes: audioBlob.size,
    });

    stopMediaStream(mediaStreamRef.current);
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    isStoppingRef.current = false;

    if (!isMountedRef.current) {
      isTranscribingRef.current = false;
      return;
    }

    if (!audioBlob.size) {
      isTranscribingRef.current = false;
      setErrorMessage("Es wurde kein Audio aufgenommen.");
      setRecorderStatus("error");
      return;
    }

    try {
      setRecorderStatus("transcribing");
      const measuredDurationMilliseconds =
        recordingStartedAtRef.current === null
          ? 0
          : Math.max(0, performance.now() - recordingStartedAtRef.current);
      const audioDurationSeconds = Math.max(
        1,
        Math.ceil(measuredDurationMilliseconds / 1000)
      );

      await transcribeAudio(audioBlob, audioDurationSeconds);

      if (!isMountedRef.current) {
        return;
      }

      setErrorMessage("");
      setRecorderStatus("idle");
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      handleError(error, "Die Sprachaufnahme konnte nicht verarbeitet werden.");
    } finally {
      isTranscribingRef.current = false;
      cleanupRecorder();
    }
  };

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  useEffect(() => {
    logVoice("mount");

    return () => {
      logVoice("component unmounted");
      isMountedRef.current = false;

      const mediaRecorder = mediaRecorderRef.current;

      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.ondataavailable = null;
        mediaRecorder.onstop = null;
        mediaRecorder.onerror = null;
        mediaRecorder.stop();
      }

      cleanupRecorder();
    };
  }, []);

  const startRecording = async () => {
    logVoice("start requested", {
      disabled: disabledRef.current,
      isStarting: isStartingRef.current,
      isTranscribing: isTranscribingRef.current,
      recorderState: mediaRecorderRef.current?.state ?? "none",
    });

    const existingRecorder = mediaRecorderRef.current;

    if (disabledRef.current || isTranscribingRef.current) {
      return;
    }

    if (isStartingRef.current) {
      return;
    }

    if (existingRecorder?.state === "recording") {
      return;
    }

    if (!isSupported) {
      setErrorMessage(
        "Sprachaufnahme wird auf diesem Geraet oder Browser nicht unterstuetzt."
      );
      setRecorderStatus("error");
      return;
    }

    try {
      isStartingRef.current = true;
      stopRequestedDuringStartRef.current = false;
      setErrorMessage("");
      setRecorderStatus("requesting_permission");
      logVoice("secure context result", {
        isSecureContext:
          typeof window !== "undefined" ? window.isSecureContext : false,
        hasMediaDevices:
          typeof navigator !== "undefined" && !!navigator.mediaDevices,
        hasGetUserMedia:
          typeof navigator !== "undefined" &&
          !!navigator.mediaDevices?.getUserMedia,
      });

      if (typeof window === "undefined" || !window.isSecureContext) {
        throw new Error(
          "Mikrofonzugriff ist nur in einem sicheren Kontext moeglich. Bitte HTTPS ueber https://abschluss-io.de verwenden."
        );
      }

      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== "function"
      ) {
        throw new Error(
          "Dein Browser unterstuetzt keinen Mikrofonzugriff ueber mediaDevices.getUserMedia."
        );
      }

      if (
        typeof navigator.permissions !== "undefined" &&
        typeof navigator.permissions.query === "function"
      ) {
        try {
          const permissionStatus = await navigator.permissions.query({
            name: "microphone" as PermissionName,
          });

          logVoice("permission status result", {
            state: permissionStatus.state,
          });
        } catch (error) {
          logVoice("permission status result", {
            state: "unavailable",
            message: error instanceof Error ? error.message : "unknown",
          });
        }
      } else {
        logVoice("permission status result", {
          state: "permissions_api_unavailable",
        });
      }

      logVoice("before getUserMedia");
      const getUserMediaPromise = navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      logVoice("after getUserMedia call");
      logVoice("awaiting getUserMedia");

      let timeoutId: number | null = null;

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(() => {
          logVoice("getUserMedia timeout");
          reject(
            createTimeoutError(
              "Der Mikrofonzugriff hat zu lange gedauert. Bitte Browser- und Systemberechtigungen pruefen."
            )
          );
        }, 8000);
      });

      let stream: MediaStream;

      try {
        stream = await Promise.race([getUserMediaPromise, timeoutPromise]);
        logVoice("getUserMedia resolved");
      } catch (error) {
        logVoice("getUserMedia rejected", {
          message: error instanceof Error ? error.message : "unknown",
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      } finally {
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
        }
      }

      logVoice("permission granted");

      if (!isMountedRef.current) {
        stopMediaStream(stream);
        isStartingRef.current = false;
        return;
      }

      const mimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ];
      let options: MediaRecorderOptions | undefined;

      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          options = { mimeType: type };
          console.log("[voice-recorder] using mimeType:", type);
          break;
        }
      }

      logVoice("creating recorder", {
        requestedMimeType: options?.mimeType ?? "default",
      });

      let mediaRecorder: MediaRecorder;

      try {
        mediaRecorder = options
          ? new MediaRecorder(stream, options)
          : new MediaRecorder(stream);
        console.log("[voice-recorder] recorder created");
      } catch (error) {
        console.error("[voice-recorder] recorder creation failed", error);
        handleError(error, "MediaRecorder konnte nicht erstellt werden.");
        stopMediaStream(stream);
        cleanupRecorder();
        return;
      }

      logVoice("recorder created", {
        recorderState: mediaRecorder.state,
        mimeType: mediaRecorder.mimeType || "default",
      });

      audioChunksRef.current = [];
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = mediaRecorder;
      mimeTypeRef.current =
        mediaRecorder.mimeType || options?.mimeType || "audio/webm";

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = () => {
        if (!isMountedRef.current) {
          return;
        }

        handleError(
          new Error("Die Sprachaufnahme ist fehlgeschlagen."),
          "Die Sprachaufnahme ist fehlgeschlagen."
        );
        cleanupRecorder();
      };

      mediaRecorder.onstop = () => {
        void finalizeStoppedRecording();
      };

      logVoice("recorder starting", {
        recorderState: mediaRecorder.state,
      });
      console.log("[voice-recorder] recorder starting");
      mediaRecorder.start();
      recordingStartedAtRef.current = performance.now();
      console.log("[voice-recorder] recorder started");
      logVoice("recorder started", {
        recorderState: mediaRecorder.state,
        mimeType: mimeTypeRef.current,
      });
      isStartingRef.current = false;
      setRecorderStatus("recording");

      if (stopRequestedDuringStartRef.current) {
        stopRequestedDuringStartRef.current = false;
        stopRecording();
      }
    } catch (error) {
      isStartingRef.current = false;
      logVoice("getUserMedia error", {
        message: error instanceof Error ? error.message : "unknown",
        stack: error instanceof Error ? error.stack : undefined,
      });

      if (error instanceof Error && error.name === "TimeoutError") {
        handleError(
          error,
          "Der Mikrofonzugriff hat zu lange gedauert. Bitte Browser- und Systemberechtigungen pruefen."
        );
      } else if (
        error instanceof DOMException &&
        (error.name === "NotAllowedError" || error.name === "PermissionDeniedError")
      ) {
        handleError(
          new Error(
            "Mikrofonzugriff wurde verweigert. Bitte erlaube den Zugriff in deinen Browser-Einstellungen."
          ),
          "Mikrofonzugriff wurde verweigert."
        );
      } else {
        handleError(error, "Die Sprachaufnahme konnte nicht gestartet werden.");
      }

      cleanupRecorder();
    }
  };

  const stopRecording = () => {
    logVoice("stop requested", {
      isStarting: isStartingRef.current,
      isStopping: isStoppingRef.current,
      recorderState: mediaRecorderRef.current?.state ?? "none",
    });

    if (isTranscribingRef.current || isStoppingRef.current) {
      return;
    }

    if (isStartingRef.current) {
      stopRequestedDuringStartRef.current = true;
      return;
    }

    const mediaRecorder = mediaRecorderRef.current;

    if (!mediaRecorder || mediaRecorder.state !== "recording") {
      return;
    }

    isStoppingRef.current = true;
    setRecorderStatus("transcribing");

    try {
      mediaRecorder.stop();
    } catch (error) {
      isStoppingRef.current = false;
      handleError(error, "Die Sprachaufnahme konnte nicht gestoppt werden.");
      cleanupRecorder();
    }
  };

  const toggleRecording = async () => {
    logVoice("button clicked", {
      uiStatus: statusRef.current,
      recorderState: mediaRecorderRef.current?.state ?? "none",
    });

    if (isTranscribingRef.current) {
      return;
    }

    if (mediaRecorderRef.current?.state === "recording") {
      stopRecording();
      return;
    }

    await startRecording();
  };

  return {
    errorMessage,
    isSupported,
    startRecording,
    status,
    stopRecording,
    toggleRecording,
  };
}
