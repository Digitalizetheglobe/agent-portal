import React, { useState } from 'react';

// Design: "Roles & Responsibilities page-html/Main.dc.html".
// Keep the content in sync with the backend (middleware/auth.js, routes/*.js, agentReviewController.js):
// the backend enforces permissions, this page only explains them.
const ROLE = {
  agent: { name: 'Agent', color: '#475569', tint: '#F1F5F9' },
  am: { name: 'Account Manager', color: '#1D4ED8', tint: '#EFF6FF' },
  hor: { name: 'Head of Recruitment', color: '#6D28D9', tint: '#F5F3FF' },
  hoa: { name: 'Head of Admission', color: '#B45309', tint: '#FFFBEB' },
  acc: { name: 'Accounts', color: '#047857', tint: '#ECFDF5' },
  sa: { name: 'Super Admin', color: '#0F172A', tint: '#E2E8F0' },
};

const ROLE_CARDS = [
  { key: 'agent', purpose: 'Brings in students and earns commission.', points: ['Create a login from the invite link', 'Fill the profile and upload company documents', 'Sign the contract and upload it', 'Register students (confirmed applications only)', 'Upload passport, photo, results and other documents', 'Upload tuition fee payment proof', 'Raise invoices and fix any marked Needs amendment', 'View universities, programs and commission'] },
  { key: 'am', purpose: 'Brings in agents and looks after them.', points: ['Add agents and send the invite link', 'Start the review of a new agent application', 'Recommend the application to Head of Recruitment', 'Send an application back for correction', 'Works only with their own agents'] },
  { key: 'hor', purpose: 'Checks that new agents are genuine.', points: ['Verify every agent document', 'Approve or reject an agent application', 'Send an application back for correction'] },
  { key: 'hoa', purpose: 'Makes the final call on agents, students and invoices.', points: ['Give final approval and issue the Agent ID', 'Issue contracts and E-Certificates', 'Verify students and move application stages', 'Accept or reject tuition fee proof', 'Approve invoices or mark Needs amendment', 'Allow early payment to an agent', 'Manage universities and programs'] },
  { key: 'acc', purpose: 'Handles all the money.', points: ['Record payments received from universities', 'Pay agents and upload the payment slip', 'Cancel or replace a payment'] },
  { key: 'sa', purpose: 'Runs the system. Can do every task.', points: ['Manage staff accounts and roles', 'See the Audit Log', 'Delete agents', 'Step in for any role when needed'] },
];

const PHASES = [
  {
    title: 'Agent joins', result: 'Ends with the Agent ID issued.',
    steps: [['am', 'Adds the agent and sends the invite link'], ['agent', 'Creates a login from the link'], ['agent', 'Fills the profile and uploads company documents'], ['am', 'Reviews the application and recommends it'], ['hor', 'Verifies every document (all must pass)'], ['hoa', 'Gives final approval and issues the Agent ID']],
    note: 'Any reviewer can send the application back to the agent for correction. Head of Recruitment or Head of Admission can reject it.',
  },
  {
    title: 'Agent is activated', result: 'Ends with the agent able to add students.',
    steps: [['hoa', 'Issues the contract'], ['agent', 'Signs the contract and uploads the signed copy'], ['hoa', 'Issues the E-Certificate. The agent is now active.']],
    note: 'The agent can view and download the contract and E-Certificate from their dashboard at any time.',
  },
  {
    title: 'Student admission and visa', result: 'Ends with final endorsement (visa 100%).', stages: true,
    steps: [['agent', 'Registers the student and uploads passport, photo, results and other documents'], ['hoa', 'Verifies the student and moves the application through each stage below'], ['agent', 'Uploads proof of tuition fee payment'], ['hoa', 'Accepts or rejects the fee proof, then gives final endorsement']],
    note: 'Only confirmed applications come in, not enquiries. All universities are in Malaysia.',
  },
  {
    title: 'Invoice and payment', result: 'Ends with the agent paid.', invoice: true,
    steps: [['agent', 'Raises the invoice for the student'], ['hoa', 'Approves it, or marks it Needs amendment with a note. Approval creates the agent payoff.'], ['acc', 'Records the payment received from the university'], ['acc', 'Pays the agent and uploads the payment slip']],
    note: 'If the university has not paid yet, Head of Admission can allow the agent to be paid early. Accounts can cancel a payoff and issue a replacement.',
  },
];

