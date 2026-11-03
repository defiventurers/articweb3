import React from 'react';
import {ChevronRight,Eye,Lightbulb,RotateCcw} from 'lucide-react';
import {LearningPanel} from './LearningPanel.jsx';

export function LearningHelp({onClose,description,note,onHint,onWatch,onReplay,onOpenLesson,variants,variant,onVariant,markers=[]}){
  return <LearningPanel title="A little help" onClose={onClose}>
    <p className="learning-help-cue">{description}</p>
    {onHint&&<button className="minimal-option" onClick={()=>{onClose();onHint();}}><Lightbulb size={19}/><span>Show a destination</span><ChevronRight size={17}/></button>}
    {onWatch&&<button className="minimal-option" onClick={()=>{onClose();onWatch();}}><Eye size={19}/><span>Watch once</span><ChevronRight size={17}/></button>}
    {onOpenLesson&&<button className="minimal-option" onClick={()=>{onClose();onOpenLesson();}}><ChevronRight size={19}/><span>Open full lesson</span><ChevronRight size={17}/></button>}
    {variants&&<details className="minimal-detail"><summary>Compare setups <ChevronRight size={15}/></summary><label className="minimal-field">Change the example<select aria-label="Example setup" value={variant} onChange={e=>{onClose();onVariant(e.target.value);}}>{variants.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><p>{variants.find(v=>v[0]===variant)?.[2]}</p></details>}
    <details className="minimal-detail"><summary>Why this rule? <ChevronRight size={15}/></summary><p>{note}</p>{!!markers.length&&<ol className="discovery-notices">{markers.map((m,i)=><li key={m.cell}><span>{i+1}</span>{m.label}</li>)}</ol>}</details>
    {onReplay&&<button className="text-button minimal-replay" onClick={()=>{onClose();onReplay();}}><RotateCcw size={16}/> Try again</button>}
  </LearningPanel>;
}
