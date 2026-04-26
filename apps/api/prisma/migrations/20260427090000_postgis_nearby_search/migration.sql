-- Enable PostGIS extension for spatial functions used by nearby discovery.
CREATE EXTENSION IF NOT EXISTS postgis;

-- Spatial expression index for venue coordinates used in ST_DWithin/ST_Distance queries.
CREATE INDEX IF NOT EXISTS "Venue_location_geography_gix"
ON "Venue"
USING GIST (ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography)
WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL;
