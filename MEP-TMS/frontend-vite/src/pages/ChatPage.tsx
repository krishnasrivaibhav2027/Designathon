import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Plus, Users, Hash, User, Loader2, MessageSquare, Shield, UserPlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface Thread {
  id: string;
  title: string;
  type: 'CHANNEL' | 'DM';
  created_at: string;
  isTempEmpty?: boolean;
}

interface Message {
  id: string;
  thread_id: string;
  sender_email: string;
  sender_name: string;
  sender_role: string;
  content: string;
  created_at: string;
}

interface Contact {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

export default function ChatPage() {
  const { user } = useAuth();
  
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>('channel-staff-lounge');
  const [messages, setMessages] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [inputText, setInputText] = useState('');
  
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [threadsLoading, setThreadsLoading] = useState(false);
  
  // Toggle between "Recent Messages" and "Trainers" sub-views in the sidebar
  const [dmView, setDmView] = useState<'recent' | 'trainers'>('recent');

  const socketRef = useRef<WebSocket | null>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<Record<string, any>>({});

  // 1. Fetch available chat channels
  const fetchThreads = async () => {
    setThreadsLoading(true);
    try {
      const res = await api.get('/chat/threads');
      if (Array.isArray(res.data)) {
        setThreads(res.data);
      }
    } catch (err) {
      console.warn('Failed to load chat channels:', err);
    } finally {
      setThreadsLoading(false);
    }
  };

  // 2. Fetch coordinators & trainers to list as direct message contacts
  const fetchContacts = async () => {
    try {
      const res = await api.get('/users/trainers');
      if (res.data && Array.isArray(res.data.data)) {
        setContacts(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to load contacts list:', err);
    }
  };

  useEffect(() => {
    fetchThreads();
    fetchContacts();
  }, []);

  // 3. Fetch messages whenever the active channel/DM room changes
  useEffect(() => {
    if (!activeThreadId) return;

    const fetchMessages = async () => {
      try {
        const res = await api.get(`/chat/threads/${activeThreadId}/messages`);
        if (Array.isArray(res.data)) {
          setMessages(res.data);
        }
      } catch (err) {
        console.warn('Failed to load messages:', err);
      }
    };

    fetchMessages();
  }, [activeThreadId]);

  // 4. Hook up WebSocket client scoped to the activeThreadId
  useEffect(() => {
    if (!activeThreadId) return;

    const wsUrl = `ws://localhost:8000/api/chat/ws/${activeThreadId}`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log(`[WebSocket] Connected to room: ${activeThreadId}`);
      setIsConnected(true);
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'typing') {
        const senderEmail = data.sender_email;
        const senderName = data.sender_name;

        if (senderEmail === user?.email) return;

        setTypingUsers(prev => ({ ...prev, [senderName]: true }));

        if (typingTimeoutRef.current[senderName]) {
          clearTimeout(typingTimeoutRef.current[senderName]);
        }
        typingTimeoutRef.current[senderName] = setTimeout(() => {
          setTypingUsers(prev => {
            const next = { ...prev };
            delete next[senderName];
            return next;
          });
        }, 2500);
      } 
      
      else if (data.type === 'message') {
        const newMsg = data.message;
        
        const senderName = newMsg.sender_name;
        setTypingUsers(prev => {
          const next = { ...prev };
          delete next[senderName];
          return next;
        });

        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });

        // Clear the temp empty flag for this thread so it stays in "Recent"
        setThreads(prev => prev.map(t => t.id === newMsg.thread_id ? { ...t, isTempEmpty: false } : t));
      }
    };

    socket.onclose = () => {
      console.log(`[WebSocket] Room connection closed: ${activeThreadId}`);
      setIsConnected(false);
    };

    socket.onerror = (err) => {
      console.error('[WebSocket] Error in room:', err);
      setIsConnected(false);
    };

    socketRef.current = socket;

    return () => {
      socket.close();
    };
  }, [activeThreadId, user]);

  // 5. Scroll message history into view
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  // 6. Handle input typing broadcast
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const payload = {
        type: 'typing',
        sender_email: user?.email || 'unknown@mep.com',
        sender_name: user?.fullName || 'Anonymous'
      };
      socketRef.current.send(JSON.stringify(payload));
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      toast.error('Connection currently offline. Re-establishing channel...');
      return;
    }

    const payload = {
      type: 'message',
      content: inputText,
      sender_email: user?.email || 'unknown@mep.com',
      sender_name: user?.fullName || 'Anonymous',
      sender_role: user?.role || 'COORDINATOR'
    };

    socketRef.current.send(JSON.stringify(payload));
    setInputText('');

    // Clear the temp empty flag for this thread so it stays in "Recent"
    setThreads(prev => prev.map(t => t.id === activeThreadId ? { ...t, isTempEmpty: false } : t));

    // Auto-switch to recent messages view so the user sees the conversation listed
    setDmView('recent');
  };

  // Helper to determine if a thread is a DM specifically with a given contact name
  const isDMWithContact = (thread: Thread, contactName: string) => {
    if (thread.type !== 'DM') return false;
    const title = thread.title;
    if (title.startsWith('DM: ')) {
      const parts = title.substring(4).split(' & ').map(p => p.trim());
      if (user?.fullName) {
        const other = parts.find(p => p.toLowerCase() !== user.fullName.toLowerCase());
        return other?.toLowerCase() === contactName.toLowerCase();
      }
      return parts.map(p => p.toLowerCase()).includes(contactName.toLowerCase());
    }
    if (title.startsWith('DM with ')) {
      const other = title.substring(8).trim();
      return other.toLowerCase() === contactName.toLowerCase();
    }
    return title.toLowerCase().includes(contactName.toLowerCase());
  };

  // Extract the other person's name from thread title
  const getDMDisplayName = (thread: Thread) => {
    const title = thread.title;
    if (title.startsWith('DM: ')) {
      const parts = title.substring(4).split(' & ').map(p => p.trim());
      const other = parts.find(p => p.toLowerCase() !== user?.fullName?.toLowerCase());
      if (other) return other;
    }
    if (title.startsWith('DM with ')) {
      return title.substring(8).trim();
    }
    return title
      .replace('DM: ', '')
      .replace('DM with ', '')
      .replace(user?.fullName || '', '')
      .replace(' & ', '')
      .replace(' (Trainer)', '')
      .trim();
  };

  // Convert click on Contact card to dynamic DM thread creation
  const handleStartDM = async (contact: Contact) => {
    const existing = threads.find(t => isDMWithContact(t, contact.fullName));
    if (existing) {
      setActiveThreadId(existing.id);
      if (!existing.isTempEmpty) {
        setDmView('recent');
      }
      return;
    }

    try {
      const res = await api.post('/chat/threads', {
        title: `DM: ${user?.fullName} & ${contact.fullName}`,
        type: 'DM'
      });
      if (res.data) {
        const newThread: Thread = { ...res.data, isTempEmpty: true };
        setThreads(prev => [...prev, newThread]);
        setActiveThreadId(res.data.id);
      }
    } catch {
      const localId = `dm-local-${Math.random()}`;
      const localDM: Thread = {
        id: localId,
        title: `DM with ${contact.fullName}`,
        type: 'DM',
        created_at: new Date().toISOString(),
        isTempEmpty: true
      };
      setThreads(prev => [...prev, localDM]);
      setActiveThreadId(localId);
    }
  };

  const activeThread = threads.find(t => t.id === activeThreadId);
  const activeChannelTitle = activeThread
    ? (activeThread.type === 'DM' ? `DM with ${getDMDisplayName(activeThread)}` : activeThread.title)
    : '# Staff Lounge';

  // Derived: DM threads only (for "Recent Messages")
  // Show a DM thread only if it is not empty
  const dmThreads = threads.filter(t => t.type === 'DM' && !t.isTempEmpty);

  return (
    <div className="chat-page-container fade-in" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, height: 'calc(100vh - 80px - 56px)', overflow: 'hidden' }}>
      
      {/* Left panel: Channels & Messages Roster */}
      <div className="card card-glow-blue" style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 20, height: '100%', transform: 'none' }}>
        
        {/* Workspace Channels */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <MessageSquare size={18} color="var(--pale-orange)" />
            <h4 style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Channels</h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {threads.filter(t => t.type === 'CHANNEL').map(c => {
              const isActive = activeThreadId === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setActiveThreadId(c.id)}
                  style={{
                    padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
                    background: isActive ? 'var(--pale-orange-glow)' : 'transparent',
                    color: isActive ? 'var(--pale-orange)' : 'var(--text-primary)',
                    fontWeight: isActive ? 700 : 600,
                    fontSize: 13.5,
                    display: 'flex', alignItems: 'center', gap: 10,
                    transition: 'all 0.2s',
                    border: isActive ? '1px solid var(--pale-orange)' : '1px solid transparent'
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--border-color)' }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  <Hash size={16} style={{ flexShrink: 0 }} />
                  <span>{c.title.replace('# ', '')}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Separator */}
        <div style={{ borderBottom: '1px solid var(--border-color)' }} />

        {/* Recent Messages / Trainers Toggle Area */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          
          {/* Toggle Header: Recent | Trainers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 14 }}>
            <button
              onClick={() => setDmView('recent')}
              style={{
                flex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px 0',
                background: dmView === 'recent' ? 'var(--powder-blue-glow)' : 'transparent',
                border: dmView === 'recent' ? '1px solid var(--powder-blue)' : '1px solid var(--border-color)',
                borderRight: 'none',
                borderTopLeftRadius: 10,
                borderBottomLeftRadius: 10,
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                color: dmView === 'recent' ? 'var(--powder-blue)' : 'var(--text-secondary)',
              }}
            >
              <MessageSquare size={14} />
              <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4 }}>Recent</span>
            </button>
            <button
              onClick={() => setDmView('trainers')}
              style={{
                flex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px 0',
                background: dmView === 'trainers' ? 'var(--pale-orange-glow)' : 'transparent',
                border: dmView === 'trainers' ? '1px solid var(--pale-orange)' : '1px solid var(--border-color)',
                borderLeft: dmView === 'trainers' ? '1px solid var(--pale-orange)' : 'none',
                borderTopRightRadius: 10,
                borderBottomRightRadius: 10,
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                color: dmView === 'trainers' ? 'var(--pale-orange)' : 'var(--text-secondary)',
              }}
            >
              <Users size={14} />
              <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4 }}>Trainers</span>
            </button>
          </div>

          {/* Sub-view content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>

            {/* ========== RECENT MESSAGES VIEW ========== */}
            {dmView === 'recent' && (
              <>
                {dmThreads.length === 0 ? (
                  <div style={{ padding: '24px 12px', textAlign: 'center' }}>
                    <MessageSquare size={28} color="var(--text-muted)" style={{ marginBottom: 8, opacity: 0.5 }} />
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      No recent conversations yet.<br />
                      Click <strong>Trainers</strong> to start a chat.
                    </p>
                  </div>
                ) : (
                  dmThreads.map(thread => {
                    const isActive = activeThreadId === thread.id;
                    const displayName = getDMDisplayName(thread);
                    
                    return (
                      <div
                        key={thread.id}
                        onClick={() => setActiveThreadId(thread.id)}
                        style={{
                          padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                          background: isActive ? 'var(--powder-blue-glow)' : 'transparent',
                          display: 'flex', alignItems: 'center', gap: 10,
                          transition: 'all 0.2s',
                          border: isActive ? '1px solid var(--powder-blue)' : '1px solid transparent'
                        }}
                        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--border-color)' }}
                        onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                      >
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: isActive ? 'var(--powder-blue-glow)' : 'var(--border-color)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 800, color: 'var(--powder-blue)',
                          border: '1px solid var(--border-color)',
                          flexShrink: 0
                        }}>
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ 
                            fontSize: 13, fontWeight: isActive ? 700 : 600, 
                            color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                          }}>
                            {displayName || thread.title}
                          </p>
                          <span style={{ fontSize: 10, color: 'var(--powder-blue)', fontWeight: 700, textTransform: 'uppercase' }}>
                            DM
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}

            {/* ========== TRAINERS LIST VIEW ========== */}
            {dmView === 'trainers' && (
              <>
                {contacts.length === 0 ? (
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', padding: '12px 6px' }}>No trainers found.</p>
                ) : (
                  contacts.map(contact => {
                    const hasDM = threads.some(t => isDMWithContact(t, contact.fullName));
                    const activeThread = threads.find(t => t.id === activeThreadId);
                    const isSelectedDM = activeThread ? isDMWithContact(activeThread, contact.fullName) : false;

                    return (
                      <div
                        key={contact.id}
                        onClick={() => handleStartDM(contact)}
                        style={{
                          padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                          background: isSelectedDM ? 'var(--pale-orange-glow)' : 'transparent',
                          display: 'flex', alignItems: 'center', gap: 10,
                          transition: 'all 0.2s',
                          border: isSelectedDM ? '1px solid var(--pale-orange)' : '1px solid transparent'
                        }}
                        onMouseEnter={(e) => { if (!isSelectedDM) e.currentTarget.style.background = 'var(--border-color)' }}
                        onMouseLeave={(e) => { if (!isSelectedDM) e.currentTarget.style.background = 'transparent' }}
                      >
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: isSelectedDM ? 'var(--pale-orange-glow)' : 'var(--border-color)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 800, color: 'var(--pale-orange)',
                          border: '1px solid var(--border-color)',
                          flexShrink: 0
                        }}>
                          {contact.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ 
                            fontSize: 13, fontWeight: isSelectedDM ? 700 : 600, 
                            color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                          }}>
                            {contact.fullName}
                          </p>
                          <span style={{ fontSize: 10, color: 'var(--pale-orange)', fontWeight: 700, textTransform: 'uppercase' }}>
                            {contact.role}
                          </span>
                        </div>
                        {hasDM && (
                          <div style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: '#4caf50', flexShrink: 0,
                            boxShadow: '0 0 6px rgba(76, 175, 80, 0.5)'
                          }} title="Active conversation" />
                        )}
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>
        </div>

      </div>

      {/* Right panel: Active Chat viewport */}
      <div className="card card-glow-orange" style={{ display: 'flex', flexDirection: 'column', padding: 0, height: '100%' }}>
        
        {/* Header bar */}
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid var(--border-color)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--bg-main)', borderTopLeftRadius: 20, borderTopRightRadius: 20
        }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {activeChannelTitle}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: isConnected ? '#4caf50' : 'var(--pale-orange)' }} />
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700 }}>
                {isConnected ? 'Real-time sync active' : 'Connecting handshake...'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700 }}>
            <Shield size={16} color="var(--pale-orange)" />
            <span>Staff Portal Secure Room</span>
          </div>
        </div>

        {/* Message Feed Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {messages.length === 0 ? (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', textAlign: 'center'
            }}>
              <div style={{
                width: 54, height: 54, borderRadius: '50%', background: 'var(--pale-orange-glow)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
                border: '1px solid var(--pale-orange)'
              }}>
                <MessageSquare size={24} color="var(--pale-orange)" />
              </div>
              <h4 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>This room is ready to message!</h4>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 320, marginTop: 4, lineHeight: 1.4 }}>
                Send a message to start conversing with active trainers and coordinators in real-time.
              </p>
            </div>
          ) : (
            <>
              {messages.map((msg) => {
                const isMe = msg.sender_email === user?.email;
                return (
                  <div 
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isMe ? 'flex-end' : 'flex-start',
                      alignSelf: isMe ? 'flex-end' : 'flex-start',
                      maxWidth: '70%',
                    }}
                  >
                    {/* Sender profile name & role badge */}
                    {!isMe && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4, display: 'block', marginLeft: 4 }}>
                        {msg.sender_name} <span style={{ color: 'var(--yellow)', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', marginLeft: 4 }}>[{msg.sender_role}]</span>
                      </span>
                    )}
                    
                    {/* Bubble capsule */}
                    <div style={{
                      padding: '11px 16px',
                      borderRadius: 18,
                      borderTopRightRadius: isMe ? 2 : 18,
                      borderTopLeftRadius: isMe ? 18 : 2,
                      background: isMe ? 'var(--powder-blue)' : 'var(--bg-card)',
                      color: isMe ? '#ffffff' : 'var(--text-primary)',
                      border: isMe ? '1px solid var(--powder-blue)' : '1px solid var(--border-color)',
                      fontSize: 13,
                      fontWeight: 500,
                      lineHeight: 1.5,
                      boxShadow: 'var(--shadow-card)',
                      whiteSpace: 'pre-wrap',
                    }}>
                      {msg.content}
                    </div>
                  </div>
                );
              })}
              
              {/* Typing composing indicators */}
              {Object.keys(typingUsers).length > 0 && (
                <div style={{ display: 'flex', alignSelf: 'flex-start', gap: 6, padding: '10px 16px', borderRadius: 18, background: 'var(--powder-blue-glow)', border: '1px solid var(--powder-blue)' }}>
                  <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--powder-blue)', animation: 'pulse 1s infinite' }} />
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--powder-blue)', animation: 'pulse 1s infinite 0.2s' }} />
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 600 }}>
                    {Object.keys(typingUsers).join(', ')} is typing...
                  </span>
                </div>
              )}
              
              <div ref={messageEndRef} />
            </>
          )}
        </div>

        {/* Input Text Form */}
        <form onSubmit={handleSendMessage} style={{
          padding: '16px 24px', borderTop: '1px solid var(--border-color)',
          display: 'flex', gap: 12, alignItems: 'center'
        }}>
          <input 
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder="Type your message here..."
            className="glass-input"
            style={{
              flex: 1, padding: '12px 20px', borderRadius: 14,
              fontSize: 13, fontWeight: 500,
            }}
          />
          <button 
            type="submit"
            className="btn-primary"
            disabled={!inputText.trim()}
            style={{
              width: 44, height: 44, borderRadius: 14, display: 'flex',
              alignItems: 'center', justifyContent: 'center', padding: 0,
              background: !inputText.trim() ? 'var(--border-color)' : 'var(--powder-blue)',
              color: !inputText.trim() ? 'var(--text-muted)' : '#ffffff',
              cursor: !inputText.trim() ? 'not-allowed' : 'pointer'
            }}
          >
            <Send size={16} strokeWidth={2.5} />
          </button>
        </form>
      </div>

    </div>
  );
}
