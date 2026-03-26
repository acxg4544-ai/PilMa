import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { text, dictionary } = await req.json();

    // 빈 텍스트 체크
    if (!text || text.trim().length === 0) {
      console.log('[Spellcheck] Empty text received, returning empty results');
      return NextResponse.json({ results: [] });
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      console.error('[Spellcheck] GOOGLE_GENERATIVE_AI_API_KEY is not set');
      return NextResponse.json({ error: 'API key not configured', results: [] });
    }

    console.log('[Spellcheck] Processing text length:', text.length);
    console.log('[Spellcheck] Dictionary words:', dictionary?.length || 0);

    // 사용자 사전 단어 목록
    const dictClause = dictionary && dictionary.length > 0
      ? `\nIMPORTANT: The following words are user-registered proper nouns. Do NOT flag these words or any form with Korean particles attached to them: [${dictionary.join(', ')}]`
      : '';

    const prompt = `You are an expert Korean proofreader. Your job is to find ALL spelling and grammar mistakes in the given Korean text.

You MUST check for these specific error categories:
1. Wrong verb conjugation endings (e.g. using past tense marker incorrectly)
2. Spacing errors between words, particles, and suffixes that should be separated or joined
3. Typos and misspellings
4. Incorrect particle usage
5. Double passive or double causative constructions
6. Commonly confused words and expressions

IMPORTANT rules:
- DO flag clear spelling and grammar errors. Be thorough.
- Do NOT flag casual/informal speech style, interjections, or onomatopoeia.
- Do NOT flag web novel dialogue style or intentional stylistic choices.${dictClause}

Output format:
- Return ONLY a raw JSON array with NO markdown formatting, NO code fences, NO extra text.
- Each item must have exactly these three fields:
  "original" = the exact erroneous substring from the input text
  "suggestions" = an array of one or more corrected versions
  "reason" = a brief explanation in Korean of why it is wrong
- If no errors are found, return exactly: []

Analyze this text now:
${text}`;

    console.log('[Spellcheck] Sending prompt to Gemini... text length:', text.length);

    const result = await generateText({
      model: google('gemini-3-flash-preview'),
      prompt: prompt,
      temperature: 0,
    });

    const responseText = result.text;
    console.log('[Spellcheck] Raw AI response:', responseText);

    // JSON 배열 파싱 시도
    let parsed: any[] = [];

    try {
      const trimmed = responseText.trim();
      // 코드 펜스 제거 (```json ... ``` 형식 대응)
      const cleaned = trimmed
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/i, '')
        .trim();

      parsed = JSON.parse(cleaned);
    } catch {
      // 직접 파싱 실패 시, 정규식으로 JSON 배열 추출
      console.log('[Spellcheck] Direct parse failed, trying regex extraction...');
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch (innerErr) {
          console.error('[Spellcheck] Regex extraction parse also failed:', innerErr);
          return NextResponse.json({
            error: 'Failed to parse AI response as JSON',
            rawResponse: responseText.substring(0, 500),
            results: []
          });
        }
      } else {
        console.error('[Spellcheck] No JSON array found in response');
        return NextResponse.json({
          error: 'No JSON array found in AI response',
          rawResponse: responseText.substring(0, 500),
          results: []
        });
      }
    }

    // 배열이 아닌 경우 방어
    if (!Array.isArray(parsed)) {
      console.error('[Spellcheck] Parsed result is not an array:', typeof parsed);
      return NextResponse.json({ error: 'AI response was not an array', results: [] });
    }

    console.log('[Spellcheck] Parsed results count:', parsed.length);

    // 사전 단어 필터링
    const filtered = parsed.filter((item: any) => {
      if (!item || !item.original) return false;
      if (!dictionary || dictionary.length === 0) return true;
      return !dictionary.some((d: string) =>
        item.original === d ||
        item.original.includes(d) ||
        d.includes(item.original)
      );
    });

    console.log('[Spellcheck] After dictionary filtering:', filtered.length);

    return NextResponse.json({ results: filtered });
  } catch (err: any) {
    console.error('[Spellcheck] Unexpected error:', err);
    return NextResponse.json({
      error: String(err?.message || err),
      results: []
    });
  }
}
