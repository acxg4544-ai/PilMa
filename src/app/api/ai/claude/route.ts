import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  try {
    const { text, systemPrompt, apiKey, worldContext, summary } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'CLAUDE_API_KEY_NOT_FOUND' }, { status: 400 });
    }

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6-20250514',
      max_tokens: 4096,
      system: [
        { 
          type: "text", 
          text: (worldContext || '') + (summary || ''), 
          // @ts-ignore
          cache_control: { type: "ephemeral" } 
        },
        { type: "text", text: systemPrompt || '' }
      ],
      messages: [
        { role: 'user', content: text }
      ]
    });

    const firstContent = response.content[0];
    const resultText = firstContent?.type === 'text' ? firstContent.text : '';

    return NextResponse.json({ result: resultText });
  } catch (err: any) {
    console.error('[Claude API Error]:', err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
