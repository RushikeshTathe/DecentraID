import { Eye, UserRoundCog } from 'lucide-react'
import { formatAddress } from '../utils/accessControl.js'
import RoleBadge from './RoleBadge.jsx'
import StatusBadge from './StatusBadge.jsx'

function roleValue(identity) {
  if (identity.roleName === 'STUDENT') return 'STUDENT'
  if (identity.roleName === 'FACULTY') return 'FACULTY'
  return ''
}

export default function UserTable({ users, demoMode, canManage = false, onAssign, onToggle, onView }) {
  if (!users.length) return <div className="empty-state"><UserRoundCog size={25} /><strong>No registered identities</strong><span>New registrations will appear here after their transactions confirm.</span></div>
  return <div className="table-scroll"><table className="user-table"><thead><tr><th>Identity</th><th>Role</th><th>Registered</th><th>Status</th><th>Actions</th></tr></thead><tbody>
    {users.map(({ address, identity, profile }) => <tr key={address}>
      <td><div className="table-user"><span className="avatar-small">{(profile?.name || address).slice(0, 1).toUpperCase()}</span><div><strong>{profile?.name || 'Profile unavailable'}</strong><span>{formatAddress(address, 8, 6)}</span>{profile?.department && <small>{profile.department}</small>}</div></div></td>
      <td><RoleBadge role={identity.roleName} /></td>
      <td>{identity.registeredAt ? new Date(identity.registeredAt * 1000).toLocaleDateString() : '—'}</td>
      <td><StatusBadge active={identity.isActive} /></td>
      <td><div className="row-actions">
        <button className="icon-button" title="View identity" aria-label="View identity" onClick={() => onView({ address, identity, profile })}><Eye size={16} /></button>
        <select aria-label={`Assign role to ${formatAddress(address)}`} value={roleValue(identity)} onChange={(event) => onAssign(address, event.target.value)} disabled={demoMode || !canManage || !identity.isRegistered}>
          {roleValue(identity) === '' && <option value="" disabled>Assign role…</option>}
          <option value="STUDENT">Student</option>
          <option value="FACULTY">Faculty</option>
        </select>
        <button className={`text-action ${identity.isActive ? 'action-danger' : 'action-success'}`} disabled={demoMode || !canManage || !identity.isRegistered} onClick={() => onToggle(address, identity.isActive)}>{identity.isActive ? 'Deactivate' : 'Reactivate'}</button>
      </div></td>
    </tr>)}
  </tbody></table></div>
}
