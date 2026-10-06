import * as Haptics from 'expo-haptics';
import { type ReactNode, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { promptById } from '@/config/prompts';
import { RELATIONSHIP_GOAL_LABELS, SPECIES_LABELS } from '@/config/reference';
import { ageFromBirthdate } from '@/domain/geo';
import { summarizePets } from '@/domain/petSummary';
import type { LikedYou } from '@/domain/matching';
import {
  buildProfileSections,
  heroBlockOf,
  likeTargetOf,
  type ProfileBlock,
  type ProfileSection,
} from '@/domain/profileBlocks';
import type { Pet, Photo, Profile, PromptAnswer, Tri } from '@/domain/types';
import { useTheme } from '@/hooks/useTheme';
import { Chip } from './ui/Chip';
import { Icon, type IconName } from './ui/Icon';
import { PhotoView } from './ui/PhotoView';
import { Text } from './ui/Text';

const HERO_ASPECT = 0.9;

interface ProfileViewProps {
  profile: Profile;
  distanceMiles?: number;
  likedYou?: LikedYou | null;
  /** When set, every photo, prompt and pet gets a labelled "Like" button that calls this. */
  onLikePress?: (block: ProfileBlock) => void;
  /** Shows a ⋯ button on the hero (unmatch / block / report). */
  onMorePress?: () => void;
  /** Sits on top of the hero photo, e.g. the daily-likes chips. */
  heroOverlay?: ReactNode;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * A profile as other people see it: a full-bleed hero photo and the basics,
 * then the rest of the person (photos + prompts), then their pets in their own tinted panel.
 * Renders edge to edge; the caller must not pad it.
 */
export function ProfileView({
  profile,
  distanceMiles,
  likedYou,
  onLikePress,
  onMorePress,
  heroOverlay,
}: ProfileViewProps) {
  const { colors, radii, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = profile;
  const [openPet, setOpenPet] = useState<Pet | null>(null);
  const sections = buildProfileSections(profile);
  // The pet-themed prompts they answered, shown with each pet in its sheet too.
  const petPrompts = user.promptAnswers.filter((a) => promptById(a.promptId)?.category === 'pet');
  const heroBlock = heroBlockOf(sections);
  const heroUrl = heroBlock?.type === 'photo' ? heroBlock.photo.url : null;
  const heroCaption = heroBlock?.type === 'photo' ? heroBlock.photo.caption : undefined;
  const age = user.birthdate ? ageFromBirthdate(user.birthdate) : null;

  const heroPets = user.kind === 'pet_owner' ? profile.pets : [];
  type Fact = { icon: IconName; text: string };
  const rawFacts: (Fact | null)[] = [
    heroPets.length > 0 ? { icon: 'paw', text: summarizePets(heroPets) } : null,
    user.basics.job ? { icon: 'briefcase', text: user.basics.job } : null,
    user.location.city ? { icon: 'pin', text: user.location.city } : null,
    user.basics.hometown ? { icon: 'home', text: `From ${user.basics.hometown}` } : null,
    user.relationshipGoals.length > 0
      ? {
          icon: 'heart',
          text: user.relationshipGoals.map((g) => RELATIONSHIP_GOAL_LABELS[g]).join(', '),
        }
      : null,
    distanceMiles === undefined
      ? null
      : {
          icon: 'compass',
          text:
            distanceMiles < 1 ? 'Less than a mile away' : `${Math.round(distanceMiles)} miles away`,
        },
  ];
  const facts = rawFacts.filter((x): x is Fact => !!x);

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

  const promptCard = (block: Extract<ProfileBlock, { type: 'prompt' }>) => (
    <PromptCard answer={block.answer} roomForLike={!!onLikePress} />
  );

  const renderPersonBlock = (block: ProfileBlock) => {
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
              {block.photo.caption ? (
                <Caption text={block.photo.caption} style={styles.photoCaption} />
              ) : null}
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
    if (section.kind === 'person') {
      return (
        <View key="person" style={{ gap: spacing.md }} accessibilityLabel={section.title}>
          {section.blocks.filter((b) => b !== heroBlock).map(renderPersonBlock)}
        </View>
      );
    }

    // Pets and animal lovers live in their own tinted panel under a clear heading.
    return (
      <View
        key={section.kind}
        style={{
          backgroundColor: colors.primarySoft,
          borderRadius: radii.xl + 8,
          padding: spacing.md,
          gap: spacing.md,
        }}
      >
        <PanelHeader title={section.title} />
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
    <View>
      <View style={{ aspectRatio: HERO_ASPECT, backgroundColor: colors.surfaceMuted }}>
        {heroUrl ? (
          <PhotoView
            url={heroUrl}
            label={`Photo of ${user.firstName}`}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.center]}>
            <Icon name="paw" size={56} color={colors.textSubtle} />
          </View>
        )}
        {heroCaption ? <Caption text={heroCaption} style={styles.heroCaption} /> : null}
        {heroPets.length > 0 ? <PetBubbles pets={heroPets} onPress={setOpenPet} /> : null}
        {/* Keeps the status bar readable on bright photos. */}
        <View
          style={[styles.scrim, { height: insets.top + 24, backgroundColor: colors.overlay }]}
          pointerEvents="none"
        />
        {onMorePress ? (
          <Pressable
            onPress={onMorePress}
            accessibilityRole="button"
            accessibilityLabel={`More options for ${user.firstName}`}
            style={[
              styles.moreButton,
              {
                top: insets.top + spacing.sm,
                right: spacing.md,
                backgroundColor: colors.surface,
                borderRadius: radii.pill,
              },
            ]}
          >
            <Icon name="more" size={24} color={colors.text} />
          </Pressable>
        ) : null}
        {heroOverlay ? (
          <View
            style={[
              styles.heroOverlay,
              { top: insets.top + spacing.sm, paddingHorizontal: spacing.lg, gap: spacing.sm },
            ]}
          >
            {heroOverlay}
          </View>
        ) : null}
      </View>

      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.background,
            borderTopLeftRadius: radii.xl + 8,
            borderTopRightRadius: radii.xl + 8,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.xl,
            gap: spacing.xl,
          },
        ]}
      >
        <View accessible accessibilityLabel={`${user.firstName}${age !== null ? `, ${age}` : ''}`}>
          {likedYou ? (
            <View style={{ marginBottom: spacing.sm }}>
              <Chip label={likedYou.isTreat ? 'Sent you a Treat' : 'Liked you'} tone="accent" />
            </View>
          ) : null}
          <Text variant="display">
            {user.firstName}
            {age !== null ? `, ${age}` : ''}
          </Text>
        </View>

        {facts.length > 0 && (
          <View style={[styles.wrap, { columnGap: spacing.md, rowGap: spacing.md, marginTop: -8 }]}>
            {facts.map((f) => (
              <View key={f.icon} style={[styles.fact, { gap: spacing.sm }]}>
                <Icon name={f.icon} size={18} color={colors.textSubtle} />
                <Text variant="small" color="textMuted" style={{ flex: 1 }}>
                  {f.text}
                </Text>
              </View>
            ))}
          </View>
        )}

        {sections.map(renderSection)}
      </View>
      <PetSheet pet={openPet} prompts={petPrompts} onClose={() => setOpenPet(null)} />
    </View>
  );
}

