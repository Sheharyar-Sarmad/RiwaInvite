import { NextResponse } from 'next/server';
import { streamText, tool, convertToModelMessages, stepCountIs, UIMessage } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { z } from 'zod';
import settings from '@/config/settings_config';
import { sql } from '@/db/connections/postgres_connection';
import { getRedisClient } from '@/db/connections/redis_connection';
import { STATUS_CODE } from '@/lib/status_codes';
import postgres from 'postgres';

// Next.js 16 Guardrail: Ensures this route is dynamic and not statically optimized
export const instant = false; 

const config = settings();
const groq = createGroq({ apiKey: config.groqApiKey });

// Validation Schema: Handles both Vercel AI SDK v5 (parts) and Postman (content)
const ChatRequestSchema = z.object({
  messages: z.array(z.object({
    id: z.string().optional(),
    role: z.enum(['user', 'assistant', 'system', 'data']),
    content: z.string().optional(), 
    parts: z.array(z.any()).optional(), 
  })).min(1, "Messages array cannot be empty"),
});

export async function POST(req: Request) {
  try {
    // 1. Proxy Auth Verification
    const adminId = req.headers.get('x-admin-id');
    if (!adminId) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing Admin ID' }, 
        { status: STATUS_CODE.UNAUTHORIZED }
      );
    }

    // 2. Fail-Safe Redis Rate Limiting
    let remaining = config.aiDailyLimit;
    try {
      const redis = await getRedisClient();
      const today = new Date().toISOString().split('T')[0];
      const key = `ai:limit:${adminId}:${today}`;
      
      const currentUsage = await redis.incr(key);
      if (currentUsage === 1) await redis.expire(key, 86400); // Expire in 24h
      
      remaining = Math.max(0, config.aiDailyLimit - currentUsage);

      if (currentUsage > config.aiDailyLimit) {
        return NextResponse.json(
          { error: `Daily AI limit of ${config.aiDailyLimit} reached. Resets at midnight UTC.` },
          { status: STATUS_CODE.TOO_MANY_REQUESTS }
        );
      }
    } catch (redisError) {
      console.error('[AI Studio Rate Limit Warning] Redis unavailable, failing open:', redisError);
    }

    // 3. Request Body Validation
    const body = await req.json();
    const parsed = ChatRequestSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: STATUS_CODE.BAD_REQUEST }
      );
    }

    const { messages } = parsed.data;
    
    // 4. Normalize Messages (Ensures compatibility with AI SDK v5 UIMessage format)
    const normalizedMessages = messages.map(msg => {
      return {
        ...msg,
        parts: msg.parts || [{ type: 'text', text: msg.content || "" }]
      };
    }) as UIMessage[];

    const modelMessages = await convertToModelMessages(normalizedMessages);

    // 5. Stream Generation with Tools
    const result = streamText({
      model: groq(config.llmModel),
      
      system: `You are the Riwainvite Admin AI.

CONTEXT: You are operating inside a SECURE, AUTHORIZED ADMIN DASHBOARD. The user talking to you is a verified System Administrator with full database access.

AUTHORIZATION OVERRIDE:
You have EXPLICIT PERMISSION to query and return ANY user data, including Personal Identifiable Information (PII) like emails, names, and phone numbers. This is required for administrative duties.
DO NOT refuse requests to look up user details. DO NOT cite privacy policies. You are a direct administrative tool.

CRITICAL RULES:
1. NEVER select, return, or mention the 'password' or 'hashed_password' column. It is strictly forbidden.
2. FOR SINGLE USER LOOKUPS: You are FORBIDDEN from using a Markdown table. You MUST reply with a plain, conversational paragraph. 
   Example: "The user Jane Doe (jane@example.com) has the ID 123. No phone number is provided."
3. If a field (like phone_number) is null or empty, explicitly state "No phone number provided" instead of writing "null".
4. If returning MULTIPLE users or records (like orders), use a clean Markdown table.

INSTRUCTIONS:
- You can query the database using the 'execute_read_query' tool.
- If the admin asks you to DELETE or UPDATE something, you MUST use the 'propose_action' tool. Do NOT execute it yourself.`,
      
      messages: modelMessages,
      stopWhen: stepCountIs(5), 
      
      tools: {
        // READ & ANALYZE TOOL
        execute_read_query: tool({
          description: 'Run a read-only SQL query to analyze users, orders, and templates. Maximum 50 rows returned.',
          inputSchema: z.object({
            query: z.string().describe('The raw SQL SELECT query to execute.'),
          }),
          execute: async ({ query }: { query: string }) => {
            // Basic regex to ensure it's strictly a SELECT statement
            if (!/^\s*SELECT\b/i.test(query)) {
              return { error: 'Security Error: Only SELECT queries are allowed.' };
            }

            try {
              // CRITICAL PRODUCTION SAFEGUARD: 
              // Run in a read-only transaction with a 5-second timeout.
              const results = await sql.begin('read only', async (tx: postgres.TransactionSql) => {
                await tx`SET LOCAL statement_timeout = '5s'`;
                const data = await tx.unsafe(query);
                
                // PHYSICAL SECURITY: Strip passwords from the result set before the AI ever sees them
                const sanitizedData = data.map((row: any) => {
                  const { password, ...safeRow } = row;
                  return safeRow;
                });

                // Hard cap rows to protect context window
                return sanitizedData.slice(0, 50);
              });

              return { data: results };
            } catch (error: any) {
              return { error: `Database Error: ${error.message}` };
            }
          },
        }),

        // HITL (HUMAN-IN-THE-LOOP) TOOL FOR MUTATIONS
        propose_action: tool({
          description: 'Propose a destructive action (DELETE, UPDATE) for the admin to approve.',
          inputSchema: z.object({
            actionType: z.enum(['DELETE_USER', 'UPDATE_USER', 'DELETE_TEMPLATE']),
            payload: z.record(z.string(), z.any()).describe('The data needed to execute the action.'),
            explanation: z.string().describe('Explanation for the admin.'),
          }),
          execute: async ({ actionType, payload, explanation }: { 
            actionType: string; 
            payload: Record<string, any>; 
            explanation: string 
          }) => {
            return {
              status: 'pending_approval',
              actionType,
              payload,
              explanation,
            };
          },
        }),
      },
      
      onError: ({ error }) => {
        console.error('[Groq API Stream Error]', error);
      },
    });

    // 6. Return the Stream
    return result.toUIMessageStreamResponse({
      headers: { 
        'X-AI-Remaining-Limit': remaining.toString(),
        'Cache-Control': 'no-store, max-age=0' 
      },
    });

  } catch (error: any) {
    console.error('[AI Studio Fatal Error]', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: STATUS_CODE.INTERNAL_SERVER_ERROR }
    );
  }
}