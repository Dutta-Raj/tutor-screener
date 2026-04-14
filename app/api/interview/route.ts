import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { v4 as uuidv4 } from 'uuid';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

interface ChatMessage {
  role: string;
  content: string;
  timestamp: number;
}

interface SessionData {
  id: string;
  name: string;
  messages: ChatMessage[];
  topicsCovered: string[];
  lastActivity: number;
}

const sessions: Map<string, SessionData> = new Map();

// Clean up old sessions
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.lastActivity > 30 * 60 * 1000) {
      sessions.delete(id);
    }
  }
}, 5 * 60 * 1000);

async function generateConversationalResponse(
  userMessage: string,
  history: string,
  candidateName: string
): Promise<string> {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a friendly, professional AI interviewer for Cuemath hiring a Tutor.

CONVERSATION HISTORY:
${history || "Interview just started"}

CANDIDATE NAME: ${candidateName}

IMPORTANT RULES FOR NATURAL CONVERSATION:
1. Be warm and conversational - like a real human interviewer
2. Listen to what the candidate says and respond naturally
3. Ask follow-up questions based on THEIR specific answers
4. Don't use the same question twice
5. Keep responses short (1-2 sentences)
6. Show empathy and understanding
7. Move the conversation forward naturally

EXAMPLES OF NATURAL RESPONSES:
- Candidate: "I have 5 years experience" ? "5 years is great! What grade levels did you teach?"
- Candidate: "I taught high school" ? "High school can be challenging. What subject did you enjoy teaching most?"
- Candidate: "I need a moment" ? "Of course, take your time. I'll wait right here."
- Candidate: "I'm not sure" ? "No problem at all. Let me ask differently - what's your favorite part about teaching?"

Your response (natural, conversational, no pre-defined scripts):`
        },
        {
          role: 'user',
          content: `Candidate said: "${userMessage}"`
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.8,
      max_tokens: 120,
    });
    
    return completion.choices[0]?.message?.content || "That's interesting! Could you tell me more about that?";
  } catch (err) {
    console.error('Groq error:', err);
    return "That's interesting! Could you tell me more about your teaching experience?";
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, sessionId, name, message } = body;

    // Start interview
    if (action === 'start') {
      const newId: string = uuidv4();
      const initialMessage = `Hello ${name}! Welcome to your Cuemath Tutor screening interview. I'm excited to learn about you. Could you tell me about your teaching experience?`;
      
      sessions.set(newId, {
        id: newId,
        name: name,
        messages: [{ role: 'assistant', content: initialMessage, timestamp: Date.now() }],
        topicsCovered: [],
        lastActivity: Date.now()
      });

      return NextResponse.json({
        success: true,
        sessionId: newId,
        message: initialMessage,
        exchangeCount: 0
      });
    }

    // Get session data
    if (action === 'get') {
      const session = sessions.get(sessionId);
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 400 });
      }
      
      return NextResponse.json({
        success: true,
        session: {
          name: session.name,
          messages: session.messages,
          topicsCovered: session.topicsCovered
        }
      });
    }

    // Send message
    if (action === 'send') {
      const session = sessions.get(sessionId);
      if (!session) {
        return NextResponse.json({ error: 'Session expired' }, { status: 400 });
      }

      // Store user message
      session.messages.push({ role: 'user', content: message, timestamp: Date.now() });
      session.lastActivity = Date.now();
      
      // Build conversation history
      const history = session.messages.slice(-10).map((m: ChatMessage) => 
        `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.content}`
      ).join('\n');
      
      // Generate natural conversational response
      const aiResponse = await generateConversationalResponse(message, history, session.name);
      
      // Store AI response
      session.messages.push({ role: 'assistant', content: aiResponse, timestamp: Date.now() });
      
      // Check if interview should end (after about 8-10 exchanges)
      const userMessageCount = session.messages.filter(m => m.role === 'user').length;
      const isComplete = userMessageCount >= 10;
      
      if (isComplete) {
        const completeMsg = "Thank you so much for your time today! This completes our interview. We'll review your responses and get back to you soon. It was great talking with you!";
        session.messages.push({ role: 'assistant', content: completeMsg, timestamp: Date.now() });
        return NextResponse.json({
          success: true,
          message: completeMsg,
          exchangeCount: userMessageCount,
          isComplete: true
        });
      }
      
      return NextResponse.json({
        success: true,
        message: aiResponse,
        exchangeCount: userMessageCount,
        isComplete: false
      });
    }

    if (action === 'delete') {
      sessions.delete(sessionId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('API Error:', error.message);
    return NextResponse.json({ 
      success: true, 
      message: "That's interesting! Could you tell me more about your teaching experience?",
      exchangeCount: 0,
      isComplete: false
    });
  }
}
