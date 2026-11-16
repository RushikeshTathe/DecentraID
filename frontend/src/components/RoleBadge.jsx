import { BookOpenCheck, GraduationCap, ShieldCheck, UserRound } from 'lucide-react'

const roleIcons = { ADMIN: ShieldCheck, FACULTY: BookOpenCheck, STUDENT: GraduationCap, NONE: UserRound }

export default function RoleBadge({ role = 'NONE' }) {
  const Icon = roleIcons[role] || UserRound
  return <span className={`role-badge role-${role.toLowerCase()}`}><Icon size={13} />{role === 'NONE' ? 'Unassigned' : role}</span>
}