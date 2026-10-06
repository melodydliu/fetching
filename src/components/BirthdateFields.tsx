import { useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { BIRTHDATE_MESSAGES, type BirthdateResult, validateBirthdate } from '@/domain/onboarding';
import type { ISODate } from '@/domain/types';
import { Text } from './ui/Text';
import { TextField } from './ui/TextField';

const digits = (s: string) => s.replace(/[^0-9]/g, '');

interface BirthdateFieldsProps {
  /** Starting value, e.g. the saved birthday. */
  initial?: ISODate;
  autoFocus?: boolean;
  /** Called with the validation result whenever any field changes (and once on mount). Keep it stable. */
  onResult: (result: BirthdateResult) => void;
  /** Called when any of the three fields loses focus. */
  onBlur?: () => void;
}

/** Month / day / year inputs with live 18+ validation. Shared by onboarding and Edit profile. */
export function BirthdateFields({ initial, autoFocus, onResult, onBlur }: BirthdateFieldsProps) {
  const [y0, m0, d0] = initial ? initial.split('-') : ['', '', ''];
  const [month, setMonth] = useState(m0 ? String(Number(m0)) : '');
  const [day, setDay] = useState(d0 ? String(Number(d0)) : '');
  const [year, setYear] = useState(y0 ?? '');
  const dayRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  const result = validateBirthdate(month, day, year);
  const message = result.ok ? null : BIRTHDATE_MESSAGES[result.reason];

  // Callers pass a stable callback (a state setter).
  useEffect(() => {
    onResult(validateBirthdate(month, day, year));
  }, [month, day, year, onResult]);

  return (
    <>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <TextField
            label="Month"
            value={month}
            onChangeText={(t) => {
              const v = digits(t);
              setMonth(v);
              if (v.length === 2) dayRef.current?.focus();
            }}
            onBlur={onBlur}
            placeholder="MM"
            keyboardType="number-pad"
            maxLength={2}
            autoFocus={autoFocus}
            style={{ textAlign: 'center' }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <TextField
            ref={dayRef}
            label="Day"
            value={day}
            onChangeText={(t) => {
              const v = digits(t);
              setDay(v);
              if (v.length === 2) yearRef.current?.focus();
            }}
            onBlur={onBlur}
            placeholder="DD"
            keyboardType="number-pad"
            maxLength={2}
            style={{ textAlign: 'center' }}
          />
        </View>
        <View style={{ flex: 1.6 }}>
          <TextField
            ref={yearRef}
            label="Year"
            value={year}
            onChangeText={(t) => setYear(digits(t))}
            onBlur={onBlur}
            placeholder="YYYY"
            keyboardType="number-pad"
            maxLength={4}
            style={{ textAlign: 'center' }}
          />
        </View>
      </View>
      {message ? (
        <Text variant="small" color="danger" accessibilityLiveRegion="polite">
          {message}
        </Text>
      ) : result.ok ? (
        <Text variant="bodyStrong" color="sageStrong" accessibilityLiveRegion="polite">
          You&apos;re {result.age}.
        </Text>
      ) : null}
    </>
  );
}
