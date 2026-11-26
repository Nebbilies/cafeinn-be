-- Additive: legacy descriptions remain nullable; new API writes require content.
ALTER TABLE programs
  ADD cover_image_url VARCHAR(2048) NULL,
  ADD revision INTEGER UNSIGNED NOT NULL DEFAULT 1;

