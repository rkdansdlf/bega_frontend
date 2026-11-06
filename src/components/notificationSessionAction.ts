type SessionAction<T> = {
  isCurrent: () => boolean;
  request: () => Promise<T>;
  apply: (result: T) => void;
  onError: (error: unknown) => void;
};

export const runNotificationSessionAction = async <T>({
  isCurrent,
  request,
  apply,
  onError,
}: SessionAction<T>): Promise<void> => {
  if (!isCurrent()) return;
  try {
    const result = await request();
    if (isCurrent()) apply(result);
  } catch (error) {
    if (isCurrent()) onError(error);
  }
};
