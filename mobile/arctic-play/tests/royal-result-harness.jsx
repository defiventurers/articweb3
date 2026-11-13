import React from 'react';
import{createRoot}from'react-dom/client';
import{RoyalResult}from'../../../frontend/src/games/shared/RoyalResult.jsx';
const root=createRoot(document.querySelector('#root'));
window.renderRoyalOutcome=props=>root.render(React.createElement(RoyalResult,props));
window.unmountRoyalOutcome=()=>root.unmount();
