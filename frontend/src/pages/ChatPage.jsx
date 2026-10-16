import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { chatAPI, formatApiError } from '../utils/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

const POLL_MS = 5000;

const time = (value) => new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

// Messages and the box to write one. `load(after)` and `send(body)` talk to the right endpoints.
const Conversation = ({ load, send, mine, title, whatsappUrl }) => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);
  const lastRef = useRef(null);

  const refresh = useCallback(async (reset) => {
    try {
      const data = await load(reset ? null : lastRef.current);
      if (reset) {
        setMessages(data);
      } else if (data.length) {
        setMessages((prev) => {
          const known = new Set(prev.map((m) => m.id));
          return [...prev, ...data.filter((m) => !known.has(m.id))];
        });
      }
      if (data.length) lastRef.current = data[data.length - 1].createdAt;
    } catch (error) {
      // The next poll tries again; a failed poll should not spam the screen
    }
  }, [load]);

  useEffect(() => {
    lastRef.current = null;
    setMessages([]);
    refresh(true);
    const timer = setInterval(() => { if (!document.hidden) refresh(false); }, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => { endRef.current && endRef.current.scrollIntoView({ block: 'end' }); }, [messages.length]);

  const submit = async (event) => {
    event.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const sent = await send(body);
      setText('');
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
      lastRef.current = sent.createdAt;
    } catch (error) {
      toast.error('Could not send the message', { description: formatApiError(error) });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[420px]">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        {whatsappUrl && (
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
            className="text-xs font-medium text-emerald-700 border border-emerald-200 rounded-md px-3 py-1.5 hover:bg-emerald-50">
            Chat on WhatsApp
          </a>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.length === 0 && <p className="text-sm text-gray-500 text-center mt-8">No messages yet. Say hello.</p>}
        {messages.map((m) => {
          const own = mine(m);
          return (
            <div key={m.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${own ? 'bg-[#042C53] text-white' : 'bg-white border border-gray-200 text-gray-900'}`}>
                {!own && m.senderName && <p className="text-[11px] font-semibold opacity-70 mb-0.5">{m.senderName}</p>}
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`text-[10px] mt-1 ${own ? 'text-white/60' : 'text-gray-400'}`}>{time(m.createdAt)}</p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={submit} className="flex gap-2 border-t border-gray-100 p-3">
        <textarea
          className="flex-1 resize-none rounded-md border border-gray-200 p-2 text-sm h-10"
          placeholder="Write a message..."
          maxLength={2000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(e); } }}
        />
        <Button type="submit" size="sm" className="h-10 gap-1" disabled={sending || !text.trim()}>
          <Send size={14} /> Send
        </Button>
      </form>
    </div>
  );
};

const AgentChat = ({ user }) => {
  const [whatsappUrl, setWhatsappUrl] = useState(null);
  const load = useCallback(async (after) => {
    const res = await chatAPI.getMine(after);
    if (res.data.whatsappUrl) setWhatsappUrl(res.data.whatsappUrl);
    return res.data.messages;
  }, []);
  const send = useCallback(async (body) => (await chatAPI.sendMine(body)).data, []);
  return (
    <Card className="border-[#E5E7EB] bg-white shadow-sm overflow-hidden rounded-xl max-w-4xl">
      <Conversation load={load} send={send} mine={(m) => m.fromAgent} title="Chat with QStudy" whatsappUrl={whatsappUrl} />
    </Card>
  );
};

const StaffChat = () => {
  const [params, setParams] = useSearchParams();
  const selected = params.get('agent');
  const [conversations, setConversations] = useState([]);
  const [agents, setAgents] = useState([]);
  const refreshList = useCallback(async () => {
    try {
      const res = await chatAPI.conversations();
      setConversations(res.data.conversations);
    } catch (error) { /* next poll retries */ }
  }, []);

  useEffect(() => {
    refreshList();
    const timer = setInterval(() => { if (!document.hidden) refreshList(); }, POLL_MS);
    return () => clearInterval(timer);
  }, [refreshList]);

  useEffect(() => {
    chatAPI.agents().then((res) => setAgents(res.data)).catch(() => {});
  }, []);

  const load = useCallback(async (after) => (await chatAPI.getConversation(selected, after)).data.messages, [selected]);
  const send = useCallback(async (body) => {
    const sent = (await chatAPI.reply(selected, body)).data;
    refreshList();
    return sent;
  }, [selected, refreshList]);

  const choose = (id) => setParams(id ? { agent: id } : {});
  const current = conversations.find((c) => c.agentId === selected) || agents.find((a) => a.id === selected);
  const currentName = current ? (current.agentName || current.name) : 'Agent';
  // Staff open the selected agent's own WhatsApp number
  const agentWhatsapp = (current && current.whatsappUrl) || (agents.find((a) => a.id === selected) || {}).whatsappUrl || null;

  return (
    <Card className="border-[#E5E7EB] bg-white shadow-sm overflow-hidden rounded-xl grid grid-cols-1 md:grid-cols-[280px_1fr]">
      <div className="border-b md:border-b-0 md:border-r border-gray-100 h-[calc(100vh-280px)] min-h-[420px] overflow-y-auto">
        <div className="p-3 border-b border-gray-100">
          <select className="h-9 w-full rounded-md border border-gray-200 bg-white px-2 text-sm" value="" onChange={(e) => choose(e.target.value)}>
            <option value="">Start a chat with an agent...</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}{a.agencyName ? ` (${a.agencyName})` : ''}</option>)}
          </select>
        </div>
        {conversations.length === 0 && <p className="p-4 text-sm text-gray-500">No conversations yet.</p>}
        {conversations.map((c) => (
          <button key={c.agentId} onClick={() => choose(c.agentId)}
            className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 ${selected === c.agentId ? 'bg-gray-50' : ''}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-gray-900 truncate">{c.agentName}</span>
              {c.unread > 0 && <span className="text-[10px] font-bold bg-red-500 text-white rounded-full px-1.5 py-0.5">{c.unread}</span>}
            </div>
            <p className="text-xs text-gray-500 truncate">{c.lastFromAgent ? '' : 'You: '}{c.lastMessage}</p>
          </button>
        ))}
      </div>
      {selected ? (
        <Conversation key={selected} load={load} send={send} mine={(m) => !m.fromAgent} title={currentName} whatsappUrl={agentWhatsapp} />
      ) : (
        <div className="h-[calc(100vh-280px)] min-h-[420px] flex flex-col items-center justify-center text-gray-400 gap-2">
          <MessageCircle size={32} />
          <p className="text-sm">Choose a conversation</p>
        </div>
      )}
    </Card>
  );
};

const ChatPage = () => {
  const { user } = useAuth();
  const isAgent = user && user.role === 'agent';
  return (
    <div className="p-6 bg-[#F9FAFB] min-h-screen space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#111827] font-['Outfit'] tracking-tight flex items-center gap-2">
          <MessageCircle size={22} className="text-[#042C53]" /> Live chat
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {isAgent ? 'Talk to the QStudy team. New replies appear here and you get a notification.' : 'Talk to agents. New messages appear here and you get a notification.'}
        </p>
      </div>
      {isAgent ? <AgentChat user={user} /> : <StaffChat />}
    </div>
  );
};

export default ChatPage;
