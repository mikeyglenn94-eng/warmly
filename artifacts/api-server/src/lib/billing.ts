// "paid" if the subscription is active, OR if it's past_due but still
// inside the grace period Stripe gives before truly canceling. The
// planActiveUntil column tracks current_period_end from Stripe webhooks.
export function isPaid(user: {
  subscriptionStatus: string | null;
  planActiveUntil: Date | null;
}): boolean {
  if (user.subscriptionStatus === "active") return true;
  if (
    user.subscriptionStatus === "past_due" &&
    user.planActiveUntil &&
    user.planActiveUntil.getTime() > Date.now()
  ) {
    return true;
  }
  return false;
}
