import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiSearch, FiPhone, FiSend, FiMail, FiMessageCircle, FiMessageSquare } from 'react-icons/fi';
import { api } from '../services/api';
import { useLeads } from '../context/LeadContext';
import './Communications.css';

const fmtTime = (d) => {
  if (!d) return '';
  const date = new Date(d);
  const now = new Date();
  if (date.toDateString() === now.toDateString())
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const yest = new Date(now); yest.setDate(now.getDate() - 1);
  if (date.toDateString() === yest.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const CHANNEL_ICONS = { Email: FiMail, WhatsApp: FiMessageCircle, SMS: FiMessageSquare };
const ChannelIcon = ({ channel }) => {
  const Icon = CHANNEL_ICONS[channel] ?? FiMail;
  return <Icon size={13} />;
};

const CHANNEL_FILTERS = ['All', 'Email', 'WhatsApp', 'SMS'];

// ── Conversation list item ────────────────────────────────────────
const ConvItem = ({ conv, active, onClick }) => (
  <button
    className={`comms-conv-item${active ? ' comms-conv-item--active' : ''}`}
    onClick={() => onClick(conv)}
  >
    <div className="comms-conv-avatar">
      {(conv.contact_name?.[0] || '?').toUpperCase()}
    </div>
    <div className="comms-conv-body">
      <div className="comms-conv-top">
        <span className="comms-conv-name">{conv.contact_name}</span>
        <span className="comms-conv-time">{fmtTime(conv.last_sent_at)}</span>
      </div>
      <div className="comms-conv-bottom">
        <span className="comms-conv-snippet">{conv.last_message || '—'}</span>
        {conv.unread > 0 && <span className="comms-unread-dot" aria-label={`${conv.unread} unread`} />}
      </div>
    </div>
  </button>
);

// ── Message bubble ────────────────────────────────────────────────
const Bubble = ({ msg }) => {
  const sent = msg.direction === 'outbound';
  return (
    <div className={`comms-bubble comms-bubble--${sent ? 'sent' : 'received'}`}>
      <div className="comms-bubble-content">{msg.content}</div>
      <div className="comms-bubble-meta">
        {msg.sent_by && sent && <span>{msg.sent_by}</span>}
        <span>{fmtTime(msg.sent_at)}</span>
      </div>
    </div>
  );
};

// ── Communications page ───────────────────────────────────────────
const Communications = () => {
  const { dispatch } = useLeads();

  const [conversations, setConversations] = useState([]);
  const [messages,      setMessages]      = useState([]);
  const [active,        setActive]        = useState(null);
  const [search,        setSearch]        = useState('');
  const [chanFilter,    setChanFilter]    = useState('All');
  const [text,          setText]          = useState('');
  const [sending,       setSending]       = useState(false);
  const [loadingMsgs,   setLoadingMsgs]   = useState(false);

  const threadRef = useRef(null);

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      const data = await api.getConversations();
      setConversations(data);
      const total = data.reduce((s, c) => s + (c.unread || 0), 0);
      dispatch({ type: 'SET_COMMS_UNREAD', payload: total });
    } catch (_) {}
  }, [dispatch]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Auto-scroll thread to bottom
  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages]);

  const selectConversation = useCallback(async (conv) => {
    setActive(conv);
    setLoadingMsgs(true);
    try {
      const msgs = await api.getMessages(conv.contactId);
      setMessages(msgs);
      // Refresh conversations to clear unread badge
      loadConversations();
    } catch (_) { setMessages([]); }
    finally { setLoadingMsgs(false); }
  }, [loadConversations]);

  const handleSend = useCallback(async () => {
    if (!text.trim() || !active || sending) return;
    const content = text.trim();
    setText('');
    setSending(true);
    // Optimistic
    const temp = { _id: `tmp-${Date.now()}`, direction: 'outbound', content, sent_at: new Date(), sent_by: 'You', channel: active.channel };
    setMessages((p) => [...p, temp]);
    try {
      const saved = await api.sendMessage(active.contactId, { content, channel: active.channel });
      setMessages((p) => p.map((m) => m._id === temp._id ? saved : m));
      loadConversations();
    } catch (_) {
      setMessages((p) => p.filter((m) => m._id !== temp._id));
      setText(content);
    }
    setSending(false);
  }, [text, active, sending, loadConversations]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const filteredConvs = conversations.filter((c) => {
    const matchChan = chanFilter === 'All' || c.channel === chanFilter;
    const q = search.trim().toLowerCase();
    const matchQ = !q || c.contact_name?.toLowerCase().includes(q) || c.last_message?.toLowerCase().includes(q);
    return matchChan && matchQ;
  });

  return (
    <div className="comms-page">

      {/* ── Left panel: conversation list ── */}
      <div className="comms-left">
        <div className="comms-left-hdr">
          <h2 className="comms-inbox-title">Inbox</h2>
          <div className="comms-search-wrap">
            <FiSearch className="comms-search-icon" size={13} />
            <input
              type="search"
              className="comms-search-input"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="comms-chan-filters">
            {CHANNEL_FILTERS.map((ch) => (
              <button
                key={ch}
                className={`comms-chan-btn${chanFilter === ch ? ' comms-chan-btn--active' : ''}`}
                onClick={() => setChanFilter(ch)}
              >
                {ch}
              </button>
            ))}
          </div>
        </div>

        <div className="comms-conv-list">
          {filteredConvs.length === 0 ? (
            <div className="comms-empty-list">No conversations yet.</div>
          ) : (
            filteredConvs.map((c) => (
              <ConvItem
                key={c.contactId}
                conv={c}
                active={active?.contactId === c.contactId}
                onClick={selectConversation}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Right panel: thread ── */}
      <div className="comms-right">
        {!active ? (
          <div className="comms-no-selection">
            <FiMessageCircle size={40} />
            <p>Select a conversation to start messaging</p>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="comms-thread-hdr">
              <div className="comms-thread-avatar">
                {(active.contact_name?.[0] || '?').toUpperCase()}
              </div>
              <div className="comms-thread-meta">
                <div className="comms-thread-name">{active.contact_name}</div>
                <span className="comms-thread-channel">
                  <ChannelIcon channel={active.channel} />
                  {active.channel}
                </span>
              </div>
              <button className="comms-call-btn" aria-label="Call">
                <FiPhone size={16} />
                Call
              </button>
            </div>

            {/* Messages */}
            <div className="comms-thread-body" ref={threadRef}>
              {loadingMsgs ? (
                <div className="comms-loading">Loading messages…</div>
              ) : messages.length === 0 ? (
                <div className="comms-loading">No messages yet. Start the conversation.</div>
              ) : (
                messages.map((m, i) => <Bubble key={m._id ?? i} msg={m} />)
              )}
            </div>

            {/* Input */}
            <div className="comms-input-area">
              <textarea
                className="comms-input"
                placeholder="Type a message… (Enter to send)"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                disabled={sending}
              />
              <button
                className="comms-send-btn"
                onClick={handleSend}
                disabled={!text.trim() || sending}
                aria-label="Send"
              >
                <FiSend size={16} />
              </button>
            </div>
          </>
        )}
      </div>

    </div>
  );
};

export default Communications;
