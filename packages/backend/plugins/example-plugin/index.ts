import type { ScrapedLead } from "@lead-generator/shared"

export const manifest = {
  name: "example-plugin",
  description: "Example plugin that generates sample leads for testing",
  version: "1.0.0",
}

export async function scrape(): Promise<ScrapedLead[]> {
  return [
    {
      name: "Alice Johnson",
      email: "alice@example.com",
      company: "Acme Corp",
      title: "VP of Marketing",
      linkedin_url: "https://linkedin.com/in/alicejohnson",
      notes: "Met at SaaS conference",
    },
    {
      name: "Bob Smith",
      email: "bob@example.com",
      company: "TechStart Inc",
      title: "Founder & CEO",
      linkedin_url: "https://linkedin.com/in/bobsmith",
      notes: "Active on Twitter, posts about growth",
    },
    {
      name: "Carol Williams",
      email: "carol@example.com",
      company: "GrowthLab",
      title: "Head of Partnerships",
      notes: "Interested in automation tools",
    },
  ]
}
