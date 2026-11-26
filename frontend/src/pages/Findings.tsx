import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ShieldAlert, Sparkles, Loader2 } from 'lucide-react';
import { fetchScanHistory, fetchFindings } from '../lib/scanApi';
import type { Finding } from '../lib/scanApi';
import { proposePR } from '../lib/prApi';

const severityColor: Record<string, string> = {
  CRITICAL: '#EF4444',
  HIGH: '#F59E0B',
  MEDIUM: '#EAB308',
  LOW: '#64748B',
};

export const Findings: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [noScans, setNoScans] = useState(false);
  const [proposingId, setProposingId] = useState<number | null>(null);
  const [proposeError, setProposeError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const scans = await fetchScanHistory(Number(id));
        if (scans.length === 0) {
          setNoScans(true);
          return;
        }
        const latestScan = scans[scans.length - 1];
        const results = await fetchFindings(latestScan.id);
        setFindings(results);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handlePropose = async (finding: Finding) => {
    setProposeError(null);
    setProposingId(finding.id);
    try {
      await proposePR(finding.id);
      navigate(`/repos/${id}/fixes`);
    } catch {
      setProposeError('The AI could not generate a fix right now. Please try again in a moment.');
    } finally {
      setProposingId(null);
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--text-dim)', padding: '40px' }}>Loading findings…</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', margin: '0 0 6px 0' }}>Security Findings & Scans</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '14.5px', margin: 0 }}>
          Review vulnerabilities detected across your codebase dependencies and source files.
        </p>
      </div>

      {proposeError && (
        <div
          role="alert"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#EF4444',
            padding: '10px 14px',
            borderRadius: '6px',
            fontSize: '13.5px',
            marginBottom: '16px',
          }}
        >
          {proposeError}
        </div>
      )}

      {noScans ? (
        <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>
          No scans have been run for this repository yet. Trigger one via <code>POST /api/scans/start/{id}</code>.
        </p>
      ) : findings.length === 0 ? (
        <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>
          No findings in the latest scan — looks clean.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {findings.map((f) => {
            const busy = proposingId === f.id;
            const anyBusy = proposingId !== null;
            return (
              <div
                key={f.id}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <ShieldAlert
                    size={22}
                    color={severityColor[f.severity] ?? '#64748B'}
                    style={{ marginTop: '2px' }}
                  />
                  <div>
                    <div style={{ marginBottom: '4px' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: severityColor[f.severity] ?? '#64748B',
                        }}
                      >
                        {f.severity}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'var(--text)',
                        fontFamily: 'var(--mono)',
                      }}
                    >
                      {f.title}
                      {f.filePath && (
  <div style={{ fontSize: '12.5px', color: 'var(--accent)', fontFamily: 'var(--mono)', marginTop: '4px' }}>
    {f.filePath}{f.startLine ? `:${f.startLine}` : ''}
  </div>
)}
{f.message && (
  <div style={{ fontSize: '12.5px', color: 'var(--text-dim)', marginTop: '4px', maxWidth: '720px' }}>
    {f.message.length > 200 ? f.message.slice(0, 200) + '…' : f.message}
  </div>
)}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handlePropose(f)}
                  disabled={anyBusy}
                  style={{
                    background: 'rgba(34, 211, 166, 0.1)',
                    border: '1px solid var(--accent-dim)',
                    color: 'var(--accent)',
                    padding: '10px 16px',
                    borderRadius: '6px',
                    cursor: anyBusy ? 'not-allowed' : 'pointer',
                    opacity: anyBusy && !busy ? 0.5 : 1,
                    fontWeight: 600,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {busy ? (
                    <>
                      <Loader2 size={15} className="spin" /> Generating fix…
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} /> Propose fix
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};