import React from 'react';

// App owns room authentication and networking. Passport owns learning and keepsakes.
export function ChatCamp({children,onFriends}){
 return <section className="chat-inbox" aria-labelledby="chat-inbox-title"><div className="chat-inbox-heading"><h2 id="chat-inbox-title">Your table chats</h2><p>Play together. Keep the conversation close.</p></div><div className="chat-inbox-rooms">{children}</div>{onFriends&&<button type="button" className="chat-saved-friends" onClick={onFriends}>Saved friends <span aria-hidden="true">→</span></button>}<p className="chat-inbox-note">Conversations live in your private game rooms.</p></section>;
}
