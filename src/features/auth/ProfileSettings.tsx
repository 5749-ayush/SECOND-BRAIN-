import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import type { User } from "firebase/auth";
import type { Member } from "../../domain/member";
import { Button } from "../../components/Button";
import { Modal } from "../../components/Modal";
import { MemberSettings } from "../members/MemberSettings";
import {
  inviteMemberEmail,
  removeMemberEmail,
  subscribeToMemberInvites,
  subscribeToMembers,
  type MemberInvite
} from "../members/memberRepository";
import { AgentKeyManager } from "../agents/AgentKeyManager";
import {
  agentApiBaseUrl,
  createAgentCredential,
  revokeAgentCredential,
  subscribeToAgentKeys,
  type AgentKeySummary
} from "../agents/agentRepository";

interface ProfileSettingsProps {
  open: boolean;
  member: Member;
  user: User;
  onClose: () => void;
  onSignOut: () => Promise<void>;
}

export function ProfileSettings({ open, member, user, onClose, onSignOut }: ProfileSettingsProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<MemberInvite[]>([]);
  const [keys, setKeys] = useState<AgentKeySummary[]>([]);
  const owner = member.role === "owner";

  useEffect(() => {
    if (!open || !owner) return;
    const stopMembers = subscribeToMembers(setMembers, () => setMembers([]));
    const stopInvites = subscribeToMemberInvites(setInvites, () => setInvites([]));
    const stopKeys = subscribeToAgentKeys(setKeys, () => setKeys([]));
    return () => {
      stopMembers();
      stopInvites();
      stopKeys();
    };
  }, [open, owner]);

  return (
    <Modal open={open} title="Your workspace" description="Identity, team, and trusted agent access." onClose={onClose} size="large">
      <div className="profile-identity">
        {user.photoURL ? (
          <img src={user.photoURL} alt="" referrerPolicy="no-referrer" />
        ) : (
          <div className="profile-fallback">{member.displayName.slice(0, 1).toUpperCase()}</div>
        )}
        <div>
          <strong>{member.displayName}</strong>
          <span>{member.email}</span>
          <small>{member.role}</small>
        </div>
        <Button type="button" variant="ghost" icon={<LogOut size={15} />} onClick={onSignOut}>
          Sign out
        </Button>
      </div>
      {owner ? (
        <div className="profile-sections">
          <MemberSettings
            members={members}
            invites={invites}
            onInvite={inviteMemberEmail}
            onRemove={removeMemberEmail}
          />
          <AgentKeyManager
            keys={keys}
            apiBaseUrl={agentApiBaseUrl()}
            onCreate={createAgentCredential}
            onRevoke={revokeAgentCredential}
          />
        </div>
      ) : (
        <p className="member-profile-note">Your owner manages team and agent access.</p>
      )}
    </Modal>
  );
}
