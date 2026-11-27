import type { Metadata } from "next";
import { AccountView } from "../../../components/marketplace/account-view";
import { Container } from "../../../components/marketplace/section";

export const metadata: Metadata = { title: "Account", robots: { index: false } };

export default function AccountPage() {
  return (
    <Container className="max-w-6xl py-8 sm:py-10">
      <h1 className="m-0 mb-6 type-h1 text-text">Account</h1>
      <AccountView />
    </Container>
  );
}
