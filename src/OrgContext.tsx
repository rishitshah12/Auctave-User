import React, { createContext, useContext, useEffect, useRef, useState, useCallback, type FC, type ReactNode } from 'react';
import { supabase } from './supabaseClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export type OrgRole = 'admin' | 'editor' | 'viewer';
export type PermissionLevel = 'none' | 'view' | 'edit';

export interface OrgPermissions {
    crm: PermissionLevel;
    orders: PermissionLevel;
    sourcing: PermissionLevel;
    billing: PermissionLevel;
}

export interface OrgMember {
    id: string;
    userId: string;
    orgId: string;
    role: OrgRole;
    permissions: OrgPermissions;
    status: 'active' | 'suspended';
    invitedBy: string | null;
    joinedAt: string;
    email?: string;
    name?: string;
    avatarUrl?: string;
}

export interface PendingInvitation {
    id: string;
    orgId: string;
    email: string;
    token: string;
    role: OrgRole;
    permissions: OrgPermissions;
    status: 'pending' | 'accepted' | 'expired' | 'revoked';
    expiresAt: string;
    createdAt: string;
    invitedBy: string | null;
}

export interface Organization {
    id: string;
    name: string;
    ownerId: string;
    maxMembers: number;
    createdAt: string;
}

// Lightweight summary used in the org switcher list
export interface OrgSummary {
    org: Organization;
    role: OrgRole;
    isOwner: boolean;
}

export interface OrgContextValue {
    // Active org
    org: Organization | null;
    currentMember: OrgMember | null;
    members: OrgMember[];
    invitations: PendingInvitation[];
    isOrgOwner: boolean;
    isOrgAdmin: boolean;
    loading: boolean;

    // Multi-org switcher
    allOrgs: OrgSummary[];           // all orgs this user belongs to
    switchOrg: (orgId: string) => Promise<void>;

    // Actions
    refreshMembers: () => Promise<void>;
    refreshInvitations: () => Promise<void>;
    updateMemberRole: (memberId: string, role: OrgRole, permissions: OrgPermissions) => Promise<void>;
    removeMember: (memberId: string) => Promise<void>;
    revokeInvitation: (invitationId: string) => Promise<void>;
    resendInvitation: (invitationId: string) => Promise<void>;

    // Permission helper
    can: (module: keyof OrgPermissions, level: PermissionLevel) => boolean;
}

const OrgContext = createContext<OrgContextValue | null>(null);

// ─── Default permissions per role ────────────────────────────────────────────

export const DEFAULT_PERMISSIONS: Record<OrgRole, OrgPermissions> = {
    admin: { crm: 'edit', orders: 'edit', sourcing: 'edit', billing: 'edit' },
    editor: { crm: 'edit', orders: 'edit', sourcing: 'edit', billing: 'none' },
    viewer: { crm: 'view', orders: 'view', sourcing: 'view', billing: 'none' },
};

const PERMISSION_RANK: Record<PermissionLevel, number> = { none: 0, view: 1, edit: 2 };

const ORG_STORAGE_KEY = 'garment_erp_active_org';

// ─── Provider ─────────────────────────────────────────────────────────────────

