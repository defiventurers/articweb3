import React from 'react';
import CoTuLenhApp from '../../../frontend/src/games/co-tu-lenh/CoTuLenhApp.jsx';

/**
 * Cờ Tư Lệnh — source-labelled modern Vietnamese game, Antarctic visual adaptation.
 * Keep all legal moves in the shared frontend/server engine; do not fork mobile rules.
 * This route is separate from the seven heritage hall catalogue and avoids existing unlock gates.
 */
export function CoTuLenhMobile({onExit}) {
  return <CoTuLenhApp
    onExitToLibrary={onExit}
    assetBase="art/co-tu-lenh"
    wsEndpoint="wss://articweb3.onrender.com"
    inviteBaseUrl="https://arcticdominion.xyz/?game=co-tu-lenh"
  />;
}
