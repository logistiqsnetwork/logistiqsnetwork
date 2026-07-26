import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import AuthGuard from "~/components/AuthGuard";
import {
  getCompany,
  updateCompany,
  createContact,
  createOutreach,
  getContacts,
  getOutreach,
  type CompanyRow,
  type ContactRow,
} from "~/lib/server-fns";

const STAGE_LABELS: Record<string, string> = {
  lead: "Lead",
  contacted: "Contacted",
  engaged: "Engaged",
  registered: "Registered",
  active: "Active",
  churned: "Churned",
};

const STAGE_COLORS: Record<string, string> = {
  lead: "bg-gray-100 text-gray-800",
  contacted: "bg-blue-100 text-blue-800",
  engaged: "bg-indigo-100 text-indigo-800",
  registered: "bg-green-100 text-green-800",
  active: "bg-green-200 text-green-900",
  churned: "bg-red-100 text-red-800",
};

const METHOD_LABELS: Record<string, string> = {
  email: "Email",
  phone: "Phone",
  linkedin: "LinkedIn",
  other: "Other",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  sent: "Sent",
  delivered: "Delivered",
  opened: "Opened",
  replied: "Replied",
  bounced: "Bounced",
  no_response: "No Response",
  opted_out: "Opted Out",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  sent: "bg-blue-100 text-blue-800",
  delivered: "bg-blue-100 text-blue-800",
  opened: "bg-indigo-100 text-indigo-800",
  replied: "bg-green-100 text-green-800",
  bounced: "bg-red-100 text-red-800",
  no_response: "bg-gray-100 text-gray-800",
  opted_out: "bg-red-100 text-red-800",
};

const TYPE_LABELS: Record<string, string> = {
  shipper: "Shipper",
  carrier: "Carrier",
  broker: "Broker",
  prospect: "Prospect",
  other: "Other",
};

const INDUSTRY_LABELS: Record<string, string> = {
  mining: "Mining",
  manufacturing: "Manufacturing",
  agriculture: "Agriculture",
  retail_distribution: "Retail Distribution",
};

