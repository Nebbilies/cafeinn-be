import type { Transaction } from '../../database/transaction.ts';
import type { Prisma } from '../../generated/prisma/client.ts';
import { pageOffset, pageResult } from '../../common/pagination.ts';
import { escapeLike } from '../../common/utils/escape-like.ts';
import { MAX_ARTIST_ID } from './constants/artist.constants.ts';
import type { ArtistListQuery } from './artists.schema.ts';

export const artistFields = {
  id: true,
  stageName: true,
  kind: true,
  email: true,
  phone: true,
  genre: true,
  notes: true,
  status: true,
  _count: {
    select: {
      artistInvitations: true,
      artistAssignments: true,
    },
  },
} as const;

export type SelectedArtist = Prisma.ArtistGetPayload<{
  select: typeof artistFields;
}>;

/** Maps a persisted Artist row + relation counts to the API DTO. */
export function artistDto({ _count, ...fields }: SelectedArtist) {
  const invitationCount = _count.artistInvitations;
  const assignmentCount = _count.artistAssignments;
  return {
    ...fields,
    invitationCount,
    assignmentCount,
    hasHistory: invitationCount + assignmentCount > 0,
  };
}

/** Builds Prisma filter criteria for listing artists, including NS### code search. */
export function buildArtistWhere(query: Pick<ArtistListQuery, 'status' | 'kind' | 'search'>): Prisma.ArtistWhereInput {
  const { status, kind, search } = query;
  const where: Prisma.ArtistWhereInput = { deletedAt: null, status, kind };
  if (search) {
    const contains = escapeLike(search);
    const id = /^NS\d{3,}$/i.test(search) ? Number(search.slice(2)) : 0;
    where.OR = [
      { stageName: { contains } },
      { email: { contains } },
      { phone: { contains } },
      { genre: { contains } },
    ];
    if (id > 0 && id <= MAX_ARTIST_ID && search.toUpperCase() === 'NS' + String(id).padStart(3, '0')) {
      where.OR.push({ id });
    }
  }
  return where;
}

export function lockArtist(tx: Transaction, id: number) {
  return tx.$queryRaw`SELECT id FROM artists WHERE id = ${id} FOR UPDATE`;
}

export function findArtist(tx: Transaction, id: number) {
  return tx.artist.findFirst({ where: { id, deletedAt: null }, select: artistFields });
}

/** Checks uniqueness across all artist rows including soft-deleted ones. */
export function findArtistByEmail(tx: Transaction, normalizedEmail: string) {
  return tx.artist.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, deletedAt: true },
  });
}

export async function findArtistPage(tx: Transaction, query: ArtistListQuery) {
  const { sort, pageSize } = query;
  const where = buildArtistWhere(query);
  const orderBy: Prisma.ArtistOrderByWithRelationInput[] = [{ id: 'asc' }];
  if (sort !== 'id.asc') orderBy.unshift({ stageName: sort === 'name.asc' ? 'asc' : 'desc' });
  const skip = pageOffset(query);
  const totalItems = await tx.artist.count({ where });
  const rows =
    skip < totalItems
      ? await tx.artist.findMany({ where, select: artistFields, orderBy, skip, take: pageSize })
      : [];
  return pageResult(rows.map(artistDto), query, totalItems);
}
