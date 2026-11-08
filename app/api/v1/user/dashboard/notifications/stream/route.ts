import { NextRequest } from "next/server";
import { getRedisClient } from "@/db/connections/redis_connection";
import { STATUS_CODE } from "@/lib/status_codes";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return new Response("Unauthorized", { status: STATUS_CODE.UNAUTHORIZED });
  }

  const redis = await getRedisClient();
  
  const subscriber = redis.duplicate();
  await subscriber.connect();

  const channel = `user_notifications:${userId}`;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      controller.enqueue(encoder.encode(`data: {"type":"ping"}\n\n`));

      await subscriber.subscribe(channel, (message) => {
        controller.enqueue(encoder.encode(`event: notification\ndata: ${message}\n\n`));
      });

      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`data: {"type":"ping"}\n\n`));
        } catch {
          clearInterval(keepAlive);
        }
      }, 30000);

      req.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        subscriber.unsubscribe(channel);
        subscriber.disconnect();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}