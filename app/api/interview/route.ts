import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Fixed question sequence - NEVER changes
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
      
      // Get the NEXT question
      const nextQuestion: string = QUESTIONS[nextIndex];
      const aiResponse: string = `Thanks for sharing. ${nextQuestion}`;
      
      // Update session
      session.questionIndex = nextIndex;
      
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
