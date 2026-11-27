import { Router } from 'express';
import { requireToken } from '../auth/auth-cookie.ts';
import { artistId, createArtist, listArtistsQuery, patchArtist } from './artists.schema.ts';
import {
  artistDetail,
  createArtistContact,
  deleteArtistContact,
  listArtists,
  updateArtistContact,
} from './artists.service.ts';

export const artistsRoutes = Router();

artistsRoutes.get('/', async (req, res) => {
  res.json(await listArtists(requireToken(req), listArtistsQuery.parse(req.query)));
});

artistsRoutes.get('/:id', async (req, res) => {
  res.json(await artistDetail(requireToken(req), artistId.parse(req.params.id)));
});

artistsRoutes.post('/', async (req, res) => {
  res.status(201).json(await createArtistContact(requireToken(req), createArtist.parse(req.body)));
});

artistsRoutes.patch('/:id', async (req, res) => {
  res.json(
    await updateArtistContact(
      requireToken(req),
      artistId.parse(req.params.id),
      patchArtist.parse(req.body),
    ),
  );
});

artistsRoutes.delete('/:id', async (req, res) => {
  await deleteArtistContact(requireToken(req), artistId.parse(req.params.id));
  res.status(204).end();
});
