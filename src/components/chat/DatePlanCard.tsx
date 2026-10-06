import { StyleSheet, View } from 'react-native';
import { PLAY_DATE_LABELS } from '@/config/reference';
import { canDelete, canEdit, canRespond, formatPlanWhen, isPast } from '@/domain/datePlans';
import type { DatePlan, ID } from '@/domain/types';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { Icon } from '../ui/Icon';
import { Text } from '../ui/Text';

interface DatePlanCardProps {
  plan: DatePlan;
  viewerId: ID;
  participantIds: readonly ID[];
  otherName: string;
  busy?: boolean;
  onAccept: () => void;
  onSuggest: () => void;
  onDecline: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function statusLine(plan: DatePlan, viewerId: ID, otherName: string, answerable: boolean): string {
  const byMe = plan.respondedById === viewerId;
  switch (plan.status) {
    case 'proposed':
      return answerable ? `${otherName} wants to meet up` : `Waiting for ${otherName} to reply`;
    case 'accepted':
      return byMe ? 'You accepted' : `${otherName} accepted`;
    case 'declined':
      return byMe ? 'You declined' : `${otherName} can't make it`;
    case 'change_suggested':
      return answerable
        ? `${otherName} suggested a new time`
        : `You suggested a new time. Waiting for ${otherName}`;
  }
}

/** A Play Date proposal in the chat, with accept / suggest a change / decline for whoever's up. */
export function DatePlanCard({
  plan,
  viewerId,
  participantIds,
  otherName,
  busy,
  onAccept,
  onSuggest,
  onDecline,
  onEdit,
  onDelete,
}: DatePlanCardProps) {
  const { colors, radii, spacing } = useTheme();
  const mine = plan.proposerId === viewerId;
  const answerable = canRespond(plan, viewerId, participantIds) && !isPast(plan);
  const title =
    plan.kind === 'custom'
      ? (plan.customLabel ?? PLAY_DATE_LABELS.custom)
      : PLAY_DATE_LABELS[plan.kind];
  const settled = plan.status === 'accepted' || plan.status === 'declined';
  const when = formatPlanWhen(plan.startsAt);
  const status = statusLine(plan, viewerId, otherName, answerable);

  return (
    <View style={[styles.row, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}>
      <View
        accessible={!answerable}
        accessibilityLabel={`Play Date, ${title}${plan.location ? `, at ${plan.location}` : ''}, ${when}. ${status}.${plan.note ? ` Note: ${plan.note}` : ''}`}
        style={{
          width: '88%',
          backgroundColor: colors.surface,
          borderColor: plan.status === 'accepted' ? colors.sageStrong : colors.border,
          borderWidth: plan.status === 'accepted' ? 2 : 1,
          borderRadius: radii.xl,
          padding: spacing.lg,
          gap: spacing.md,
          opacity: plan.status === 'declined' ? 0.75 : 1,
        }}
      >
        <View style={[styles.header, { gap: spacing.sm }]}>
          <View style={[styles.pawBadge, { backgroundColor: colors.accent }]}>
            <Icon name="paw" size={18} color={colors.onAccent} />
          </View>
          <Text variant="smallStrong" color="textMuted" style={styles.flex}>
            Play Date · {PLAY_DATE_LABELS[plan.kind]}
          </Text>
          {plan.status === 'accepted' ? <Chip label="Accepted" tone="sage" /> : null}
          {plan.status === 'declined' ? <Chip label="Declined" /> : null}
        </View>

        <View style={{ gap: spacing.xs }}>
          <Text variant="heading">{title}</Text>
          {plan.location ? (
            <Text variant="small" color="textMuted">
              {plan.location}
            </Text>
          ) : null}
          <Text variant="bodyStrong" color={plan.status === 'declined' ? 'textMuted' : 'primary'}>
            {when}
          </Text>
          {plan.note ? (
            <Text variant="small" color="textMuted">
              “{plan.note}”
            </Text>
          ) : null}
        </View>

        <Text variant="small" color="textMuted" accessibilityLiveRegion="polite">
          {status}
        </Text>

        {answerable ? (
          <View style={{ gap: spacing.sm }}>
            <Button
              label={plan.status === 'change_suggested' ? 'Accept new time' : 'Accept'}
              onPress={onAccept}
              loading={busy}
              icon="check"
            />
            <View style={[styles.header, { gap: spacing.sm }]}>
              <Button
                label="Suggest a change"
                variant="secondary"
                onPress={onSuggest}
                disabled={busy}
                style={styles.flex}
              />
              <Button
                label="Decline"
                variant="danger"
                onPress={onDecline}
                disabled={busy}
                style={styles.flex}
              />
            </View>
          </View>
        ) : null}

        {canDelete(plan, viewerId) ? (
          <View style={[styles.header, { gap: spacing.sm }]}>
            {canEdit(plan, viewerId) ? (
              <Button
                label="Edit"
                variant="secondary"
                icon="edit"
                onPress={onEdit}
                disabled={busy}
                style={styles.flex}
              />
            ) : null}
            <Button
              label="Delete"
              variant="danger"
              icon="trash"
              onPress={onDelete}
              disabled={busy}
              style={styles.flex}
            />
          </View>
        ) : null}

        {!answerable && !settled && isPast(plan) ? (
          <Text variant="small" color="textSubtle">
            This time has passed.
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  header: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  pawBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
