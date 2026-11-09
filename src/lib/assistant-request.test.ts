import { describe, expect, it, vi } from "vitest";
import { DefaultChatTransport, type UIMessage } from "ai";
import { assistantRequestBody } from "./assistant-request";

describe("assistant request delivery", () => {
  it("sends the announcement question and conversation through the actual transport", async () => {
    const messages: UIMessage[] = [{ id: "question", role: "user", parts: [{ type: "text", text: "How do I make an announcement?" }] }];
    const fetchRequest = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response('data: {"type":"start","messageId":"answer"}\n\ndata: {"type":"finish"}\n\ndata: [DONE]\n\n', {
      headers: { "content-type": "text/event-stream", "x-vercel-ai-ui-message-stream": "v1" },
    }));
    const transport = new DefaultChatTransport({
      fetch: fetchRequest,
      prepareSendMessagesRequest: (request) => ({ body: assistantRequestBody(request, "/home") }),
    });
    await transport.sendMessages({ chatId: "account-chat", messages, trigger: "submit-message", messageId: "question", abortSignal: undefined });
    const call = fetchRequest.mock.calls[0];
    expect(call).toBeDefined();
    const body = JSON.parse(String(call?.[1]?.body));
    expect(body.messages).toEqual(messages);
    expect(body.id).toBe("account-chat");
    expect(body.trigger).toBe("submit-message");
    expect(body.messageId).toBe("question");
    expect(body.page).toBe("/home");
  });
});