import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { cn } from '../../lib/utils';
import { DISPLAY_STAGE_INFO, PIPELINE_STAGES, getDisplayStage, isPipelineActive } from '../../utils/pipeline';

const ORDER = PIPELINE_STAGES;

/**
 * How many applications are in each visa pipeline stage. Each live application counts in exactly one
 * stage, so moving a student on lowers one count and raises the next; the counts always add up to the total.
 */
const PipelineSummary = ({ applications = [], to }) => {
  const { counts, total } = useMemo(() => {
    const counts = Object.fromEntries(ORDER.map((key) => [key, 0]));
    let total = 0;
    applications.filter(isPipelineActive).forEach((app) => {
      counts[getDisplayStage(app)] += 1;
      total += 1;
    });
    return { counts, total };
  }, [applications]);

  return (
    <Card className="border-[#E5E7EB] shadow-none bg-white" data-testid="pipeline-summary">
      <CardHeader className="px-6 py-4 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold font-['Outfit'] text-[#111827]">Visa progress</CardTitle>
        <div className="flex items-center gap-3 text-xs text-[#6B7280]">
          <span>{total} live application{total === 1 ? '' : 's'}</span>
          {to && <Link to={to} className="font-semibold text-[#042C53] hover:underline">View applications</Link>}
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-0">
        <ul className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {ORDER.map((key) => (
            <li key={key} className="rounded-lg border border-[#E5E7EB] p-3 text-center">
              <p className="text-2xl font-semibold text-[#111827] tabular-nums">{counts[key]}</p>
              <span className={cn('mt-1 inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold', DISPLAY_STAGE_INFO[key].style)}>
                {DISPLAY_STAGE_INFO[key].label}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default PipelineSummary;
