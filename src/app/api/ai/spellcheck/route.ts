import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text || text.trim().length === 0) {
    return NextResponse.json({ results: [] });
  }

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `다음 한국어 소설 본문에서 맞춤법 오류, 오타, 띄어쓰기 오류를 찾아줘.
각 오류마다 JSON 배열로 반환해:
[{ "original": "틀린 텍스트", "suggestions": ["수정안1", "수정안2"], "reason": "이유" }]
오류가 없으면 빈 배열 []을 반환해.
소설 문체나 의도적 표현은 오류로 잡지 마.
반드시 JSON 배열만 반환하고 다른 텍스트는 포함하지 마.

본문:
${text}`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    return NextResponse.json({ results: parsed });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
