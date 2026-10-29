import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { PIPELINE_STAGES, PIPELINE_STAGE_LABELS, getDisplayStage, isPipelineActive } from '../../utils/pipeline';

// The 17 stages are grouped into five phases so the dashboard stays easy to read.
const PHASES = [
  { key: 'application', title: 'Application', hint: 'Offer and payment', stages: ['Application', 'Eligibility', 'OfferLetter', 'Payment'], accent: 'bg-[#9CA3AF]' },
  { key: 'visa', title: 'Visa processing', hint: '5% to 80%', stages: ['Visa5', 'Visa15', 'Visa35', 'Visa70', 'Visa80'], accent: 'bg-[#378ADD]' },
  { key: 'travel', title: 'Approval and travel', hint: 'EVAL, SEV, departure', stages: ['VisaApproval', 'SEV', 'Departure'], accent: 'bg-[#7F77DD]' },
  { key: 'arrival', title: 'Arrival', hint: 'Health check, registration', stages: ['Arrival', 'Medical', 'Registration'], accent: 'bg-[#1D9E75]' },
  { key: 'final', title: 'Tuition and endorsement', hint: 'Ready to invoice', stages: ['FeesPaid', 'Visa100'], accent: 'bg-[#EF9F27]' },
];

/**
 * How many applications are in each phase of the visa pipeline, with the stages that have students
 * listed underneath. Each live application counts once, so the numbers always add up to the total.
 * Clicking a phase opens a popup with the number at every stage of it. Only numbers are shown, never
 * a list of students, so the popup stays short however many students there are.
 */
const PipelineSummary = ({ applications = [], to }) => {
  const [openPhase, setOpenPhase] = useState(null);
  const { counts, total } = useMemo(() => {
    const counts = Object.fromEntries(PIPELINE_STAGES.map((key) => [key, 0]));
    const live = applications.filter(isPipelineActive);
    live.forEach((app) => { counts[getDisplayStage(app)] += 1; });
    return { counts, total: live.length };
  }, [applications]);

  const phaseTotal = (phase) => phase.stages.reduce((sum, stage) => sum + counts[stage], 0);
  const openTotal = openPhase ? phaseTotal(openPhase) : 0;
  const share = (count, of) => (of > 0 ? Math.round((count / of) * 100) : 0);

  return (
    <Card className="border-[#E5E7EB] shadow-none bg-white" data-testid="pipeline-summary">
      <CardHeader className="px-6 pt-6 pb-4 flex flex-row items-start justify-between space-y-0 gap-4">
        <div>
          <CardTitle className="text-lg font-semibold font-['Outfit'] text-[#111827]">Visa progress</CardTitle>
          <p className="text-sm text-[#6B7280] mt-1">{total} live application{total === 1 ? '' : 's'}</p>
        </div>
        {to && <Link to={to} className="text-sm font-semibold text-[#042C53] hover:underline shrink-0">View applications</Link>}
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-0">
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {PHASES.map((phase) => {
            const count = phaseTotal(phase);
            const active = phase.stages.filter((stage) => counts[stage] > 0);
            return (
              <li key={phase.key}>
                <button
                  type="button"
                  onClick={() => setOpenPhase(phase)}
                  className="w-full h-full text-left rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 flex flex-col transition-colors hover:border-[#042C53] hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#042C53]"
                  aria-label={`${phase.title}: ${count} applications. Show the numbers per stage`}
                >
                  <div className={`h-1 w-8 rounded-full ${phase.accent}`} />
                  <p className="mt-3 text-sm font-semibold text-[#111827]">{phase.title}</p>
                  <p className="text-xs text-[#6B7280] mt-0.5">{phase.hint}</p>
                  <p className="mt-3 text-3xl font-semibold text-[#111827] tabular-nums">{count}</p>
                  <ul className="mt-3 space-y-1.5 min-h-[2.5rem]">
                    {active.length === 0 ? (
                      <li className="text-xs text-[#9CA3AF]">No students</li>
                    ) : active.map((stage) => (
                      <li key={stage} className="flex items-center justify-between gap-2 text-xs text-[#4B5563]">
                        <span className="truncate">{PIPELINE_STAGE_LABELS[stage]}</span>
                        <span className="font-semibold text-[#111827] tabular-nums">{counts[stage]}</span>
                      </li>
                    ))}
                  </ul>
                  <span className="mt-3 inline-flex items-center text-xs font-semibold text-[#042C53]">
                    View numbers <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </CardContent>

      <Dialog open={!!openPhase} onOpenChange={(open) => !open && setOpenPhase(null)}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
          {openPhase && (
            <>
              <DialogHeader className="px-7 pt-6 pb-5 border-b border-[#E5E7EB] space-y-1">
                <DialogTitle className="font-['Outfit'] text-lg">{openPhase.title}</DialogTitle>
                <DialogDescription>{openPhase.hint}</DialogDescription>
              </DialogHeader>

              <div className="px-7 py-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-semibold text-[#111827] tabular-nums">{openTotal}</span>
                  <span className="text-sm text-[#6B7280]">
                    application{openTotal === 1 ? '' : 's'} in this phase ({share(openTotal, total)}% of all)
                  </span>
                </div>

                <ul className="mt-6 space-y-4">
                  {openPhase.stages.map((stage) => (
                    <li key={stage}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-[#374151]">{PIPELINE_STAGE_LABELS[stage]}</span>
                        <span className="font-semibold text-[#111827] tabular-nums">{counts[stage]}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-[#F3F4F6] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${openPhase.accent}`}
                          style={{ width: `${share(counts[stage], openTotal)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PipelineSummary;
