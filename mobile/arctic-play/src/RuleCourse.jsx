import React,{useEffect,useMemo,useState} from 'react';
import {ArrowRight,List} from 'lucide-react';
import {courseCards,courseProgress,courseCompletion,COURSE_KEY} from './curriculum.js';
import {LearningActivity} from './LearningActivity.jsx';
import {TeachingHost} from './TeachingHost.jsx';
import {read,write} from './storage.js';
export function RuleCourse({id,preferences,index,onIndex,onSolo,onTopics,onPractice,onFinish,onDiscovery,onLearningEvent}){
 const cards=useMemo(()=>courseCards(id),[id]),card=cards[Math.min(index,cards.length-1)],key=COURSE_KEY+'.'+id;
 const[finished,setFinished]=useState(false),[progress,setProgress]=useState(()=>courseProgress(id,read(key,{})));
 useEffect(()=>{setFinished(false);setProgress(courseProgress(id,read(key,{})));},[id,index]);
 function save(next){write(key,next);setProgress(next);}
 function complete(){const saved=courseProgress(id,read(key,{}));save({...saved,index,practiced:{...saved.practiced,[card.key]:saved.practiced[card.key]||Date.now()}});}
 function next(){const saved=courseProgress(id,read(key,{}));if(!saved.practiced[card.key])return;const untried=cards.findIndex(c=>!saved.practiced[c.key]),nextIndex=index===cards.length-1?(untried<0?index:untried):index+1;save({...saved,index:nextIndex,read:{...saved.read,[card.key]:saved.read[card.key]||Date.now()}});if(index===cards.length-1&&untried<0)setFinished(true);else onIndex(nextIndex);}
 const completion=courseCompletion(id,progress);
 return <section className="full-rules-guide"><div className="rule-health"><div><strong>Full Rules</strong><span>{completion.percent}% complete</span></div><progress aria-label="Full rules completed" value={completion.percent} max="100"/><small>{completion.done} of {completion.total} steps completed · Saved on this phone</small>{onTopics&&<button onClick={onTopics}><List size={17}/> Browse rules</button>}</div>{finished?<section className="learning-ready full-rule-course"><h2>100% — guide complete!</h2><TeachingHost host="abster" preferences={preferences} minimal success>You explored every rule with the board. Flippers up! Let’s try a game when you’re ready.</TeachingHost><button className="primary full" onClick={onPractice||onFinish}>{onPractice?'Quick play (vs bot)':'Learning choices'}<ArrowRight size={17}/></button></section>:<LearningActivity key={card.key} id={id} preferences={preferences} request={{task:'course',key:card.key}} cardKey={card.key} index={index} count={cards.length} title={card.title} eyebrow={card.chapter+' · '+(index+1)+' / '+cards.length} cue={card.cue} detail={card.detail} host={card.host} role={card.role} onSolo={onSolo} onDiscovery={onDiscovery} onLearningEvent={onLearningEvent} onComplete={complete} onNext={next} nextLabel={index===cards.length-1?'Finish guide':'Next rule'} className="full-rule-course interactive-course"/>}</section>;
}
