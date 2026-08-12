import { getStats } from "@/lib/stats";
import { onStats } from "@/lib/realtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Server-Sent Events stream of live registration statistics.
 *
 * The browser opens this stream and receives a `stats` event whenever a
 * registration (or admin status change) happens. No polling required.
 */
export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      const send = (payload: unknown) => {
        safeEnqueue(`event: stats\ndata: ${JSON.stringify(payload)}\n\n`);
      };

      // Initial snapshot so the client doesn't need a separate fetch.
      try {
        send(await getStats());
      } catch (err) {
        console.error("realtime initial stats error", err);
      }

      const unsubscribe = onStats((stats) => send(stats));

      // Heartbeat keeps the connection alive through proxies.
      const heartbeat = setInterval(() => safeEnqueue(`: ping\n\n`), 25_000);

      // Detect client disconnect. Web Streams don't expose cancellation directly
      // in all runtimes; poll controller.desiredSize which becomes null on close.
      const watchdog = setInterval(() => {
        if (controller.desiredSize === null) {
          closed = true;
          clearInterval(heartbeat);
          clearInterval(watchdog);
          unsubscribe();
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        }
      }, 5_000);
    },
    cancel() {
      // The ReadableStream `cancel` is invoked when the consumer aborts.
      // Cleanup is handled by the watchdog; nothing else to do here.
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
