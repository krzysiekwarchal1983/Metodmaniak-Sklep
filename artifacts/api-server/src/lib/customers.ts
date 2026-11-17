import { clerkClient } from "@clerk/express";

type Account = Awaited<ReturnType<typeof clerkClient.users.getUser>>;
export class CustomerLookupError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function requireCustomer(id: string): Promise<Account> {
  try { return await clerkClient.users.getUser(id); }
  catch (error) {
    if (error && typeof error === "object" && "status" in error && error.status === 404) throw new CustomerLookupError(404, "Nie znaleziono konta klienta.");
    throw new CustomerLookupError(503, "Baza kont jest chwilowo niedostępna. Spróbuj ponownie.");
  }
}
export function customerProfile(user: Account, totals?: { orderCount: number; totalOrderValue: number }) {
  const email = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId) ?? user.emailAddresses[0];
  const phone = user.phoneNumbers.find((p) => p.id === user.primaryPhoneNumberId) ?? user.phoneNumbers[0];
  // Explicit whitelist: never send credentials, arbitrary metadata or external identity tokens.
  return {
    id: user.id, firstName: user.firstName ?? "", lastName: user.lastName ?? "", username: user.username ?? "",
    email: email?.emailAddress ?? "", phone: phone?.phoneNumber ?? "",
    emailVerified: email?.verification?.status === "verified",
    registeredAt: new Date(user.createdAt).toISOString(),
    lastSignInAt: user.lastSignInAt ? new Date(user.lastSignInAt).toISOString() : null,
    orderCount: totals?.orderCount ?? 0, totalOrderValue: totals?.totalOrderValue ?? 0,
  };
}