export const Route = createFileRoute("/companies/$id")({
  component: CompanyDetail,
});

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function CompanyDetail() {
  const { id } = Route.useParams();
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [outreach, setOutreach] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Contact form
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({
    first_name: "",
    last_name: "",
    title: "",
    email: "",
    phone: "",
    is_primary: false,
  });

  // Outreach form
  const [showOutreachForm, setShowOutreachForm] = useState(false);
  const [outreachForm, setOutreachForm] = useState({
    method: "email",
    subject: "",
    notes: "",
    follow_up_date: "",
    contact_id: "",
  });

  async function loadData() {
    setLoading(true);
    try {
      const data = await getCompany({ id });
      if (data) {
        setCompany(data.company);
        setContacts(data.contacts);
        setOutreach(data.outreach || []);
      }
    } catch (err) {
      console.error("Failed to load company:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [id]);

  async function handleStageChange(newStage: string) {
    if (!company) return;
    setSaving(true);
    try {
      await updateCompany({ id: company.id, onboarding_stage: newStage });
      setCompany({ ...company, onboarding_stage: newStage });
    } catch (err) {
      console.error("Failed to update stage:", err);
    }
    setSaving(false);
  }

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault();
    if (!contactForm.first_name.trim() || !contactForm.last_name.trim()) return;
    setSaving(true);
    try {
      await createContact({
        company_id: id,
        ...contactForm,
      });
      setShowContactForm(false);
      setContactForm({
        first_name: "",
        last_name: "",
        title: "",
        email: "",
        phone: "",
        is_primary: false,
      });
      await loadData();
    } catch (err) {
      console.error("Failed to add contact:", err);
    }
    setSaving(false);
  }

  async function handleAddOutreach(e: React.FormEvent) {
    e.preventDefault();
    if (!outreachForm.method) return;
    setSaving(true);
    try {
      await createOutreach({
        company_id: id,
        method: outreachForm.method,
        subject: outreachForm.subject || undefined,
        notes: outreachForm.notes || undefined,
        follow_up_date: outreachForm.follow_up_date || undefined,
        contact_id: outreachForm.contact_id || undefined,
      });
      setShowOutreachForm(false);
      setOutreachForm({
        method: "email",
        subject: "",
        notes: "",
        follow_up_date: "",
        contact_id: "",
      });
      await loadData();
    } catch (err) {
      console.error("Failed to log outreach:", err);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      </AuthGuard>
    );
  }

  if (!company) {
    return (
      <AuthGuard>
        <main className="mx-auto max-w-4xl px-6 py-12">
          <h1 className="text-2xl font-bold text-gray-900">Company Not Found</h1>
          <Link to="/companies" className="mt-4 inline-block text-indigo-600 hover:text-indigo-800">
            ← Back to Companies
          </Link>
        </main>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              to="/companies"
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              ← Companies
            </Link>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">
              {company.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  STAGE_COLORS[company.onboarding_stage] || "bg-gray-100 text-gray-800"
                }`}
              >
                {STAGE_LABELS[company.onboarding_stage] || company.onboarding_stage}
              </span>
              <span className="text-sm text-gray-500">
                {TYPE_LABELS[company.company_type] || company.company_type}
              </span>
              {company.industry && (
                <span className="text-sm text-gray-500">
                  · {INDUSTRY_LABELS[company.industry] || company.industry}
                </span>
              )}
            </div>
          </div>
          <select
            value={company.onboarding_stage}
            onChange={(e) => handleStageChange(e.target.value)}
            disabled={saving}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {Object.entries(STAGE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Company Info */}
          <div className="rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Company Info
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Type</dt>
                <dd className="font-medium text-gray-900">
                  {TYPE_LABELS[company.company_type] || company.company_type}
                </dd>
              </div>
              {company.industry && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Industry</dt>
                  <dd className="font-medium text-gray-900">
                    {INDUSTRY_LABELS[company.industry] || company.industry}
                  </dd>
                </div>
              )}
              {company.website && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Website</dt>
                  <dd className="font-medium text-gray-900">
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      {company.website.replace(/^https?:\/\//, "")}
                    </a>
                  </dd>
                </div>
              )}
              {company.phone && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Phone</dt>
                  <dd className="font-medium text-gray-900">{company.phone}</dd>
                </div>
              )}
              {company.source && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Source</dt>
                  <dd className="font-medium text-gray-900 capitalize">
                    {company.source.replace(/_/g, " ")}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-500">Added</dt>
                <dd className="font-medium text-gray-900">
                  {formatDate(company.created_at)}
                </dd>
              </div>
            </dl>
            {(company.address_line1 ||
              company.address_city ||
              company.address_state) && (
              <div className="mt-4 border-t pt-4">
                <h3 className="text-sm font-medium text-gray-700">Address</h3>
                <p className="mt-1 text-sm text-gray-600">
                  {[
                    company.address_line1,
                    company.address_city,
                    company.address_state,
                    company.address_zip,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
            )}
            {company.notes && (
              <div className="mt-4 border-t pt-4">
                <h3 className="text-sm font-medium text-gray-700">Notes</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">
                  {company.notes}
                </p>
              </div>
            )}
          </div>

          {/* Contacts */}
          <div className="rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Contacts</h2>
              <button
                onClick={() => setShowContactForm(!showContactForm)}
                className="text-sm text-indigo-600 hover:text-indigo-800"
              >
                {showContactForm ? "Cancel" : "+ Add Contact"}
              </button>
            </div>

            {showContactForm && (
              <form
                onSubmit={handleAddContact}
                className="mt-4 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={contactForm.first_name}
                      onChange={(e) =>
                        setContactForm({
                          ...contactForm,
                          first_name: e.target.value,
                        })
                      }
                      className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={contactForm.last_name}
                      onChange={(e) =>
                        setContactForm({
                          ...contactForm,
                          last_name: e.target.value,
                        })
                      }
                      className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">
                    Title
                  </label>
                  <input
                    type="text"
                    value={contactForm.title}
                    onChange={(e) =>
                      setContactForm({ ...contactForm, title: e.target.value })
                    }
                    className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Logistics Manager"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600">
                      Email
                    </label>
                    <input
                      type="email"
                      value={contactForm.email}
                      onChange={(e) =>
                        setContactForm({ ...contactForm, email: e.target.value })
                      }
                      className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">
                      Phone
                    </label>
                    <input
                      type="text"
                      value={contactForm.phone}
                      onChange={(e) =>
                        setContactForm({ ...contactForm, phone: e.target.value })
                      }
                      className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_primary"
                    checked={contactForm.is_primary}
                    onChange={(e) =>
                      setContactForm({
                        ...contactForm,
                        is_primary: e.target.checked,
                      })
                    }
                    className="rounded border-gray-300"
                  />
                  <label
                    htmlFor="is_primary"
                    className="text-xs text-gray-600"
                  >
                    Primary contact
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? "Adding..." : "Add Contact"}
                </button>
              </form>
            )}

            <div className="mt-4 space-y-3">
              {contacts.length === 0 ? (
                <p className="text-sm text-gray-500">No contacts added yet.</p>
              ) : (
                contacts.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-lg border border-gray-100 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {c.first_name} {c.last_name}
                        {c.is_primary ? (
                          <span className="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 text-xs font-medium text-indigo-700">
                            Primary
                          </span>
                        ) : null}
                      </p>
                    </div>
                    {c.title && (
                      <p className="text-xs text-gray-500">{c.title}</p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-gray-500">
                      {c.email && (
                        <a
                          href={`mailto:${c.email}`}
                          className="text-indigo-600 hover:text-indigo-800"
                        >
                          {c.email}
                        </a>
                      )}
                      {c.phone && <span>{c.phone}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Outreach Timeline */}
          <div className="rounded-lg border border-gray-200 p-6 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Outreach Timeline
              </h2>
              <button
                onClick={() => setShowOutreachForm(!showOutreachForm)}
                className="text-sm text-indigo-600 hover:text-indigo-800"
              >
                {showOutreachForm ? "Cancel" : "+ Log Outreach"}
              </button>
            </div>

            {showOutreachForm && (
              <form
                onSubmit={handleAddOutreach}
                className="mt-4 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600">
                      Method *
                    </label>
                    <select
                      value={outreachForm.method}
                      onChange={(e) =>
                        setOutreachForm({
                          ...outreachForm,
                          method: e.target.value,
                        })
                      }
                      className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">
                      Contact
                    </label>
                    <select
                      value={outreachForm.contact_id}
                      onChange={(e) =>
                        setOutreachForm({
                          ...outreachForm,
                          contact_id: e.target.value,
                        })
                      }
                      className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">— None —</option>
                      {contacts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.first_name} {c.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={outreachForm.subject}
                    onChange={(e) =>
                      setOutreachForm({
                        ...outreachForm,
                        subject: e.target.value,
                      })
                    }
                    className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Introductory email..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">
                    Notes
                  </label>
                  <textarea
                    value={outreachForm.notes}
                    onChange={(e) =>
                      setOutreachForm({
                        ...outreachForm,
                        notes: e.target.value,
                      })
                    }
                    rows={2}
                    className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="What was discussed..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">
                    Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={outreachForm.follow_up_date}
                    onChange={(e) =>
                      setOutreachForm({
                        ...outreachForm,
                        follow_up_date: e.target.value,
                      })
                    }
                    className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? "Logging..." : "Log Outreach"}
                </button>
              </form>
            )}

            <div className="mt-4 space-y-4">
              {outreach.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No outreach records yet.
                </p>
              ) : (
                outreach.map((o) => (
                  <div
                    key={o.id}
                    className="relative border-l-2 border-gray-200 pl-4 pb-4 last:pb-0"
                  >
                    <div className="absolute -left-1.5 top-0.5 h-3 w-3 rounded-full bg-indigo-600" />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {METHOD_LABELS[o.method] || o.method}
                      </span>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          STATUS_COLORS[o.status] || "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {STATUS_LABELS[o.status] || o.status}
                      </span>
                    </div>
                    {o.contact_name && (
                      <p className="text-xs text-gray-500">
                        Contact: {o.contact_name}
                      </p>
                    )}
                    {o.subject && (
                      <p className="mt-1 text-sm text-gray-700">
                        {o.subject}
                      </p>
                    )}
                    {o.notes && (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-gray-500">
                        {o.notes}
                      </p>
                    )}
                    <div className="mt-1 flex gap-4 text-xs text-gray-400">
                      <span>{formatDateTime(o.created_at)}</span>
                      {o.follow_up_date && (
                        <span className="text-indigo-600">
                          Follow-up: {formatDate(o.follow_up_date)}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
