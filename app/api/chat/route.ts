import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { system, message } = await req.json();

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system,
      messages: [{ role: "user", content: message }],
    }),
  });

  const data = await response.json();
  return NextResponse.json(data);
}
```

**Step 4.** Now open `C:\Users\Maciej\prism\.env.local` — create this file if it doesn't exist — and add:
```
ANTHROPIC_API_KEY=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