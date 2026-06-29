import type { ContentType } from "./actions"

/** Who the content is for: customer screens (kunde) vs staff/back-room (intern). */
export type Audience = "kunde" | "intern"

/** Default audience for a type when not explicitly set (offers → customer). */
export function audienceForType(type: ContentType): Audience {
  return type === "slide" ? "kunde" : "intern"
}
