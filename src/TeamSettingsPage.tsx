import React, { useState, type FC } from 'react';
import {
    Users, Mail, Shield, Eye, Edit2, Trash2, RotateCcw,
    Plus, ChevronDown, Clock, CheckCircle, XCircle, Crown,
    AlertCircle, Send, Copy, Building2, ArrowLeftRight,
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { useOrg, DEFAULT_PERMISSIONS, type OrgRole, type OrgPermissions, type PermissionLevel, type OrgMember } from './OrgContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    user: any;
    showToast: (msg: string, type?: 'success' | 'error') => void;
    darkMode: boolean;
}

const MODULES: Array<{ key: keyof OrgPermissions; label: string }> = [
    { key: 'crm', label: 'CRM & Orders' },
    { key: 'orders', label: 'Order Tracking' },
    { key: 'sourcing', label: 'Sourcing & RFQ' },
    { key: 'billing', label: 'Billing' },
];

const ROLES: Array<{ value: OrgRole; label: string; description: string; color: string }> = [
    { value: 'admin', label: 'Admin', description: 'Full access, can invite members', color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400' },
    { value: 'editor', label: 'Editor', description: 'Can view and edit content', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400' },
    { value: 'viewer', label: 'Viewer', description: 'Read-only access', color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400' },
];

const PERMISSION_LEVELS: Array<{ value: PermissionLevel; label: string }> = [
    { value: 'none', label: 'No Access' },
    { value: 'view', label: 'View' },
    { value: 'edit', label: 'Edit' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const RoleBadge: FC<{ role: OrgRole }> = ({ role }) => {
    const r = ROLES.find(r => r.value === role)!;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${r.color}`}>
            {role === 'admin' && <Shield size={10} />}
            {role === 'editor' && <Edit2 size={10} />}
            {role === 'viewer' && <Eye size={10} />}
            {r.label}
        </span>
    );
};

const MemberAvatar: FC<{ name?: string; avatarUrl?: string; size?: number }> = ({ name, avatarUrl, size = 36 }) => {
    const initials = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    if (avatarUrl) {
        return <img src={avatarUrl} alt={name} style={{ width: size, height: size }} className="rounded-full object-cover" />;
    }
    return (
        <div
            style={{ width: size, height: size, fontSize: size * 0.36 }}
            className="rounded-full bg-gradient-to-br from-[var(--color-primary)] to-purple-600 flex items-center justify-center text-white font-semibold shrink-0"
        >
            {initials}
        </div>
    );
};

// ─── Permission Editor Modal ──────────────────────────────────────────────────

const EditMemberModal: FC<{
    member: OrgMember;
    isOwner: boolean;
    onSave: (role: OrgRole, permissions: OrgPermissions) => Promise<void>;
    onClose: () => void;
}> = ({ member, isOwner, onSave, onClose }) => {
    const [role, setRole] = useState<OrgRole>(member.role);
    const [permissions, setPermissions] = useState<OrgPermissions>({ ...member.permissions });
    const [saving, setSaving] = useState(false);

    const handleRoleChange = (newRole: OrgRole) => {
        setRole(newRole);
        setPermissions({ ...DEFAULT_PERMISSIONS[newRole] });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(role, permissions);
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-white/10 overflow-hidden">
                <div className="p-5 border-b border-gray-100 dark:border-white/10">
                    <div className="flex items-center gap-3">
                        <MemberAvatar name={member.name} avatarUrl={member.avatarUrl} size={40} />
                        <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{member.name || 'Team Member'}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{member.email}</p>
                        </div>
                    </div>
                </div>

                <div className="p-5 space-y-5">
                    {/* Role selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Role</label>
                        <div className="grid grid-cols-3 gap-2">
                            {ROLES.filter(r => isOwner ? true : r.value !== 'admin').map(r => (
                                <button
                                    key={r.value}
                                    onClick={() => handleRoleChange(r.value)}
                                    className={`p-2.5 rounded-lg border text-center transition-all ${
                                        role === r.value
                                            ? 'border-[var(--color-primary)] bg-red-50 dark:bg-red-900/20'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    <p className={`text-xs font-semibold ${role === r.value ? 'text-[var(--color-primary)]' : 'text-gray-700 dark:text-gray-300'}`}>{r.label}</p>
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 leading-tight">{r.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Per-module permissions */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Module Access</label>
                        <div className="space-y-2">
                            {MODULES.map(mod => (
                                <div key={mod.key} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{mod.label}</span>
                                    <div className="flex gap-1">
                                        {PERMISSION_LEVELS.map(lvl => (
                                            <button
                                                key={lvl.value}
                                                onClick={() => setPermissions(p => ({ ...p, [mod.key]: lvl.value }))}
                                                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                                                    permissions[mod.key] === lvl.value
                                                        ? 'bg-[var(--color-primary)] text-white'
                                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                }`}
                                            >
                                                {lvl.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-5 border-t border-gray-100 dark:border-white/10 flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────

export const TeamSettingsPage: FC<Props> = ({ user, showToast, darkMode: _darkMode }) => {
    const { org, members, invitations, isOrgOwner, isOrgAdmin, loading,
        allOrgs, switchOrg,
        refreshMembers, refreshInvitations, updateMemberRole, removeMember,
        revokeInvitation, resendInvitation } = useOrg();

    const [switching, setSwitching] = useState<string | null>(null);

    const handleSwitchOrg = (orgId: string) => {
        setSwitching(orgId);
        localStorage.setItem('garment_erp_active_org', orgId);
        window.location.reload();
    };

    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<OrgRole>('viewer');
    const [invitePermissions, setInvitePermissions] = useState<OrgPermissions>({ ...DEFAULT_PERMISSIONS.viewer });
    const [showPermEditor, setShowPermEditor] = useState(false);
    const [inviting, setSending] = useState(false);
    // Shown after invite creation so admin can copy/share the link
    const [inviteLink, setInviteLink] = useState<string | null>(null);

    const [editingMember, setEditingMember] = useState<OrgMember | null>(null);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

    const activeMembers = members.filter(m => m.status === 'active');
    const canInviteMore = activeMembers.length < (org?.maxMembers ?? 5);

    const handleInvite = async () => {
        if (!inviteEmail.trim()) { showToast('Please enter an email address', 'error'); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) { showToast('Invalid email address', 'error'); return; }
        if (!org) return;

        setSending(true);
        try {
            const email = inviteEmail.trim().toLowerCase();

            // Remove any existing invitation for this email+org (avoids unique constraint violation)
            await supabase
                .from('invitations')
                .delete()
                .eq('org_id', org.id)
                .eq('email', email);

            // Create invitation record directly in DB (RLS allows org owners)
            const { data: invitation, error: dbErr } = await supabase
                .from('invitations')
                .insert({
                    org_id: org.id,
                    email,
                    role: inviteRole,
                    permissions: invitePermissions,
                    invited_by: user.id,
                    status: 'pending',
                })
                .select()
                .single();

            if (dbErr || !invitation) {
                showToast(dbErr?.message ?? 'Failed to create invitation', 'error');
                return;
            }

            // Build the invite link — works whether or not the email was sent
            const link = `${window.location.origin}?invite_token=${invitation.token}`;
            setInviteLink(link);

            // Try Edge Function to send email — invite link always works regardless
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const { data: fnData, error: fnError } = await supabase.functions.invoke('invite-member', {
                    body: { email, role: inviteRole, permissions: invitePermissions, orgId: org.id, invitationId: invitation.id },
                    headers: { Authorization: `Bearer ${session?.access_token}` },
                });
                if (fnError) {
                    console.warn('invite-member function error:', fnError.message);
                    showToast('Invitation created — share the link below');
                } else if (fnData?.emailSent) {
                    showToast(`Invitation email sent to ${email}`);
                } else {
                    // Existing user — Supabase can't re-send invite; admin shares link
                    showToast('Invitation created — share the link below (existing account)');
                }
            } catch {
                showToast('Invitation created — share the link below');
            }

            setInviteEmail('');
            setInviteRole('viewer');
            setInvitePermissions({ ...DEFAULT_PERMISSIONS.viewer });
            setShowPermEditor(false);
            await refreshInvitations();
        } finally {
            setSending(false);
        }
    };

    const handleRemove = async (memberId: string) => {
        setRemovingId(memberId);
        try {
            await removeMember(memberId);
            showToast('Member removed');
        } catch (e: any) {
            showToast(e.message ?? 'Failed to remove member', 'error');
        } finally {
            setRemovingId(null);
            setConfirmRemoveId(null);
        }
    };

    const handleResend = async (invId: string) => {
        try {
            await resendInvitation(invId);
            showToast('Invitation resent');
        } catch (e: any) {
            showToast(e.message ?? 'Failed to resend invitation', 'error');
        }
    };

    const handleRevoke = async (invId: string) => {
        try {
            await revokeInvitation(invId);
            showToast('Invitation revoked');
        } catch (e: any) {
            showToast(e.message ?? 'Failed to revoke', 'error');
        }
    };

    if (loading) {
        return (
            <div className="max-w-3xl mx-auto px-4 py-12 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!org) {
        return (
            <div className="max-w-3xl mx-auto px-4 py-12 text-center">
                <AlertCircle size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400">Organization not found. Please refresh or contact support.</p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-1 sm:px-4 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">Team</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {org.name} &mdash; {activeMembers.length}/{org.maxMembers} members
                </p>
            </div>

            {/* Organization switcher — shown when user belongs to multiple orgs */}
            {allOrgs.length > 1 && (
                <div className="bg-white/80 backdrop-blur-md dark:bg-gray-900/40 rounded-xl shadow-md border border-gray-200 dark:border-white/10 overflow-hidden">
                    <div className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-gray-100 dark:border-white/10">
                        <h2 className="text-base font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                            <ArrowLeftRight size={16} className="text-[var(--color-primary)]" />
                            Switch Organization
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            You're a member of {allOrgs.length} organizations. Switch to view another workspace.
                        </p>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-white/5">
                        {allOrgs.map(summary => {
                            const isActive = summary.org.id === org?.id;
                            return (
                                <div key={summary.org.id} className={`flex items-center gap-3 p-4 sm:p-5 transition-colors ${isActive ? 'bg-red-50/50 dark:bg-red-900/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--color-primary)] to-purple-600 flex items-center justify-center shrink-0">
                                        <Building2 size={16} className="text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{summary.org.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 capitalize">
                                            {summary.isOwner ? 'Owner' : summary.role}
                                            {isActive && <span className="ml-2 text-[var(--color-primary)] font-medium">— Active</span>}
                                        </p>
                                    </div>
                                    {isActive ? (
                                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                                            <CheckCircle size={11} /> Current
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => handleSwitchOrg(summary.org.id)}
                                            disabled={switching !== null}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-[var(--color-primary)] hover:text-white transition disabled:opacity-50"
                                        >
                                            {switching === summary.org.id
                                                ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                                                : <ArrowLeftRight size={12} />
                                            }
                                            Switch
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Invite form — only for org admins */}
            {isOrgAdmin && (
                <div className="bg-white/80 backdrop-blur-md dark:bg-gray-900/40 rounded-xl shadow-md border border-gray-200 dark:border-white/10 overflow-hidden">
                    <div className="p-4 sm:p-6">
                        <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                            <Plus size={16} className="text-[var(--color-primary)]" />
                            Invite Team Member
                        </h2>

                        {!canInviteMore ? (
                            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2.5">
                                <AlertCircle size={16} />
                                You've reached the maximum of {org.maxMembers} members. Remove a member to invite someone new.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex gap-2 flex-col sm:flex-row">
                                    <div className="relative flex-1">
                                        <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                        <input
                                            type="email"
                                            placeholder="colleague@company.com"
                                            value={inviteEmail}
                                            onChange={e => setInviteEmail(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleInvite()}
                                            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                                        />
                                    </div>
                                    <div className="relative">
                                        <select
                                            value={inviteRole}
                                            onChange={e => {
                                                const r = e.target.value as OrgRole;
                                                setInviteRole(r);
                                                setInvitePermissions({ ...DEFAULT_PERMISSIONS[r] });
                                            }}
                                            className="pl-3 pr-8 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] appearance-none cursor-pointer"
                                        >
                                            <option value="viewer">Viewer</option>
                                            <option value="editor">Editor</option>
                                        </select>
                                        <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <button
                                        onClick={() => setShowPermEditor(p => !p)}
                                        className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1"
                                    >
                                        <Shield size={12} />
                                        {showPermEditor ? 'Hide' : 'Customize'} permissions
                                        <ChevronDown size={12} className={`transition-transform ${showPermEditor ? 'rotate-180' : ''}`} />
                                    </button>
                                    <button
                                        onClick={handleInvite}
                                        disabled={inviting || !inviteEmail.trim()}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition"
                                    >
                                        {inviting
                                            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            : <Send size={14} />
                                        }
                                        {inviting ? 'Sending...' : 'Send Invite'}
                                    </button>
                                </div>

                                {showPermEditor && (
                                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2 bg-gray-50 dark:bg-gray-800/50">
                                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Module-level access</p>
                                        {MODULES.map(mod => (
                                            <div key={mod.key} className="flex items-center justify-between">
                                                <span className="text-xs text-gray-600 dark:text-gray-400 w-28">{mod.label}</span>
                                                <div className="flex gap-1">
                                                    {PERMISSION_LEVELS.map(lvl => (
                                                        <button
                                                            key={lvl.value}
                                                            onClick={() => setInvitePermissions(p => ({ ...p, [mod.key]: lvl.value }))}
                                                            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                                                                invitePermissions[mod.key] === lvl.value
                                                                    ? 'bg-[var(--color-primary)] text-white'
                                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200'
                                                            }`}
                                                        >
                                                            {lvl.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Invite link — shown after invite is created */}
                        {inviteLink && (
                            <div className="mt-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                                <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1.5 flex items-center gap-1">
                                    <CheckCircle size={12} /> Invite link ready — share this with your teammate
                                </p>
                                <div className="flex items-center gap-2">
                                    <input
                                        readOnly
                                        value={inviteLink}
                                        className="flex-1 text-xs bg-white dark:bg-gray-800 border border-green-200 dark:border-green-700 rounded px-2 py-1.5 text-gray-600 dark:text-gray-300 truncate"
                                    />
                                    <button
                                        onClick={() => { navigator.clipboard.writeText(inviteLink); showToast('Link copied!'); }}
                                        className="shrink-0 px-3 py-1.5 rounded text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition"
                                    >
                                        Copy
                                    </button>
                                    <button onClick={() => setInviteLink(null)} className="p-1 text-gray-400 hover:text-gray-600">
                                        <XCircle size={14} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Members list */}
            <div className="bg-white/80 backdrop-blur-md dark:bg-gray-900/40 rounded-xl shadow-md border border-gray-200 dark:border-white/10 overflow-hidden">
                <div className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-gray-100 dark:border-white/10">
                    <h2 className="text-base font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                        <Users size={16} className="text-gray-400" />
                        Members <span className="text-gray-400 font-normal">({activeMembers.length})</span>
                    </h2>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-white/5">
                    {activeMembers.map(member => {
                        const isCurrentUser = member.userId === user?.id;
                        const isAccountOwner = member.userId === org.ownerId;
                        return (
                            <div key={member.id} className="flex items-center gap-3 p-4 sm:p-5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                <MemberAvatar name={member.name} avatarUrl={member.avatarUrl} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                            {member.name || 'Team Member'}
                                            {isCurrentUser && <span className="text-gray-400 font-normal ml-1 text-xs">(you)</span>}
                                        </p>
                                        {isAccountOwner && (
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400">
                                                <Crown size={9} /> Owner
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{member.email}</p>
                                </div>
                                <RoleBadge role={member.role} />
                                {isOrgOwner && !isAccountOwner && (
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setEditingMember(member)}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                                            title="Edit access"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        {confirmRemoveId === member.id ? (
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleRemove(member.id)}
                                                    disabled={removingId === member.id}
                                                    className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 transition"
                                                >
                                                    {removingId === member.id ? '...' : 'Confirm'}
                                                </button>
                                                <button
                                                    onClick={() => setConfirmRemoveId(null)}
                                                    className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                                                >
                                                    <XCircle size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setConfirmRemoveId(member.id)}
                                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                                                title="Remove member"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Pending invitations */}
            {isOrgAdmin && invitations.length > 0 && (
                <div className="bg-white/80 backdrop-blur-md dark:bg-gray-900/40 rounded-xl shadow-md border border-gray-200 dark:border-white/10 overflow-hidden">
                    <div className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-gray-100 dark:border-white/10">
                        <h2 className="text-base font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                            <Clock size={16} className="text-amber-500" />
                            Pending Invitations <span className="text-gray-400 font-normal">({invitations.length})</span>
                        </h2>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-white/5">
                        {invitations.map(inv => {
                            const expiresAt = new Date(inv.expiresAt);
                            const isExpiringSoon = expiresAt.getTime() - Date.now() < 6 * 60 * 60 * 1000; // <6h
                            return (
                                <div key={inv.id} className="flex items-center gap-3 p-4 sm:p-5">
                                    <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                                        <Mail size={15} className="text-gray-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{inv.email}</p>
                                        <p className={`text-xs mt-0.5 ${isExpiringSoon ? 'text-amber-500' : 'text-gray-400 dark:text-gray-500'}`}>
                                            Expires {expiresAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <RoleBadge role={inv.role} />
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleResend(inv.id)}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                                            title="Resend invitation"
                                        >
                                            <RotateCcw size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleRevoke(inv.id)}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                                            title="Revoke invitation"
                                        >
                                            <XCircle size={14} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Info box for non-admin sub-users */}
            {!isOrgAdmin && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4 flex items-start gap-3">
                    <Shield size={18} className="text-blue-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Team access managed by your org admin</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">Contact your organization owner to change your access level.</p>
                    </div>
                </div>
            )}

            {/* Edit member modal */}
            {editingMember && (
                <EditMemberModal
                    member={editingMember}
                    isOwner={isOrgOwner}
                    onSave={async (role, perms) => {
                        await updateMemberRole(editingMember.id, role, perms);
                        showToast('Member access updated');
                    }}
                    onClose={() => setEditingMember(null)}
                />
            )}
        </div>
    );
};
