import type { FilterOptions } from 'payload'
import { assignedCityIds, type AppUser } from './index'

/** City pickers show correspondents only their assigned cities (UX; requireAssignedCity enforces it). */
export const assignedCityOptions: FilterOptions = ({ req }) => {
  const u = req.user as unknown as AppUser | null
  if (u?.role === 'admin' || u?.role === 'editor') return true
  return { id: { in: u ? assignedCityIds(u) : [] } }
}
