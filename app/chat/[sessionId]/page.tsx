import type { Metadata } from "next";

import { ChatSessionView } from "./chat-session-view";

export const metadata: Metadata = {
  title: {
    absolute: "Sales Training",
  },
};

type ChatPageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function ChatPage({ params }: ChatPageProps) {
  const { sessionId } = await params;

  return <ChatSessionView sessionId={sessionId} />;
}
