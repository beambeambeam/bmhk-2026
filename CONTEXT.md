# Hackathon Registration

This context manages competition teams, their registration information, and organizer review.

## Language

**Team**:
A competition entry owned by exactly one Team Owner. A user may own zero or one Team.
_Avoid_: Group, organization

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

**Legal Consent**:
A Team Owner's attestations and agreements associated with registration. It is distinct from registration information maintained by Registration Operators.
_Avoid_: Registration setting

**Award**:
An organizer-controlled competition outcome assigned to a Team.
_Avoid_: Team achievement field
