# Hackathon Registration

This context manages competition teams, their registration information, and organizer review.

## Language

**Team**:
A competition entry owned by exactly one Team Owner. A user may own zero or one Team.
_Avoid_: Group, organization

**Team Removal**:
Permanent deletion of a Team's competition registration.
_Avoid_: Withdrawal, archival

**Team Owner**:
The user responsible for a Team and its registration information. Team participants and advisors are not Team Owners.
_Avoid_: Team member, creator

**Registration Operator**:
A staff user permitted to inspect and maintain registration information across Teams.
_Avoid_: Registration staff role, admin

**Team Registration Review**:
A Registration Operator's pre-competition assessment of a Team's Registration Information. Review findings are private to Registration Operators, and a completed review remains authoritative when Registration Information later changes.
_Avoid_: Round 1 verification, staff verification

**Review Issue**:
A coded finding recorded against a Team Advisor or Participant slot during a Team Registration Review. Review Issues are not visible to Team Owners.
_Avoid_: Problem, validation error

**Review Feedback**:
A Team Owner-visible status summary derived from a Team Registration Review. It reports the outcome for each Team Advisor or Participant slot without exposing Review Issues or internal notes.
_Avoid_: Review details, problem list

**Team Access**:
Authority arising from either Team ownership or Registration Operator permission.
_Avoid_: Membership

**Registration Information**:
The Team, participant, advisor, and supporting-document information submitted for competition entry.
_Avoid_: Team data, form data

**Competition Category**:
The division in which a Team competes. Master's and doctoral participants share the Graduate Competition Category.
_Avoid_: Participant degree level

**Graduate Competition Category**:
The shared competition category named “บัณฑิตศึกษา”, open only to master's and doctoral participants. A Team may contain either degree level or a mixture of both; bachelor's participants are ineligible.
_Avoid_: Master's competition category, doctoral competition category

**Participant Degree Level**:
A participant's individual degree level, retained in their profile. Master's and doctoral remain distinct even though they share a Competition Category.
_Avoid_: Competition category

**Legal Consent**:
A Team Owner's attestations and agreements associated with registration. It is distinct from registration information maintained by Registration Operators.
_Avoid_: Registration setting

**Award**:
An organizer-controlled competition outcome assigned to a Team.
_Avoid_: Team achievement field

**Feature Flag**:
A named competition capability that becomes available at a scheduled start and may remain available forever or until a scheduled end. It is not a manual toggle or targeted rollout.
_Avoid_: Feature Availability Window, rollout, toggle
