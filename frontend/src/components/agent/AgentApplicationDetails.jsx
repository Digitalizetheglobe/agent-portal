import React from 'react';
import { APPLICATION_GROUPS, displayValue } from '../../utils/agentApplication';
import { cn } from '../../lib/utils';

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null;

const Group = ({ title, fields }) => {
  const filled = fields.filter((f) => f.value);
  const missing = fields.filter((f) => !f.value);

  return (
    <section className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
      <h4 className="px-4 py-2.5 border-b border-[#F3F4F6] bg-[#F9FAFB] text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
        {title}
      </h4>
      {filled.length > 0 ? (
        <dl className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {filled.map((f) => (
            <div key={f.key} className={cn('min-w-0', f.wide && 'sm:col-span-2')}>
              <dt className="text-[11px] font-medium text-[#6B7280]">{f.label}</dt>
              <dd className="text-sm font-medium text-[#111827] break-words whitespace-pre-line mt-0.5">{f.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="p-4 text-xs text-[#9CA3AF]">Nothing provided in this section.</p>
      )}
      {missing.length > 0 && filled.length > 0 && (
        <p className="px-4 pb-3 text-[11px] text-[#9CA3AF]">
          Not provided: {missing.map((f) => f.label).join(', ')}
        </p>
      )}
    </section>
  );
};

/**
 * Read-only view of everything captured on the agent application form.
 * Filled answers come first; fields the agent left blank are listed in one line under each section.
 * Bank details are omitted by the API for staff without a payout role, so those
 * rows are simply not shown when the fields are absent from the record.
 */
const AgentApplicationDetails = ({ agent, className }) => {
  if (!agent) return null;

  const bankHidden = !('bankName' in agent);

  const sections = APPLICATION_GROUPS
    .filter((g) => !(g.id === 'bank' && bankHidden))
    .map((g) => ({
      ...g,
      fields: g.fields
        .filter((f) => !f.showIf || f.showIf(agent))
        .map((f) => ({
          key: f.key,
          label: f.label,
          wide: f.wide || f.type === 'textarea',
          value: displayValue(f, agent[f.key]),
        })),
    }));

  const declaration = [
    { key: 'name', label: 'Signed by', value: agent.declarationName },
    { key: 'id', label: 'ID number', value: agent.declarationIdNumber },
    { key: 'date', label: 'Date', value: formatDate(agent.declarationAcceptedAt) },
  ];

  return (
    <div className={cn('space-y-3', className)}>
      {sections.map((group) => (
        <Group key={group.id} title={group.title} fields={group.fields} />
      ))}
      <Group title="Declaration" fields={declaration} />
    </div>
  );
};

export default AgentApplicationDetails;
