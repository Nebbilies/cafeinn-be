import { z } from 'zod';
import { email } from '../auth/auth.schema.ts';
import { paginationQuery } from '../../common/pagination.ts';
import {
  artistKinds,
  artistSorts,
  artistStatuses,
  DEFAULT_ARTIST_SORT,
  MAX_ARTIST_ID,
} from './constants/artist.constants.ts';

export { artistKinds, artistSorts, artistStatuses, DEFAULT_ARTIST_SORT, MAX_ARTIST_ID };

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

export const artistId = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().min(1).max(MAX_ARTIST_ID));

export const artistListParameters = {
  search: z.string().trim().max(100).optional(),
  status: fields.shape.status.optional(),
  kind: fields.shape.kind.optional(),
  sort: z.enum(artistSorts).default(DEFAULT_ARTIST_SORT),
};

export const listArtistsQuery = paginationQuery.safeExtend(artistListParameters).strict();

export type CreateArtistInput = z.infer<typeof createArtist>;
export type PatchArtistInput = z.infer<typeof patchArtist>;
export type ArtistListQuery = z.infer<typeof listArtistsQuery>;
