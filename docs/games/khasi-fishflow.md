# Khasi Fishflow

**Heritage ruleset:** Mawkar Katiya  
**Region:** Khasi Hills, Meghalaya, India  
**Engine:** Relay sowing / Mancala  
**Players:** 2  
**Ruleset ID:** `mawkar-katiya-research-0.1.0`  
**Release status:** Research-playable, unranked

## Implemented rules

- Two rows of seven pits.
- Five counters in every pit at opening.
- Clockwise sowing through active pits only.
- Relay sowing when the final counter lands in an occupied pit.
- Opposite-pit capture when the final counter lands in an empty pit.
- Multi-round inventories, five-counter refills and inactive pits.
- Match loss when a player cannot refill one pit.
- Server-authoritative online rooms, reconnect, action audit log, proof hash and match history.

## Handicap policy

The historical account includes unusual surplus/deficiency handicap clauses, but the exact wording still needs direct-page transcription from H. C. Das Gupta. The build therefore does **not** claim a canonical historical handicap.

Local practice exposes a separate modern unranked `pit-transfer` handicap. One five-counter pit is removed from the stronger side and transferred to the beneficiary's store. Online rooms always use `none`.

## Evidence gate before ranked heritage release

1. Transcribe the original stopping and opposite-capture wording.
2. Transcribe every historical surplus/deficiency handicap clause.
3. Confirm whether the landing counter is included in an opposite capture.
4. Publish a new immutable ruleset version after source closure.

## Tchuka Ruma connection

`frontend/src/games/sowing/relayEngine.js` is the shared relay-sowing primitive used by Khasi Fishflow and Ruma Ice Puzzle. Tchuka Ruma remains a solo puzzle with a visible provenance warning.
