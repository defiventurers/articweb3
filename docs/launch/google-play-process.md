# Google Play route — checked November 11, 2026

The web release and Google Play availability have separate gates. No Console account, tester cohort or review submission was visible in this session; do not say “Google is reviewing the app” without that evidence.

| Decision | Current official requirement | Effect for November 14 |
|---|---|---|
| Personal account | No D-U-N-S field in Google's personal-account requirements. Intended for personal use; organisation/business cases have their own account type. | Not a guaranteed business/wallet shortcut. |
| Organisation account | Legal organisation identity, website, contact details and D-U-N-S. Google directs businesses and cryptocurrency software wallet providers to this type. | Appropriate business direction; classify embedded Para wallet accurately in Console/support. |
| D-U-N-S | Free through Dun & Bradstreet; can take up to 30 days. Alternatives are restricted to organisations actually unable to obtain one and government exceptions. | GST is not listed as a routine substitute. Do not assume an Indian brand can waive it to save time. |
| New personal account test | Accounts created after November 13, 2023 need at least 12 opted-in testers continuously for 14 days, with meaningful engagement and feedback. | Starting November 11 cannot finish before November 25; internal testing does not replace this. |
| Production access | Apply after required testing; review usually seven days or less, sometimes longer; further testing may be requested. | Not immediate production availability. |
| App review | A separate submission/review step. Google advises a buffer of at least a week; processing may be longer. | November 14 cannot be promised without existing account/testing/review evidence. |
| Android target | New phone apps/updates require Android 16 / API 36 after August 31, 2026; stated extension ended November 1. | Release source updated to target 36; physical-device testing still required. |

## Submission pack

1. Verify the account's legal owner/type, identity and contact details. For an organisation, check the correct D-U-N-S entity against the payments profile.
2. Upload the signed Android App Bundle, keeping package `xyz.arcticdominion.play`. Enrol in Play App Signing with the intended app-signing/update identity; do not inadvertently break compatibility with existing direct-APK installs.
3. Complete the store listing, privacy-policy URL, support contact, screenshots, content rating, target audience, Data safety and app access/reviewer instructions. Reviewers need a working route through required login.
4. Accurately declare the embedded wallet and NFTs in the Financial features declaration and relevant blockchain content sections. Testnet/free assets are not an explicitly documented exemption. Do not promise earnings or add paid random-NFT rewards.
5. Check Play billing requirements for digital unlocks/cosmetics separately from direct APK/web distribution. The current direct APK is not proof that a Play billing submission is complete.
6. Run internal QA and required closed testing; retain feedback and fixes. Inspect pre-launch reports and accessibility/Android 16 behaviour.
7. Apply for production access if required, then submit the production release. Announce Play availability only after its actual publishing state is verified.

## Communication ready to use

Before readiness is verified:

> Lantern Harbor is preparing to open on the web on November 14. We're preparing the Android release alongside the required Google Play steps, and we'll share availability as each stage is confirmed. Your first adventure begins with an Antarctic Passport.

After the website and signed APK have been deployed and installed successfully:

> The Kingdom is open. Play in your browser, add the web app to your home screen, or download the Android APK from our website. Google Play availability will be announced separately. Your Antarctic Passport is waiting.

Only attribute delays to Play review if the app has actually been submitted and that status is confirmed.

## Official sources

- Account types: https://support.google.com/googleplay/android-developer/answer/13634885?hl=en
- Identity / D-U-N-S: https://support.google.com/googleplay/android-developer/answer/13628312?hl=en
- Testing / production access: https://support.google.com/googleplay/android-developer/answer/14151465?hl=en
- Publishing timelines: https://support.google.com/googleplay/android-developer/answer/9859654?hl=en
- Target API: https://support.google.com/googleplay/android-developer/answer/11926878?hl=en
- App setup: https://support.google.com/googleplay/android-developer/answer/9859152?rd=1
- Blockchain policy: https://support.google.com/googleplay/android-developer/answer/13607354?hl=en
- Financial declaration: https://support.google.com/googleplay/android-developer/answer/13849271?hl=en
