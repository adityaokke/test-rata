export const QUEUE_NAMES = {
  MESSAGES: 'messages',
} as const;

export const JOB_NAMES = {
  SEND_MESSAGE: 'send-message',
} as const;

export const DLQ_NAMES = {
  MESSAGES: 'messages-dlq',
} as const;

// BullMQ job options: 3 attempts with exponential backoff,
// then route to DLQ on final failure
export const MESSAGE_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 1000, // 1s, 2s, 4s
  },
  removeOnComplete: { count: 100 },
  removeOnFail: false, // keep failed jobs visible for DLQ processing
} as const;
