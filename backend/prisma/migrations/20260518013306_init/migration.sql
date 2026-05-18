-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "RoofState" AS ENUM ('OPEN', 'CLOSED', 'MOVING');

-- CreateEnum
CREATE TYPE "VoteOption" AS ENUM ('OPEN', 'CLOSE');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'CLOSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SessionResult" AS ENUM ('OPEN', 'CLOSE', 'NO_QUORUM', 'TIE');

-- CreateEnum
CREATE TYPE "OverrideAction" AS ENUM ('FORCE_OPEN', 'FORCE_CLOSE', 'RELEASE');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "matricula" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "career" TEXT NOT NULL DEFAULT 'Ingeniería en Software',
    "rfid_uid" TEXT,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presence_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "rfid_uid" TEXT NOT NULL,
    "check_in" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "check_out" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "presence_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telemetry" (
    "id" SERIAL NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL,
    "humidity" DOUBLE PRECISION NOT NULL,
    "rain" BOOLEAN NOT NULL,
    "rain_analog" INTEGER NOT NULL DEFAULT 0,
    "uv_index" DOUBLE PRECISION NOT NULL,
    "roof_state" "RoofState" NOT NULL DEFAULT 'CLOSED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telemetry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voting_sessions" (
    "id" SERIAL NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "result" "SessionResult",
    "total_present" INTEGER NOT NULL DEFAULT 0,
    "total_votes" INTEGER NOT NULL DEFAULT 0,
    "quorum_needed" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "voting_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votes" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "session_id" INTEGER NOT NULL,
    "vote" "VoteOption" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overrides" (
    "id" SERIAL NOT NULL,
    "admin_id" INTEGER NOT NULL,
    "action" "OverrideAction" NOT NULL,
    "reason" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMP(3),

    CONSTRAINT "overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" SERIAL NOT NULL,
    "day_of_week" INTEGER[],
    "action" "VoteOption" NOT NULL,
    "time" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_state" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "roof_state" "RoofState" NOT NULL DEFAULT 'CLOSED',
    "active_priority" INTEGER NOT NULL DEFAULT 4,
    "emergency_lock" BOOLEAN NOT NULL DEFAULT false,
    "rain_auto_mode" BOOLEAN NOT NULL DEFAULT true,
    "last_esp32_ping" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_state_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_matricula_key" ON "users"("matricula");

-- CreateIndex
CREATE UNIQUE INDEX "users_rfid_uid_key" ON "users"("rfid_uid");

-- CreateIndex
CREATE UNIQUE INDEX "votes_user_id_session_id_key" ON "votes"("user_id", "session_id");

-- AddForeignKey
ALTER TABLE "presence_logs" ADD CONSTRAINT "presence_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "voting_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
