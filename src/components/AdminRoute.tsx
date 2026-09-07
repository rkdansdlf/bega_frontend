import { type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { buildLoginPath } from '../utils/loginRedirect';
import { isAdminRole, useAuthProfileSnapshot, useAuthSession } from '../store/authStore';

type AdminRouteAccessState = {
  isLoggedIn: boolean;
  userRole?: string;
};

type AdminRouteAccess =
  | { kind: 'allow' }
  | { kind: 'redirect'; to: string };

type AdminRouteProps = {
  accessOverride?: AdminRouteAccessState;
  outletOverride?: ReactNode;
};

export const resolveAdminRouteAccess = ({
  currentLocation,
  isLoggedIn,
  userRole,
}: AdminRouteAccessState & { currentLocation: string }): AdminRouteAccess => {
  if (!isLoggedIn) {
    return { kind: 'redirect', to: buildLoginPath(currentLocation) };
  }

  if (!isAdminRole(userRole)) {
    return { kind: 'redirect', to: '/' };
  }

  return { kind: 'allow' };
};

export default function AdminRoute({ accessOverride, outletOverride }: AdminRouteProps = {}) {
  const session = useAuthSession();
  const profile = useAuthProfileSnapshot();
  const location = useLocation();
  const access = resolveAdminRouteAccess({
    currentLocation: `${location.pathname}${location.search}${location.hash}`,
    isLoggedIn: accessOverride?.isLoggedIn ?? session.isLoggedIn,
    userRole: accessOverride === undefined ? profile.userRole : accessOverride.userRole,
  });

  if (access.kind === 'redirect') {
    return <Navigate to={access.to} replace />;
  }

  return outletOverride !== undefined ? outletOverride : <Outlet />;
}