/** A photo's caption on a translucent chip, sitting over the photo's bottom-left. */
function Caption({ text, style }: { text: string; style: object }) {
  const { colors, radii } = useTheme();
  return (
    <View
      style={[styles.caption, { backgroundColor: colors.overlay, borderRadius: radii.md }, style]}
    >
      <Text variant="small" numberOfLines={3} style={{ color: colors.onPrimary }}>
        {text}
      </Text>
    </View>
  );
}

const BUBBLE = 72;
const MAX_BUBBLES = 3;

/** Round pet photos on the hero's bottom-right corner, overlapping like a stack. Tap one to meet that pet. */
function PetBubbles({ pets, onPress }: { pets: Pet[]; onPress: (pet: Pet) => void }) {
  const { colors, spacing } = useTheme();
  const shown = pets.slice(0, MAX_BUBBLES);
  const hidden = pets.slice(MAX_BUBBLES);
  return (
    <View style={[styles.bubbles, { right: spacing.lg }]}>
      {shown.map((pet, i) => (
        <Pressable
          key={pet.id}
          onPress={() => onPress(pet)}
          accessibilityRole="button"
          accessibilityLabel={`Meet ${pet.name}`}
          style={[
            styles.bubble,
            {
              borderColor: colors.surface,
              backgroundColor: colors.surfaceMuted,
              marginLeft: i === 0 ? 0 : -20,
            },
          ]}
        >
          {pet.photos[0] ? (
            <PhotoView url={pet.photos[0].url} label={pet.name} style={styles.bubbleImage} />
          ) : (
            <View style={[styles.bubbleImage, styles.center]}>
              <Icon name="paw" size={30} color={colors.textSubtle} />
            </View>
          )}
        </Pressable>
      ))}
      {hidden.length > 0 && (
        <Pressable
          onPress={() => onPress(hidden[0]!)}
          accessibilityRole="button"
          accessibilityLabel={`Meet ${hidden.map((p) => p.name).join(', ')}`}
          style={[
            styles.bubble,
            styles.center,
            { borderColor: colors.surface, backgroundColor: colors.primarySoft, marginLeft: -20 },
          ]}
        >
          <Text variant="smallStrong" color="onPrimarySoft">
            +{hidden.length}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/** "Meet [pet]" heading with the paw, shared by the profile's pet panel and the pet sheet. */
function PanelHeader({ title }: { title: string }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={[styles.sectionHeader, { paddingHorizontal: spacing.sm, paddingTop: spacing.xs }]}>
      <Icon name="paw" size={22} color={colors.onPrimarySoft} />
      <Text variant="title" color="onPrimarySoft" style={{ flex: 1 }}>
        {title}
      </Text>
    </View>
  );
}

/** A prompt and its answer on a white card. */
function PromptCard({ answer, roomForLike }: { answer: PromptAnswer; roomForLike?: boolean }) {
  const { colors, radii, spacing } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radii.xl,
          padding: spacing.xl,
          paddingBottom: roomForLike ? spacing.xl + 40 : spacing.xl,
          gap: spacing.sm,
        },
      ]}
    >
      <Text variant="smallStrong" color="textMuted">
        {promptById(answer.promptId)?.text}
      </Text>
      <Text variant="titleItalic">{answer.answer}</Text>
    </View>
  );
}

