import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  GraduationCap,
  Clock,
  MapPin,
  Percent,
  CheckCircle2,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { courseAPI, formatApiError } from '../../utils/api';
import { readFee, earningsFor } from '../../utils/programFee';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import UniversityLogo from '../../components/university/UniversityLogo';
import ApplicationModal from '../../components/modals/ApplicationModal';

// The program text may hold "Entry requirements: ..." and "Awarding body: ..." lines (added by the file import).
// Those are shown on their own; everything else is the description.
const splitDescription = (text) => {
  const about = [];
  const requirements = [];
  let awardingBody = '';
  String(text || '').split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const req = trimmed.match(/^Entry requirements:\s*(.*)$/i);
    const body = trimmed.match(/^Awarding body:\s*(.*)$/i);
    if (req) requirements.push(...req[1].split(/[;\n]/).map((r) => r.trim()).filter(Boolean));
    else if (body) awardingBody = body[1].trim();
    else about.push(trimmed);
  });
  return { about: about.join('\n'), requirements, awardingBody };
};

const Fact = ({ label, children }) => (
  <div className="rounded-xl bg-[#F9FAFB] border border-gray-100 px-4 py-3 min-w-0">
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
    <p className="text-sm font-semibold text-gray-900 mt-1 break-words">{children}</p>
  </div>
);

