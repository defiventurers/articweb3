import React from 'react';
import {BookOpen,Zap} from 'lucide-react';

export function RulesButtons({onQuick,onFull,active}){
  return <nav className="rules-shortcuts" aria-label="Learn the rules">
    <button type="button" aria-label="Quick Rules" aria-pressed={active==='quick-rules'} onClick={onQuick}><Zap size={23} aria-hidden="true"/><span><strong>Quick Rules</strong><small>Goal & first turns</small></span></button>
    <button type="button" aria-label="Full Rules" aria-pressed={active==='full-rules'} onClick={onFull}><BookOpen size={23} aria-hidden="true"/><span><strong>Full Rules</strong><small>Every rule explained</small></span></button>
  </nav>;
}
