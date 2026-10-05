import { chooseXiangqiAction } from './engine';
self.onmessage = ({ data }) => {
  try { self.postMessage({ action: chooseXiangqiAction(data.state,data.difficulty) }); }
  catch (error) { self.postMessage({ error: String(error) }); }
};
