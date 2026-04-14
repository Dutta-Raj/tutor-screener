import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { v4 as uuidv4 } from 'uuid';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

interface SessionData {
  id: string;
  name: string;
  messages: Array<{ role: string; content: string; timestamp: number }>;
  askedQuestions: string[];
  exchangeCount: number;
  createdAt: number;
}

const sessions = new Map<string, SessionData>();

export async function POST(request: NextRequest) {
  try {
    const { action, sessionId, name, message } = await request.json();

    // Start new interview
    if (action === 'start') {
      const newId = uuidv4();
      sessions.set(newId, {
        id: newId,
        name: name,
        messages: [],
        askedQuestions: [],
        exchangeCount: 0,
        createdAt: Date.now()
      });

      const welcomeMsg = `Hello ${name}! Welcome to your Cuemath Tutor screening interview. To start, could you tell me about your teaching experience?`;
      
      return NextResponse.json({
        success: true,
        sessionId: newId,
        message: welcomeMsg,
        exchangeCount: 0
      });
    }

    // Send message
    if (action === 'send') {
      const session = sessions.get(sessionId);
      if (!session) {
        return NextResponse.json({ error: 'Session expired' }, { status: 400 });
      }

      session.messages.push({ role: 'user', content: message, timestamp: Date.now() });
      session.exchangeCount++;
      
      const exchangeCount = session.exchangeCount;
      
      const history = session.messages.slice(-8).map(m => 
        `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.content}`
      ).join('\n');
      
      const askedList = session.askedQuestions.join(', ');
      
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are a friendly, professional AI interviewer for Cuemath hiring a Tutor.

CONVERSATION SO FAR:
${history}

PREVIOUS QUESTIONS ASKED (DO NOT REPEAT ANY OF THESE):
${askedList || 'None'}

RULES:
1. FIRST, acknowledge what the candidate just said
2. THEN ask a NEW, DIFFERENT follow-up question
3. ABSOLUTELY DO NOT repeat any question from the list above
4. Keep response to 1-2 sentences
5. Be warm and encouraging`
          },
          {
            role: 'user',
            content: `Candidate said: "${message}"`
          }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 150,
      });
      
      let aiResponse = completion.choices[0]?.message?.content || "Thanks for sharing. What subjects do you enjoy teaching the most?";
      
      session.askedQuestions.push(aiResponse);
      session.messages.push({ role: 'assistant', content: aiResponse, timestamp: Date.now() });
      
      const isComplete = exchangeCount >= 8;
      
      return NextResponse.json({
        success: true,
        message: aiResponse,
        exchangeCount: exchangeCount,
        isComplete: isComplete
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('API Error:', error.message);
    return NextResponse.json({ 
      success: true, 
      message: "What subjects do you enjoy teaching the most?",
      exchangeCount: 0,
      isComplete: false
    });
  }
}
