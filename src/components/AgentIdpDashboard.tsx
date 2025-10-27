import React, { useMemo, useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from "recharts";
import { useSupabaseData } from "../hooks/useSupabaseData";
import { fetchUsageStats, fetchTrafficStats } from "../lib/supabase-queries";

// --- Quick notes ---
// One-file, drop-in React dashboard for your hackathon demo.
// Uses TailwindCSS utility classes for styling (no external UI kit required).
// All data is mocked. Wire to your backend by swapping the useMemo(...) blocks.
// Components: KPI cards, filters, live token request stream, attempts, usage overview, and a JSON detail drawer.
// Security narrative hooks are called out in copy so you can pitch while you click.

// ---- Helpers / Tests ----
const now = new Date();
const safeJoin = (x: unknown, sep = " ") => (Array.isArray(x) ? (x as any[]).join(sep) : "");

function minutesAgo(min: number) {
  const d = new Date(now.getTime() - min * 60000);
  return d.toISOString();
}

// Utility to detect non-ASCII characters (helps avoid SyntaxError in some bundlers)
const hasNonAscii = (s: string) => /[^\x00-\x7F]/.test(s);

// Minimal runtime sanity tests (dev only). These are console.assert-based and do not affect production.
function runTests() {
  // safeJoin tests
  const a: any = { resources: undefined };
  console.assert(safeJoin(a.resources) === "", "safeJoin should return empty string for undefined");
  console.assert(safeJoin(["a", "b"]) === "a b", "safeJoin should join arrays with spaces");

  // ASCII safety tests (spot-check a few strings from our mocks below after they are defined)
  const stringsToCheck: string[] = [
    "meets least-privilege; row/column constraints applied",
    "write allowed to idempotent endpoint with per-token rate-limit",
    "column-level masking + geo restriction",
    "30-second, purpose-scoped tokens * Just-in-time access * Full audit trail",
  ];
  stringsToCheck.forEach((s) => console.assert(!hasNonAscii(s), `Non-ASCII detected in: ${s}`));

  // PolicyText escaping check
  const rf = "region = 'US-CA' AND level IN ('SWE-2')";
  const policy = `rowFilterAllowed(agent, resource, "${rf}")`;
  console.assert(policy.includes("US-CA") && policy.includes("SWE-2"), "Policy text should embed filters safely");
}
try {
  runTests();
} catch {}

// ---- Mock Data ----
const MOCK_AGENTS = [
  { id: "a-1", name: "OrderSummarizer" },
  { id: "a-2", name: "BillingReconciler" },
  { id: "a-3", name: "SupportAutoResponder" },
  { id: "a-4", name: "HR-OfferGenerator" },
];

const MOCK_TOKEN_REQUESTS = [
  {
    id: "r-1101",
    ts: minutesAgo(1),
    agent: "OrderSummarizer",
    ttlSec: 30,
    decision: "GRANTED",
    reason: "meets least-privilege; row/column constraints applied",
    ip: "35.166.17.10",
    token: {
      action: "READ",
      resource_type: "table",
      resource_id: "db.orders",
      justification: "Summarize last order for vendor 42 to reply to user",
      columns: ["order_id", "created_at", "vendor_id", "total", "currency"],
      row_filter: "vendor_id = 42 AND order_id = 981233",
      output_limit: { max_rows: 1, max_bytes: 32768 },
      mask_rules: [{ column: "total", rule: "round(2)" }],
      retentionSec: 0,
      egress_budget: { bytes: 16384 },
      replay_protection: { nonce: "8fd1e8", one_time: true },
      audit_tags: ["summary-reply"],
      attestations: { model_hash: "sha256:abc123", prompt_hash: "sha256:def456" },
      network: { cidr_allow: ["35.0.0.0/8"] },
    },
  },
  {
    id: "r-1100",
    ts: minutesAgo(4),
    agent: "SupportAutoResponder",
    ttlSec: 30,
    decision: "DENIED",
    reason: "attachment scope too broad (requested wildcard)",
    ip: "34.101.2.9",
    token: {
      action: "READ",
      resource_type: "object-store",
      resource_id: "gdrive:/support/attachments/*",
      justification: "Scan all attachments for ticket 5531",
      columns: [],
      row_filter: "*",
      output_limit: { max_rows: 0, max_bytes: 0 },
      mask_rules: [],
      retentionSec: 0,
      egress_budget: { bytes: 0 },
      replay_protection: { nonce: "b771c2", one_time: true },
      audit_tags: ["overscope"],
      attestations: { model_hash: "sha256:beef" },
      network: { cidr_allow: ["34.0.0.0/8"] },
    },
  },
  {
    id: "r-1099",
    ts: minutesAgo(12),
    agent: "BillingReconciler",
    ttlSec: 30,
    decision: "GRANTED",
    reason: "write allowed to idempotent endpoint with per-token rate-limit",
    ip: "18.211.95.1",
    token: {
      action: "POST",
      resource_type: "api",
      resource_id: "api://erp/journals:create",
      justification: "Create one reversing journal entry for txn 771",
      idempotency_key: "rev-771-2024-10-26T09:14:00Z",
      rate_limit: { rpm: 2, burst: 1 },
      payload_constraints: {
        schema: {
          type: "object",
          required: ["txn_id", "amount", "currency"],
          properties: {
            txn_id: { type: "string", const: "771" },
            amount: { type: "number", maximum: 500.0 },
            currency: { type: "string", const: "USD" },
          },
        },
      },
      retentionSec: 0,
      egress_budget: { bytes: 4096 },
      replay_protection: { nonce: "7c19aa", one_time: true },
      audit_tags: ["journal-reverse"],
      attestations: { model_hash: "sha256:cafe" },
      network: { cidr_allow: ["18.0.0.0/8"] },
    },
  },
  {
    id: "r-1098",
    ts: minutesAgo(20),
    agent: "HR-OfferGenerator",
    ttlSec: 30,
    decision: "GRANTED",
    reason: "column-level masking + geo restriction",
    ip: "104.28.8.2",
    token: {
      action: "READ",
      resource_type: "sheet",
      resource_id: "sheet://hr/comp_bands",
      justification: "Generate offer for role SWE-2 in CA region",
      columns: ["role", "level", "min", "max", "currency"],
      row_filter: "region = 'US-CA' AND level IN ('SWE-2')",
      mask_rules: [{ column: "max", rule: "percentile_mask(80)" }],
      retentionSec: 0,
      egress_budget: { bytes: 8192 },
      replay_protection: { nonce: "1f22ab", one_time: true },
      audit_tags: ["offer-gen"],
      network: { geo_allow: ["US-CA"] },
    },
  },
];

const MOCK_SIGNIN_ATTEMPTS = [
  { id: "s-001", ts: minutesAgo(1), subject: "SupportAutoResponder", method: "mTLS", status: "FAILED", reason: "cert revoked" },
  { id: "s-002", ts: minutesAgo(7), subject: "OrderSummarizer", method: "OIDC client-cred", status: "SUCCESS", reason: "" },
  { id: "s-003", ts: minutesAgo(31), subject: "ExternalAgent-X", method: "OIDC", status: "BLOCKED", reason: "unregistered client_id" },
];

const MOCK_USAGE = [
  { resource: "db.orders", calls: 42 },
  { resource: "api://erp/journals", calls: 13 },
  { resource: "gdrive:/support/attachments", calls: 5 },
  { resource: "sheet://hr/comp_bands", calls: 9 },
];

const MOCK_TRAFFIC = Array.from({ length: 12 }).map((_, i) => ({
  t: `${i * 5}m`,
  granted: Math.max(0, 6 - Math.abs(6 - i)) + (i % 3 === 0 ? 1 : 0),
  denied: i % 4 === 0 ? 1 : 0,
}));

// --- Animated Aurora Background (black/blue/purple) ---
function AuroraBG() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-slate-950 to-black" />
      {/* animated ribbons */}
      <span className="aurora aurora-1" />
      <span className="aurora aurora-2" />
      <span className="aurora aurora-3" />
      <span className="aurora aurora-4" />
      <style>{`
        .aurora{position:absolute;filter:blur(40px);opacity:.5;width:120%;height:120%;left:-10%;top:-10%;background:radial-gradient(60% 40% at 50% 50%, rgba(99,102,241,.35), transparent 60%),
          radial-gradient(60% 40% at 60% 40%, rgba(59,130,246,.35), transparent 60%),
          radial-gradient(60% 40% at 40% 60%, rgba(168,85,247,.35), transparent 60%);
          mix-blend:screen;}
        .aurora-1{animation:move1 18s ease-in-out infinite alternate;}
        .aurora-2{animation:move2 22s ease-in-out infinite alternate;}
        .aurora-3{animation:move3 26s ease-in-out infinite alternate;}
        .aurora-4{animation:move4 30s ease-in-out infinite alternate;}
        @keyframes move1{0%{transform:translate3d(-10%, -5%, 0) rotate(0deg)}100%{transform:translate3d(10%, 5%, 0) rotate(10deg)}}
        @keyframes move2{0%{transform:translate3d(5%, -10%, 0) rotate(-8deg)}100%{transform:translate3d(-5%, 10%, 0) rotate(6deg)}}
        @keyframes move3{0%{transform:translate3d(-6%, 8%, 0) rotate(6deg)}100%{transform:translate3d(6%, -8%, 0) rotate(-6deg)}}
        @keyframes move4{0%{transform:translate3d(8%, 0%, 0) rotate(-4deg)}100%{transform:translate3d(-8%, 0%, 0) rotate(8deg)}}
      `}</style>
    </div>
  );
}

