export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const nonempty = x => typeof x === 'string' && x.trim().length > 0;
const unit = x => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 1;
export function buildRequest(body) {
  if (!object(body) || !object(body.context)) throw new HttpError(400, 'Context must be a JSON object.');
  const { scenario, context } = body;
  let question;
  if (scenario === 'support') {
    if (!object(context.ticket) || !nonempty(context.ticket.message)) throw new HttpError(400, 'Provide ticket.message.');
    question = { type: 'choice', instructions: 'Which team should handle this support ticket?', criteria: { billing: 'Payments, charges, invoices or refunds', technical: 'Technical problems, bugs or access issues', other: 'Other support requests' } };
  } else if (scenario === 'github') {
    if (!nonempty(context.title) || typeof context.body !== 'string') throw new HttpError(400, 'Provide an issue title and body.');
    question = { type: 'choice', instructions: 'Which label best describes this issue?', criteria: { bug: 'An existing feature is not working as expected', enhancement: 'A request for new or improved functionality', question: 'A request for information or help' } };
  } else if (scenario === 'guardrails') {
    if (!nonempty(context.action) || (context.requires_approval !== undefined && typeof context.requires_approval !== 'boolean')) throw new HttpError(400, 'Provide action and an optional boolean requires_approval.');
    question = { type: 'noul', instructions: 'Is this proposed action a read-only operation on public information that can proceed without human approval? Answer no for destructive actions, credentials, private information, financial transactions, or unclear scope.' };
  } else if (scenario === 'rag') {
    if (!nonempty(context.query) || !nonempty(context.document)) throw new HttpError(400, 'Provide a query and document.');
    question = { type: 'score', instructions: 'How relevant is the document for answering the query?', criteria: ['Not relevant', 'Partially relevant', 'Directly relevant and useful'] };
  } else throw new HttpError(400, 'Choose a supported scenario.');
  return { model: 'jev-latest', state: context, questions: { decision: question } };
}
function probabilities(value, labels) {
  if (!object(value) || Object.keys(value).length !== labels.length || !labels.every(k => Object.hasOwn(value, k) && unit(value[k]))) throw new HttpError(502, 'Jev returned an invalid probability distribution.');
  if (Math.abs(labels.reduce((n, k) => n + value[k], 0) - 1) > .02) throw new HttpError(502, 'Jev returned an invalid probability distribution.');
  return Object.fromEntries(labels.map(k => [k, value[k]]));
}
export function normalizeResponse(raw, request, scenario) {
  const answer = raw?.answers?.decision;
  const question = request.questions.decision;
  if (!object(answer) || answer.type !== question.type) throw new HttpError(502, 'Jev returned an unexpected answer type.');
  const result = { mode: 'live', model: typeof raw.model === 'string' ? raw.model.slice(0, 100) : 'jev-latest', scenario };
  if (answer.type === 'choice') {
    const labels = Object.keys(question.criteria);
    if (!labels.includes(answer.choice) || !unit(answer.confidence)) throw new HttpError(502, 'Jev returned an invalid choice.');
    return { ...result, type: 'choice', decision: answer.choice, confidence: answer.confidence, probabilities: probabilities(answer.probabilities, labels) };
  }
  if (answer.type === 'noul') {
    if (!unit(answer.noul)) throw new HttpError(502, 'Jev returned an invalid yes/no probability.');
    const yes = answer.noul;
    return { ...result, type: 'yes-no', decision: yes > .5 ? 'yes' : 'no', confidence: Math.max(yes, 1 - yes), probabilities: { yes, no: 1 - yes }, requiresApproval: request.state.requires_approval === true };
  }
  if (typeof answer.score !== 'number' || !Number.isFinite(answer.score) || answer.score < 0 || answer.score > 2 || !unit(answer.confidence)) throw new HttpError(502, 'Jev returned an invalid score.');
  return { ...result, type: 'score', decision: answer.score.toFixed(2), score: answer.score, maxScore: 2, confidence: answer.confidence, probabilities: probabilities(answer.probabilities, ['0', '1', '2']), legend: question.criteria };
}
