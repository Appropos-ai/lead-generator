import { useState, useEffect, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, Trash2, Plus, Send } from "lucide-react"
import { useLead, useUpdateLead, useDeleteLead } from "../hooks/useLeads.js"
import { useOutreach, useCreateOutreach, useDeleteOutreach } from "../hooks/useOutreach.js"
import type { PipelineStage, CreateOutreachInput } from "../api/client.js"
import type { OutreachChannel, OutreachStatus } from "@lead-generator/shared"
import { isSafeUrl } from "../utils/url.js"

const STAGES: readonly PipelineStage[] = ["new", "contacted", "responded", "converted", "lost"]

interface LeadForm {
  name: string
  email: string
  company: string
  title: string
  linkedin_url: string
  notes: string
  stage: PipelineStage
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const leadId = Number(id)

  const { data: lead, isLoading } = useLead(leadId)
  const { data: outreach = [] } = useOutreach(leadId)
  const updateLead = useUpdateLead()
  const deleteLead = useDeleteLead()
  const createOutreach = useCreateOutreach()
  const deleteOutreach = useDeleteOutreach(leadId)

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<LeadForm>({
    name: "",
    email: "",
    company: "",
    title: "",
    linkedin_url: "",
    notes: "",
    stage: "new",
  })
  const [showOutreachForm, setShowOutreachForm] = useState(false)
  const handleCloseOutreach = useCallback(() => setShowOutreachForm(false), [])

  if (!id || isNaN(leadId)) return <div className="text-center py-12 text-gray-400">Invalid lead ID</div>
  if (isLoading) return <div className="text-center py-12 text-gray-400">Loading...</div>
  if (!lead) return <div className="text-center py-12 text-gray-400">Lead not found</div>

  const startEdit = () => {
    setForm({
      name: lead.name,
      email: lead.email,
      company: lead.company ?? "",
      title: lead.title ?? "",
      linkedin_url: lead.linkedin_url ?? "",
      notes: lead.notes ?? "",
      stage: lead.stage,
    })
    setEditing(true)
  }

  const saveEdit = () => {
    updateLead.mutate(
      {
        id: leadId,
        data: {
          name: form.name,
          email: form.email,
          company: form.company || null,
          title: form.title || null,
          linkedin_url: form.linkedin_url || null,
          notes: form.notes || null,
          stage: form.stage,
        },
      },
      { onSuccess: () => setEditing(false) },
    )
  }

  const handleDelete = () => {
    if (!confirm("Delete this lead?")) return
    deleteLead.mutate(leadId, { onSuccess: () => void navigate("/") })
  }

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => void navigate("/")}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft size={16} /> Back to leads
      </button>

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-xl font-bold">{lead.name}</h2>
          <div className="flex gap-2">
            {!editing && (
              <button
                onClick={startEdit}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Edit
              </button>
            )}
            <button
              onClick={handleDelete}
              className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {editing ? (
          <div className="flex flex-col gap-3">
            <label className="text-xs font-medium text-gray-500">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <label className="text-xs font-medium text-gray-500">Email</label>
            <input
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <label className="text-xs font-medium text-gray-500">Company</label>
            <input
              value={form.company}
              onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <label className="text-xs font-medium text-gray-500">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <label className="text-xs font-medium text-gray-500">LinkedIn</label>
            <input
              value={form.linkedin_url}
              onChange={(e) => setForm((f) => ({ ...f, linkedin_url: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <label className="text-xs font-medium text-gray-500">Stage</label>
            <select
              value={form.stage}
              onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value as PipelineStage }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm capitalize"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <label className="text-xs font-medium text-gray-500">Notes</label>
            <textarea
              value={form.notes}
              rows={3}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={saveEdit}
                disabled={updateLead.isPending}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-gray-500">Email</dt>
              <dd className="font-medium">{lead.email}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Company</dt>
              <dd>{lead.company ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Title</dt>
              <dd>{lead.title ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Stage</dt>
              <dd className="capitalize">{lead.stage}</dd>
            </div>
            <div>
              <dt className="text-gray-500">LinkedIn</dt>
              <dd>
                {lead.linkedin_url ? (
                  isSafeUrl(lead.linkedin_url) ? (
                    <a
                      href={lead.linkedin_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {lead.linkedin_url}
                    </a>
                  ) : (
                    <span>{lead.linkedin_url}</span>
                  )
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Source</dt>
              <dd>{lead.source ?? "—"}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-gray-500">Notes</dt>
              <dd className="whitespace-pre-wrap">{lead.notes ?? "—"}</dd>
            </div>
          </dl>
        )}
      </div>

      {/* Outreach Log */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Outreach Log</h3>
          <button
            onClick={() => setShowOutreachForm(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            <Plus size={14} /> Log Outreach
          </button>
        </div>

        {outreach.length === 0 ? (
          <p className="text-sm text-gray-400">No outreach logged yet</p>
        ) : (
          <div className="space-y-3">
            {outreach.map((entry) => (
              <div key={entry.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Send size={14} className="text-gray-400" />
                    <span className="text-sm font-medium capitalize">{entry.channel}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        entry.status === "replied"
                          ? "bg-green-100 text-green-700"
                          : entry.status === "bounced"
                            ? "bg-red-100 text-red-700"
                            : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {entry.status}
                    </span>
                    <span className="text-xs text-gray-400">{entry.date}</span>
                  </div>
                  {entry.notes && <p className="text-sm text-gray-600 ml-6">{entry.notes}</p>}
                </div>
                <button
                  onClick={() => {
                    if (confirm("Delete this outreach entry?")) deleteOutreach.mutate(entry.id)
                  }}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {showOutreachForm && (
          <OutreachForm
            leadId={leadId}
            isPending={createOutreach.isPending}
            onClose={handleCloseOutreach}
            onSubmit={(data) => {
              createOutreach.mutate(data, { onSuccess: () => setShowOutreachForm(false) })
            }}
          />
        )}
      </div>
    </div>
  )
}

type OutreachFormProps = {
  leadId: number
  isPending: boolean
  onClose: () => void
  onSubmit: (data: CreateOutreachInput) => void
}

interface OutreachFormState {
  date: string
  channel: OutreachChannel
  status: OutreachStatus
  notes: string
}

function OutreachForm({ leadId, isPending, onClose, onSubmit }: OutreachFormProps) {
  const [form, setForm] = useState<OutreachFormState>({
    date: new Date().toISOString().split("T")[0],
    channel: "email",
    status: "sent",
    notes: "",
  })

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [onClose])

  return (
    <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-white">
      <h4 className="text-sm font-bold mb-3">Log Outreach</h4>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <label className="text-xs text-gray-500">Date</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Channel</label>
          <select
            value={form.channel}
            onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value as OutreachChannel }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="email">Email</option>
            <option value="linkedin">LinkedIn</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as OutreachStatus }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="sent">Sent</option>
            <option value="replied">Replied</option>
            <option value="bounced">Bounced</option>
          </select>
        </div>
      </div>
      <textarea
        placeholder="Notes"
        value={form.notes}
        rows={2}
        onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3"
      />
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
          Cancel
        </button>
        <button
          onClick={() => onSubmit({ lead_id: leadId, ...form, notes: form.notes || undefined })}
          disabled={isPending}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save
        </button>
      </div>
    </div>
  )
}
