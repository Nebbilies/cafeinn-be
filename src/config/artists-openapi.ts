import { z } from 'zod';
import { EVENTS_MANAGE_PERMISSION } from '../common/constants/permissions.constants.ts';
import { paginatedResponse, paginationParameters } from '../common/pagination.ts';
import {
  artistKinds,
  artistStatuses,
  MAX_ARTIST_ID,
} from '../modules/artists/constants/artist.constants.ts';
import {
  artistListParameters,
  createArtist,
  patchArtist,
} from '../modules/artists/artists.schema.ts';

const artistOutput = z.object({
  id: z.int(),
  stageName: z.string(),
  kind: z.enum(artistKinds),
  email: z.email(),
  phone: z.string().nullable(),
  genre: z.string().nullable(),
  notes: z.string().nullable(),
  status: z.enum(artistStatuses),
  invitationCount: z.int().min(0),
  assignmentCount: z.int().min(0),
  hasHistory: z.boolean(),
});

const error = z.object({ error: z.object({ code: z.string(), message: z.string() }) });

const artistListQueryDescriptions = {
  page: 'One-based page number.',
  pageSize: 'Number of artist contacts per page.',
  search: 'Partial stage name, email, phone, genre, or exact artist code such as NS012.',
  status: 'Filter by cooperation status. Omit to include both statuses.',
  kind: 'Filter by artist kind (SOLO or BAND).',
  sort: 'Sort by ID or stage name. Equal names are ordered by ascending artist ID.',
};

function content(schema: z.ZodType) {
  return { 'application/json': { schema: z.toJSONSchema(schema, { target: 'openapi-3.0', io: 'input' }) } };
}

function operation(
  summary: string,
  options: {
    input?: z.ZodType;
    output?: z.ZodType;
    status?: number;
    id?: boolean;
    errors?: number[];
  },
) {
  const responses: Record<number, unknown> = {
    [options.status ?? 200]: {
      description: summary,
      ...(options.output && { content: content(options.output) }),
    },
  };
  const descriptions: Record<number, string> = {
    400: 'Invalid input or query parameters.',
    401: 'Authentication session required or expired.',
    403: `Origin rejected or missing ${EVENTS_MANAGE_PERMISSION} permission.`,
    404: 'Artist contact not found.',
    409: 'Duplicate artist email or artist has event history.',
  };
  for (const code of options.errors ?? []) {
    responses[code] = { description: descriptions[code], content: content(error) };
  }
  return {
    tags: ['Artists'],
    summary,
    security: [{ staffCookie: [] }],
    responses,
    ...(options.id && {
      parameters: [
        {
          in: 'path',
          name: 'id',
          required: true,
          schema: { type: 'integer', minimum: 1, maximum: MAX_ARTIST_ID },
        },
      ],
    }),
    ...(options.input && { requestBody: { required: true, content: content(options.input) } }),
  };
}

export const artistPaths = {
  '/api/v1/artists': {
    get: {
      ...operation(`List artist contacts (${EVENTS_MANAGE_PERMISSION})`, {
        output: paginatedResponse(artistOutput),
        errors: [400, 401, 403],
      }),
      description: 'Search and filter reusable artist/band contacts for event invitations and schedules.',
      parameters: Object.entries({ ...paginationParameters, ...artistListParameters }).map(
        ([name, schema]) => ({
          in: 'query',
          name,
          description: artistListQueryDescriptions[name as keyof typeof artistListQueryDescriptions],
          required: false,
          schema: z.toJSONSchema(schema, { target: 'openapi-3.0' }),
        }),
      ),
    },
    post: operation(`Create an artist contact (${EVENTS_MANAGE_PERMISSION})`, {
      input: createArtist,
      output: artistOutput,
      status: 201,
      errors: [400, 401, 403, 409],
    }),
  },
  '/api/v1/artists/{id}': {
    get: operation(`Read artist contact details (${EVENTS_MANAGE_PERMISSION})`, {
      id: true,
      output: artistOutput,
      errors: [400, 401, 403, 404],
    }),
    patch: operation(`Update an artist contact (${EVENTS_MANAGE_PERMISSION})`, {
      id: true,
      input: patchArtist,
      output: artistOutput,
      errors: [400, 401, 403, 404, 409],
    }),
    delete: operation(`Delete an unused artist contact (${EVENTS_MANAGE_PERMISSION})`, {
      id: true,
      status: 204,
      errors: [400, 401, 403, 404, 409],
    }),
  },
};
