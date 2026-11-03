import React from 'react';
import {game} from './games.ts';
import {GAME_HISTORY} from './gameHistory.js';
export function GameTitle({id}){return <>{game(id).name}<span className="game-translation"> ({GAME_HISTORY[id].english})</span></>;}
export function GamePeriod({id,className=''}){return <span className={'game-period '+className}>{GAME_HISTORY[id].period}</span>;}
export function GameHistory({id}){const h=GAME_HISTORY[id];return <section className="game-history"><h4>Name & origins</h4><p>{h.literal}</p><p>{h.detail}</p><ul>{h.sources.map(([label,url])=><li key={url}><a href={url} target="_blank" rel="noreferrer">{label}</a></li>)}</ul></section>;}
