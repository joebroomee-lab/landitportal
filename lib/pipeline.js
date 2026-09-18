// Admin's manually-advanced CRM pipeline for a match — shared between the
// server action (app/admin/matches/actions.js, which validates against and
// writes matches.pipelineStage) and the dashboard UI (AdminDashboard.js's
// PipelineStepper). Lives outside actions.js because a "use server" file
// may only export async functions, not plain data like this array.
export const PIPELINE_STAGES = [
  { key: "matched", label: "Matched" },
  { key: "first_interview", label: "1st Interview" },
  { key: "further_interviews", label: "Further Interviews" },
  { key: "formal_offer", label: "Formal Offer" },
  { key: "hired", label: "Hired" },
];

export const PIPELINE_STAGE_KEYS = PIPELINE_STAGES.map((s) => s.key);
