import * as Haptics from 'expo-haptics';
import { type ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { promptById } from '@/config/prompts';
import { RELATIONSHIP_GOAL_LABELS, SPECIES_LABELS } from '@/config/reference';
import { ageFromBirthdate } from '@/domain/geo';
import type { LikedYou } from '@/domain/matching';
import {
  buildProfileSections,
  likeTargetOf,
  type ProfileBlock,
  type ProfileSection,
  type ProfileSectionKind,
} from '@/domain/profileBlocks';
import type { Pet, Photo, Profile, Tri } from '@/domain/types';
import { useTheme } from '@/hooks/useTheme';
import { Chip } from './ui/Chip';
import { Icon } from './ui/Icon';
import { PhotoView } from './ui/PhotoView';
import { Text } from './ui/Text';

interface ProfileViewProps {
  profile: Profile;
  distanceMiles?: number;
  likedYou?: LikedYou | null;
  /** When set, every photo, prompt and pet gets a labelled "Like" button that calls this. */
  onLikePress?: (block: ProfileBlock) => void;
  /** Reports where each section starts (relative to this view) so a parent can offer jump tabs. */
  onSectionLayout?: (kind: ProfileSectionKind, y: number) => void;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * A profile as other people see it, in clearly separate parts:
 * the person (photos + personal prompts), then their pets in their own tinted panel.
 */
export function ProfileView({
  profile,
  distanceMiles,
  likedYou,
  onLikePress,
  onSectionLayout,
}: ProfileViewProps) {
  const { colors, radii, spacing } = useTheme();
  const { user } = profile;
  const sections = buildProfileSections(profile);
  const age = user.birthdate ? ageFromBirthdate(user.birthdate) : null;

  const basics = [
    user.basics.job,
    user.basics.school,
    user.basics.hometown,
    user.relationshipGoal ? RELATIONSHIP_GOAL_LABELS[user.relationshipGoal] : null,
    distanceMiles === undefined
      ? null
      : distanceMiles < 1
        ? 'Less than a mile away'
        : `${Math.round(distanceMiles)} miles away`,
  ].filter((x): x is string => !!x);

  const describe = (block: ProfileBlock): string => {
    if (block.type === 'photo') return `${user.firstName}'s photo`;
    if (block.type === 'pet') return block.pet.name;
    if (block.type === 'prompt') {
      return `${user.firstName}'s answer to ${promptById(block.answer.promptId)?.text ?? 'a prompt'}`;
    }
    return 'this profile';
  };

  /** Wraps one likeable thing with its "Like" button. */
  const likeable = (block: ProfileBlock, content: ReactNode) => (
    <View>
      {content}
      {onLikePress && likeTargetOf(block) ? (
        <LikePill label={`Like ${describe(block)}`} onPress={() => onLikePress(block)} />
      ) : null}
    </View>
  );

  const promptCard = (block: Extract<ProfileBlock, { type: 'prompt' }>) => {
    const prompt = promptById(block.answer.promptId);
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radii.xl,
            padding: spacing.xl,
            paddingBottom: onLikePress ? spacing.xl + 40 : spacing.xl,
            gap: spacing.sm,
          },
        ]}
      >
        <Text variant="smallStrong" color="textMuted">
          {prompt?.text}
        </Text>
        <Text variant="titleItalic">{block.answer.answer}</Text>
      </View>
    );
  };

  const renderPersonBlock = (block: ProfileBlock, index: number) => {
    if (block.type === 'photo') {
      return (
        <View key={block.photo.id}>
          {likeable(
            block,
            <View style={[styles.photoWrap, { borderRadius: radii.xl }]}>
              <PhotoView
                url={block.photo.url}
                label={`Photo of ${user.firstName}`}
                style={styles.photo}
              />
              {index === 0 && (
                <View
                  style={[
                    styles.nameTag,
                    { backgroundColor: colors.surface, borderRadius: radii.lg },
                  ]}
                >
                  <Text variant="title">
                    {user.firstName}
                    {age !== null ? `, ${age}` : ''}
                  </Text>
                </View>
              )}
            </View>,
          )}
        </View>
      );
    }
    if (block.type === 'prompt') {
      return <View key={block.answer.id}>{likeable(block, promptCard(block))}</View>;
    }
    return null;
  };

  const renderSection = (section: ProfileSection) => {
    const onLayout = (y: number) => onSectionLayout?.(section.kind, y);

    if (section.kind === 'person') {
      return (
        <View
          key="person"
          onLayout={(e) => onLayout(e.nativeEvent.layout.y)}
          style={{ gap: spacing.md }}
          accessibilityLabel={section.title}
        >
          {section.blocks.slice(0, 1).map((b, i) => renderPersonBlock(b, i))}
          {basics.length > 0 && (
            <View style={[styles.wrap, { gap: spacing.sm }]}>
              {basics.map((b) => (
                <Chip key={b} label={b} />
              ))}
            </View>
          )}
          {section.blocks.slice(1).map((b, i) => renderPersonBlock(b, i + 1))}
        </View>
      );
    }

    // Pets and animal lovers live in their own tinted panel under a clear heading.
    return (
      <View
        key={section.kind}
        onLayout={(e) => onLayout(e.nativeEvent.layout.y)}
        style={{
          backgroundColor: colors.primarySoft,
          borderRadius: radii.xl + 8,
          padding: spacing.md,
          gap: spacing.md,
        }}
      >
        <View
          style={[styles.sectionHeader, { paddingHorizontal: spacing.sm, paddingTop: spacing.xs }]}
        >
          <Icon name="paw" size={22} color={colors.onPrimarySoft} />
          <Text variant="title" color="onPrimarySoft" style={{ flex: 1 }}>
            {section.title}
          </Text>
        </View>
        {section.blocks.map((block) => {
          if (block.type === 'pet') {
            return (
              <View key={block.pet.id}>
                <PetCard
                  pet={block.pet}
                  likeButton={
                    onLikePress ? (
                      <LikePill
                        label={`Like ${block.pet.name}`}
                        onPress={() => onLikePress(block)}
                      />
                    ) : null
                  }
                />
              </View>
            );
          }
          if (block.type === 'prompt') {
            return <View key={block.answer.id}>{likeable(block, promptCard(block))}</View>;
          }
          return <AnimalLoverCard key="lover" profile={profile} />;
        })}
      </View>
    );
  };

  return (
    <View style={{ gap: spacing.lg }}>
      {likedYou ? (
        <Chip label={likedYou.isTreat ? 'Sent you a Treat' : 'Liked you'} tone="accent" />
      ) : null}
      {sections.map(renderSection)}
    </View>
  );
}