// Numbered across groups, as in the design. Mirrors utils/pipeline.js.
const STAGE_GROUPS = (() => {
  let n = 0;
  const number = (names) => names.map((name) => ({ n: ++n, name }));
  return [
    { label: 'APPLICATION', stages: number(['Application submitted', 'Eligibility issued', 'Offer letter', 'Payment']) },
    { label: 'VISA', stages: number(['Visa 5%', 'Visa 15%', 'Visa 35%', 'Visa 70%', 'Visa 80%', 'Visa approval (EVAL)', 'SEV (single entry visa)']) },
    { label: 'ARRIVAL', stages: number(['Departure briefing and travel', 'Student arrival: pickup, transport, stay', 'Health check', 'University registration']) },
    { label: 'FINISH', stages: number(['Tuition fees payment', 'Final endorsement (visa 100%)', 'Issue invoice']) },
  ];
})();

const INVOICE_STATUS = ['Invoice submitted', 'Invoice processing', 'Invoice paid'];

const FILTERS = [{ key: 'all', label: 'All roles' }, ...['agent', 'am', 'hor', 'hoa', 'acc'].map((k) => ({ key: k, label: ROLE[k].name }))];

const RolesGuidePage = () => {
  const [sel, setSel] = useState('all');
  const isOn = (key) => sel === 'all' || sel === key;
  let stepNo = 0;

  return (
    <div className="mx-auto flex flex-col gap-12 py-8 md:py-10" style={{ maxWidth: 1120 }}>
      <header className="flex flex-col gap-4">
        <div className="text-[13px] text-slate-600">Help / Roles and Responsibilities</div>
        <h1 className="m-0 text-[32px] font-bold leading-[1.2] tracking-[-0.02em] text-slate-900">Roles and Responsibilities</h1>
        <p className="m-0 max-w-[680px] text-base leading-normal text-slate-600">
          Who does what in Q-Study, and in what order. Pick a role to see only their work.
        </p>
        <div role="group" aria-label="Filter by role" className="flex flex-wrap gap-2 pt-2">
          {FILTERS.map((f) => {
            const on = sel === f.key;
            return (
              <button
                key={f.key}
                type="button"
                aria-pressed={on}
                onClick={() => setSel(f.key)}
                className="min-h-[40px] cursor-pointer rounded-full px-4 text-sm font-semibold"
                style={{ border: `1px solid ${on ? '#0F172A' : '#CBD5E1'}`, background: on ? '#0F172A' : '#FFFFFF', color: on ? '#FFFFFF' : '#1E293B' }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </header>

      <section aria-labelledby="who" className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <h2 id="who" className="m-0 text-[22px] font-bold text-slate-900">Who does what</h2>
          <p className="m-0 text-[15px] text-slate-600">Each role and the tasks it owns.</p>
        </div>
        <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          {ROLE_CARDS.map((card) => {
            const r = ROLE[card.key];
            return (
              <article
                key={card.key}
                className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 transition-opacity duration-200"
                style={{ opacity: isOn(card.key) ? 1 : 0.35, boxShadow: sel === card.key ? `0 0 0 2px ${r.color}` : 'none' }}
              >
                <div className="flex items-center gap-2.5">
                  <span aria-hidden="true" className="h-3 w-3 flex-none rounded" style={{ background: r.color }} />
                  <h3 className="m-0 text-[17px] font-bold text-slate-900">{r.name}</h3>
                </div>
                <p className="m-0 text-sm leading-normal text-slate-600">{card.purpose}</p>
                <ul className="m-0 flex list-none flex-col gap-2.5 border-t border-slate-100 p-0 pt-4">
                  {card.points.map((p) => (
                    <li key={p} className="flex gap-2.5 text-sm leading-[1.45] text-slate-800">
                      <span aria-hidden="true" className="font-bold" style={{ color: r.color }}>-</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="flow" className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <h2 id="flow" className="m-0 text-[22px] font-bold text-slate-900">The flow, step by step</h2>
          <p className="m-0 text-[15px] text-slate-600">
            From a new agent joining to the agent getting paid. Every step is logged with its date, and each handoff sends an email.
          </p>
        </div>

        {PHASES.map((ph, i) => (
          <div key={ph.title} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-slate-900 text-[15px] font-bold text-white">{i + 1}</span>
              <div className="flex flex-col gap-0.5">
                <h3 className="m-0 text-[17px] font-bold text-slate-900">{ph.title}</h3>
                <p className="m-0 text-sm text-slate-600">{ph.result}</p>
              </div>
            </div>

            <ol className="m-0 flex list-none flex-col px-6 py-2">
              {ph.steps.map(([role, text]) => {
                const r = ROLE[role];
                stepNo += 1;
                return (
                  <li
                    key={stepNo}
                    className="-mx-3 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border-b border-slate-100 px-3 py-3.5 transition-opacity duration-200"
                    style={{ opacity: isOn(role) ? 1 : 0.35, background: sel === role ? r.tint : 'transparent' }}
                  >
                    <span className="w-6 text-[13px] font-semibold tabular-nums text-slate-500">{stepNo}</span>
                    <span
                      className="min-w-[150px] rounded-md px-2.5 py-1 text-center text-xs font-semibold"
                      style={{ background: r.tint, color: r.color }}
                    >
                      {r.name}
                    </span>
                    <span className="min-w-[200px] flex-1 basis-[280px] text-[15px] leading-[1.45] text-slate-900">{text}</span>
                  </li>
                );
              })}
            </ol>

            {ph.stages && (
              <div className="flex flex-col gap-4 border-t border-slate-200 px-6 py-5">
                <div className="text-[13px] font-semibold text-slate-900">Application stages, in order</div>
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                  {STAGE_GROUPS.map((g) => (
                    <div key={g.label} className="flex flex-col gap-2">
                      <div className="text-[11px] font-bold tracking-[0.08em] text-slate-600">{g.label}</div>
                      {g.stages.map((st) => (
                        <div key={st.n} className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[13px] text-slate-800">
                          <span className="w-[18px] text-[11px] font-bold tabular-nums text-slate-500">{st.n}</span>
                          <span>{st.name}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ph.invoice && (
              <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-5">
                <div className="text-[13px] font-semibold text-slate-900">Invoice status, in order</div>
                <div className="flex flex-wrap items-center gap-2">
                  {INVOICE_STATUS.map((name, idx) => (
                    <React.Fragment key={name}>
                      <span className="rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-800">{name}</span>
                      {idx < INVOICE_STATUS.length - 1 && <span aria-hidden="true" className="text-sm text-slate-400">→</span>}
                    </React.Fragment>
                  ))}
                </div>
                <div className="text-[13px] leading-normal text-slate-600">
                  A problem invoice is marked <strong style={{ color: '#B45309' }}>Needs amendment</strong> with a note, never Rejected. The agent fixes it and sends it again.
                </div>
              </div>
            )}

            <div className="border-t border-slate-200 px-6 py-3.5 text-[13px] leading-normal text-slate-600" style={{ background: '#FCFCFD' }}>
              {ph.note}
            </div>
          </div>
        ))}
      </section>

      <footer className="border-t border-slate-200 pt-5 text-[13px] text-slate-500">
        Super Admin can do every task on this page, plus manage staff accounts, see the Audit Log and delete agents.
      </footer>
    </div>
  );
};

export default RolesGuidePage;
