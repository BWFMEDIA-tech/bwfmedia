import type { UIMessage } from "ai";

/** A prepared body replaces the transport defaults, so retain the full chat envelope. */
export function assistantRequestBody(request: {
  body?: object;
  id: string;
  messages: UIMessage[];
  trigger: string;
  messageId?: string;
}, page: string) {
  return {
    ...request.body,
    id: request.id,
    messages: request.messages,
    trigger: request.trigger,
    messageId: request.messageId,
    page,
  };
}