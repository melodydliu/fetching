import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { CAT_BREEDS, DOG_BREEDS } from '@/config/reference';
import type { Species } from '@/domain/types';
import { useTheme } from '@/hooks/useTheme';
import { hitSize } from '@/theme';
import { Text } from '../ui/Text';
import { TextField } from '../ui/TextField';

interface BreedFieldProps {
  species: Species;
  value: string;
  onChange: (breed: string) => void;
}

/** Searchable list for dogs and cats; plain free text for every other species. */
export function BreedField({ species, value, onChange }: BreedFieldProps) {
  const { colors, radii, spacing } = useTheme();
  const [focused, setFocused] = useState(false);
  const list = species === 'dog' ? DOG_BREEDS : species === 'cat' ? CAT_BREEDS : null;

  const query = value.trim().toLowerCase();
  const matches = list
    ? list.filter((b) => b.toLowerCase().includes(query)).slice(0, query ? 6 : 5)
    : [];
  const exact = list?.some((b) => b.toLowerCase() === query) ?? false;
  const showList = !!list && focused && !exact && (matches.length > 0 || query.length > 0);

  return (
    <View style={{ gap: spacing.xs }}>
      <TextField
        label="Breed (optional)"
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder={list ? 'Search breeds' : undefined}
        autoCapitalize="words"
        autoCorrect={false}
      />
      {showList && (
        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: radii.md,
            overflow: 'hidden',
          }}
        >
          {matches.map((b) => (
            <Pressable
              key={b}
              onPress={() => {
                onChange(b);
                setFocused(false);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Choose ${b}`}
              style={{
                minHeight: hitSize,
                justifyContent: 'center',
                paddingHorizontal: spacing.lg,
              }}
            >
              <Text>{b}</Text>
            </Pressable>
          ))}
          {query.length > 0 && !exact && (
            <Pressable
              onPress={() => setFocused(false)}
              accessibilityRole="button"
              accessibilityLabel={`Use ${value.trim()}`}
              style={{
                minHeight: hitSize,
                justifyContent: 'center',
                paddingHorizontal: spacing.lg,
                backgroundColor: colors.surfaceMuted,
              }}
            >
              <Text variant="smallStrong" color="primary">
                Use “{value.trim()}”
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}
