# Cờ Tư Lệnh — YouTuber Rules

Accepted implementation: an additional selectable profile, `youtuber_rules`, default for new matches. All four historical profile IDs and their earlier behaviour remain available. This is a modern Vietnamese game by Nguyễn Quý Hải, approximately 2010. The Antarctic artwork is a fantasy adaptation, not a claim about its historical origin or an official licensed edition.

## Evidence and scope

Primary source: [AncientChess instruction video](https://www.youtube.com/watch?v=bdbllE9d4Ok), supplied as a complete 28:29.6 upload. Full narration and visual demonstrations were reviewed for the accompanying *YouTuber’s Version* rulebook. SHA-256 of the reviewed upload: `70f21ba5da75cb76c5379a4fe0b6b249a01ef179cc7727dba8007a0a2b4ff495`.

Starting repository: current `main`, `e2d1ec69dd5a2c11f774ae1836f4c347e27410f2`. This work also incorporates the earlier carrier fixes from PR #62, `5b01079a788c738e86688880d2d2271853b6c320`, rather than losing those repairs. Rules protocol is now `co-tu-lenh-practice-0.5`; the server engine is generated from the same frontend rules file. Android release target: 5.7.3, code 82, package `xyz.arcticdominion.play`.

The shared engine, server and local/bot UI implement the following. Metadata and every explicit app clarification are bundled in `frontend/public/assets/co-tu-lenh/youtuber-rules-v1.json`.

| Video evidence | Implementation |
| --- | --- |
| 0:43–2:10 | Clear orthogonal Commander travel, adjacent capture, no entering or crossing the other Commander’s unblocked sightline. Own Commander must remain safe. |
| 2:13–7:58 | Infantry/Engineer one orthogonal; Tank two orthogonal; Militia one in eight directions; Artillery three; Anti-aircraft one; Missile two orthogonal or one diagonal. Heavy guns use fords/Engineer, with a capturing river-crossing exception. |
| 7:58–11:04 | Aircraft four in eight directions, overflight, optional strike-and-return except against Aircraft, no open-sea landing, friendly Navy boarding and defended sacrificial attacks. |
| 11:04–12:11 | Artillery, Aircraft and Navy bypass HQ protection. Other attackers destroy HQ first, leave the Commander alive, and stay at the firing point. |
| 12:15–14:48 | Personnel ride Tank or Aircraft; Navy also carries Tanks and Aircraft; Engineer ferries Artillery, Anti-aircraft and Missile. A four-piece Navy stack is possible. No BGA three-piece cap is imposed on this profile. |
| 14:48–17:06 | Navy cannot enter or cross the reefs; four on water, three against land targets; one sea and one land attack may share a turn. Original stack members may separate and attack within a single turn. |
| 17:06–17:56 | Artillery jumping capture replaces its victim; no empty-point jump. Defence ignores intervening pieces. |
| 17:56–22:32 | Persistent Hero promotion by check and by being the last mobile defender. Extra range/diagonals, Missile three orthogonal/two diagonal, heroic Aircraft immunity. Defence circles stay unchanged. |
| 22:35–26:12 | Commander, two Aircraft, two Navy or six core land units decide victory. A last required unit may be mated. Optional clocks use capture points; Commander-mate 200 bonus requires the higher captured score. Booklet-only bonuses are not imported. |
| 26:15–28:22 | Exact 38-piece final setup, including late restored Blue Infantry; fords at x=5 and x=7. Secret setup is offered as an advanced choice. |

## Explicit playable clarifications — still Research Draft

The video does not provide a complete machine specification. These choices are disclosed in the UI and metadata rather than attributed to the presenter:

- Red moves first. Secret deployment uses empty unstacked points within each side’s five home rows with terrain constraints. Both armies reveal after both players confirm. Online packets redact the opposing coordinates throughout setup.
- Eligible cargo has no invented numeric or per-type quota; a finite 19-piece army bounds any stack. Every passenger/descendant must be compatible with both its parent and root. Boarding means moving onto the carrier. Carrier pickup and aircraft passenger drop-and-return are retained in the earlier profiles only.
- Original stack members may each act once per turn. Newly boarding ends a turn. Navy may use each weapon once instead of taking an additional independent move; its second shot starts from its current location. The existing Navy behaviour of passing occupied water points is retained, since the video does not settle that obstruction case.
- Destroyed carriers lose their remaining passengers. Aircraft and cargo destroyed by interception score for the defending side. HQ has the narrated Commander-survival exception. The last defender is counted as the last living mobile unit excluding Commander and HQ, including passengers. Hero Artillery gains one step by the general rule; the Commander retains the engine’s general Hero bonus, a case the video does not demonstrate.
- Normal aircraft transit through coverage is intercepted. A defended destination allows a successful sacrifice even if an earlier zone was crossed. Several-zone combat ordering is not fully specified by the video.
- Commander safety is checked after each component action. Automatic unavoidable capture uses a bounded whole-turn escape proof. If the proof budget is exhausted, the match continues. Players can concede an agreed forced capture; this is not presented as complete arbitrarily deep mate solving.
- If both divisions are eliminated in one action, the acting side’s completed victory is checked first, retaining prior engine ordering.
- Optional 10/15-minute clocks apply to the whole match. Tied captured scores draw. The 200 bonus requires a strict lead. The video gives no per-player clock allocation or tie procedure. No Commander 100, Hero +10, or general +100 mate bonus is applied.

## Release gates and limits

Tests cover video-specific rules, all older profiles/carrier regression, client/server parity, seat authorization and revisions, per-seat setup redaction, server-controlled time expiry, real WebSocket bootstrap integration, Android packaged UI, board rotation/zoom, and all original game engines. A web bundle or DOM test does not prove a physical Android installation, real Para/login success or public production multiplayer compatibility.

The public backend must run this same v0.5 engine/service before the updated app can open online rooms. Older servers are rejected explicitly. Do not update a public APK feed as part of this source change. Commercial rights approval and full advanced rule adjudication remain separate launch gates. No claim of production deployment or publisher approval is made.
