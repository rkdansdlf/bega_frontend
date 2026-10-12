export const isAdminUserDeletionBlocked = (
  targetUserId: number,
  targetRole: string,
  currentUserId: number | null,
): boolean => currentUserId === null
  || targetUserId === currentUserId
  || targetRole !== 'ROLE_USER';
