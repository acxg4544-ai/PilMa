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
      return NextResponse.json({ results: [] });
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash' });

    const dictStr = dictionary && dictionary.length > 0
      ? `\nThe following words are proper nouns registered by the user. Do NOT flag these words or any form with Korean particles attached: [${dictionary.join(', ')}]`
      : '';

    const prompt = `You are a Korean spelling and grammar correction expert. Review the following Korean web novel text and find errors.

Check for:
1. Spelling errors (e.g. 됬다 -> 됐다)
2. Spacing errors (e.g. 할수있다 -> 할 수 있다)
3. Typos (e.g. 겈찮아 -> 괜찮아)
4. Particle errors (e.g. 를 -> 을)
5. Double passive/causative (e.g. 보여지다 -> 보이다)

Rules:
- Do NOT flag web novel style, casual speech, or interjections as errors.${dictStr}
- Only flag clear errors. Skip ambiguous cases.
- Return ONLY a JSON array, no other text.

Format: [{ "original": "wrong text", "suggestions": ["correction"], "reason": "reason in Korean" }]
Return [] if no errors found.

Text:
${text}`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 2048,
      }
    });

    const responseText = result.response.text();

    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

      const filtered = parsed.filter((item: any) => {
        if (!dictionary || dictionary.length === 0) return true;
        return !dictionary.some((d: string) =>
          item.original === d ||
          item.original.includes(d) ||
          d.includes(item.original)
        );
      });

      return NextResponse.json({ results: filtered });
    } catch {
      return NextResponse.json({ results: [] });
    }
  } catch (err) {
    console.error('Spellcheck error:', err);
    return NextResponse.json({ results: [] });
  }
}
