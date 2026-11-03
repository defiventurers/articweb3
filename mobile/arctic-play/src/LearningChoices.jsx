import React from 'react';
import {ChevronRight,BookOpen} from 'lucide-react';
import {MascotPortrait} from './Companions.jsx';
import {courseCompletion,COURSE_KEY} from './curriculum.js';
import {read} from './storage.js';
export function LearningChoices({id,preferences,onChoose}){
 const progress=courseCompletion(id,read(COURSE_KEY+'.'+id,{}));
 const choices=[['quick-rules','Quick Rules','polly','Move, capture and try the essentials.'],['full-rules','Full Rules','abster','Every rule, guided one step at a time.'],['movement','Learn piece movement','pengu','Choose a piece and practise its legal moves.']];
 return <nav className="learning-choice-buttons" aria-label="Ways to learn">{choices.map(([key,title,host,description])=><button key={key} type="button" aria-label={title} onClick={()=>onChoose(key)}>{preferences.mode!=='off'?<MascotPortrait host={host} mood="wave" motion={preferences.mode==='lively'&&preferences.motion}/>:<BookOpen size={29}/>}<span><strong>{title}</strong><small>{description}</small>{key==='full-rules'&&<em>{progress.percent}% complete</em>}</span><ChevronRight size={21}/></button>)}</nav>;
}
