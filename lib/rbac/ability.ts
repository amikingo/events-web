import { AbilityBuilder, createMongoAbility } from "@casl/ability";
import type { MongoAbility } from "@casl/ability";
import type { EffectiveAccess } from "@/lib/rbac/effective-access";

/**
 * CASL actions. The backend says `view`; CASL convention says `read`, so `view` is mapped to `read` here and only
 * here. Every other action keeps the backend's word.
 */
export type AbilityAction = "read" | "create" | "update" | "delete" | "import" | "export" | "notify";
/** Subjects are module codes (`EVENTS`), exactly as the backend sends them. */
export type AppAbility = MongoAbility<[AbilityAction, string]>;

const TO_ABILITY: Record<string, AbilityAction> = {
  view: "read",
  create: "create",
  update: "update",
  delete: "delete",
  import: "import",
  export: "export",
  notify: "notify",
};

/** One rule per granted action per module. Nothing is granted that `/me` didn't grant. */
export function buildAbility(access: EffectiveAccess | null | undefined): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);
  for (const grant of access?.modules ?? []) {
    for (const [action, granted] of Object.entries(grant.actions)) {
      const mapped = TO_ABILITY[action];
      if (granted && mapped) can(mapped, grant.code);
    }
  }
  return build();
}
