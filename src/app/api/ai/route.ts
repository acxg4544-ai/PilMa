import { streamText } from 'ai';
import { google } from '@ai-sdk/google';

export async function POST(req: Request) {
  const { context, worldContext, plot, selectedText, customPrompt, fileUri } = await req.json();

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API_KEY_NOT_FOUND' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 시스템 프롬프트 조립
  let fullPrompt = '';

  if (fileUri && fileUri.trim().length > 0) {
    fullPrompt += `[작품 요약]\n${fileUri}\n\n`;
  }

  if (worldContext && worldContext.length > 0) {
    fullPrompt += `[세계관 정보]\n${worldContext.join('\n')}\n\n`;
  }

  if (plot && plot.trim().length > 0) {
    fullPrompt += `[이번 회차 플롯]\n${plot}\n\n`;
  }

  fullPrompt += `[현재 본문]\n${context}\n\n`;

  if (selectedText && selectedText.trim().length > 0) {
    fullPrompt += `[강조할 부분]\n${selectedText}\n위 부분을 중심으로 이어서 써주세요.\n\n`;
  }

  const instruction = customPrompt && customPrompt.trim().length > 0 
    ? customPrompt 
    : '다음에 올 문장 3개를 제안해주세요.';

  fullPrompt += `[지시]\n${instruction}\n\n각 제안은 [1] [2] [3] 형식으로 구분해주세요.`;

  const result = streamText({
    model: google('gemini-3.1-pro-preview'),
    system: '당신은 한국어 웹소설 전문 작가입니다. 문맥의 문체와 톤을 정확히 유지하세요.',
    prompt: fullPrompt,
  });

  return result.toTextStreamResponse();
}
