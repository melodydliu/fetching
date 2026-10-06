import { useNavigation } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { confirmAction } from '@/utils/confirm';

/**
 * Leaving a screen with unsaved edits (back button, swipe, hardware back) asks first.
 * Call `markSaved()` right before navigating away after a successful save.
 */
export function useDiscardGuard(dirty: boolean): { markSaved: () => void } {
  const navigation = useNavigation();
  const saved = useRef(false);

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        if (saved.current || !dirty) return;
        e.preventDefault();
        confirmAction({
          title: 'Discard changes?',
          message: 'Your edits haven’t been saved.',
          confirmLabel: 'Discard',
          cancelLabel: 'Keep editing',
          destructive: true,
          onConfirm: () => navigation.dispatch(e.data.action),
        });
      }),
    [navigation, dirty],
  );

  return { markSaved: useCallback(() => void (saved.current = true), []) };
}
