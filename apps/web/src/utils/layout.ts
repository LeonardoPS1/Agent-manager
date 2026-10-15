export type FurnitureKind =
  | 'desk' | 'chair' | 'monitor' | 'printer' | 'cabinet' | 'rack'
  | 'table' | 'whiteboard' | 'sofa' | 'plant' | 'coffee' | 'wall' | 'rug'

export interface FurnitureItem {
  id: string
  kind: FurnitureKind
  x: number
  z: number
  rotation?: number // radians
  deskId?: string // assignable desk
}

export interface RoomDef {
  id: string
  name: string
  x: number
  z: number
  w: number
  d: number
  color?: string
}

export interface LayoutJSON {
  version: 1
  cellSize: number
  rooms: RoomDef[]
  furniture: FurnitureItem[]
}

export const DEFAULT_LAYOUT: LayoutJSON = {
  version: 1,
  cellSize: 1,
  rooms: [
    { id: 'open', name: 'Open Space', x: 0, z: 0, w: 12, d: 10, color: '#1b2130' },
    { id: 'server', name: 'Server Room', x: -8, z: 0, w: 6, d: 6, color: '#18202e' },
    { id: 'archive', name: 'Archive', x: -8, z: 8, w: 6, d: 5, color: '#1a2432' },
    { id: 'meeting', name: 'Meeting Room', x: 8, z: 8, w: 8, d: 7, color: '#1c2333' },
    { id: 'kitchen', name: 'Kitchen', x: 8, z: -4, w: 6, d: 5, color: '#20242e' },
    { id: 'manager', name: 'Manager Office', x: 0, z: -10, w: 8, d: 6, color: '#1d2331' }
  ],
  furniture: [
    // Open space desks (5 demo agent desks)
    { id: 'desk-1', kind: 'desk', x: -3, z: 2, deskId: 'desk-1' },
    { id: 'desk-2', kind: 'desk', x: 0, z: 2, deskId: 'desk-2' },
    { id: 'desk-3', kind: 'desk', x: 3, z: 2, deskId: 'desk-3' },
    { id: 'desk-4', kind: 'desk', x: -3, z: 6, deskId: 'desk-4' },
    { id: 'desk-5', kind: 'desk', x: 0, z: 6, deskId: 'desk-5' },
    // Server room
    { id: 'rack-1', kind: 'rack', x: -9, z: -1 },
    { id: 'rack-2', kind: 'rack', x: -9, z: 1 },
    // Archive
    { id: 'cab-1', kind: 'cabinet', x: -9, z: 8 },
    { id: 'cab-2', kind: 'cabinet', x: -7, z: 8 },
    // Printer
    { id: 'printer-1', kind: 'printer', x: 6, z: 4 },
    // Meeting room
    { id: 'meet-table', kind: 'table', x: 10, z: 10 },
    { id: 'whiteboard-1', kind: 'whiteboard', x: 10, z: 6 },
    // Kitchen
    { id: 'coffee-1', kind: 'coffee', x: 9, z: -4 },
    // Manager
    { id: 'mgr-desk', kind: 'desk', x: 0, z: -10 },
    // Decor
    { id: 'plant-1', kind: 'plant', x: -5, z: -2 },
    { id: 'plant-2', kind: 'plant', x: 5, z: -2 }
  ]
}

export const ANCHORS: Record<string, { x: number; z: number }> = {
  printer: { x: 6, z: 3 },
  archive: { x: -8, z: 8 },
  'server-rack': { x: -7, z: 0 },
  meeting: { x: 10, z: 10 },
  kitchen: { x: 9, z: -3 }
}
