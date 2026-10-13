import {parseCommand} from './core.mjs';
// New commands reuse the controller's existing authorization and event checks.
export function parseWorkflowCommand(body=''){
  const original=parseCommand(body);if(original)return original;
  const match=String(body).trim().match(/^\/(refresh-research|review)(?:\s+([\s\S]*))?$/i);
  return match?{name:match[1].toLowerCase(),arg:(match[2]||'').trim()}:null;
}
