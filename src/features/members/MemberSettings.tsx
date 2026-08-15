import { useState, type FormEvent } from "react";
import { MailPlus, ShieldCheck, Trash2 } from "lucide-react";
import type { Member } from "../../domain/member";
import { Button } from "../../components/Button";
import type { MemberInvite } from "./memberRepository";

interface MemberSettingsProps {
  members: Member[];
  invites: MemberInvite[];
  onInvite: (email: string) => Promise<unknown>;
  onRemove: (email: string) => Promise<unknown>;
}

export function MemberSettings({ members, invites, onInvite, onRemove }: MemberSettingsProps) {
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onInvite(email.trim().toLowerCase());
      setEmail("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Access could not be approved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="settings-section">
      <div className="settings-section-heading">
        <div className="settings-icon"><ShieldCheck size={18} /></div>
        <div>
          <h3>Team access</h3>
          <p>Only approved Google accounts can enter this workspace.</p>
        </div>
      </div>
      <form className="member-invite-form" onSubmit={submit}>
        <label className="form-field">
          <span>Team member email</span>
          <input
            type="email"
            value={email}
            required
            placeholder="name@company.com"
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <Button type="submit" loading={saving} icon={<MailPlus size={16} />}>Approve email</Button>
      </form>
      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="access-list">
        {members.map((member) => (
          <div className="access-row" key={member.id}>
            <div className="member-avatar">{member.displayName.slice(0, 1).toUpperCase()}</div>
            <div className="access-identity">
              <strong>{member.displayName}</strong>
              <span>{member.email}</span>
            </div>
            <span className="access-status">{member.role}</span>
            {member.role !== "owner" && (
              <button
                className="icon-button"
                type="button"
                aria-label={`Remove access for ${member.email}`}
                onClick={() => void onRemove(member.email)}
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        ))}
        {invites.map((invite) => (
          <div className="access-row" key={invite.email}>
            <div className="member-avatar pending">?</div>
            <div className="access-identity">
              <strong>Awaiting first sign-in</strong>
              <span>{invite.email}</span>
            </div>
            <span className="access-status pending">approved</span>
            <button
              className="icon-button"
              type="button"
              aria-label={`Remove access for ${invite.email}`}
              onClick={() => void onRemove(invite.email)}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
