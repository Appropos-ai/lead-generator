import type { CreateLeadInput, CreateOutreachInput } from "@lead-generator/shared"

export const validLead: CreateLeadInput = {
  name: "Alice Test",
  email: "alice@test.com",
  company: "Test Corp",
  title: "Engineer",
  source: "manual",
  stage: "new",
}

export const validLead2: CreateLeadInput = {
  name: "Bob Test",
  email: "bob@test.com",
  company: "Other Corp",
  title: "Manager",
  source: "manual",
  stage: "contacted",
}

export const validLead3: CreateLeadInput = {
  name: "Charlie Test",
  email: "charlie@test.com",
}

export function validOutreach(leadId: number): CreateOutreachInput {
  return {
    lead_id: leadId,
    date: "2024-01-15",
    channel: "email",
    status: "sent",
    notes: "Test outreach",
  }
}
