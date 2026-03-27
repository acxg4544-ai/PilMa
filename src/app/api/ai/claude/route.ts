import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  try {
    const { context, worldContext, plot, selectedText, customPrompt, fileUri, apiKey } = await req.json();

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'CLAUDE_API_KEY_NOT_FOUND' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const client = new Anthropic({ apiKey });

    // 반복되는 큰 컨텍스트 (세계관 + 요약) → cache_control 적용
    let cachedContext = '';

    if (fileUri && fileUri.trim().length > 0) {
      cachedContext += `[작품 요약]\n${fileUri}\n\n`;
    }

    if (worldContext && worldContext.length > 0) {
      cachedContext += `[세계관 정보]\n${worldContext.join('\n')}\n\n`;
    }

    // 이번 회차 전용 (캐싱 안 함)
    let currentContext = '';

    if (plot && plot.trim().length > 0) {
      currentContext += `[이번 회차 플롯]\n${plot}\n\n`;
    }

    currentContext += `[현재 본문]\n${context}\n\n`;

    if (selectedText && selectedText.trim().length > 0) {
      currentContext += `[강조할 부분]\n${selectedText}\n위 부분을 중심으로 이어서 써주세요.\n\n`;
    }

    const instruction = customPrompt && customPrompt.trim().length > 0
      ? customPrompt
      : '다음에 올 문장 3개를 제안해주세요.';

    currentContext += `[지시]\n${instruction}\n\n각 제안은 [1] [2] [3] 형식으로 구분해주세요.`;

    // system 메시지 구성: Prompt Caching 적용
    const systemMessages: Anthropic.Messages.TextBlockParam[] = [];

    // 캐싱 대상 (세계관 + 요약 등 반복 컨텍스트)
    if (cachedContext.trim().length > 0) {
      systemMessages.push({
        type: 'text' as const,
        text: `당신은 한국어 웹소설 전문 작가입니다. 문맥의 문체와 톤을 정확히 유지하세요.\n\n${cachedContext}`,
        // @ts-ignore - Anthropic SDK prompt caching
        cache_control: { type: 'ephemeral' }
      });
    } else {
      systemMessages.push({
        type: 'text' as const,
        text: '당신은 한국어 웹소설 전문 작가입니다. 문맥의 문체와 톤을 정확히 유지하세요.',
        // @ts-ignore - Anthropic SDK prompt caching
        cache_control: { type: 'ephemeral' }
      });
    }

    // 매 요청 변경되는 부분 (캐싱 안 함)
    systemMessages.push({
      type: 'text' as const,
      text: currentContext
    });

    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-6-20250514',
      max_tokens: 2048,
      system: systemMessages,
      messages: [
        { role: 'user', content: instruction }
      ]
    });

    // ReadableStream으로 변환하여 스트리밍 응답
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta') {
              const delta = event.delta as any;
              if (delta.type === 'text_delta' && delta.text) {
                controller.enqueue(encoder.encode(delta.text));
              }
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      }
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      }
    });
  } catch (err: any) {
    console.error('[Claude] Error:', err);
    return new Response(JSON.stringify({ error: err?.message || 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
