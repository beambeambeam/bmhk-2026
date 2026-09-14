export interface VerifyChannelMessage {
  authorIsBot: boolean;
  channelId: string;
  memberHasAdminRole: boolean;
  verifyChannelId: string | null;
}

export function shouldDeleteVerifyChannelMessage(message: VerifyChannelMessage): boolean {
  if (message.verifyChannelId === null || message.channelId !== message.verifyChannelId) {
    return false;
  }

  return !message.authorIsBot && !message.memberHasAdminRole;
}
