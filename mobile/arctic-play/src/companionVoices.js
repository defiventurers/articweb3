const voices={
  polly:{
    hello:[c=>`Hello, ${c.name||'Explorer'}! There’s room for you at our table. Shall we find a game?`,()=>"I brought the warm welcome. You bring the curiosity. It’s good to see you!"],
    encourage:[()=>"One move at a time. You’re allowed to learn as you go.",()=>"A tricky game can still be a lovely time. Give yourself room to try."],
    thought:[()=>"My favourite opening? Saying hello to the person across the board.",()=>"The Frozen Archive has seven tables. Every one is an invitation to try something new."],
    celebrate:[()=>"Flippers up! A little celebration for showing up and playing.",()=>"High five! A thoughtful try deserves a little cheer, too."],
    breathe:[()=>"Let your shoulders relax. Take one slow breath. The next move can wait.",()=>"No rush from me. A sip of water and a moment to settle?"],
  },
  retsba:{
    hello:[c=>`${c.name||'Explorer'}, welcome to my corner of the Archive. Focused play, friendly company.`,()=>"Ready when you are. Bring your best curiosity; we’ll leave the pressure outside."],
    encourage:[()=>"Stay curious after a mistake. The next decision still belongs to you.",()=>"Take your time. A calm look at the whole board is part of playing well."],
    thought:[()=>"A good rival can teach you something. So can a game you don’t win.",()=>"I like a thoughtful rematch: same friends, a fresh chance to notice something."],
    celebrate:[()=>"A crisp flipper high five. Good effort at the table!",()=>"That’s the spirit. Respect for your rival, and a little pride in your effort."],
    breathe:[()=>"Unclench your hands. Breathe out. You can bring focus without bringing tension.",()=>"Even a focused penguin takes a break. Come back when you feel ready."],
  },
  pengu:{
    hello:[c=>`Hello, ${c.name||'Explorer'}. I’m Pengu. I like making a new board feel a little more familiar.`,()=>"A calm welcome from me. Every game has its own paths; we can take our time."],
    encourage:[()=>"You don’t need to remember everything at once. The game’s legal highlights are here to help.",()=>"Questions belong at the table. There’s no hurry to know every rule."],
    thought:[()=>"Our Antarctic home is imaginary. The games keep their own names, origins and traditions.",()=>"A shared rule gives two strangers a way to begin playing together. I rather like that."],
    celebrate:[()=>"A gentle high five! Another moment of curiosity in the Archive.",()=>"A little happy waddle for you. Enjoy the moment."],
    breathe:[()=>"Breathe in slowly, then out. Let your eyes rest before you return to the board.",()=>"The board will still be here. A comfortable pause is always welcome."],
  },
  abster:{
    hello:[c=>`Hi, ${c.name||'Explorer'}! I’m Abster. I’ll bring a little patience and plenty of curiosity.`,()=>"Welcome to my patch of the Archive. Shall we notice something new together?"],
    encourage:[()=>"You can explore without getting everything right. A new possibility is a fine place to start.",()=>"Small discoveries count. Notice one thing you didn’t see before."],
    thought:[()=>"Sometimes I look away for a moment and return with fresher eyes.",()=>"A familiar board can hide a new pattern. That’s what keeps me curious."],
    celebrate:[()=>"Flipper high five! A tiny happy waddle for a curious explorer.",()=>"A little burst of green cheer. It’s good to make time for play."],
    breathe:[()=>"Soften your gaze. Take a slow breath. You don’t have to solve everything this moment.",()=>"A little pause can be part of the adventure. Stretch, sip, and return at your own pace."],
  },
};


export function voiceLine(host,event,variant=0){const lines=voices[host]?.[event]||voices.polly.hello;return lines[((variant%lines.length)+lines.length)%lines.length]({});}
