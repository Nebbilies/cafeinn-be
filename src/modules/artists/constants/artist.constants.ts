export const artistKinds = ['SOLO', 'BAND'] as const;
export const artistStatuses = ['ACTIVE', 'INACTIVE'] as const;
export const artistSorts = ['id.asc', 'name.asc', 'name.desc'] as const;

export const DEFAULT_ARTIST_SORT = 'id.asc' as const;
export const MAX_ARTIST_ID = 2_147_483_647;
