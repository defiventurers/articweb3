# Aurora Ganjifa Academy

## Release-one ruleset

- Product: Aurora Ganjifa Academy
- Traditional family: Ganjifa
- Selected deck: Mughal Ganjifa
- Ruleset ID: `aurora-ganjifa-academy / ignca-mughal-teaching-baseline-1.0.0`
- Source baseline: Indira Gandhi National Centre for the Arts, *Ganjifa — Traditional Playing Cards of India* workshop report
- Players: three or four
- Engine: hidden-state trick taking

This release implements an institutional teaching baseline. It is not presented as universal Ganjifa law.

## Deck

The selected teaching pack has 96 circular cards divided into eight suits of twelve:

- strong suits: Taj, Safed, Samsher and Ghulam;
- weak suits: Chang, Surkh, Barat and Qimash;
- every suit contains Raja, Pradhan and numeral cards Ace through Ten.

Raja and Pradhan are the two court cards and remain the top two cards in every suit.

For strong suits, numeral strength runs Ace, Two, Three through Ten. For weak suits the numeral sequence reverses: Ten, Nine, Eight through Ace.

## Deal and turn

- Securely shuffle the complete pack.
- Deal every card anticlockwise and equally.
- Three players receive 32 cards each.
- Four players receive 24 cards each.
- The leader plays one card.
- Every later player must follow the led suit when holding it.
- A player void in the led suit may discard any card.
- Only cards in the led suit compete for the trick.
- The highest denomination of that suit collects every card and leads the next trick.
- There is no permanent trump in this queue.

## Victory

When all hands are empty, the player who collected the most cards wins. Equal highest totals are recorded as a shared result rather than receiving an invented historical tie-break.

## Declared digital policies

The IGNCA workshop report says the player with the highest denomination begins but does not identify one unique suit among multiple Rajas. This digital queue uses the holder of the Taj Raja as the opening player.

The queue records equal highest captured-card totals as a shared result.

Changing either policy requires a new ruleset version.

## Hidden-state architecture

- The server creates the complete deck and performs the secure shuffle.
- A SHA-256 commitment binds the match ID, secret nonce and complete shuffled order before play.
- The nonce and shuffled order remain server-private during the deal.
- Every wallet receives a personalized state projection containing only its own hand.
- Other hands are represented only by card counts.
- Public room listings receive no card faces.
- Reconnect restores the same private hand projection.
- The current trick and completed tricks are public.
- The shuffle reveal is published after the deal for audit verification.
- Every play enters an audit hash chain and the completed deal receives a final proof hash.

Wallet identity establishes the room profile and reconnect target. It is not described as cryptographic wallet-signature authentication.

## Product modes

- Three-player practice with two bots
- Four-player practice with three bots
- Three-player pass-device mode
- Four-player pass-device mode
- Follow-Suit Lesson
- Public three- or four-seat online rooms
- Private room codes
- Persistent reconnectable tables
- Game-specific history

Pass-device mode hides the next hand behind an explicit handoff screen after every play.

## Family boundary

This teaching release does not import:

- Dashavatara suit themes;
- Dukkal, Deni, Talafa, Natavani, Tavani, Hardu, Sokta, Akheri or Rangeri obligations;
- dynamic hukm systems;
- Ramayana Hamrang or Ekrang partnership rules;
- payments between deals;
- a permanent trump;
- gambling, entry fees or token rewards.

Advanced regional tables require their own source validation, deck record, ruleset ID and queue.

## Art boundary

The frontend uses original arctic circular-card graphics and suit symbols. IGNCA archive images are not copied into the product because the archive states that electronic publication requires permission.

## Release boundary

Free play and teaching only. No entry fees, wagering, payouts or token rewards.
