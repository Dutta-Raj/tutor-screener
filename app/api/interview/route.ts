import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { v4 as uuidv4 } from 'uuid';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

const sessions = new Map();

// Fixed question sequence - each question asked exactly once
const QUESTION_SEQUENCE = [
  "What teaching experience do you have?",
  "What subjects do you enjoy teaching the most?",
  "How would you describe your teaching style?",
  "How do you help students who are struggling?",
  "How do you keep students engaged during lessons?",
  "What is your teaching philosophy?",
  "How do you handle frustrated students?",
  "What makes you a good tutor for Cuemath?"
];

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
        questionIndex: 0,  // Track which question we're on
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

      // Store user message
      session.messages.push({ role: 'user', content: message, timestamp: Date.now() });
      session.exchangeCount++;
      
      const currentIndex = session.questionIndex;
      
      // Check if interview is complete
      if (currentIndex >= QUESTION_SEQUENCE.length) {
        const completeMsg = "Thank you for your time! This completes our interview. We'll review your responses and get back to you soon.";
        session.messages.push({ role: 'assistant', content: completeMsg, timestamp: Date.now() });
        return NextResponse.json({
          success: true,
          message: completeMsg,
          exchangeCount: session.exchangeCount,
          isComplete: true
        });
      }
      
      // Get the next question
      const nextQuestion = QUESTION_SEQUENCE[currentIndex];
      
      // Build conversation history for context
      const history = session.messages.slice(-4).map(m => 
        `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.content}`
      ).join('\n');
      
      // Generate a natural acknowledgment + the question
      let aiResponse = "";
      
      try {
        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: `You are a friendly AI interviewer. Acknowledge what the candidate said (1 short sentence), then ask the exact question provided.

CONVERSATION: ${history}

Candidate said: "${message}"

Question to ask: "${nextQuestion}"

Your response (acknowledgment + question):`
            }
          ],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.5,
          max_tokens: 80,
        });
        
        aiResponse = completion.choices[0]?.message?.content || `Thanks for sharing. ${nextQuestion}`;
      } catch (err) {
        aiResponse = `Thanks for sharing. ${nextQuestion}`;
      }
      
      // Store AI response and increment question index
      session.messages.push({ role: 'assistant', content: aiResponse, timestamp: Date.now() });
      session.questionIndex++;
      
      const isComplete = session.questionIndex >= QUESTION_SEQUENCE.length;
      
      return NextResponse.json({
        success: true,
        message: aiResponse,
        exchangeCount: session.exchangeCount,
        isComplete: isComplete
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('API Error:', error.message);
    return NextResponse.json({ 
      success: true, 
      message: QUESTION_SEQUENCE[0],
      exchangeCount: 0,
      isComplete: false
    });
  }
}
