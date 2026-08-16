import { Button } from "@/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import {
  getParticipationAdvisorQueryOptions,
  getParticipationConsentQueryOptions,
  getParticipationParticipantsQueryOptions,
  getParticipationQueryOptions,
  getParticipationReviewQueryOptions,
  getParticipationStatusQueryOptions,
} from "@bmhk-2026/client/query-options";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueries, useQuery } from "@tanstack/react-query";

import { DetailFields } from "@/features/registration/detail-fields";
import { personName } from "@/features/registration/review-utils";

export const Route = createFileRoute("/_auth/participations/$teamId")({ component: ParticipationDetailPage });

function DocumentLink({ label, url }: { readonly label: string; readonly url: string | null }) {
  return url ? <a className="text-primary underline" href={url} rel="noopener" target="_blank">{label}</a> : <span>{label}: —</span>;
}

function ParticipationDetailPage() {
  const { teamId } = Route.useParams();
  const teamQuery = useQuery(getParticipationQueryOptions(teamId));
  const [participantsQuery, advisorQuery, consentQuery, statusQuery, reviewQuery] = useQueries({
    queries: [
      getParticipationParticipantsQueryOptions(teamId),
      getParticipationAdvisorQueryOptions(teamId),
      getParticipationConsentQueryOptions(teamId),
      getParticipationStatusQueryOptions(teamId),
      getParticipationReviewQueryOptions(teamId),
    ],
  });
  const team = teamQuery.data;

  if (teamQuery.isLoading) return <p>Loading participation...</p>;
  if (teamQuery.isError || !team) return <p className="text-destructive">Unable to load this participation.</p>;

  return <section className="flex flex-col gap-5"><Button className="self-start" render={<Link to="/participations" />} variant="outline">Back to participations</Button><h1 className="font-semibold text-3xl">{team.name}</h1><DetailFields title="Team" fields={[{ label: "School", value: team.school }, { label: "Members", value: team.memberCount }, { label: "Submission", value: statusQuery.data?.submissionState }, { label: "Submitted at", value: statusQuery.data?.submittedAt?.toLocaleString() }]} /><Card><CardHeader><CardTitle>Participants</CardTitle></CardHeader><CardContent className="flex flex-col gap-5">{participantsQuery.data?.map((participant) => <DetailFields key={participant.id} title={`Participant ${participant.index}: ${personName(participant)}`} fields={[{ label: "Email", value: participant.email }, { label: "Phone", value: participant.phone }, { label: "Date of birth", value: participant.dateOfBirth }, { label: "Identity document", value: participant.identityDocument ? "Available" : "Missing" }, { label: "Academic record", value: participant.academicRecordDocument ? "Available" : "Missing" }, { label: "Portrait photo", value: participant.portraitPhoto ? "Available" : "Missing" }]} />)}</CardContent></Card>{advisorQuery.data ? <DetailFields title={`Advisor: ${personName(advisorQuery.data)}`} fields={[{ label: "Email", value: advisorQuery.data.email }, { label: "Phone", value: advisorQuery.data.phone }, { label: "Identity document", value: advisorQuery.data.identityDocument ? "Available" : "Missing" }, { label: "Teacher status document", value: advisorQuery.data.teacherStatusDocument ? "Available" : "Missing" }]} /> : null}<DetailFields title="Review" fields={[{ label: "Review status", value: reviewQuery.data?.status ?? "PENDING_REVIEW" }, { label: "Team registration", value: statusQuery.data?.team }, { label: "Terms and conditions", value: statusQuery.data?.termsAndConditions }, { label: "Consent recorded", value: consentQuery.data ? "Available" : "Missing" }]} /><Card><CardHeader><CardTitle>Documents</CardTitle></CardHeader><CardContent className="flex flex-col gap-2">{participantsQuery.data?.flatMap((participant) => [<DocumentLink key={`${participant.id}-identity`} label={`Participant ${participant.index} identity document`} url={participant.identityDocument?.url ?? null} />, <DocumentLink key={`${participant.id}-academic`} label={`Participant ${participant.index} academic record`} url={participant.academicRecordDocument?.url ?? null} />, <DocumentLink key={`${participant.id}-portrait`} label={`Participant ${participant.index} portrait`} url={participant.portraitPhoto?.url ?? null} />])}{advisorQuery.data ? <><DocumentLink label="Advisor identity document" url={advisorQuery.data.identityDocument?.url ?? null} /><DocumentLink label="Advisor teacher status document" url={advisorQuery.data.teacherStatusDocument?.url ?? null} /></> : null}</CardContent></Card></section>;
}
