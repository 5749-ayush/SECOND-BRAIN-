import { useState, type FormEvent } from "react";
import { Bot, Check, Copy, KeyRound, RefreshCw, ShieldX } from "lucide-react";
import { Button } from "../../components/Button";
import { buildAgentInstructions } from "./buildAgentInstructions";
import type { AgentKeySummary, CreatedAgentKey } from "./agentRepository";

interface AgentKeyManagerProps {
  keys: AgentKeySummary[];
  apiBaseUrl: string;
  onCreate: (name: string) => Promise<CreatedAgentKey>;
  onRevoke: (keyId: string) => Promise<unknown>;
}

export function AgentKeyManager({
  keys,
  apiBaseUrl,
  onCreate,
  onRevoke
}: AgentKeyManagerProps) {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreatedAgentKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const instructions = buildAgentInstructions({
    apiBaseUrl,
    token: created?.token ?? null,
    workspaceName: "Second Brain"
  });

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setError(null);
    try {
      setCreated(await onCreate(name.trim()));
      setName("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The credential could not be created.");
    } finally {
      setCreating(false);
    }
  };

  const replace = async (key: AgentKeySummary) => {
    setCreating(true);
    try {
      const replacement = await onCreate(`${key.name} replacement`);
      await onRevoke(key.keyId);
      setCreated(replacement);
    } finally {
      setCreating(false);
    }
  };

  return (
    <section className="settings-section">
      <div className="settings-section-heading">
        <div className="settings-icon"><Bot size={18} /></div>
        <div>
          <h3>Agent access</h3>
          <p>Create a private, revocable credential and copy the operating instructions.</p>
        </div>
      </div>

      <form className="member-invite-form" onSubmit={create}>
        <label className="form-field">
          <span>Credential name</span>
          <input
            value={name}
            required
            maxLength={80}
            placeholder="e.g. Codex on my laptop"
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <Button type="submit" loading={creating} icon={<KeyRound size={16} />}>
          Generate credential
        </Button>
      </form>
      {error && <p className="form-error" role="alert">{error}</p>}

      {created && (
        <div className="credential-reveal">
          <div className="credential-warning">
            <ShieldX size={17} />
            <span><strong>Shown only once.</strong> Copy this now; it cannot be revealed again.</span>
          </div>
          <label className="form-field">
            <span>Agent credential</span>
            <input readOnly value={created.token} onFocus={(event) => event.currentTarget.select()} />
          </label>
          <label className="form-field">
            <span>Copyable agent instructions</span>
            <textarea readOnly value={instructions} rows={11} />
          </label>
          <div className="form-actions">
            <Button
              type="button"
              variant="secondary"
              icon={copied ? <Check size={16} /> : <Copy size={16} />}
              onClick={async () => {
                await navigator.clipboard.writeText(instructions);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1800);
              }}
            >
              {copied ? "Copied" : "Copy agent instructions"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setCreated(null)}>I’ve saved it</Button>
          </div>
        </div>
      )}

      <div className="access-list">
        {keys.length === 0 && <p className="field-hint agent-empty">No agent credentials yet.</p>}
        {keys.map((key) => (
          <div className="access-row agent-key-row" key={key.keyId}>
            <div className="member-avatar pending"><Bot size={14} /></div>
            <div className="access-identity">
              <strong>{key.name}</strong>
              <span>{key.tokenPrefix}… · {key.lastUsedAt ? "used" : "never used"}</span>
            </div>
            <span className={`access-status ${key.status === "revoked" ? "pending" : ""}`}>{key.status}</span>
            {key.status === "active" && (
              <div className="key-actions">
                <button
                  className="icon-button"
                  type="button"
                  aria-label={`Regenerate ${key.name}`}
                  onClick={() => void replace(key)}
                >
                  <RefreshCw size={14} />
                </button>
                {confirmRevoke === key.keyId ? (
                  <Button type="button" size="sm" variant="danger" onClick={() => void onRevoke(key.keyId)}>
                    Confirm revoke
                  </Button>
                ) : (
                  <button
                    className="icon-button"
                    type="button"
                    aria-label={`Revoke ${key.name}`}
                    onClick={() => setConfirmRevoke(key.keyId)}
                  >
                    <ShieldX size={14} />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