/**
 * Opened from the hero's pet bubbles: the same "Meet [pet]" panel as on the profile (tinted
 * background, heading, pet card, then the pet prompts), just one pet at a time.
 */
function PetSheet({
  pet,
  prompts,
  onClose,
}: {
  pet: Pet | null;
  prompts: PromptAnswer[];
  onClose: () => void;
}) {
  const { colors, radii, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  return (
    <Modal visible={!!pet} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.sheetBackdrop, { backgroundColor: colors.overlay }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <View
          style={{
            maxHeight: windowHeight * 0.88,
            backgroundColor: colors.primarySoft,
            borderTopLeftRadius: radii.xl + 8,
            borderTopRightRadius: radii.xl + 8,
          }}
        >
          <ScrollView
            contentContainerStyle={{
              padding: spacing.md,
              paddingBottom: insets.bottom + spacing.lg,
              gap: spacing.md,
            }}
          >
            {pet ? (
              <>
                <View style={styles.sheetTitleRow}>
                  <View style={{ flex: 1 }}>
                    <PanelHeader title={`Meet ${pet.name}`} />
                  </View>
                  <Pressable
                    onPress={onClose}
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                    style={styles.sheetClose}
                  >
                    <Icon name="x" size={24} color={colors.onPrimarySoft} />
                  </Pressable>
                </View>
                <PetCard pet={pet} likeButton={null} />
                {prompts.map((answer) => (
                  <PromptCard key={answer.id} answer={answer} />
                ))}
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** Round heart button; the label is for screen readers only. */
function LikePill({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors, radii } = useTheme();
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
          shadowColor: colors.shadow,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        },
      ]}
    >
      <Icon name="heart" size={24} color={colors.primary} />
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
            <View key={p.id} style={{ width, height: width }}>
              <PhotoView
                url={p.url}
                label={`Photo ${i + 1} of ${name}`}
                style={{ width, height: width }}
              />
              {p.caption ? (
                <Caption
                  text={p.caption}
                  style={{ left: 12, right: 72, bottom: photos.length > 1 ? 32 : 12 }}
                />
              ) : null}
            </View>
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

function PetCard({ pet, likeButton }: { pet: Pet; likeButton: ReactNode | null }) {
  const { colors, radii, spacing } = useTheme();
  const details = [
    pet.breed ?? SPECIES_LABELS[pet.species],
    pet.ageYears === undefined ? null : `${pet.ageYears} ${pet.ageYears === 1 ? 'yr' : 'yrs'}`,
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
  center: { alignItems: 'center', justifyContent: 'center' },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, opacity: 0.5 },
  heroOverlay: { position: 'absolute', left: 0, right: 0, alignItems: 'flex-start' },
  sheet: { marginTop: -40 },
  moreButton: {
    position: 'absolute',
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end' },
  sheetTitleRow: { flexDirection: 'row', alignItems: 'center' },
  sheetClose: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  caption: { position: 'absolute', paddingHorizontal: 12, paddingVertical: 8 },
  photoCaption: { left: 12, bottom: 12, right: 12 + 48 + 12 },
  heroCaption: { left: 16, bottom: 40 + 12, maxWidth: '50%' },
  bubbles: { position: 'absolute', bottom: 40 + 12, flexDirection: 'row' },
  bubble: {
    width: BUBBLE,
    height: BUBBLE,
    borderRadius: BUBBLE / 2,
    borderWidth: 2.5,
    overflow: 'hidden',
  },
  bubbleImage: { width: '100%', height: '100%' },
  fact: { width: '47%', flexDirection: 'row', alignItems: 'center' },
  card: { borderWidth: StyleSheet.hairlineWidth },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  likePill: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
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
