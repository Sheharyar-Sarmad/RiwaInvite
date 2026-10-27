export const instant = false;

import { headers } from "next/headers";
import { getRedisClient } from "@/db/connections/redis_connection";
import { STATUS_CODE } from "@/lib/status_codes";

export async function GET(request: Request) {
  const h = await headers();
  const adminId = h.get("x-admin-id");
  if (!adminId) {
    return new Response("Unauthorized", { status: STATUS_CODE.UNAUTHORIZED });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let subscriber: any = null;
      let interval: NodeJS.Timeout | null = null;

      const cleanup = async () => {
        if (interval) clearInterval(interval);
        if (subscriber) {
          try {
            await subscriber.unsubscribe("admin-notifications");
            await subscriber.disconnect();
          } catch (err) {
            console.warn("[SSE] Redis disconnect error:", err);
          }
        }
      };

      try {
        const redis = await getRedisClient();
        subscriber = redis.duplicate();
        
        subscriber.on("error", (err: any) => console.warn("[SSE] Redis sub error:", err));
        
        await subscriber.connect();

        controller.enqueue(encoder.encode(`event: ping\ndata: connected\n\n`));

        await subscriber.subscribe("admin-notifications", (message: string) => {
          try {
            const parsed = JSON.parse(message);
            
            if (parsed.admin_id && parsed.admin_id !== adminId) {
              return; 
            }

            controller.enqueue(encoder.encode(`event: notification\ndata: ${message}\n\n`));
          } catch (err) {
            console.error("[SSE] Failed to parse message", err);
          }
        });

        interval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`event: ping\ndata: keepalive\n\n`));
          } catch {}
        }, 30000);

        request.signal.addEventListener("abort", () => {
          cleanup();
          try { controller.close(); } catch {}
        });

      } catch (error) {
        console.error("[SSE] Connection failed:", error);
        cleanup();
        try { controller.close(); } catch {}
      }
    },
    cancel() {}
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", 
    },
  });
}