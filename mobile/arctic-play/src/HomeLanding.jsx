import React from 'react';
import {ArrowRight,Play,Users} from 'lucide-react';
import {BRAND} from './brand.js';
import {CELEBRATION_ART} from './celebration.js';
import {RoomCodeInput} from './RoomCodeInput.jsx';

export function HomeLanding({onBrowse,onJoin,onContinue,continueLabel,roomCode='',onRoomCode,story=true,discovery}){
  return <section className="home-landing harbor-home" aria-labelledby="home-intention">
    <p className="home-world-kicker">{story?'WELCOME TO LANTERN HARBOR':'SEVEN REMARKABLE STRATEGY GAMES'}</p>
    <div className="harbor-panorama"><img className="home-world-art" src={CELEBRATION_ART.home} alt="Polly, Pengu, Retsba and Abster welcome you to Lantern Harbor" fetchPriority="high" width="1200" height="800"/></div>
    <div className="home-world-copy">
      <h2 id="home-intention">{story?'An Endless Celebration of Timeless Board Game Classics.':<>Find your next <em>great game.</em></>}</h2>
      {story?<div className="home-celebration-story">
        <p>Kingdoms fell. Empires faded. But their wisdom found a secret home.</p>
        <p>Far from the chaos of the modern world, a hidden kingdom in Antarctica kept the celebration alive.</p>
        <p className="home-story-finale"><span>Centuries of stories.</span><strong>Take Your Seat. Relive History.</strong></p>
      </div>:<p className="home-motto">{BRAND.tagline}</p>}
    </div>
    {discovery}
    <div className="home-play-actions">
      {onContinue&&<button className="secondary resume-table home-continue" onClick={onContinue}><Play size={17}/>{continueLabel||'Continue playing'}</button>}
      <button className="primary home-explore" onClick={onBrowse}>{story?'Explore the Halls':'Find a game'} <ArrowRight size={22}/></button>
      <div className="home-join-controls">
        <button className="secondary home-join-sticker" onClick={onJoin}><Users size={20}/> Join friends</button>
        <div className="home-room-code"><RoomCodeInput id="home-room-code" value={roomCode} onChange={onRoomCode} onEnter={onJoin}/></div>
      </div>
    </div>
  </section>;
}
