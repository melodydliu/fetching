import { chatListLayout } from '../chat/listLayout';

describe('chatListLayout', () => {
  it('top-aligns a thread with messages: the area under the newest message grows to take spare room', () => {
    const { contentContainerStyle, headerStyle } = chatListLayout(3, 16, 8);
    expect(contentContainerStyle).toMatchObject({ padding: 16, gap: 8, flexGrow: 1 });
    expect(contentContainerStyle.justifyContent).toBeUndefined();
    expect(headerStyle).toEqual({ flexGrow: 1 });
  });

  it('works the same for one message as for a hundred (a full thread simply has no spare room)', () => {
    expect(chatListLayout(1, 16, 8)).toEqual(chatListLayout(100, 16, 8));
  });

  it('centres the "You matched!" prompt when there are no messages, with nothing growing', () => {
    const { contentContainerStyle, headerStyle } = chatListLayout(0, 16, 8);
    expect(contentContainerStyle).toMatchObject({ flexGrow: 1, justifyContent: 'center' });
    expect(headerStyle).toBeUndefined();
  });
});
