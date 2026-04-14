import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { v4 as uuidv4 } from 'uuid';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

const sessions = new Map();

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

      // Store user message
      session.messages.push({ role: 'user', content: message, timestamp: Date.now() });
      session.exchangeCount++;
      
      const exchangeCount = session.exchangeCount;
      
      // Build conversation history
      const history = session.messages.slice(-6).map(m => 
        `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.content}`
      ).join('\n');
      
      // Get already asked questions
      const askedList = session.askedQuestions.join(', ');
      
      // Define question sequence (never repeats)
      const questionSequence = [
        "What teaching experience do you have?",
        "What subjects do you enjoy teaching the most?",
        "How would you describe your teaching style?",
        "How do you help students who are struggling?",
        "How do you keep students engaged?",
        "What is your teaching philosophy?",
        "How do you handle frustrated students?",
        "What makes you a good tutor for Cuemath?"
      ];
      
      // Get next question based on how many have been asked
      const askedCount = session.askedQuestions.length;
      let nextQuestion = "";
      
      if (askedCount < questionSequence.length) {
        nextQuestion = questionSequence[askedCount];
      } else {
        nextQuestion = "Thank you for your time! This completes our interview.";
      }
      
      // Generate response with the next question
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are a friendly AI interviewer for Cuemath.

CONVERSATION SO FAR:
${history}

IMPORTANT RULES:
1. Acknowledge what the candidate said in ONE short sentence
2. Then ask EXACTLY this question: "${nextQuestion}"
3. DO NOT ask any other question
4. Keep response under 30 words

Example: "Thanks for sharing. What teaching experience do you have?"`
          },
          {
            role: 'user',
            content: `Candidate said: "${message}"`
          }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.5,
        max_tokens: 100,
      });
      
      let aiResponse = completion.choices[0]?.message?.content || `Thanks for sharing. ${nextQuestion}`;
      
      // Store the question asked
      if (nextQuestion !== "Thank you for your time! This completes our interview.") {
        session.askedQuestions.push(nextQuestion);
      }
      session.messages.push({ role: 'assistant', content: aiResponse, timestamp: Date.now() });
      
      const isComplete = exchangeCount >= 8 || askedCount >= questionSequence.length;
      
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
