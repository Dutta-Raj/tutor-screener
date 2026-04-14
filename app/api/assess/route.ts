import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export async function POST(request: NextRequest) {
  try {
    const { messages, name } = await request.json();
    
    const conversation = (messages as Message[]).map((m: Message) => `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.content}`).join('\n');
    
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are an expert evaluator. Assess this candidate interview.

CONVERSATION:
${conversation}

CANDIDATE: ${name}

Return ONLY valid JSON:
{
  "scores": {
    "communication": {"score": 1-10, "feedback": "brief feedback"},
    "patience": {"score": 1-10, "feedback": "brief feedback"},
    "simplicity": {"score": 1-10, "feedback": "brief feedback"},
    "fluency": {"score": 1-10, "feedback": "brief feedback"},
    "temperament": {"score": 1-10, "feedback": "brief feedback"}
  },
  "overallScore": 1-100,
  "recommendation": "PASS/FAIL/BORDERLINE",
  "strengths": ["strength1", "strength2"],
  "areasForImprovement": ["area1", "area2"],
  "summary": "brief summary"
}`
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 800,
    });
    
    const content = completion.choices[0]?.message?.content || '{}';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const assessment = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    
    return NextResponse.json({ success: true, assessment });
    
  } catch (error: any) {
    console.error('Assessment error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
