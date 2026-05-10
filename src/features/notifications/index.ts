// Type registry for the notifications feature. Cross-feature TYPE imports
// come through this barrel. Runtime values (collections, hooks, Zod
// schemas) are imported directly from their files.
export type { NotificationType, NotificationTypeEnum } from './schemas'
