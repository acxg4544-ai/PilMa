import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  try {
    const { text, dictionary, apiKey } = await req.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ results: [] });
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'Claude API key not provided', results: [] });
    }

    const client = new Anthropic({ apiKey });

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

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6-20250514',
      max_tokens: 4096,
      temperature: 0,
      system: [
        {
          type: 'text',
          text: 'You are an expert Korean proofreader. Return only valid JSON arrays.',
          // @ts-ignore - Anthropic SDK prompt caching
          cache_control: { type: 'ephemeral' }
        }
      ],
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    // 응답 텍스트 추출
    const responseText = response.content[0]?.type === 'text' ? response.content[0].text : '';

    // JSON 파싱
    let parsed: any[] = [];

    try {
      const trimmed = responseText.trim();
      const cleaned = trimmed
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/i, '')
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          return NextResponse.json({
            error: 'Failed to parse AI response as JSON',
            results: []
          });
        }
      } else {
        return NextResponse.json({
          error: 'No JSON array found in AI response',
          results: []
        });
      }
    }

    if (!Array.isArray(parsed)) {
      return NextResponse.json({ error: 'AI response was not an array', results: [] });
    }

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

    return NextResponse.json({ results: filtered });
  } catch (err: any) {
    console.error('[Claude Spellcheck Error]:', err);
    return NextResponse.json({
      error: String(err?.message || err),
      results: []
    });
  }
}
