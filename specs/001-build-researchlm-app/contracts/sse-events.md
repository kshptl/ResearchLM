# SSE Event Contract: `/api/llm/stream`

This contract defines normalized outbound events sent by the model proxy route.

## Transport

- Content type: `text/event-stream`
- Encoding: UTF-8
- Event framing: standard SSE with `event:` and `data:` lines
- Keepalive: heartbeat comment (`: ping`) every 10-15 seconds during long streams

## Event Types

### `start`

Sent once when request is accepted and upstream connection is established.

```json
{
  "requestId": "req_123",
  "sequence": 1,
  "provider": "openai",
  "model": "gpt-4o-mini",
  "intent": "prompt",
  "timestamp": "2026-03-02T10:00:00.000Z"
}
```

### `delta`

Sent for incremental text output.

```json
{
  "requestId": "req_123",
  "sequence": 2,
  "timestamp": "2026-03-02T10:00:00.200Z",
  "text": "incremental token text"
}
```

### `tool_delta`

Sent when provider emits incremental tool-call updates.

```json
{
  "requestId": "req_123",
  "sequence": 3,
  "timestamp": "2026-03-02T10:00:00.300Z",
  "toolName": "summarize_nodes",
  "argumentsChunk": "{\"nodeIds\":[\"n1\"",
  "toolSequence": 4
}
```

### `usage`

Optional event with provider usage counters.

```json
{
  "requestId": "req_123",
  "sequence": 90,
  "timestamp": "2026-03-02T10:00:03.000Z",
  "inputTokens": 140,
  "outputTokens": 58,
  "totalTokens": 198
}
```

### `error`

Terminal event for stream failures.

```json
{
  "requestId": "req_123",
  "sequence": 99,
  "timestamp": "2026-03-02T10:00:03.050Z",
  "category": "rate_limit",
  "message": "Provider rate limit reached",
  "retryable": true,
  "retryAfterMs": 2000,
  "stage": "stream",
  "provider": "anthropic",
  "providerCode": "rate_limit_error"
}
```

### `done`

Terminal success event.

```json
{
  "requestId": "req_123",
  "sequence": 100,
  "finishReason": "stop",
  "timestamp": "2026-03-02T10:00:03.100Z"
}
```

## Ordering Rules

- A stream starts with `start`.
- Zero or more `delta` and `tool_delta` events may follow.
- `usage` may appear near end or at completion when provider supplies counters.
- Exactly one terminal event appears: `done` or `error`.
- `sequence` MUST monotonically increase within a stream.

## Policy Rules

- Requests without valid BYOK credentials must fail before streaming starts.
- Credentials must be user-provided provider credentials; consumer/CLI tokens are rejected.
- Error categories must follow the canonical taxonomy in `llm-stream.openapi.yaml`.
- Route MUST emit local structured logs for generation and stream lifecycle events without exposing prompt or credential plaintext.
- Retry requests MUST be marked with `retryContext.triggerType=manual-retry` and reference the prior request when applicable.

## Implementation Validation

- Route implementation reference: `/home/kush/researchlm/app/api/llm/stream/route.ts`
- Encoded SSE transport helpers: `/home/kush/researchlm/lib/sse/events.ts`
- Validation status: event names and error taxonomy align with this contract.
