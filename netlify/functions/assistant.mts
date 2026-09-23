import Anthropic from "@anthropic-ai/sdk";
import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/functions";
import { json, sourceHash } from "../lib/enquiry.mjs";
import { SYSTEM_PROMPT } from "../lib/knowledge.mjs";

const MODEL = "claude-haiku-4-5";
const MAX_QUESTION = 600;
const MAX_TURNS = 12;
const MAX_PER_HOUR = 25;

type Turn = { role: "user" | "assistant"; content: string };

/** Best-effort hourly cap per source, so the assistant cannot be farmed for credits. */
async function overLimit(ip: string) {
  try {
    const store = getStore("assistant-rate");
    const key = sourceHash(ip);
    const hour = new Date().toISOString().slice(0, 13);
    const record = (await store.get(key, { type: "json" })) as { hour: string; count: number } | null;
    const count = record?.hour === hour ? record.count : 0;
    if (count >= MAX_PER_HOUR) return true;
    await store.setJSON(key, { hour, count: count + 1 });
    return false;
  } catch {
    return false; // Never block a genuine visitor because the counter is unavailable.
  }
}

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  let body: { question?: unknown; history?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ error: "That question could not be read." }, 400);
  }

  const question = typeof body.question === "string" ? body.question.trim().slice(0, MAX_QUESTION) : "";
  if (!question) return json({ error: "Type a question about the school." }, 422);

  const history: Turn[] = (Array.isArray(body.history) ? body.history : [])
    .filter(
      (turn): turn is Turn =>
        !!turn &&
        typeof turn === "object" &&
        ((turn as Turn).role === "user" || (turn as Turn).role === "assistant") &&
        typeof (turn as Turn).content === "string",
    )
    .slice(-MAX_TURNS)
    .map((turn) => ({ role: turn.role, content: turn.content.slice(0, MAX_QUESTION) }));

  if (await overLimit(context.ip ?? "unknown"))
    return json(
      { error: "The assistant has answered many questions from here recently. Please call the school on 0703 789 8216." },
      429,
    );

  try {
    const anthropic = new Anthropic();
    const stream = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [...history, { role: "user", content: question }],
      stream: true,
    });

    const encoder = new TextEncoder();
    const output = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta")
              controller.enqueue(encoder.encode(event.delta.text));
          }
        } catch (error) {
          console.error("assistant stream", error);
          controller.enqueue(
            encoder.encode("\n\nSorry — that answer was interrupted. Please call the school on 0703 789 8216."),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(output, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    console.error("assistant", error);
    return json(
      { error: "The assistant is unavailable right now. Please call the school on 0703 789 8216." },
      503,
    );
  }
};

export const config: Config = {
  path: "/api/assistant",
};
