import type { ViewStyle } from 'react-native';

/**
 * Layout for the (inverted) message list.
 *
 * The list is inverted so a long thread opens at the newest message. In an inverted list the
 * "header" sits visually BELOW the newest message, so letting it grow soaks up any spare room
 * under a short thread and top-aligns it, like a conversation that has just started. Once the
 * thread fills the screen there is no spare room and nothing changes: newest at the bottom.
 * With no messages at all, the "You matched!" prompt is centred instead.
 */
export function chatListLayout(itemCount: number, padding: number, gap: number) {
  const empty = itemCount === 0;
  const contentContainerStyle: ViewStyle = {
    padding,
    gap,
    flexGrow: 1,
    ...(empty ? { justifyContent: 'center' } : null),
  };
  const headerStyle: ViewStyle | undefined = empty ? undefined : { flexGrow: 1 };
  return { contentContainerStyle, headerStyle };
}
