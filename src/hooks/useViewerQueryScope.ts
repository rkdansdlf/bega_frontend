import { useMemo } from 'react';

import { useAuthSession } from '../store/authStore';
import type { ViewerQueryScope } from '../utils/viewerQueryScope';

export const useViewerQueryScope = (): ViewerQueryScope => {
  const { userId, sessionEpoch } = useAuthSession();

  return useMemo(() => ({
    viewerId: userId,
    sessionEpoch,
  }), [sessionEpoch, userId]);
};
