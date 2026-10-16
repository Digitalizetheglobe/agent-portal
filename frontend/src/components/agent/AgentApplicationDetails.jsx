import React from 'react';
import { APPLICATION_GROUPS, displayValue } from '../../utils/agentApplication';
import { cn } from '../../lib/utils';

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null;

/**
 * Read-only view of everything captured on the agent application form.
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
      fields: g.fields.filter((f) => !f.showIf || f.showIf(agent)),
    }));

  return (
    <div className={cn('space-y-3', className)}>
      {sections.map((group) => (
        <section key={group.id} className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
          <h4 className="px-4 py-2.5 border-b border-[#F3F4F6] text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
            {group.title}
          </h4>
          <dl className="p-4 grid grid-cols-2 gap-x-4 gap-y-4">
            {group.fields.map((f) => {
              const value = displayValue(f, agent[f.key]);
              return (
                <div key={f.key} className={cn('min-w-0', (f.wide || f.type === 'textarea') && 'col-span-2')}>
                  <dt className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-wider">{f.label}</dt>
                  <dd className="text-sm text-[#111827] break-words whitespace-pre-line mt-1">
                    {value || <span className="text-[#9CA3AF]">Not provided</span>}
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>
      ))}

      <section className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        <h4 className="px-4 py-2.5 border-b border-[#F3F4F6] text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
          Declaration
        </h4>
        <dl className="p-4 grid grid-cols-2 gap-x-4 gap-y-4">
          {[
            ['Signed by', agent.declarationName],
            ['ID number', agent.declarationIdNumber],
            ['Date', formatDate(agent.declarationAcceptedAt)],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-wider">{label}</dt>
              <dd className="text-sm text-[#111827] break-words mt-1">
                {value || <span className="text-[#9CA3AF]">Not provided</span>}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
};

export default AgentApplicationDetails;
