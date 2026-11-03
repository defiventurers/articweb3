import { chooseAction, actionKey } from './rules.js';
self.onmessage = ({ data }) => {
  try { const action = chooseAction(data.state, { difficulty: data.difficulty, budgetMs: data.difficulty === 'hard' ? 650 : 220, maxNodes: data.difficulty === 'hard' ? 2400 : 900 }); self.postMessage({ id: data.id, action, key: action && actionKey(action) }); }
  catch (error) { self.postMessage({ id: data.id, error: error.message }); }
};
