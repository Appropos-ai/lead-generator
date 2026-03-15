// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import LeadDetailPage from "./LeadDetailPage.js"

// Mock hooks
const mockUseLead = vi.fn()
const mockUseUpdateLead = vi.fn()
const mockUseDeleteLead = vi.fn()
const mockUseOutreach = vi.fn()
const mockUseCreateOutreach = vi.fn()
const mockUseDeleteOutreach = vi.fn()

vi.mock("../hooks/useLeads.js", () => ({
  useLead: (...args: unknown[]) => mockUseLead(...args),
  useUpdateLead: (...args: unknown[]) => mockUseUpdateLead(...args),
  useDeleteLead: (...args: unknown[]) => mockUseDeleteLead(...args),
}))

vi.mock("../hooks/useOutreach.js", () => ({
  useOutreach: (...args: unknown[]) => mockUseOutreach(...args),
  useCreateOutreach: (...args: unknown[]) => mockUseCreateOutreach(...args),
  useDeleteOutreach: (...args: unknown[]) => mockUseDeleteOutreach(...args),
}))

function renderWithRouter(leadId: number) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/leads/${leadId}`]}>
        <Routes>
          <Route path="/leads/:id" element={<LeadDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const baseLead = {
  id: 1,
  name: "Alice Test",
  email: "alice@test.com",
  company: "Test Corp",
  title: "Engineer",
  linkedin_url: "https://linkedin.com/in/alice",
  source: "manual",
  notes: null,
  stage: "new" as const,
  created_at: "2024-01-01T00:00:00Z",
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseUpdateLead.mockReturnValue({ mutate: vi.fn(), isPending: false })
  mockUseDeleteLead.mockReturnValue({ mutate: vi.fn() })
  mockUseCreateOutreach.mockReturnValue({ mutate: vi.fn(), isPending: false })
  mockUseDeleteOutreach.mockReturnValue({ mutate: vi.fn() })
})

describe("LeadDetailPage", () => {
  it("renders loading state", () => {
    mockUseLead.mockReturnValue({ data: undefined, isLoading: true })
    mockUseOutreach.mockReturnValue({ data: [] })
    renderWithRouter(1)
    expect(screen.getByText("Loading...")).toBeTruthy()
  })

  it("renders lead details", () => {
    mockUseLead.mockReturnValue({ data: baseLead, isLoading: false })
    mockUseOutreach.mockReturnValue({ data: [] })
    renderWithRouter(1)
    expect(screen.getAllByText("Alice Test").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("alice@test.com").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("Test Corp").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("Engineer").length).toBeGreaterThanOrEqual(1)
  })

  it("renders safe LinkedIn URL as a link", () => {
    mockUseLead.mockReturnValue({ data: baseLead, isLoading: false })
    mockUseOutreach.mockReturnValue({ data: [] })
    renderWithRouter(1)
    const links = screen.getAllByRole("link", { name: "https://linkedin.com/in/alice" })
    expect(links.length).toBeGreaterThanOrEqual(1)
    expect(links[0].getAttribute("href")).toBe("https://linkedin.com/in/alice")
    expect(links[0].getAttribute("target")).toBe("_blank")
  })

  it("renders unsafe LinkedIn URL as plain text", () => {
    const unsafeLead = { ...baseLead, linkedin_url: "javascript:alert(1)" }
    mockUseLead.mockReturnValue({ data: unsafeLead, isLoading: false })
    mockUseOutreach.mockReturnValue({ data: [] })
    renderWithRouter(1)
    expect(screen.getAllByText("javascript:alert(1)").length).toBeGreaterThanOrEqual(1)
    expect(screen.queryAllByRole("link", { name: "javascript:alert(1)" })).toHaveLength(0)
  })

  it("renders outreach log section", () => {
    mockUseLead.mockReturnValue({ data: baseLead, isLoading: false })
    mockUseOutreach.mockReturnValue({ data: [] })
    renderWithRouter(1)
    expect(screen.getAllByText("Outreach Log").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("No outreach logged yet").length).toBeGreaterThanOrEqual(1)
  })

  it("renders lead not found when data is missing", () => {
    mockUseLead.mockReturnValue({ data: undefined, isLoading: false })
    mockUseOutreach.mockReturnValue({ data: [] })
    renderWithRouter(1)
    expect(screen.getByText("Lead not found")).toBeTruthy()
  })
})
