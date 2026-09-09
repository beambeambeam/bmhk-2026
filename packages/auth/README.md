# Authentication roles

Better Auth's admin plugin and the browser client share the access-control definitions in `src/permission.ts`. New signups receive `user`; role values remain in the existing text column, so adding `superAdmin` requires no database migration.

| Role                | Application access                        | Role management                                                                          |
| ------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------- |
| `superAdmin`        | All administrator and staff features      | Any supported role on another account                                                    |
| `admin`             | Existing administrator and staff features | Only `registrationStaff`, `staff`, and `user` accounts; only those roles may be assigned |
| `registrationStaff` | Registration and staff check-in features  | None                                                                                     |
| `staff`             | Registration and participant features     | None                                                                                     |
| `user`              | Participant account features              | None                                                                                     |

Users cannot change their own roles. Unknown or combined role strings fail closed at application authorization boundaries. This application uses one role per account.

## Changing roles

Use the staff application's Admin Users screen. The API checks the actor, desired role, and current target role. The repository locks the target row and revokes that user's sessions in the same transaction as the role update. Existing audit events record successful, denied, and failed role changes without recording session tokens or credentials.

The public Better Auth `/admin/set-role` endpoint is disabled. Role changes through `/admin/update-user` are rejected as well, so these endpoints cannot bypass the application's transaction and audit trail. Other Better Auth account and session operations enforce the same target hierarchy. Administrator creation cannot assign an equal or higher role; super administrators can create administrators. Impersonation of administrators remains disabled by the Better Auth permission configuration.

## Bootstrap

`bun run db:seed:root` provisions the configured root account (`admin-bmhk-2026@kmutt.ac.th`) as `superAdmin`. Run it only against the intended database. This command resets the account's password, revokes existing sessions, and prints a newly generated password; store that output securely. Existing administrators are not automatically promoted.

For development, `bun run db:seed:auth` includes separate local super administrator and administrator accounts. It also resets passwords for existing local seed accounts. Run this before `bun run db:seed:dev` when creating development fixtures.

## References

- [Better Auth admin access control](https://better-auth.com/docs/plugins/admin#access-control)
- [Better Auth admin roles](https://better-auth.com/docs/plugins/admin#admin-roles)
