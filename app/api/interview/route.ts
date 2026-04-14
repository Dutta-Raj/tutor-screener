import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { v4 as uuidv4 } from 'uuid';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

const QUESTIONS: string[] = [
  "What teaching experience do you have?",
  "What subjects do you enjoy teaching the most?",
  "How would you describe your teaching style?",
  "How do you help students who are struggling?",
  "How do you keep students engaged?",
  "What is your teaching philosophy?",
  "How do you handle frustrated students?",
  "What makes you a good tutor for Cuemath?"
];

interface ChatMessage {
  role: string;
  content: string;
  timestamp: number;
}

interface SessionData {
  id: string;
  name: string;
  questionIndex: number;
  messages: ChatMessage[];
}

const sessions: Map<string, SessionData> = new Map();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, sessionId, name, message } = body;

    // Start interview
    if (action === 'start') {
      const newId: string = uuidv4();
      sessions.set(newId, {
        id: newId,
        name: name,
        questionIndex: 0,
        messages: []
      });

      return NextResponse.json({
        success: true,
        sessionId: newId,
        message: `Hello ${name}! Welcome to your Cuemath Tutor screening interview. To start, ${QUESTIONS[0]}`,
        exchangeCount: 0
      });
    }

    // Send message
    if (action === 'send') {
      const session = sessions.get(sessionId);
      if (!session) {
        return NextResponse.json({ error: 'Session expired' }, { status: 400 });
      }

      const currentIndex: number = session.questionIndex;
      const nextIndex: number = currentIndex + 1;
      
      // Check if interview is complete
      if (nextIndex >= QUESTIONS.length) {
        return NextResponse.json({
          success: true,
          message: "Thank you for your time! This completes our interview.",
          exchangeCount: nextIndex,
          isComplete: true
        });
      }
      
      const nextQuestion: string = QUESTIONS[nextIndex];
      
      // Build conversation history
      const history = session.messages.slice(-4).map((m: ChatMessage) => 
        `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.content}`
      ).join('\n');
      
      // Generate a personalized response using Groq
      let aiResponse: string = "";
      
      try {
        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: `You are a friendly AI interviewer for Cuemath.

CONVERSATION SO FAR:
${history}

Candidate just said: "${message}"

INSTRUCTIONS:
1. Acknowledge what the candidate specifically said (1 sentence)
2. Then ask this exact question: "${nextQuestion}"
3. Be warm and natural
4. Keep response to 2 sentences

Example:
- Candidate says "2 years experience" ? "2 years is a great start! What subjects do you enjoy teaching the most?"
- Candidate says "math" ? "Math is a wonderful subject! How would you describe your teaching style?"
- Candidate says "understand their mentality" ? "That's a thoughtful approach! How do you keep students engaged?"`
            }
          ],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.7,
          max_tokens: 100,
        });
        
        aiResponse = completion.choices[0]?.message?.content || `Thanks for sharing. ${nextQuestion}`;
      } catch (err) {
        aiResponse = `Thanks for sharing. ${nextQuestion}`;
      }
      
      // Update session
      session.questionIndex = nextIndex;
      session.messages.push({ role: 'user', content: message, timestamp: Date.now() });
      session.messages.push({ role: 'assistant', content: aiResponse, timestamp: Date.now() });
      
      return NextResponse.json({
        success: true,
        message: aiResponse,
        exchangeCount: nextIndex,
        isComplete: false
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('API Error:', error.message);
    return NextResponse.json({ 
      success: true, 
      message: QUESTIONS[0],
      exchangeCount: 0,
      isComplete: false
    });
  }
}
