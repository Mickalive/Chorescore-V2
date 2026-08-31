/**
 * ChoreScore V2 — Local Invitation Adapter
 *
 * In-memory implementation of the InvitationGateway port.
 * Provides create/accept/decline household invitations.
 *
 * In production, this would be backed by a server-side database
 * with proper email delivery and token-based invitation links.
 */

import {
  InvitationGateway,
  InvitationCreateData,
  Invitation,
  InvitationResult,
} from '../../application/ports';

export class LocalInvitationAdapter implements InvitationGateway {
  private invitations: Map<string, Invitation> = new Map();
  private counter = 0;

  async createInvitation(data: InvitationCreateData): Promise<Invitation> {
    this.counter++;
    const id = `inv-${Date.now()}-${this.counter}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation: Invitation = {
      id,
      householdId: data.householdId,
      invitedByUserId: data.invitedByUserId,
      invitedEmail: data.invitedEmail,
      role: data.role ?? 'MEMBER',
      status: 'pending',
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    this.invitations.set(id, invitation);
    return invitation;
  }

  async acceptInvitation(invitationId: string, userId: string): Promise<InvitationResult> {
    const invitation = this.invitations.get(invitationId);
    if (!invitation) {
      return { success: false, error: 'Invitation not found' };
    }

    if (invitation.status !== 'pending') {
      return { success: false, error: 'Invitation is no longer pending' };
    }

    if (new Date(invitation.expiresAt).getTime() < Date.now()) {
      return { success: false, error: 'Invitation has expired' };
    }

    // Update status
    invitation.status = 'accepted';
    this.invitations.set(invitationId, invitation);

    return {
      success: true,
      membershipId: `mem-${invitationId}-${userId}`,
    };
  }

  async declineInvitation(invitationId: string, _userId: string): Promise<InvitationResult> {
    const invitation = this.invitations.get(invitationId);
    if (!invitation) {
      return { success: false, error: 'Invitation not found' };
    }

    if (invitation.status !== 'pending') {
      return { success: false, error: 'Invitation is no longer pending' };
    }

    invitation.status = 'declined';
    this.invitations.set(invitationId, invitation);

    return { success: true };
  }

  async getPendingInvitations(userId: string): Promise<Invitation[]> {
    return Array.from(this.invitations.values()).filter(
      inv => inv.status === 'pending' && inv.invitedEmail.includes(userId)
    );
  }

  async getHouseholdInvitations(householdId: string): Promise<Invitation[]> {
    return Array.from(this.invitations.values()).filter(
      inv => inv.householdId === householdId
    );
  }

  async revokeInvitation(invitationId: string, _householdId: string): Promise<void> {
    const invitation = this.invitations.get(invitationId);
    if (invitation && invitation.status === 'pending') {
      invitation.status = 'revoked';
      this.invitations.set(invitationId, invitation);
    }
  }

  /** Seed with test data */
  seed(invitations: Invitation[]): void {
    for (const inv of invitations) {
      this.invitations.set(inv.id, inv);
    }
  }
}
