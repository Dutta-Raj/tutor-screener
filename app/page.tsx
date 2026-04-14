'use client';
import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface SessionData {
  id: string;
  name: string;
  date: string;
  messageCount: number;
  exchangeCount: number;
}

interface Assessment {
  scores: {
    communication: { score: number; feedback: string };
    patience: { score: number; feedback: string };
    simplicity: { score: number; feedback: string };
    fluency: { score: number; feedback: string };
    temperament: { score: number; feedback: string };
  };
  overallScore: number;
  recommendation: string;
  strengths: string[];
  areasForImprovement: string[];
  summary: string;
}

export default function Home() {
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [interviewActive, setInterviewActive] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [candidateName, setCandidateName] = useState('');
  const [exchangeCount, setExchangeCount] = useState(0);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(900);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer
  useEffect(() => {
    if (interviewActive && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [interviewActive]);

  useEffect(() => {
    if (timeRemaining === 0 && interviewActive) {
      endInterview();
    }
  }, [timeRemaining, interviewActive]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startInterview = async () => {
    if (!candidateName.trim()) {
      alert('Please enter your name');
      return;
    }
    
    setLoading(true);
    
    try {
      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', name: candidateName.trim() })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setSessionId(data.sessionId);
        setMessages([{ role: 'assistant', content: data.message, timestamp: Date.now() }]);
        setInterviewActive(true);
        setExchangeCount(0);
        setAssessment(null);
        setTimeRemaining(900);
        speakText(data.message);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to start interview');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading || !sessionId) return;
    
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: Date.now() }]);
    setLoading(true);
    
    try {
      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', sessionId, message: userMessage })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.message, timestamp: Date.now() }]);
        setExchangeCount(data.exchangeCount);
        speakText(data.message);
        
        if (data.isComplete) {
          endInterview();
        }
      } else if (data.error) {
        alert(data.error);
        resetInterview();
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const endInterview = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    // Generate assessment
    const conversation = messages.map(m => `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.content}`).join('\n');
    
    try {
      const res = await fetch('/api/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, name: candidateName })
      });
      
      const data = await res.json();
      if (data.success && data.assessment) {
        setAssessment(data.assessment);
      }
    } catch (error) {
      console.error('Assessment error:', error);
    }
    
    setInterviewActive(false);
    loadHistory();
  };

  const loadHistory = async () => {
    try {
      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'history' })
      });
      
      const data = await res.json();
      if (data.success) {
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const viewSessionDetails = async (sessionId: string) => {
    try {
      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'details', sessionId })
      });
      
      const data = await res.json();
      if (data.success) {
        setSelectedSession(data.session);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!confirm('Delete this interview?')) return;
    
    try {
      await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', sessionId })
      });
      
      loadHistory();
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null);
      }
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const downloadReport = () => {
    if (!assessment) return;
    
    const report = `
================================================================================
                        CUEMATH TUTOR ASSESSMENT
================================================================================

CANDIDATE: ${candidateName}
DATE: ${new Date().toLocaleString()}
DURATION: ${formatTime(900 - timeRemaining)}

================================================================================
SCORES (1-10)
================================================================================
Communication: ${assessment.scores.communication.score}/10
  ${assessment.scores.communication.feedback}

Patience: ${assessment.scores.patience.score}/10
  ${assessment.scores.patience.feedback}

Simplicity: ${assessment.scores.simplicity.score}/10
  ${assessment.scores.simplicity.feedback}

Fluency: ${assessment.scores.fluency.score}/10
  ${assessment.scores.fluency.feedback}

Temperament: ${assessment.scores.temperament.score}/10
  ${assessment.scores.temperament.feedback}

================================================================================
OVERALL SCORE: ${assessment.overallScore}/100
RECOMMENDATION: ${assessment.recommendation}
================================================================================

STRENGTHS:
${assessment.strengths.map(s => `  - ${s}`).join('\n')}

AREAS FOR IMPROVEMENT:
${assessment.areasForImprovement.map(a => `  - ${a}`).join('\n')}

SUMMARY:
${assessment.summary}
`;
    
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cuemath_Assessment_${candidateName}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Voice input requires Chrome browser');
      return;
    }
    const SpeechRecognition = (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      setInput(event.results[0][0].transcript);
    };
    recognition.start();
  };

  const resetInterview = () => {
    setInterviewActive(false);
    setMessages([]);
    setAssessment(null);
    setSessionId(null);
    setCandidateName('');
    setExchangeCount(0);
    setTimeRemaining(900);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.1)', padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: 'white', margin: 0 }}>?? Cuemath AI Tutor Screener</h1>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>Position: Cuemath Tutor | Voice Interview | Smart Assessment</p>
          </div>
          <button onClick={() => { setShowHistory(!showHistory); loadHistory(); }} style={{ padding: '10px 20px', background: showHistory ? 'white' : 'rgba(255,255,255,0.2)', color: showHistory ? '#667eea' : 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
            ?? History ({sessions.length})
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 20px', display: 'flex', gap: '24px' }}>
        {/* Main Interview Area */}
        <div style={{ flex: 2 }}>
          {!interviewActive && !assessment ? (
            // Start Screen
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '24px', padding: '50px', textAlign: 'center', backdropFilter: 'blur(10px)' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>??</div>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: 'white', marginBottom: '16px' }}>Cuemath Tutor Screening</h2>
              <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '30px' }}>15 Minutes | Voice Conversation | Smart Assessment</p>
              <input
                type="text"
                placeholder="Enter your full name"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && startInterview()}
                style={{ padding: '14px 24px', fontSize: '16px', borderRadius: '40px', border: 'none', width: '300px', marginBottom: '16px', outline: 'none' }}
                disabled={loading}
              />
              <br/>
              <button onClick={startInterview} disabled={loading} style={{ padding: '14px 48px', background: 'linear-gradient(135deg, #48bb78, #4299e1)', color: 'white', border: 'none', borderRadius: '40px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '16px', opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Starting...' : 'Start Interview'}
              </button>
            </div>
          ) : interviewActive ? (
            // Interview Screen
            <div>
              {/* Progress */}
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '16px', padding: '16px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ color: 'white', fontSize: '14px' }}>Progress</span>
                  <div style={{ marginTop: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', height: '6px', width: '150px', overflow: 'hidden' }}>
                    <div style={{ width: `${(exchangeCount / 10) * 100}%`, height: '100%', background: '#48bb78' }} />
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', marginTop: '4px', display: 'block' }}>Question {exchangeCount}/10</span>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ color: timeRemaining < 120 ? '#f56565' : 'white', fontSize: '28px', fontWeight: 'bold' }}>{formatTime(timeRemaining)}</span>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px' }}>Remaining</div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span style={{ background: isSpeaking ? '#48bb78' : 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', color: 'white' }}>?? {isSpeaking ? 'Speaking' : 'AI'}</span>
                  <span style={{ background: isListening ? '#f56565' : 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', color: 'white' }}>?? {isListening ? 'Listening' : 'Voice'}</span>
                </div>
              </div>

              {/* Chat */}
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '24px', padding: '24px', minHeight: '400px', maxHeight: '450px', overflowY: 'auto', marginBottom: '20px' }}>
                {messages.map((msg, idx) => (
                  <div key={idx} style={{ marginBottom: '16px', display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: '75%', padding: '12px 18px', borderRadius: '20px', background: msg.role === 'user' ? 'linear-gradient(135deg, #48bb78, #4299e1)' : 'rgba(255,255,255,0.2)', color: 'white' }}>
                      <div style={{ fontSize: '11px', opacity: 0.7, marginBottom: '4px' }}>{msg.role === 'user' ? candidateName : 'AI Interviewer'}</div>
                      <div style={{ fontSize: '14px', lineHeight: '1.5' }}>{msg.content}</div>
                      <div style={{ fontSize: '9px', opacity: 0.5, marginTop: '6px' }}>{new Date(msg.timestamp).toLocaleTimeString()}</div>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{ background: 'rgba(255,255,255,0.2)', padding: '12px 18px', borderRadius: '20px' }}>
                      <div style={{ fontSize: '11px', opacity: 0.7 }}>AI Interviewer</div>
                      <div style={{ fontSize: '14px' }}>Thinking...</div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={startVoiceInput} style={{ padding: '12px 20px', background: isListening ? '#f56565' : 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>
                  ?? {isListening ? 'Listening...' : 'Voice'}
                </button>
                <textarea 
                  value={input} 
                  onChange={(e) => setInput(e.target.value)} 
                  onKeyPress={handleKeyPress} 
                  placeholder="Type your answer..." 
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', fontSize: '14px', height: '60px', resize: 'none', outline: 'none' }} 
                />
                <button onClick={sendMessage} disabled={loading || !input.trim()} style={{ padding: '12px 28px', background: loading || !input.trim() ? '#666' : '#48bb78', color: 'white', border: 'none', borderRadius: '12px', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                  Send
                </button>
              </div>
              
              <button onClick={endInterview} style={{ marginTop: '16px', padding: '10px 20px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', width: '100%' }}>
                End Interview & Get Assessment
              </button>
            </div>
          ) : assessment ? (
            // Assessment Screen
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '24px', padding: '32px', backdropFilter: 'blur(10px)' }}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>??</div>
                <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>Assessment Complete!</h2>
              </div>

              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ fontSize: '56px', fontWeight: 'bold', color: assessment.overallScore >= 70 ? '#48bb78' : '#f56565' }}>
                  {assessment.overallScore}%
                </div>
                <div style={{ display: 'inline-block', padding: '4px 20px', borderRadius: '20px', background: assessment.recommendation === 'PASS' ? '#48bb78' : '#f56565', color: 'white', fontWeight: 'bold', marginTop: '8px' }}>
                  {assessment.recommendation}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '24px' }}>
                {Object.entries(assessment.scores).map(([key, val]: [string, any]) => (
                  <div key={key} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#48bb78' }}>{val.score}</div>
                    <div style={{ fontSize: '10px', color: 'white', marginTop: '4px' }}>{key === 'communication' ? 'Comm' : key === 'patience' ? 'Pat' : key === 'simplicity' ? 'Simp' : key === 'fluency' ? 'Flu' : 'Temp'}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ color: '#48bb78', marginBottom: '8px' }}>? Strengths</h3>
                {assessment.strengths.map((s, i) => <div key={i} style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '4px' }}>? {s}</div>)}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ color: '#f56565', marginBottom: '8px' }}>? Areas to Improve</h3>
                {assessment.areasForImprovement.map((a, i) => <div key={i} style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '4px' }}>? {a}</div>)}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ color: 'white', marginBottom: '8px' }}>?? Summary</h3>
                <p style={{ color: 'rgba(255,255,255,0.8)' }}>{assessment.summary}</p>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={downloadReport} style={{ flex: 1, padding: '12px', background: '#48bb78', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>
                  ?? Download Report
                </button>
                <button onClick={resetInterview} style={{ flex: 1, padding: '12px', background: 'white', color: '#667eea', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>
                  ?? New Interview
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* History Sidebar */}
        {showHistory && (
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', borderRadius: '24px', padding: '20px', maxHeight: '600px', overflowY: 'auto', backdropFilter: 'blur(10px)' }}>
            <h3 style={{ color: 'white', marginBottom: '16px' }}>?? Past Interviews</h3>
            {sessions.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>No interviews yet</p>
            ) : (
              sessions.map(session => (
                <div key={session.id} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', color: 'white' }}>{session.name}</div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>{session.date}</div>
                      <div style={{ fontSize: '11px', color: '#f6ad55' }}>{session.exchangeCount} exchanges</div>
                    </div>
                    <button onClick={() => deleteSession(session.id)} style={{ padding: '4px 8px', background: 'rgba(245,101,101,0.3)', color: '#f56565', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>
                      Delete
                    </button>
                  </div>
                  <button onClick={() => viewSessionDetails(session.id)} style={{ marginTop: '8px', width: '100%', padding: '6px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>
                    View Details
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Session Details Modal */}
      {selectedSession && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setSelectedSession(null)}>
          <div style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', borderRadius: '24px', padding: '32px', maxWidth: '600px', width: '90%', maxHeight: '80%', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: 'white', marginBottom: '8px' }}>{selectedSession.name}</h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '16px' }}>{new Date(selectedSession.createdAt).toLocaleString()}</p>
            
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: '#48bb78', marginBottom: '8px' }}>Conversation</h4>
              {selectedSession.messages?.slice(0, 10).map((msg: any, idx: number) => (
                <div key={idx} style={{ marginBottom: '8px', padding: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                  <strong style={{ color: msg.role === 'user' ? '#48bb78' : '#f6ad55' }}>{msg.role === 'user' ? selectedSession.name : 'AI'}:</strong>
                  <span style={{ color: 'rgba(255,255,255,0.8)', marginLeft: '8px' }}>{msg.content}</span>
                </div>
              ))}
            </div>
            
            <button onClick={() => setSelectedSession(null)} style={{ width: '100%', padding: '10px', background: 'white', color: '#667eea', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
