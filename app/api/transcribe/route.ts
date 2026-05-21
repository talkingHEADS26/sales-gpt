import OpenAI from "openai";
import { NextResponse } from "next/server";

import { isFailure as isPaidAppAuthFailure, requireAuthUser } from "@/lib/auth-server";
import { getErrorMessage, logSystemEvent } from "@/lib/system-monitoring";
import {
  MAX_AUDIO_SECONDS_PER_SESSION,
  SESSION_AUDIO_LIMIT_REACHED_CODE,
} from "@/lib/usage-limits";

type TranscriptionSuccessResponse = {
  audioLimitReached: boolean;
  audioLimitSeconds: number;
  audioSecondsUsed: number;
  remainingAudioSeconds: number;
  success: true;
  text: string;
};

type ErrorResponse = {
  code?: string;
  error: string;
  remainingAudioSeconds?: number;
  success?: false;
};

type ReserveAudioResult = {
  audio_seconds_used: number;
  code: string | null;
  limit_reason: string | null;
  message: string | null;
  remaining_audio_seconds: number;
  success: boolean;
  usage_limit_reached: boolean;
};

type ChatSessionAccess = {
  id: string;
  user_id: string;
  success?: false;
};

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

async function logTranscribeEvent(params: {
  forceNotify?: boolean;
  message: string;
  metadata?: Record<string, unknown>;
  severity: "critical" | "error" | "warning";
}) {
  await logSystemEvent({
    forceNotify: params.forceNotify,
    message: params.message,
    metadata: params.metadata,
    severity: params.severity,
    source: "api_transcribe",
  });
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY || !openai) {
      await logTranscribeEvent({
        forceNotify: true,
        message: "OpenAI configuration missing in api_transcribe",
        severity: "critical",
      });

      return NextResponse.json<ErrorResponse>(
        { error: "OPENAI_API_KEY ist nicht gesetzt." },
        { status: 500 }
      );
    }

    const authResult = await requireAuthUser(
      request.headers.get("authorization")
    );

    if (isPaidAppAuthFailure(authResult)) {
      return NextResponse.json<ErrorResponse>(
        { code: authResult.code, error: authResult.error },
        { status: authResult.status }
      );
    }

    const { serviceRoleClient, supabase, userId } = authResult;

    const formData = await request.formData();
    const audioFile = formData.get("audio");
    const sessionId = formData.get("sessionId");
    const durationSecondsRaw = formData.get("audioDurationSeconds");

    if (!(audioFile instanceof File)) {
      return NextResponse.json<ErrorResponse>(
        { error: "Audio-Datei fehlt." },
        { status: 400 }
      );
    }

    if (audioFile.size === 0) {
      return NextResponse.json<ErrorResponse>(
        { error: "Die Audio-Datei ist leer." },
        { status: 400 }
      );
    }

    if (typeof sessionId !== "string" || !sessionId.trim()) {
      return NextResponse.json<ErrorResponse>(
        { error: "sessionId fehlt." },
        { status: 400 }
      );
    }

    if (typeof durationSecondsRaw !== "string") {
      return NextResponse.json<ErrorResponse>(
        { error: "audioDurationSeconds fehlt." },
        { status: 400 }
      );
    }

    const parsedDurationSeconds = Number.parseInt(durationSecondsRaw, 10);

    if (
      Number.isNaN(parsedDurationSeconds) ||
      parsedDurationSeconds <= 0 ||
      parsedDurationSeconds > MAX_AUDIO_SECONDS_PER_SESSION
    ) {
      return NextResponse.json<ErrorResponse>(
        { error: "audioDurationSeconds ist ungültig." },
        { status: 400 }
      );
    }

    const { data: session, error: sessionError } = await supabase
      .from("chat_sessions")
      .select("id, user_id")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .maybeSingle<ChatSessionAccess>();

    if (sessionError) {
      await logTranscribeEvent({
        message: "Session lookup failed in api_transcribe",
        metadata: {
          sessionId,
          userId,
          error: sessionError.message,
        },
        severity: "error",
      });

      return NextResponse.json<ErrorResponse>(
        { error: sessionError.message },
        { status: 500 }
      );
    }

    if (!session) {
      return NextResponse.json<ErrorResponse>(
        { error: "Session nicht gefunden." },
        { status: 404 }
      );
    }

    const { data: reserveAudioResult, error: reserveAudioError } =
      await serviceRoleClient.rpc("reserve_session_audio_seconds", {
        p_audio_seconds: parsedDurationSeconds,
        p_session_id: session.id,
        p_user_id: userId,
      });

    if (reserveAudioError) {
      await logTranscribeEvent({
        message: "Audio reservation RPC failed in api_transcribe",
        metadata: {
          durationSeconds: parsedDurationSeconds,
          sessionId: session.id,
          userId,
          error: reserveAudioError.message,
        },
        severity: "error",
      });

      return NextResponse.json<ErrorResponse>(
        { error: reserveAudioError.message },
        { status: 500 }
      );
    }

    const reservedAudio = Array.isArray(reserveAudioResult)
      ? ((reserveAudioResult[0] ?? null) as ReserveAudioResult | null)
      : ((reserveAudioResult ?? null) as ReserveAudioResult | null);

    if (!reservedAudio?.success) {
      const isAudioLimitReached =
        reservedAudio?.code === SESSION_AUDIO_LIMIT_REACHED_CODE;

      return NextResponse.json<ErrorResponse>(
        {
          code: reservedAudio?.code ?? undefined,
          error:
            reservedAudio?.message ??
            "Die Sprachaufnahme konnte nicht verarbeitet werden.",
          remainingAudioSeconds: reservedAudio?.remaining_audio_seconds,
          success: false,
        },
        { status: isAudioLimitReached ? 429 : 400 }
      );
    }

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "gpt-4o-mini-transcribe",
      response_format: "json",
    });

    const text = transcription.text.trim();

    if (!text) {
      await logTranscribeEvent({
        forceNotify: true,
        message: "OpenAI returned empty transcription",
        metadata: {
          durationSeconds: parsedDurationSeconds,
          sessionId: session.id,
          userId,
        },
        severity: "error",
      });

      return NextResponse.json<ErrorResponse>(
        { error: "Die Audio-Datei konnte nicht in Text umgewandelt werden." },
        { status: 502 }
      );
    }

    return NextResponse.json<TranscriptionSuccessResponse>({
      audioLimitReached: reservedAudio.usage_limit_reached,
      audioLimitSeconds: MAX_AUDIO_SECONDS_PER_SESSION,
      audioSecondsUsed: reservedAudio.audio_seconds_used,
      remainingAudioSeconds: reservedAudio.remaining_audio_seconds,
      success: true,
      text,
    });
  } catch (error) {
    const message = getErrorMessage(
      error,
      "Die Transkription ist fehlgeschlagen."
    );

    await logTranscribeEvent({
      forceNotify: true,
      message: "Unhandled transcription failure",
      metadata: {
        error: message,
      },
      severity: "critical",
    });

    return NextResponse.json<ErrorResponse>(
      { error: message },
      { status: 500 }
    );
  }
}