const AgentProgramDetailPage = () => {
  const { programId } = useParams();
  const navigate = useNavigate();

  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sameProgram, setSameProgram] = useState([]);
  const [related, setRelated] = useState([]);
  const [universityId, setUniversityId] = useState('');
  const [applyOpen, setApplyOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setProgram(null);
    courseAPI.getById(programId)
      .then(async ({ data }) => {
        if (cancelled) return;
        const course = data.course;
        setProgram(course);
        setUniversityId(course.universities?.[0]?.id || '');

        // The same program at other universities, and other programs in the same faculty
        try {
          const name = course.name.trim().toLowerCase();
          const [same, faculty] = await Promise.all([
            courseAPI.getAll({ search: course.name, limit: 50 }),
            course.department ? courseAPI.getAll({ search: course.department, limit: 12 }) : Promise.resolve({ data: { courses: [] } }),
          ]);
          if (cancelled) return;
          setSameProgram((same.data.courses || []).filter((c) => c.id !== course.id && c.name.trim().toLowerCase() === name));
          setRelated((faculty.data.courses || []).filter((c) => c.id !== course.id && c.name.trim().toLowerCase() !== name).slice(0, 5));
        } catch {
          // the side lists are a bonus; the page works without them
        }
      })
      .catch((error) => {
        if (!cancelled) toast.error('Could not load this program', { description: formatApiError(error) });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [programId]);

  const universities = program?.universities || [];
  const selectedUniversity = universities.find((u) => u.id === universityId) || null;
  const fee = useMemo(() => readFee(program?.tuitionFee), [program]);
  const earn = earningsFor(fee, selectedUniversity?.commissionRate);
  const { about, requirements, awardingBody } = useMemo(() => splitDescription(program?.description), [program]);

  const back = (
    <Button variant="outline" size="sm" onClick={() => navigate('/agent/programs')} className="text-xs w-fit bg-white border-gray-200 hover:border-[#042C53]">
      <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Programs
    </Button>
  );

  if (loading) {
    return (
      <div className="p-4 sm:p-6 bg-[#F9FAFB] min-h-screen space-y-6">
        {back}
        <Card className="border-[#E5E7EB] bg-white shadow-none">
          <CardContent className="p-16 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#042C53] mx-auto"></div>
            <p className="text-xs text-gray-500 mt-3 font-medium">Loading program...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="p-4 sm:p-6 bg-[#F9FAFB] min-h-screen space-y-6">
        {back}
        <Card className="border-[#E5E7EB] bg-white shadow-none">
          <CardContent className="p-16 text-center text-gray-500">
            <AlertCircle size={40} className="mx-auto mb-3 opacity-20" />
            <h3 className="font-bold text-base text-gray-800">Program not found</h3>
            <p className="text-xs text-gray-400 mt-1">It may have been removed, or it is not available to you.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const openToAll = universities.length === 0;
  const primary = selectedUniversity || program.university;

  return (
    <div className="p-4 sm:p-6 bg-[#F9FAFB] min-h-screen space-y-5" data-testid="agent-program-detail-page">
      {back}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
            <div className="h-1.5 bg-[#042C53]" />
            <CardContent className="p-6 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {program.level && (
                  <span className="inline-flex items-center gap-1.5 bg-[#EEF2FF] text-[#1E3A8A] text-xs font-semibold px-3 py-1.5 rounded-lg">
                    <GraduationCap size={13} /> {program.level}
                  </span>
                )}
                {program.duration && (
                  <span className="inline-flex items-center gap-1.5 bg-[#F3F4F6] text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-lg">
                    <Clock size={13} /> {program.duration}
                  </span>
                )}
                {program.code && (
                  <span className="border border-gray-200 text-gray-600 text-xs font-mono font-semibold px-3 py-1.5 rounded-lg">{program.code}</span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-[#111827] font-['Outfit'] leading-tight">{program.name}</h1>

              <div className="flex items-center gap-2.5 text-sm text-gray-600 flex-wrap">
                {primary ? (
                  <>
                    <UniversityLogo university={primary} size="sm" />
                    <button type="button" onClick={() => navigate(`/agent/universities/${primary.id}`)} className="font-medium hover:text-[#042C53] hover:underline">
                      {primary.name}
                    </button>
                    {primary.country && (
                      <span className="inline-flex items-center gap-1 text-gray-500">
                        <MapPin size={13} /> {primary.city ? `${primary.city}, ` : ''}{primary.country}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="inline-flex items-center gap-2 font-medium"><Building2 size={16} className="text-gray-400" /> Offered by all universities</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#E5E7EB] bg-white shadow-none">
            <CardHeader className="border-b border-gray-100 px-6 py-4">
              <CardTitle className="text-base font-bold text-gray-900 font-['Outfit']">About this program</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {about || 'No description has been added for this program yet.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Fact label="University">{primary ? primary.name : 'All universities'}</Fact>
                <Fact label="Country">{primary?.country || '-'}</Fact>
                <Fact label="Level">{program.level || '-'}</Fact>
                <Fact label="Duration">{program.duration || '-'}</Fact>
                <Fact label="Faculty">{program.department || '-'}</Fact>
                <Fact label="Program code">{program.code || '-'}</Fact>
                {awardingBody && <Fact label="Awarding body">{awardingBody}</Fact>}
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#E5E7EB] bg-white shadow-none">
            <CardHeader className="border-b border-gray-100 px-6 py-4">
              <CardTitle className="text-base font-bold text-gray-900 font-['Outfit']">Entry requirements</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {requirements.length === 0 ? (
                <p className="text-sm text-gray-500">No entry requirements are listed for this program. Check the university page or ask your Account Manager.</p>
              ) : (
                <ul className="space-y-2.5">
                  {requirements.map((requirement, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <CheckCircle2 size={16} className="text-[#27500A] shrink-0 mt-0.5" /> {requirement}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Side column */}
        <div className="space-y-6 lg:sticky lg:top-6">
          <Card className="border-[#E5E7EB] bg-white shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div>
                <p className="text-xs text-gray-500">Tuition</p>
                <p className="text-3xl font-bold text-[#111827] font-['Outfit'] mt-1">{fee ? fee.text : 'On request'}</p>
              </div>

              {earn ? (
                <div className="flex items-center justify-between rounded-xl bg-[#EAF3DE] px-4 py-3">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-[#27500A]"><Percent size={14} /> You earn</span>
                  <span className="text-lg font-bold text-[#27500A]">{earn}</span>
                </div>
              ) : (
                <p className="text-xs text-gray-500 rounded-xl bg-[#F9FAFB] px-4 py-3">
                  {fee?.amount === null && fee ? 'The price is a range, so the commission is worked out when you apply.' : 'Your commission is shown once the university and price are known.'}
                </p>
              )}

              {universities.length > 1 && (
                <div className="space-y-1.5">
                  <label htmlFor="applyUniversity" className="text-xs font-semibold text-gray-700">Apply at</label>
                  <select
                    id="applyUniversity"
                    value={universityId}
                    onChange={(e) => setUniversityId(e.target.value)}
                    className="w-full h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm"
                  >
                    {universities.map((u) => <option key={u.id} value={u.id}>{u.name}{u.country ? ` (${u.country})` : ''}</option>)}
                  </select>
                </div>
              )}
              {openToAll && <p className="text-xs text-gray-500">This program is open to every university. You choose the university in the application form.</p>}

              <Button onClick={() => setApplyOpen(true)} className="w-full h-12 rounded-xl bg-[#042C53] hover:bg-[#0C447C] text-white text-sm font-semibold gap-2">
                Apply now <ArrowUpRight size={16} />
              </Button>
              <p className="text-[11px] text-gray-400 text-center">You will choose the student and the intake next.</p>
            </CardContent>
          </Card>

          {sameProgram.length + Math.max(universities.length - 1, 0) > 0 && (
            <Card className="border-[#E5E7EB] bg-white shadow-none">
              <CardHeader className="border-b border-gray-100 px-5 py-3.5">
                <CardTitle className="text-sm font-bold text-gray-900 font-['Outfit']">Also offered at</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                {universities.filter((u) => u.id !== primary?.id).map((u) => (
                  <button key={u.id} type="button" onClick={() => setUniversityId(u.id)} className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-[#F9FAFB] text-left">
                    <UniversityLogo university={u} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-gray-900 truncate">{u.name}</span>
                      <span className="block text-xs text-gray-500">{u.country}</span>
                    </span>
                  </button>
                ))}
                {sameProgram.map((c) => {
                  const otherFee = readFee(c.tuitionFee);
                  return (
                    <button key={c.id} type="button" onClick={() => navigate(`/agent/programs/${c.id}`)} className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-[#F9FAFB] text-left">
                      {c.university ? <UniversityLogo university={c.university} size="sm" /> : <Building2 size={20} className="text-gray-400" />}
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-gray-900 truncate">{c.university?.name || 'All universities'}</span>
                        <span className="block text-xs text-gray-500">{c.university?.country}{otherFee ? ` · ${otherFee.text}` : ''}</span>
                      </span>
                      <ChevronRight size={16} className="text-gray-300 shrink-0" />
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {related.length > 0 && (
            <Card className="border-[#E5E7EB] bg-white shadow-none">
              <CardHeader className="border-b border-gray-100 px-5 py-3.5">
                <CardTitle className="text-sm font-bold text-gray-900 font-['Outfit']">Related programs</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                {related.map((c) => (
                  <button key={c.id} type="button" onClick={() => navigate(`/agent/programs/${c.id}`)} className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-[#F9FAFB] text-left">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-gray-900">{c.name}</span>
                      <span className="block text-xs text-gray-500">{c.university?.name || 'All universities'}</span>
                    </span>
                    {c.level && <Badge variant="outline" className="text-[10px] shrink-0">{c.level}</Badge>}
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ApplicationModal
        open={applyOpen}
        onOpenChange={setApplyOpen}
        defaultUniversityId={universityId}
        defaultCourseId={program.id}
        onSuccess={() => navigate('/agent/applications')}
      />
    </div>
  );
};

export default AgentProgramDetailPage;
