# Arctic Game Kingdoms forensic matrix

This matrix records the inspection of the current `main` source, the current application router and catalog, frontend and server tests, remote branches, and GitHub pull requests. It also records the selective integration now present on the local integration branch.

| # | Game | Main before integration | Branch / PR evidence | Current integration status | Safe action |
|---:|---|---|---|---|---|
| 1 | Arctic Dominion | Production multiplayer flow and catalog availability on main | Not needed | Existing and preserved | Preserve |
| 2 | Nine Ice Forts | Route, frontend engine, backend, and tests on main | PR #4/#5 merged | Existing and preserved | Preserve |
| 3 | Four-Wing Ice Hunt | Route, frontend engine, backend, and tests on main | PR #6 merged | Existing and preserved | Preserve |
| 4 | Fishflow | Route, frontend engine, backend, and tests on main | PR #7 merged | Existing and preserved | Preserve |
| 5 | Break the Ice | Route, frontend engine, backend, and tests on main | PR #8 merged | Existing and preserved | Preserve |
| 6 | Ice Hunters | Route, frontend engine, backend, and tests on main | PR #9 merged | Existing and preserved | Preserve |
| 7 | Sixteen Ice Warriors | Route, frontend engine, backend, and tests on main | PR #10 merged | Existing and preserved | Preserve |
| 8 | Glacier Trail | Route, frontend engine, backend, and tests on main | PR #11 merged | Existing and preserved | Preserve |
| 9 | Crown Run | Preview-only on main; no route import or game folder | Complete frontend, backend, and test artifacts in the stacked feature chain; PR #12 merged into that chain | Imported and routed | Integrated selectively |
| 10 | Forty Glacier Guards | Preview-only on main | Complete frontend, backend, and test artifacts on the cumulative feature branch; PR #13 carries it forward | Imported and routed | Integrated selectively |
| 11 | Sky Temple Run | Preview-only on main | Complete frontend, backend, and test artifacts on the cumulative feature branch; PR #15 merged into that chain | Imported and routed | Integrated selectively |
| 12 | Ice Rings | Preview-only on main | Complete frontend, backend, and test artifacts on the cumulative feature branch; PR #16 merged into that chain | Imported and routed | Integrated selectively |
| 13 | Cowrie Kingdoms | Preview-only on main | Complete frontend, backend, and test artifacts on the cumulative feature branch; PR #17 merged into that chain | Imported and routed | Integrated selectively |
| 14 | Two Stones | Preview-only on main | Complete frontend, backend, and test artifacts on the cumulative feature branch; PR #18 merged into that chain | Imported and routed | Integrated selectively |
| 15 | Aurora Vulture | Preview-only on main | Complete frontend, backend, and test artifacts on the cumulative feature branch; PR #19 merged into that chain | Imported and routed | Integrated selectively |
| 16 | Khasi Fishflow | Real app, route, rules, and server test on main; marked `PLAYABLE · RESEARCH` | Later branches contain a different or stale version | Existing main version preserved; all-games backend bootstrap extends it | Preserve main implementation |
| 17 | Seven Ice Rings | Preview-only on main | Complete frontend, backend, and test artifacts on the cumulative feature branch; PR #23 merged into that chain | Imported and routed | Integrated selectively |
| 18 | Ruma Ice Puzzle | Real solo app and rules on main; unit test on main | PR #34/#35 merged | Existing and preserved | Preserve |
| 19 | Polar Tablan | Preview-only on main | Complete frontend, backend, and test artifacts on the cumulative feature branch; PR #20 merged into that chain | Imported and routed | Integrated selectively |
| 20 | Sige | Preview-only on main | Complete frontend, backend, and test artifacts on the cumulative feature branch; PR #22 merged into that chain | Imported and routed | Integrated selectively |
| 21 | Aurora Ganjifa Academy | Preview-only on main | Complete frontend, backend, and test artifacts on the cumulative feature branch; PR #21 merged into that chain | Imported and routed | Integrated selectively |

## Safe integration boundary

The cumulative feature branch was not merged wholesale because it predates the current `main` and would overwrite or remove newer work, including the Arctic launcher, current Khasi Fishflow and Ruma versions, launcher tests, and repository planning assets. The integration instead imports only the eleven missing game directories, their per-game server rules/services/bootstrap files, per-game tests, required socket clients and shared socket helpers, styles, catalog availability changes, route wiring, and the all-games backend package integration.

No new game engine was invented from scratch. The imported implementations were taken from the verified feature history, and the current main versions of Arctic Dominion, Khasi Fishflow, and Ruma Ice Puzzle remain the source of truth for those titles.

## References

[1]: https://github.com/defiventurers/articweb3 "defiventurers/articweb3 repository"
[2]: https://github.com/defiventurers/articweb3/pull/13 "Forty Glacier Guards pull request"
[3]: https://github.com/defiventurers/articweb3/pull/15 "Sky Temple Run pull request"
[4]: https://github.com/defiventurers/articweb3/pull/16 "Ice Rings pull request"
[5]: https://github.com/defiventurers/articweb3/pull/17 "Cowrie Kingdoms pull request"
[6]: https://github.com/defiventurers/articweb3/pull/18 "Two Stones pull request"
[7]: https://github.com/defiventurers/articweb3/pull/19 "Aurora Vulture pull request"
[8]: https://github.com/defiventurers/articweb3/pull/20 "Polar Tablan pull request"
[9]: https://github.com/defiventurers/articweb3/pull/21 "Aurora Ganjifa Academy pull request"
[10]: https://github.com/defiventurers/articweb3/pull/22 "Sige pull request"
[11]: https://github.com/defiventurers/articweb3/pull/23 "Seven Ice Rings pull request"
[12]: https://github.com/defiventurers/articweb3/pull/34 "Khasi Fishflow and Ruma pull request"
[13]: https://github.com/defiventurers/articweb3/pull/35 "Ruma Ice Puzzle upgrade pull request"