export const OrgProvider: FC<{ user: any | null; children: ReactNode }> = ({ user, children }) => {
    const [org, setOrg] = useState<Organization | null>(null);
    const [currentMember, setCurrentMember] = useState<OrgMember | null>(null);
    const [allOrgs, setAllOrgs] = useState<OrgSummary[]>([]);
    const [members, setMembers] = useState<OrgMember[]>([]);
    const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
    const [loading, setLoading] = useState(false);

    const mapMember = (row: any): OrgMember => ({
        id: row.id,
        userId: row.user_id,
        orgId: row.org_id,
        role: row.role,
        permissions: row.permissions as OrgPermissions,
        status: row.status,
        invitedBy: row.invited_by,
        joinedAt: row.joined_at,
        email: row.client_email ?? row.email,
        name: row.client_name ?? row.name,
        avatarUrl: row.avatar_url,
    });

    // Load all orgs the user belongs to, then select the active one
    const fetchAllOrgs = useCallback(async (userId: string) => {
        setLoading(true);
        try {
            // SECURITY DEFINER function — bypasses RLS entirely, returns all orgs for current user
            const { data, error } = await supabase.rpc('get_user_orgs');

            console.log('[OrgContext] get_user_orgs result:', { data, error });

            if (error || !data || data.length === 0) { setLoading(false); return; }

            const summaries: OrgSummary[] = data.map((row: any) => ({
                org: {
                    id: row.org_id,
                    name: row.org_name,
                    ownerId: row.owner_id,
                    maxMembers: row.max_members,
                    createdAt: row.created_at,
                },
                role: row.role as OrgRole,
                isOwner: row.owner_id === userId,
            }));

            const savedOrgId = localStorage.getItem(ORG_STORAGE_KEY);
            console.log('[OrgContext] summaries:', summaries.map(s => s.org.name), '| savedOrgId:', savedOrgId);

            setAllOrgs(summaries);

            // Determine which org to activate: persisted preference, or first owned org, or first in list
            const preferred =
                summaries.find(s => s.org.id === savedOrgId) ??
                summaries.find(s => s.isOwner) ??
                summaries[0];

            await activateOrg(preferred, userId);
        } finally {
            setLoading(false);
        }
    }, []);

    const activateOrg = useCallback(async (summary: OrgSummary, userId: string) => {
        setOrg(summary.org);
        localStorage.setItem(ORG_STORAGE_KEY, summary.org.id);

        // Fetch the full membership record for this user in this org
        const { data: memberRow } = await supabase
            .from('organization_members')
            .select('*')
            .eq('org_id', summary.org.id)
            .eq('user_id', userId)
            .single();

        if (memberRow) {
            setCurrentMember(mapMember(memberRow));
        }
    }, []);

    const switchOrg = useCallback(async (orgId: string) => {
        const summary = allOrgs.find(s => s.org.id === orgId);
        if (!summary || !user?.id) return;
        setMembers([]);
        setInvitations([]);
        await activateOrg(summary, user.id);
    }, [allOrgs, user?.id, activateOrg]);

    const refreshMembers = useCallback(async () => {
        if (!org) return;
        const { data } = await supabase.rpc('get_org_members_with_profiles', { p_org_id: org.id });
        if (data) {
            setMembers(data.map((row: any) => mapMember(row)));
        }
    }, [org]);

    const refreshInvitations = useCallback(async () => {
        if (!org) return;
        const { data } = await supabase
            .from('invitations')
            .select('*')
            .eq('org_id', org.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (data) {
            setInvitations(data.map(row => ({
                id: row.id,
                orgId: row.org_id,
                email: row.email,
                token: row.token,
                role: row.role,
                permissions: row.permissions,
                status: row.status,
                expiresAt: row.expires_at,
                createdAt: row.created_at,
                invitedBy: row.invited_by ?? null,
            })));
        }
    }, [org]);

    const updateMemberRole = useCallback(async (memberId: string, role: OrgRole, permissions: OrgPermissions) => {
        const { error } = await supabase
            .from('organization_members')
            .update({ role, permissions })
            .eq('id', memberId);
        if (error) throw new Error(error.message);
        await refreshMembers();
    }, [refreshMembers]);

    const removeMember = useCallback(async (memberId: string) => {
        const { error } = await supabase
            .from('organization_members')
            .delete()
            .eq('id', memberId);
        if (error) throw new Error(error.message);
        await refreshMembers();
    }, [refreshMembers]);

    const revokeInvitation = useCallback(async (invitationId: string) => {
        const { error } = await supabase
            .from('invitations')
            .delete()
            .eq('id', invitationId);
        if (error) throw new Error(error.message);
        await refreshInvitations();
    }, [refreshInvitations]);

    const resendInvitation = useCallback(async (invitationId: string) => {
        const inv = invitations.find(i => i.id === invitationId);
        if (!inv || !org) return;

        // Delete old record so the unique (org_id, email) constraint allows a fresh insert
        await supabase.from('invitations').delete().eq('id', invitationId);
        const { data: newInv, error } = await supabase
            .from('invitations')
            .insert({
                org_id: org.id,
                email: inv.email,
                role: inv.role,
                permissions: inv.permissions,
                status: 'pending',
                invited_by: user?.id ?? inv.invitedBy,
            })
            .select()
            .single();

        if (error || !newInv) throw new Error(error?.message ?? 'Failed to create new invitation');

        const { data: { session } } = await supabase.auth.getSession();
        await supabase.functions.invoke('invite-member', {
            body: { email: inv.email, role: inv.role, permissions: inv.permissions, orgId: org.id, invitationId: newInv.id },
            headers: { Authorization: `Bearer ${session?.access_token}` },
        });
        await refreshInvitations();
    }, [invitations, org, refreshInvitations]);

    const can = useCallback((module: keyof OrgPermissions, level: PermissionLevel): boolean => {
        if (!currentMember) return false;
        const granted = currentMember.permissions[module] ?? 'none';
        return PERMISSION_RANK[granted] >= PERMISSION_RANK[level];
    }, [currentMember]);

    const prevUserIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (user?.id) {
            prevUserIdRef.current = user.id;
            fetchAllOrgs(user.id);
        } else if (prevUserIdRef.current) {
            // Only clear when transitioning from a real user → null (actual sign-out)
            // NOT on initial page load where user starts as null briefly
            prevUserIdRef.current = null;
            setOrg(null);
            setCurrentMember(null);
            setAllOrgs([]);
            setMembers([]);
            setInvitations([]);
            localStorage.removeItem(ORG_STORAGE_KEY);
        }
    }, [user?.id, fetchAllOrgs]);

    // Refresh members + invitations when active org or role changes
    useEffect(() => {
        if (org && currentMember && (currentMember.role === 'admin' || org.ownerId === user?.id)) {
            refreshMembers();
            refreshInvitations();
        }
    }, [org?.id, currentMember?.role]);

    const isOrgOwner = org?.ownerId === user?.id;
    const isOrgAdmin = isOrgOwner || currentMember?.role === 'admin';

    return (
        <OrgContext.Provider value={{
            org, currentMember, members, invitations,
            isOrgOwner, isOrgAdmin, loading,
            allOrgs, switchOrg,
            refreshMembers, refreshInvitations,
            updateMemberRole, removeMember, revokeInvitation, resendInvitation,
            can,
        }}>
            {children}
        </OrgContext.Provider>
    );
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export const useOrg = (): OrgContextValue => {
    const ctx = useContext(OrgContext);
    if (!ctx) throw new Error('useOrg must be used inside OrgProvider');
    return ctx;
};

export const useOrgPermissions = () => {
    const { can, currentMember, isOrgOwner, isOrgAdmin } = useOrg();
    return { can, currentMember, isOrgOwner, isOrgAdmin };
};
