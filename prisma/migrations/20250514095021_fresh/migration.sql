-- CreateTable
CREATE TABLE "Song" (
    "id" TEXT NOT NULL,
    "spotify_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "album" TEXT NOT NULL,
    "album_cover" TEXT,
    "note" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "color" TEXT DEFAULT 'green',
    "spotify_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT,
    "user_email" TEXT,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "user_likes" BOOLEAN NOT NULL DEFAULT false,
    "zora_link" TEXT,
    "zora_tx" TEXT,
    "coin_address" TEXT,

    CONSTRAINT "Song_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SongLike" (
    "id" TEXT NOT NULL,
    "song_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SongLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Song_spotify_id_idx" ON "Song"("spotify_id");

-- CreateIndex
CREATE INDEX "Song_user_id_idx" ON "Song"("user_id");

-- CreateIndex
CREATE INDEX "Song_username_idx" ON "Song"("username");

-- CreateIndex
CREATE INDEX "SongLike_song_id_idx" ON "SongLike"("song_id");

-- CreateIndex
CREATE INDEX "SongLike_user_id_idx" ON "SongLike"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "SongLike_song_id_user_id_key" ON "SongLike"("song_id", "user_id");