// ---- Components ----
function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-indigo-500/20 bg-slate-900/40 backdrop-blur p-4 shadow-sm">
      <div className="text-sm text-indigo-200/80">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-white">{value}</div>
      {hint ? <div className="mt-1 text-xs text-indigo-300/70">{hint}</div> : null}
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="px-2 py-0.5 rounded-full border border-indigo-500/30 text-xs bg-slate-900/50 text-indigo-100">{children}</span>;
}

function DecisionBadge({ d }: { d: string }) {
  const map: Record<string, string> = {
    GRANTED: "bg-green-500/20 text-green-300 border-green-400/30",
    DENIED: "bg-rose-500/20 text-rose-300 border-rose-400/30",
    BLOCKED: "bg-amber-500/20 text-amber-300 border-amber-400/30",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs border ${map[d] || ""}`}>{d}</span>;
}

export default function AgentIdpDashboard() {
  const [query, setQuery] = useState("");
  const [agent, setAgent] = useState<string | "ALL">("ALL");
  const [detail, setDetail] = useState<any | null>(null);
  
  // Fetch data from Supabase (falls back to mock if not configured)
  const { tokenRequests, signinAttempts, agents, useMockData } = useSupabaseData();
  
  // Use Supabase data if available, otherwise use mock data
  const [requests, setRequests] = useState<any[]>([]);
  const [signinAttemptsList, setSigninAttemptsList] = useState<any[]>([]);
  const [availableAgents, setAvailableAgents] = useState<any[]>([]);
  const [usageData, setUsageData] = useState<any[]>([]);
  const [trafficData, setTrafficData] = useState<any[]>([]);
  
  useEffect(() => {
    if (!useMockData && tokenRequests.length > 0) {
      setRequests(tokenRequests);
    } else if (useMockData) {
      setRequests(MOCK_TOKEN_REQUESTS);
    }
  }, [tokenRequests, useMockData]);
  
  useEffect(() => {
    if (!useMockData && signinAttempts.length > 0) {
      setSigninAttemptsList(signinAttempts);
    } else if (useMockData) {
      setSigninAttemptsList(MOCK_SIGNIN_ATTEMPTS);
    }
  }, [signinAttempts, useMockData]);
  
  useEffect(() => {
    if (!useMockData && agents.length > 0) {
      setAvailableAgents(agents);
    } else if (useMockData) {
      setAvailableAgents(MOCK_AGENTS);
    }
  }, [agents, useMockData]);

  // Fetch usage and traffic stats
  useEffect(() => {
    if (useMockData) {
      setUsageData(MOCK_USAGE);
      setTrafficData(MOCK_TRAFFIC);
      return;
    }

    async function loadStats() {
      try {
        const [usage, traffic] = await Promise.all([
          fetchUsageStats(),
          fetchTrafficStats(),
        ]);
        setUsageData(usage);
        setTrafficData(traffic);
      } catch (error) {
        console.error('Error loading stats:', error);
        setUsageData(MOCK_USAGE);
        setTrafficData(MOCK_TRAFFIC);
      }
    }

    loadStats();
  }, [useMockData]);

  const filteredReqs = useMemo(() => {
    const q = query.toLowerCase();
    return requests.filter((r) =>
      (agent === "ALL" || r.agent === agent) &&
      (!q || [
        r.agent,
        r.reason,
        r.id,
        r.token?.resource_id || "",
        r.token?.action || "",
        safeJoin(r.token?.columns),
        r.token?.justification || "",
        r.token?.row_filter || "",
      ].join(" ").toLowerCase().includes(q))
    );
  }, [query, agent, requests]);

  const totals = useMemo(() => {
    const g = filteredReqs.filter((r) => r.decision === "GRANTED").length;
    const d = filteredReqs.filter((r) => r.decision === "DENIED").length;
    const uniqueAgents = new Set(filteredReqs.map((r) => r.agent)).size;
    const avgTtl = Math.round(
      filteredReqs.reduce((acc, r) => acc + (r.ttlSec || 0), 0) / (filteredReqs.length || 1)
    );
    return { g, d, uniqueAgents, avgTtl };
  }, [filteredReqs]);

  const policyText = detail
    ? `when action == "${detail.token?.action}" and
    resource == "${detail.token?.resource_id}" and
    within(columns subset-of allowedColumns(agent, resource)) and
    rowFilterAllowed(agent, resource, "${detail.token?.row_filter || ""}") and
    ttl <= 30s and
    rateWithinLimit(agent, resource) and
    replayNonceUnused("${detail.token?.replay_protection?.nonce || ""}")
then GRANT with masks = maskRules(agent, resource)
else DENY`
    : "";

  return (
    <div className="relative min-h-screen w-full text-slate-100">
      <AuroraBG />
      <div className="max-w-7xl mx-auto px-5 py-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Arcane Security</h1>
            <p className="text-sm text-indigo-200/80 mt-1">
              30-second, purpose-scoped tokens * Just-in-time access * Full audit trail
              : Identity provider for AI agents
            </p>
          </div>
          <div className="flex items-center gap-3">
              <select
                value={agent}
                onChange={(e) => setAgent(e.target.value as any)}
                className="border border-indigo-500/30 rounded-xl px-3 py-2 bg-slate-900/40 text-indigo-100 placeholder-indigo-300/50 backdrop-blur"
              >
                <option value="ALL">All data sources</option>
                {availableAgents.map((a) => (
                  <option key={a.id} value={a.name}>
                    {a.name}
                  </option>
                ))}
              </select>
            <input
              placeholder="Search reason, resource, id..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border border-indigo-500/30 rounded-xl px-3 py-2 bg-slate-900/40 text-indigo-100 placeholder-indigo-300/50 backdrop-blur w-56"
            />
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <Kpi label="Active agents" value={totals.uniqueAgents} hint="seen in recent requests" />
          <Kpi label="Tokens granted" value={totals.g} hint="last ~30 minutes" />
          <Kpi label="Requests denied" value={totals.d} hint="policy violations prevented" />
          <Kpi label="Avg token TTL" value={`${totals.avgTtl}s`} hint="short-lived, blast-radius minimized" />
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-5 gap-6 mt-6">
          <div className="md:col-span-3 rounded-2xl border border-indigo-500/20 bg-slate-900/40 backdrop-blur p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Requests over time</h2>
              <div className="text-xs text-indigo-200/70">
                {useMockData ? 'demo data' : `${trafficData.length} time buckets`}
              </div>
            </div>
            <div className="h-48 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trafficData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#6366F1" opacity={0.1} />
                  <XAxis dataKey="t" stroke="#c7d2fe" tick={{ fill: "#c7d2fe", fontSize: 11 }} />
                  <YAxis allowDecimals={false} stroke="#c7d2fe" tick={{ fill: "#c7d2fe", fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '8px' }}
                    labelStyle={{ color: '#c7d2fe', fontSize: '12px', marginBottom: '4px' }}
                    itemStyle={{ color: '#ffffff', fontSize: '13px' }}
                  />
                  <Area type="monotone" dataKey="granted" stroke="#6366F1" fill="url(#colorGranted)" name="Granted" />
                  <Area type="monotone" dataKey="denied" stroke="#A855F7" fill="url(#colorDenied)" name="Denied" />
                  <defs>
                    <linearGradient id="colorGranted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.5}/>
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorDenied" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#A855F7" stopOpacity={0.5}/>
                      <stop offset="95%" stopColor="#A855F7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="md:col-span-2 rounded-2xl border border-indigo-500/20 bg-slate-900/40 backdrop-blur p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Top scopes / APIs</h2>
              <div className="text-xs text-indigo-200/70">
                {useMockData ? 'demo data' : `${usageData.length} scopes`}
              </div>
            </div>
            <div className="h-48 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={usageData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#6366F1" opacity={0.1} />
                  <XAxis 
                    dataKey="resource" 
                    tick={{ fontSize: 11, fill: "#c7d2fe" }} 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fill: "#c7d2fe", fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '8px' }}
                    labelStyle={{ color: '#c7d2fe', fontSize: '12px', marginBottom: '4px' }}
                    itemStyle={{ color: '#ffffff', fontSize: '13px' }}
                  />
                  <Bar dataKey="calls" fill="url(#colorBar)" radius={[8, 8, 0, 0]} />
                  <defs>
                    <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366F1" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#818CF8" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Token Requests Stream */}
        <div className="mt-6 space-y-6">
          <div className="rounded-2xl border border-indigo-500/20 bg-slate-900/40 backdrop-blur p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">Live token requests</h2>
              <div className="text-xs text-indigo-200/70">
                {filteredReqs.length} {filteredReqs.length === 1 ? 'request' : 'requests'} • real-time
              </div>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-indigo-200/70">
                  <tr>
                    <th className="py-2">When</th>
                    <th>Agent</th>
                    <th>Purpose</th>
                    <th>Decision</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReqs.map((r) => (
                    <tr key={r.id} className="border-t border-indigo-500/20">
                      <td className="py-2 align-top">{new Date(r.ts).toLocaleTimeString()}</td>
                      <td className="align-top">
                        <Pill>{r.agent}</Pill>
                      </td>
                      <td className="align-top">
                        <div className="font-medium">{r.token?.action} on {r.token?.resource_id}</div>
                        <div className="text-xs text-indigo-200/70 truncate max-w-[280px]">
                          {[r.token?.justification, r.token?.row_filter].filter(Boolean).join(" | ")}
                        </div>
                      </td>
                      <td className="align-top">
                        <DecisionBadge d={r.decision} />
                      </td>
                      <td className="align-top">
                        <button onClick={() => setDetail(r)} className="text-indigo-300 hover:underline text-xs">
                          view
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sign-in attempts */}
          <div className="rounded-2xl border border-indigo-500/20 bg-slate-900/40 backdrop-blur p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">Auth attempts</h2>
              <div className="text-xs text-indigo-200/70">
                {signinAttemptsList.length} {signinAttemptsList.length === 1 ? 'attempt' : 'attempts'} • real-time
              </div>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-indigo-200/70">
                  <tr>
                    <th className="py-2">When</th>
                    <th>Subject</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {signinAttemptsList.map((s) => (
                    <tr key={s.id} className="border-t border-indigo-500/20">
                      <td className="py-2">{new Date(s.ts).toLocaleTimeString()}</td>
                      <td>
                        <Pill>{s.subject}</Pill>
                      </td>
                      <td>{s.method}</td>
                      <td>
                        <DecisionBadge d={s.status} />
                      </td>
                      <td className="text-xs text-indigo-200/70">{s.reason || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Detail Drawer */}
        {detail && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center z-50"
            onClick={() => setDetail(null)}
          >
            <div
              className="bg-slate-900 text-indigo-100 border border-indigo-500/20 rounded-2xl shadow-xl w-full md:max-w-2xl max-h-[80vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-indigo-500/20 flex items-center justify-between">
                <div className="font-semibold">Request {detail.id}</div>
                <button className="text-indigo-200/70" onClick={() => setDetail(null)}>
                  X
                </button>
              </div>
              <div className="p-4 grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div>
                    <span className="text-indigo-200/70 text-xs">Agent</span>
                    <div className="font-medium">{detail.agent}</div>
                  </div>
                  <div>
                    <span className="text-indigo-200/70 text-xs">Action</span>
                    <div className="font-medium">{detail.token?.action}</div>
                  </div>
                  <div>
                    <span className="text-indigo-200/70 text-xs">Resource</span>
                    <div className="text-sm">{detail.token?.resource_id}</div>
                  </div>
                  <div>
                    <span className="text-indigo-200/70 text-xs">Justification</span>
                    <div className="text-sm">{detail.token?.justification}</div>
                  </div>
                  <div>
                    <span className="text-indigo-200/70 text-xs">Columns</span>
                    <div className="text-sm">{safeJoin(detail.token?.columns, ", ") || "-"}</div>
                  </div>
                  <div>
                    <span className="text-indigo-200/70 text-xs">Row Filter</span>
                    <div className="text-sm">{detail.token?.row_filter || "-"}</div>
                  </div>
                  <div>
                    <span className="text-indigo-200/70 text-xs">Output Limit</span>
                    <div className="text-sm">{detail.token?.output_limit ? JSON.stringify(detail.token.output_limit) : "-"}</div>
                  </div>
                  <div>
                    <span className="text-indigo-200/70 text-xs">Mask Rules</span>
                    <div className="text-sm">{detail.token?.mask_rules ? JSON.stringify(detail.token.mask_rules) : "-"}</div>
                  </div>
                  <div>
                    <span className="text-indigo-200/70 text-xs">Rate / Idempotency</span>
                    <div className="text-sm">
                      {detail.token?.rate_limit ? JSON.stringify(detail.token.rate_limit) : "-"}
                      {detail.token?.idempotency_key ? ` | ${detail.token.idempotency_key}` : ""}
                    </div>
                  </div>
                  <div>
                    <span className="text-indigo-200/70 text-xs">Replay Protection</span>
                    <div className="text-sm">{detail.token?.replay_protection ? JSON.stringify(detail.token.replay_protection) : "-"}</div>
                  </div>
                  <div>
                    <span className="text-indigo-200/70 text-xs">Network</span>
                    <div className="text-sm">{detail.token?.network ? JSON.stringify(detail.token.network) : "-"}</div>
                  </div>
                  <div>
                    <span className="text-indigo-200/70 text-xs">TTL</span>
                    <div className="text-sm">{detail.ttlSec}s</div>
                  </div>
                  <div>
                    <span className="text-indigo-200/70 text-xs">Decision</span>
                    <div>
                      <DecisionBadge d={detail.decision} />
                    </div>
                  </div>
                  <div>
                    <span className="text-indigo-200/70 text-xs">Reason</span>
                    <div className="text-sm">{detail.reason}</div>
                  </div>
                  <div>
                    <span className="text-indigo-200/70 text-xs">IP</span>
                    <div className="text-sm">{detail.ip}</div>
                  </div>
                </div>
                <div>
                  <div className="text-indigo-200/70 text-xs mb-1">Policy evaluation (example)</div>
                  <pre className="text-xs bg-slate-900/50 border border-indigo-500/20 rounded-xl p-3 overflow-auto text-indigo-100">{policyText}</pre>
                  <div className="text-indigo-200/70 text-xs mt-2">Event JSON</div>
                  <pre className="text-xs bg-slate-900/50 border border-indigo-500/20 rounded-xl p-3 overflow-auto text-indigo-100">{JSON.stringify(detail, null, 2)}</pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer narrative for judges */}
        <div className="mt-8 text-xs text-indigo-200/70">
          <p>
            Pitch lines while demoing: Short-lived tokens reduce blast radius. Every request is purpose-bound and explainable.
            Policies are human-readable. You get GA-style observability for agents: requests, denials, and exact data touched.
          </p>
        </div>
      </div>
    </div>
  );
}

