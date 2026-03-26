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
      return NextResponse.json({ error: 'no key', results: [] });
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash' });

    const dictStr = dictionary && dictionary.length > 0
      ? `\nIMPORTANT: The following words are proper nouns registered by the user. Do NOT flag these words or any form with Korean particles (은/는/이/가/을/를/에서/도/만/으로/과/와/한테/께/부터/까지) attached as errors: [${dictionary.join(', ')}]`
      : '';

    const prompt = `You are a Korean proofreading expert. Find spelling and grammar errors in the following Korean text.

Error types to check:
1. Misspelling (ex: 됬다 should be 됐다, 안돼 should be 안 돼)
2. Spacing errors (ex: 할수있다 should be 할 수 있다)
3. Typos (ex: 겈찮아 should be 괜찮아)
4. Wrong particles (ex: 를 should be 을)
5. Double passive (ex: 보여지다 should be 보이다)

Rules:
- Do NOT flag casual speech, web novel style, interjections, or onomatopoeia.${dictStr}
- Only flag CLEAR errors. Skip anything ambiguous.
- Return ONLY a raw JSON array. No markdown, no code blocks, no explanation.

Output format: [{"original":"wrong","suggestions":["fix"],"reason":"Korean explanation"}]
If no errors: return []

Korean text to check:
${text}`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 2048 }
    });

    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    const filtered = parsed.filter((item: any) => {
      if (!dictionary || dictionary.length === 0) return true;
      return !dictionary.some((d: string) =>
        item.original === d || item.original.includes(d) || d.includes(item.original)
      );
    });

    return NextResponse.json({ results: filtered });
  } catch (err) {
    console.error('Spellcheck error:', err);
    return NextResponse.json({ error: String(err), results: [] });
  }
}
