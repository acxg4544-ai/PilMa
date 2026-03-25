import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

export async function POST(req: Request) {
  try {
    const { text, projectName } = await req.json();

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return new Response(JSON.stringify({ error: 'API_KEY_NOT_FOUND' }), { status: 400 });
    }

    const result = await generateText({
      model: google('gemini-3.1-pro-preview'),
      system: '당신은 웹소설 전문 편집자입니다. 주어진 전체 원고는 본문 플롯 위주입니다. 세계관이나 설정 설명은 배제하고, 각 회차별 핵심 사건을 1~2줄로 요약하세요. [1화 제목] 요약문 형식으로 반환하세요.',
      prompt: `[작품명: ${projectName || '제목 미상'}]\n\n${text}`,
    });

    return new Response(JSON.stringify({ summary: result.text }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Summarize error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
