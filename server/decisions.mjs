export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
import { villageQuestion } from './village.mjs';
import { questionFor } from '../dist/recipes.js';
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const unit = x => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 1;
export function buildRequest(body) {
  if (!object(body)) throw new HttpError(400, 'Provide a recipe and context.');
  try { return { model: 'jev-latest', state: body.context, questions: { decision: body.scenario === 'village' ? villageQuestion(body.context) : questionFor(body.scenario, body.context) } }; }
  catch (error) { throw new HttpError(400, error.message); }
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
