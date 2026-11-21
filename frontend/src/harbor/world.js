// Positions use metres in the XZ plane. The same footprints drive scenery and collision.
export const HALLS = [
  { key: "temple", name: "Chaturanga Temple", sign: "Chaturanga", x: -14, z: 0, width: 9, depth: 8,
    game: "arctic-dominion", note: "Chaturanga has roots in India. Its name refers to four divisions of an army. Arctic Dominion is our modern, dice-activated game for four kingdoms.",
    source: "https://www.nms.ac.uk/discover-catalogue/chess-and-ludo-board-games-with-south-asian-origins",
    actions: [
      ["Play Arctic Dominion", "game=arctic-dominion"],
      ["Learn piece movement", "game=arctic-dominion&movement=1"],
      ["Play local Chaturaji · modern team variant", "game=heritage-arcade&table=chaturaji"]
    ] },
  { key: "pavilion", name: "Xiangqi Pavilion", sign: "Xiangqi", x: -7.7, z: -15, width: 8.6, depth: 7,
    game: "heritage-arcade", note: "The river divides this Chinese chessboard. Each general commands from a palace. Open the Xiangqi table for its rules, bots, local seats and online setup.",
    actions: [["Open Xiangqi table", "game=heritage-arcade&table=xiangqi"]] },
  { key: "palace", name: "Shogi Palace", sign: "Shogi", x: 7.7, z: -15, width: 8.6, depth: 7,
    game: "shogi-frozen-shogunate", note: "On the Japanese nine-by-nine board, a captured piece can return on your side. The Frozen Shogunate table teaches drops and promotion and offers local, bot and online play.",
    actions: [["Open Frozen Shogunate", "game=shogi-frozen-shogunate"]] },
  { key: "council", name: "San You Qi Council Hall", sign: "San You Qi", x: 14, z: 0, width: 9, depth: 8,
    game: "san-you-qi", note: "Three Friends Chess brings three armies to a shared junction. Trace the paths between the three arms and meet the Fire and Flag pieces in the movement guide.",
    actions: [["Open Three Friends Chess", "game=san-you-qi"], ["Learn piece movement", "game=san-you-qi&movement=1"]] }
];

export const ARRIVAL = { x: 0, z: 21 };
export const ROOM_ENTRY = { x: 0, z: 5.8 };
export const door = hall => ({ x: hall.x, z: hall.z + hall.depth / 2 + 1.65 });
