import React, { useState } from 'react';
import { FiMail, FiMessageCircle, FiSearch, FiEdit, FiPhone } from 'react-icons/fi';

const CommunicationsHub = () => {
  const [activeTab, setActiveTab] = useState('Email');
  const [selectedMessage, setSelectedMessage] = useState(null);

  const messages = [
    { id: 1, type: 'Email', sender: 'John Doe', subject: 'Re: Maldives Quote', snippet: 'Thanks for sending this over. Can we add one more day?', time: '10:30 AM', unread: true },
    { id: 2, type: 'WhatsApp', sender: 'Sarah Smith', subject: 'WhatsApp Message', snippet: 'Is the transfer included?', time: 'Yesterday', unread: false },
  ];

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)' }}>
      {/* Sidebar List */}
      <div style={{ width: '350px', background: 'white', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2 style={{ margin: 0 }}>Inbox</h2>
            <button className="btn btn-icon"><FiEdit /></button>
          </div>
          <div style={{ position: 'relative' }}>
            <FiSearch style={{ position: 'absolute', top: 10, left: 10, color: '#999' }} />
            <input type="text" placeholder="Search messages..." style={{ width: '100%', padding: '8px 8px 8px 30px', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>
        </div>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
          {['Email', 'WhatsApp', 'SMS'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: '10px', background: 'none', border: 'none', borderBottom: activeTab === tab ? '2px solid var(--primary)' : 'none', fontWeight: activeTab === tab ? 'bold' : 'normal', color: activeTab === tab ? 'var(--primary)' : '#666', cursor: 'pointer' }}>
              {tab}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {messages.filter(m => m.type === activeTab || activeTab === 'All').map(msg => (
            <div key={msg.id} onClick={() => setSelectedMessage(msg)} style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', background: selectedMessage?.id === msg.id ? '#f8fafc' : 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <strong style={{ display: 'flex', alignItems: 'center', gap: '5px', color: msg.unread ? 'black' : '#666' }}>
                   {msg.type === 'Email' ? <FiMail /> : <FiMessageCircle />} {msg.sender}
                </strong>
                <span style={{ fontSize: '0.8rem', color: '#999' }}>{msg.time}</span>
              </div>
              <div style={{ fontWeight: msg.unread ? 'bold' : 'normal', fontSize: '0.9rem', marginBottom: '5px' }}>{msg.subject}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg.snippet}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Message Detail View */}
      <div style={{ flex: 1, background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
        {selectedMessage ? (
          <>
            <div style={{ padding: '20px', background: 'white', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 5px 0' }}>{selectedMessage.subject}</h3>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>From: <strong>{selectedMessage.sender}</strong></div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-outline btn-sm"><FiPhone /> Call</button>
              </div>
            </div>
            <div style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>
               <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <p>{selectedMessage.snippet}</p>
               </div>
            </div>
            <div style={{ padding: '20px', background: 'white', borderTop: '1px solid var(--border-color)' }}>
               <textarea placeholder="Type your reply here..." style={{ width: '100%', height: '100px', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', marginBottom: '10px' }}></textarea>
               <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                 <button className="btn btn-primary">Send Reply</button>
               </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
            Select a message to view the conversation.
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunicationsHub;
