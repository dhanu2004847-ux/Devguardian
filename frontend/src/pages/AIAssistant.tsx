import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Send, Sparkles, Loader2, BookOpen, Wrench, GitPullRequest } from 'lucide-react';
import { fetchRepos } from '../lib/repoApi';
import type { Repo } from '../lib/repoApi';
import { fetchScanHistory, fetchFindings } from '../lib/scanApi';
import type { Finding } from '../lib/scanApi';
import { explainFinding, suggestFix, askAboutFinding } from '../lib/aiApi';
import { proposePR } from '../lib/prApi';

interface Message {
  sender: 'user' | 'ai' | 'error';
  text: string;
}

const PROMPTS = [
  'What could an attacker do with this vulnerability?',
  'How do I test that the fix works?',
  'Could this be a false positive?',
  'Explain this like I am a beginner',
];

const selectStyle: React.CSSProperties = {
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  padding: '8px 10px',
  borderRadius: '6px',
  fontSize: '13px',
  minWidth: 0,
};

function errorText(err: unknown): string {
  const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return msg ?? 'Something went wrong. Check that the backend is running.';
}

function shortRule(title: string): string {
  const parts = title.split('.');
  return parts[parts.length - 1] || title;
}

export const AIAssistant: React.FC = () => {
  const navigate = useNavigate();
  const endRef = useRef<HTMLDivElement>(null);

  const [repos, setRepos] = useState<Repo[]>([]);
  const [repoId, setRepoId] = useState('');
  const [findings, setFindings] = useState<Finding[]>([]);
  const [findingId, setFindingId] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'ai',
      text: 'Hello! Pick a repository and a finding, then I can explain it, preview a fix, or answer your questions about that code.',
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  const selected = findings.find((f) => String(f.id) === findingId) ?? null;

  // Load repositories once
  useEffect(() => {
    async function load() {
      try {
        const list = await fetchRepos();
        setRepos(list);
        let stored: string | null = null;
        try {
          stored = localStorage.getItem('selectedRepoId');
        } catch {
          /* ignore */
        }
        const preferred = list.find((r) => String(r.id) === stored) ?? list[0];
        if (preferred) setRepoId(String(preferred.id));
      } catch {
        setMessages((prev) => [...prev, { sender: 'error', text: 'Could not load repositories.' }]);
      }
    }
    load();
  }, []);

  // Load the latest scan's findings whenever the repo changes
  useEffect(() => {
    async function load() {
      setFindings([]);
      setFindingId('');
      if (!repoId) return;
      try {
        const scans = await fetchScanHistory(Number(repoId));
        if (scans.length === 0) return;
        const list = await fetchFindings(scans[scans.length - 1].id);
        setFindings(list);
        if (list.length > 0) setFindingId(String(list[0].id));
      } catch {
        setMessages((prev) => [...prev, { sender: 'error', text: 'Could not load findings for this repository.' }]);
      }
    }
    load();
  }, [repoId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  const run = async (userText: string, call: () => Promise<string>) => {
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setBusy(true);
    try {
      const answer = await call();
      setMessages((prev) => [...prev, { sender: 'ai', text: answer }]);
    } catch (err) {
      setMessages((prev) => [...prev, { sender: 'error', text: errorText(err) }]);
    } finally {
      setBusy(false);
    }
  };

  const label = selected ? `${shortRule(selected.title)}${selected.filePath ? ` (${selected.filePath}:${selected.startLine ?? '?'})` : ''}` : '';

  const handleExplain = () => {
    if (!selected) return;
    run(`Explain this finding: ${label}`, () => explainFinding(selected.id));
  };

  const handleSuggest = () => {
    if (!selected) return;
    run(`Preview a fix for: ${label}`, () => suggestFix(selected.id));
  };

  const handlePropose = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await proposePR(selected.id);
      navigate(`/repos/${repoId}/fixes`);
    } catch (err) {
      setMessages((prev) => [...prev, { sender: 'error', text: errorText(err) }]);
      setBusy(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q || !selected || busy) return;
    setInput('');
    run(q, () => askAboutFinding(selected.id, q));
  };

  const actionBtn = (enabled: boolean): React.CSSProperties => ({
    background: 'rgba(34, 211, 166, 0.1)',
    border: '1px solid var(--accent-dim)',
    color: 'var(--accent)',
    padding: '8px 12px',
    borderRadius: '6px',
    fontWeight: 600,
    fontSize: '13px',
    cursor: enabled ? 'pointer' : 'not-allowed',
    opacity: enabled ? 1 : 0.5,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  });

  const canAct = !!selected && !busy;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 96px)' }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Bot size={28} color="var(--accent)" />
          <h1 style={{ fontSize: '30px', margin: 0 }}>AI Agent Hub</h1>
        </div>
        <p style={{ color: 'var(--text-dim)', margin: '6px 0 0', fontSize: '14.5px' }}>
          Explain findings, preview fixes and ask questions about your real code.
        </p>
      </div>

      {/* Selectors */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <select
          value={repoId}
          onChange={(e) => setRepoId(e.target.value)}
          aria-label="Repository"
          style={{ ...selectStyle, width: '240px' }}
        >
          {repos.length === 0 && <option value="">No repositories</option>}
          {repos.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} (#{r.id})
            </option>
          ))}
        </select>
        <select
          value={findingId}
          onChange={(e) => setFindingId(e.target.value)}
          aria-label="Finding"
          style={{ ...selectStyle, flex: 1, minWidth: '260px' }}
        >
          {findings.length === 0 && <option value="">No findings in the latest scan</option>}
          {findings.map((f) => (
            <option key={f.id} value={f.id}>
              [{f.severity}] {shortRule(f.title)}
              {f.filePath ? ` · ${f.filePath}:${f.startLine ?? '?'}` : ''}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Actions */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button style={actionBtn(canAct)} disabled={!canAct} onClick={handleExplain}>
              <BookOpen size={14} /> Explain
            </button>
            <button style={actionBtn(canAct)} disabled={!canAct} onClick={handleSuggest}>
              <Wrench size={14} /> Suggest fix
            </button>
            <button style={actionBtn(canAct)} disabled={!canAct} onClick={handlePropose}>
              <GitPullRequest size={14} /> Propose fix
            </button>
          </div>

          <div role="log" aria-live="polite" style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  background:
                    m.sender === 'user' ? 'var(--surface-2)' : m.sender === 'error' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(34, 211, 166, 0.04)',
                  border: `1px solid ${m.sender === 'error' ? 'rgba(239, 68, 68, 0.4)' : 'var(--border)'}`,
                  color: m.sender === 'error' ? '#EF4444' : 'var(--text)',
                  padding: '16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'anywhere',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-dim)', marginBottom: '6px', fontFamily: 'var(--mono)' }}>
                  {m.sender === 'user' ? (
                    'You'
                  ) : (
                    <>
                      <Sparkles size={12} color="var(--accent)" /> {m.sender === 'error' ? 'Error' : 'DevGuardian AI'}
                    </>
                  )}
                </div>
                {m.text}
              </div>
            ))}
            {busy && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dim)', fontSize: '13px' }}>
                <Loader2 size={14} className="spin" /> Thinking…
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={handleSend} style={{ padding: '20px', borderTop: '1px solid var(--border)', display: 'flex', gap: '12px', background: 'var(--surface)' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!selected}
              placeholder={selected ? 'Ask a question about the selected finding…' : 'Select a finding first'}
              style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: '6px', color: 'var(--text)', fontSize: '14px' }}
            />
            <button
              type="submit"
              disabled={!canAct || !input.trim()}
              style={{
                background: 'var(--accent)',
                color: '#0B1120',
                border: 'none',
                padding: '0 20px',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: canAct && input.trim() ? 'pointer' : 'not-allowed',
                opacity: canAct && input.trim() ? 1 : 0.6,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Send size={16} /> Send
            </button>
          </form>
        </div>

        <div style={{ width: '320px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
          {selected && (
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '12px', fontSize: '12.5px' }}>
              <div style={{ color: 'var(--text-dim)', fontFamily: 'var(--mono)', marginBottom: '4px' }}>Selected finding</div>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>{shortRule(selected.title)}</div>
              {selected.filePath && (
                <div style={{ color: 'var(--accent)', fontFamily: 'var(--mono)', marginBottom: '4px' }}>
                  {selected.filePath}
                  {selected.startLine ? `:${selected.startLine}` : ''}
                </div>
              )}
              <div style={{ color: 'var(--text-dim)' }}>Severity: {selected.severity}</div>
            </div>
          )}

          <div style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.04em', fontFamily: 'var(--mono)' }}>
            Suggested questions
          </div>
          {PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => setInput(p)}
              disabled={!selected}
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                padding: '12px',
                borderRadius: '6px',
                textAlign: 'left',
                fontSize: '13px',
                cursor: selected ? 'pointer' : 'not-allowed',
                opacity: selected ? 1 : 0.5,
              }}
            >
              {p}
            </button>
          ))}
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: 'auto' }}>
            Each action uses one Gemini request, and the free tier is limited per day.
          </div>
        </div>
      </div>
    </div>
  );
};