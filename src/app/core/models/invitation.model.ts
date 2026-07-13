export interface CreateInvitationRequest {
  moduleCodes: string[];
  expiresInDays?: number;
}

export interface OrganizationInvitation {
  id: string;
  /** Solo viene poblado justo después de crear la invitación; no se puede recuperar más tarde. */
  token?: string;
  moduleCodes: string[];
  expiresAt: string;
  usedAt?: string | null;
  revokedAt?: string | null;
  createdAt: string;
  usable: boolean;
}
