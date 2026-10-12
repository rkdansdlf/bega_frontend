import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { useAuthSession } from '../store/authStore';
import {
  createInitialMateCreateFormErrors,
  createInitialPartyFormData,
  getMateCreateDraftStorageKey,
  isMateCreateDraftEmpty,
  readMateCreateDraft,
  serializeMateCreateDraft,
  type MateCreateFormErrors,
  type PartyFormData,
} from '../utils/mateCreateDraft';

type MateCreateDraftState = {
  viewerId: number | null;
  createStep: 1 | 2 | 3 | 4;
  formData: PartyFormData;
  formErrors: MateCreateFormErrors;
};

const createInitialDraftState = (viewerId: number | null): MateCreateDraftState => ({
  viewerId,
  createStep: 1,
  formData: createInitialPartyFormData(),
  formErrors: createInitialMateCreateFormErrors(),
});

const loadInitialDraft = (viewerId: number | null): MateCreateDraftState => {
  const initialState = createInitialDraftState(viewerId);
  const storageKey = getMateCreateDraftStorageKey(viewerId);
  if (typeof window === 'undefined' || !storageKey) return initialState;

  try {
    return {
      ...initialState,
      ...readMateCreateDraft(window.sessionStorage.getItem(storageKey)),
    };
  } catch {
    return initialState;
  }
};

export const useMateCreateDraft = () => {
  const { userId, sessionEpoch } = useAuthSession();
  const [draftState, setDraftState] = useState(() => loadInitialDraft(userId));

  useEffect(() => {
    setDraftState(loadInitialDraft(userId));
  }, [sessionEpoch, userId]);

  const activeDraftState = draftState.viewerId === userId
    ? draftState
    : createInitialDraftState(userId);

  useEffect(() => {
    if (typeof window === 'undefined' || userId === null || draftState.viewerId !== userId) {
      return;
    }

    const storageKey = getMateCreateDraftStorageKey(userId);
    if (!storageKey) return;

    try {
      if (isMateCreateDraftEmpty(draftState.createStep, draftState.formData)) {
        window.sessionStorage.removeItem(storageKey);
        return;
      }

      window.sessionStorage.setItem(
        storageKey,
        serializeMateCreateDraft(draftState.createStep, draftState.formData),
      );
    } catch {
      // Continue with in-memory draft state when session storage is unavailable.
    }
  }, [draftState, userId]);

  const updateForCurrentViewer = (
    update: (current: MateCreateDraftState) => MateCreateDraftState,
  ) => {
    setDraftState((current) => update(
      current.viewerId === userId ? current : createInitialDraftState(userId),
    ));
  };

  const setCreateStep: Dispatch<SetStateAction<1 | 2 | 3 | 4>> = (value) => {
    updateForCurrentViewer((current) => ({
      ...current,
      createStep: typeof value === 'function' ? value(current.createStep) : value,
    }));
  };

  return {
    createStep: activeDraftState.createStep,
    formData: activeDraftState.formData,
    formErrors: activeDraftState.formErrors,
    setCreateStep,
    updateFormData: (data: Partial<PartyFormData>) => {
      updateForCurrentViewer((current) => ({
        ...current,
        formData: { ...current.formData, ...data },
      }));
    },
    setFormError: (field: keyof MateCreateFormErrors, error: string) => {
      updateForCurrentViewer((current) => ({
        ...current,
        formErrors: { ...current.formErrors, [field]: error },
      }));
    },
    resetForm: () => setDraftState(createInitialDraftState(userId)),
  };
};

export type UseMateCreateDraftReturn = ReturnType<typeof useMateCreateDraft>;
