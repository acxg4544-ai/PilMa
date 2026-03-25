import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { text, dictionary } = await req.json();
  if (!text || text.trim().length === 0) {
    return NextResponse.json({ results: [] });
  }

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash' });

  const dictStr = dictionary && dictionary.length > 0 
    ? `\n다음 단어들은 고유명사이거나 작가가 허용한 단어입니다. 이 단어 자체는 물론, 이 단어 뒤에 한국어 조사(은/는/이/가/을/를/의/에/에서/도/만/로/으로/과/와/한테/께/부터/까지 등)가 붙은 형태도 절대 오류로 잡지 마세요: [${dictionary.join(', ')}]` 
    : '';

  const prompt = `당신은 한국어 맞춤법 전문 교정사입니다. 다음 소설 본문을 한 문장씩 꼼꼼히 검사하여 오류를 찾아주세요.

검사 항목:
1. 맞춤법 오류 (예: 됬다 -> 됐다, 안돼 -> 안 돼)
2. 띄어쓰기 오류 (예: 할수있다 -> 할 수 있다)
3. 오타/탈자 (예: 하곘다 -> 하겠다)
4. 조사 오류 (예: 를 -> 을, 는 -> 은)
5. 이중 피동/사동 (예: 보여지다 -> 보이다)

주의:
- 소설 문체, 대화체, 의도적 비문은 오류로 잡지 마세요.${dictStr}
- 확실한 오류만 잡으세요. 애매하면 포함하지 마세요.
- 반드시 JSON 배열만 반환하고 다른 설명은 하지 마세요.

형식: [{ "original": "틀린 텍스트", "suggestions": ["수정안1"], "reason": "이유" }]
오류가 없으면 []를 반환하세요.

본문:
${text}`;

  // temperature 0으로 설정하여 일관성 확보
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0,
    }
  });
  
  const response = result.response.text();

  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    
    // 이중 안전장치: 단어장에 있는 단어가 포함된 결과는 필터링
    const filtered = parsed.filter((item: any) => {
      if (!dictionary || dictionary.length === 0) return true;
      // dictionary 단어가 original 텍스트를 포함하거나, 반대로 original이 dictionary 단어를 포함하는 경우 필터링
      return !dictionary.some((d: string) => 
        item.original === d || 
        item.original.startsWith(d) || 
        d.startsWith(item.original)
      );
    });

    return NextResponse.json({ results: filtered });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
