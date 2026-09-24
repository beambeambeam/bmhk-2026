# Keep Round 2 Confirmation documents separate from registration

Round 2 Confirmation requires fresh national ID card and student ID card documents for every registered participant, submitted together by the Team Owner through an explicit confirmation action. Registration documents remain separate because the existing academic record is not a student ID card, and confirmation must preserve the documents supporting the participation declaration instead of depending on mutable registration uploads.

Submission fixes the confirmation documents and participant roster; there is no owner cancellation or staff submission on behalf of a Team in this initial capability. Registration Operators may inspect confirmations and their documents, but confirmation does not require their approval.

All Round 2 Confirmation persistence belongs to one `team_round2` row per Team: its confirmation timestamp and both document references for each of the three participant slots. The `teams` table has no Round 2 Confirmation fields; fixed slots follow the existing registration-review model and keep file foreign keys without splitting this capability across tables.
