import { Prisma } from '../../generated/prisma/client.ts';
import { audit } from '../../common/audit/audit.ts';
import { ApiError } from '../../common/api-error.ts';
import { authorize } from '../auth/auth.service.ts';
import { transaction, type Transaction } from '../../database/transaction.ts';
import type { ArtistListQuery, CreateArtistInput, PatchArtistInput } from './artists.schema.ts';
import {
  artistDto,
  artistFields,
  findArtist,
  findArtistByEmail,
  findArtistPage,
  lockArtist,
  normalizeArtistEmail,
  normalizeOptionalText,
} from './artists.repository.ts';

/** Ensures artist has no invitation or assignment history before deletion (QD12). */
export function assertDeletableArtist(artist: { invitationCount: number; assignmentCount: number }) {
  if (artist.invitationCount > 0 || artist.assignmentCount > 0) {
    throw new ApiError(409, 'ARTIST_HAS_HISTORY');
  }
}

async function assertNoDuplicateEmail(tx: Transaction, normalizedEmail: string, excludeId?: number) {
  const existing = await findArtistByEmail(tx, normalizedEmail);
  if (existing && existing.id !== excludeId) {
    throw new ApiError(409, 'ARTIST_EMAIL_EXISTS');
  }
}

function mapArtistUniqueViolation(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new ApiError(409, 'ARTIST_EMAIL_EXISTS');
  }
  throw error;
}

export function listArtists(token: string, query: ArtistListQuery) {
  return transaction(async (tx) => {
    await authorize(tx, token, 'events.manage');
    return findArtistPage(tx, query);
  });
}

export function artistDetail(token: string, id: number) {
  return transaction(async (tx) => {
    await authorize(tx, token, 'events.manage');
    const row = await findArtist(tx, id);
    if (!row) throw new ApiError(404, 'ARTIST_NOT_FOUND');
    return artistDto(row);
  });
}

export function createArtistContact(token: string, input: CreateArtistInput) {
  return transaction(async (tx) => {
    const actor = await authorize(tx, token, 'events.manage');
    const normalizedEmail = normalizeArtistEmail(input.email);
    await assertNoDuplicateEmail(tx, normalizedEmail);

    let row;
    try {
      row = await tx.artist.create({
        data: {
          stageName: input.stageName,
          kind: input.kind,
          email: normalizedEmail,
          phone: normalizeOptionalText(input.phone) ?? null,
          genre: normalizeOptionalText(input.genre) ?? null,
          notes: normalizeOptionalText(input.notes) ?? null,
          status: input.status,
        },
        select: artistFields,
      });
    } catch (error) {
      mapArtistUniqueViolation(error);
    }

    const dto = artistDto(row);
    await audit(tx, {
      employeeId: actor.id,
      action: 'RECORD_CREATED',
      entityType: 'artist',
      entityKey: { id: row.id },
      details: { after: dto },
    });
    return dto;
  });
}

export function updateArtistContact(token: string, id: number, input: PatchArtistInput) {
  return transaction(async (tx) => {
    const actor = await authorize(tx, token, 'events.manage');
    await lockArtist(tx, id);
    const before = await findArtist(tx, id);
    if (!before) throw new ApiError(404, 'ARTIST_NOT_FOUND');

    const normalizedEmail = input.email !== undefined ? normalizeArtistEmail(input.email) : undefined;
    if (normalizedEmail !== undefined) {
      await assertNoDuplicateEmail(tx, normalizedEmail, id);
    }

    let row;
    try {
      row = await tx.artist.update({
        where: { id },
        data: {
          stageName: input.stageName,
          kind: input.kind,
          email: normalizedEmail,
          phone: normalizeOptionalText(input.phone),
          genre: normalizeOptionalText(input.genre),
          notes: normalizeOptionalText(input.notes),
          status: input.status,
        },
        select: artistFields,
      });
    } catch (error) {
      mapArtistUniqueViolation(error);
    }

    const dto = artistDto(row);
    await audit(tx, {
      employeeId: actor.id,
      action: 'RECORD_UPDATED',
      entityType: 'artist',
      entityKey: { id },
      details: { before: artistDto(before), after: dto },
    });
    return dto;
  });
}

export function deleteArtistContact(token: string, id: number) {
  return transaction(async (tx) => {
    const actor = await authorize(tx, token, 'events.manage');
    await lockArtist(tx, id);
    const before = await findArtist(tx, id);
    if (!before) throw new ApiError(404, 'ARTIST_NOT_FOUND');

    const dto = artistDto(before);
    assertDeletableArtist(dto);

    await tx.artist.update({
      where: { id },
      data: { status: 'INACTIVE', deletedAt: new Date() },
    });

    await audit(tx, {
      employeeId: actor.id,
      action: 'RECORD_SOFT_DELETED',
      entityType: 'artist',
      entityKey: { id },
      details: { before: dto },
    });
  });
}
