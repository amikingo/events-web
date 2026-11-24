
import {
  DOMAIN_PROFILES,
  activeDomain,
  isModuleEnabled,
  getDomainLabel,
} from "./brandos-config";
import type { BusinessDomain, DomainProfile } from "../../types";

export { DOMAIN_PROFILES, activeDomain, isModuleEnabled, getDomainLabel };
export type { BusinessDomain, DomainProfile };

export function getDomainProfile(domain: BusinessDomain): DomainProfile {
  return DOMAIN_PROFILES[domain] || DOMAIN_PROFILES.enterprise;
}
