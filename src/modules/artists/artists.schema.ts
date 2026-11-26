import { z } from 'zod';
import { email } from '../auth/auth.schema.ts';
import { paginationQuery } from '../../common/pagination.ts';

export const artistKinds = ['SOLO', 'BAND'] as const;
export const artistStatuses = ['ACTIVE', 'INACTIVE'] as const;
export const artistSorts = ['id.asc', 'name.asc', 'name.desc'] as const;

const fields = z.object({
  stageName: z.string().trim().min(1).max(100),
  kind: z.enum(artistKinds),
  email,
  phone: z.string().trim().max(15).nullable().optional(),
  genre: z.string().trim().max(50).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  status: z.enum(artistStatuses),
});

export const createArtist = fields
  .extend({ status: fields.shape.status.default('ACTIVE') })
  .strict();

export const patchArtist = fields
  .partial()
  .strict()
  .refine((input) => Object.keys(input).length > 0);

export const artistId = z.coerce.number().int().positive().max(2147483647);

export const artistListParameters = {
  search: z.string().trim().max(100).optional(),
  status: fields.shape.status.optional(),
  kind: fields.shape.kind.optional(),
  sort: z.enum(artistSorts).default('id.asc'),
};

export const listArtistsQuery = paginationQuery.safeExtend(artistListParameters).strict();

export type CreateArtistInput = z.infer<typeof createArtist>;
export type PatchArtistInput = z.infer<typeof patchArtist>;
export type ArtistListQuery = z.infer<typeof listArtistsQuery>;
