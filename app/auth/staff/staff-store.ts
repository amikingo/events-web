"use client";

import { createStorageStore } from "@/lib/marketplace/storage-store";
import type { User } from "@/types";

/** The signed-in staff member, or null. Kept in its own file so the attendee service can clear it without a cycle. */
export const staffSession = createStorageStore<User | null>("app_user_session", null, "local");
