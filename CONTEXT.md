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
