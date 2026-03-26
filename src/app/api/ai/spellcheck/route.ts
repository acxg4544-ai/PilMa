import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { text, dictionary } = await req.json();
    if (!text || text.trim().length === 0) {
      return NextResponse.json({ results: [] });
    }

    const API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!API_KEY) {
      console.error('API key is missing');
      return NextResponse.json({ results: [] });
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    // 모델명을 최신으로 유지 (이전 요청사항 반영: gemini-3.1-pro-preview 또는 gemini-1.5-flash)
    // 현재 프로젝트에서 작동 확인된 모델로 설정
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

    const dictStr = dictionary && dictionary.length > 0
      ? `\n다음 단어들은 고유명사이거나 사용자가 등록한 단어입니다. 이 단어 자체는 물론, 이 단어 뒤에 조사(은/는/이/가/을/를/에서/도/만으로/과/와/한테/께/부터/까지 등)가 붙은 형태라면 오류로 잡지 마세요: [${dictionary.join(', ')}]`
      : '';

    const prompt = `당신은 한국어 맞춤법 교정 전문가입니다. 다음 웹소설 본문의 모든 문장을 정밀하게 검토하고 아래 오류를 찾아주세요.

검토 항목:
1. 맞춤법 오류 (예: 됬다 -> 됐다, 안돼 -> 안 돼)
2. 띄어쓰기 오류 (예: 할수있다 -> 할 수 있다)
3. 오타/탈자 (예: 겈찮아 -> 괜찮아)
4. 조사 오류 (예: 를 -> 을, 은 -> 는)
5. 이중 피동/사동 (예: 보여지다 -> 보이다)

주의:
- 웹소설 문체, 반말체, 감탄사를 오류로 잡지 마세요.${dictStr}
- 확실한 오류만 잡으세요. 애매하면 포함하지 마세요.
- 반드시 JSON 배열만 반환하고 다른 설명은 하지 마세요.

형식: [{ "original": "틀린텍스트", "suggestions": ["수정안"], "reason": "이유" }]
오류가 없으면 []를 반환하세요.

본문:
${text}`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        topP: 0.95,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      }
    });
    
    const responseText = result.response.text();

    try {
      const parsed = JSON.parse(responseText);
      // 배열 형태인지 확인 (Gemini가 JSON 모드여도 가끔 객체 안에 배열을 넣을 수 있음)
      const results = Array.isArray(parsed) ? parsed : (parsed.results || []);
      
      // 단어장 필터링 (강제 적용)
      const filtered = results.filter((item: any) => {
        if (!dictionary || dictionary.length === 0) return true;
        return !dictionary.some((d: string) => 
          item.original === d || 
          item.original.startsWith(d) || 
          d.startsWith(item.original)
        );
      });

      return NextResponse.json({ results: filtered });
    } catch (parseError) {
      console.error('JSON Parse Error:', responseText);
      // JSON 모드 실패 시 정규식 시도
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      const fallbackParsed = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      return NextResponse.json({ results: fallbackParsed });
    }
  } catch (err) {
    console.error('Spellcheck API error:', err);
    return NextResponse.json({ results: [] });
  }
}