/** Labelled "Like" button (heart + word), so it's obvious what it does. */
function LikePill({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors, radii, spacing } = useTheme();
  return (
    <Pressable
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.likePill,
        {
          backgroundColor: colors.surface,
          borderColor: colors.primary,
          borderRadius: radii.pill,
          paddingHorizontal: spacing.lg,
          shadowColor: colors.shadow,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        },
      ]}
    >
      <Icon name="heart" size={22} color={colors.primary} />
      <Text variant="bodyStrong" color="primary">
        Like
      </Text>
    </Pressable>
  );
}

/** Swipeable photos with page dots. */
function PhotoCarousel({ photos, name }: { photos: Photo[]; name: string }) {
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityLabel={`${name}'s photos`}
      accessibilityValue={{ text: `Photo ${page + 1} of ${photos.length}` }}
      style={{ aspectRatio: 1 }}
    >
      {width > 0 && (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        >
          {photos.map((p, i) => (
            <PhotoView
              key={p.id}
              url={p.url}
              label={`Photo ${i + 1} of ${name}`}
              style={{ width, height: width }}
            />
          ))}
        </ScrollView>
      )}
      {photos.length > 1 && (
        <View style={styles.dots} pointerEvents="none" aria-hidden>
          {photos.map((p, i) => (
            <View
              key={p.id}
              style={[styles.dot, { width: i === page ? 18 : 7, opacity: i === page ? 1 : 0.6 }]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function PetCard({ pet, likeButton }: { pet: Pet; likeButton: ReactNode }) {
  const { colors, radii, spacing } = useTheme();
  const details = [
    pet.breed ?? SPECIES_LABELS[pet.species],
    `${pet.ageYears} ${pet.ageYears === 1 ? 'yr' : 'yrs'}`,
    pet.size ? cap(pet.size) : null,
  ].filter((x): x is string => !!x);
  const social = (
    [
      ['dogs', pet.goodWith.dogs],
      ['cats', pet.goodWith.cats],
      ['kids', pet.goodWith.kids],
    ] as [string, Tri][]
  ).filter(([, v]) => v !== 'unsure');

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radii.xl,
          overflow: 'hidden',
        },
      ]}
    >
      <View>
        {pet.photos.length > 0 ? (
          <PhotoCarousel photos={pet.photos} name={pet.name} />
        ) : (
          <View style={{ aspectRatio: 1, backgroundColor: colors.surfaceMuted }} />
        )}
        {likeButton}
      </View>
      <View
        accessible
        accessibilityLabel={`Pet: ${pet.name}, ${details.join(', ')}`}
        style={{ padding: spacing.xl, gap: spacing.md }}
      >
        <View style={{ gap: 2 }}>
          <Text variant="title">{pet.name}</Text>
          <Text variant="small" color="textMuted">
            {details.join(' · ')}
          </Text>
        </View>
        <View style={[styles.wrap, { gap: spacing.sm }]}>
          <Chip label={`${cap(pet.energy)} energy`} tone="accent" />
          {social.map(([who, v]) => (
            <Chip
              key={who}
              label={v === 'yes' ? `Good with ${who}` : `Not for ${who}`}
              tone={v === 'yes' ? 'sage' : 'neutral'}
            />
          ))}
          {pet.personalityTags.map((t) => (
            <Chip key={t} label={cap(t)} tone="primary" />
          ))}
        </View>
      </View>
    </View>
  );
}

function AnimalLoverCard({ profile }: { profile: Profile }) {
  const { colors, radii, spacing } = useTheme();
  const { user } = profile;
  const loved = (user.animalLover?.lovedSpecies ?? []).map(
    (s) => `${SPECIES_LABELS[s].toLowerCase()}s`,
  );
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.sage,
          borderColor: colors.border,
          borderRadius: radii.xl,
          padding: spacing.xl,
          gap: spacing.md,
        },
      ]}
    >
      <Chip label="Animal Lover" tone="neutral" />
      <Text variant="titleItalic" color="onSage">
        Loves {joinList(loved)}
      </Text>
      <Text variant="small" color="onSage">
        {openToText(user.animalLover?.openToPetSpecies ?? [])}
        {user.allergies.length
          ? ` Allergic to ${joinList(user.allergies.map((s) => `${s}s`))}.`
          : ''}
      </Text>
    </View>
  );
}

const joinList = (items: string[]) =>
  items.length <= 1
    ? (items[0] ?? 'animals')
    : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

const openToText = (species: string[]) => {
  if (species.length === 0) return 'Prefers to date someone without pets.';
  const groups = species
    .map((s) => (s === 'dog' ? 'dogs' : s === 'cat' ? 'cats' : 'other pets'))
    .filter((v, i, a) => a.indexOf(v) === i);
  return `Happy to date someone with ${joinList(groups)}.`;
};

const styles = StyleSheet.create({
  photoWrap: { overflow: 'hidden' },
  photo: { width: '100%', aspectRatio: 4 / 5 },
  nameTag: {
    position: 'absolute',
    left: 14,
    bottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  card: { borderWidth: StyleSheet.hairlineWidth },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  likePill: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 5,
  },
  dots: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  dot: { height: 7, borderRadius: 4, backgroundColor: '#FFFFFF' },
});
