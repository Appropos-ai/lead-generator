// Module-scoped counter; relies on pool: "forks" for per-file isolation.
// The Date.now() suffix in emails already prevents cross-file collisions.
let counter = 0

export function makeLeadInput(overrides?: Record<string, unknown>) {
  counter++
  return {
    name: `Test Lead ${counter}`,
    email: `test-${counter}-${Date.now()}@example.com`,
    ...overrides,
  }
}

export function makeOutreachInput(leadId: number, overrides?: Record<string, unknown>) {
  return {
    lead_id: leadId,
    date: "2025-01-15",
    channel: "email" as const,
    status: "sent" as const,
    ...overrides,
  }
}
