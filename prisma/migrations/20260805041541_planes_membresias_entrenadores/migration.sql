-- CreateEnum
CREATE TYPE "ServiceKind" AS ENUM ('ACCESS', 'TRAINING', 'CLASS', 'EVENT', 'ADDON');

-- CreateEnum
CREATE TYPE "ServiceUnit" AS ENUM ('UNLIMITED', 'SESSION', 'HOUR', 'CLASS', 'MONTH');

-- CreateEnum
CREATE TYPE "DurationUnit" AS ENUM ('DAY', 'WEEK', 'MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "PlanModality" AS ENUM ('OPEN', 'GROUP', 'SEMI_PERSONAL', 'PERSONAL');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'HIDDEN', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EntitlementPeriod" AS ENUM ('TOTAL', 'DAY', 'WEEK', 'MONTH');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAUSED', 'EXPIRED', 'COMPLETED', 'CANCELLED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "MembershipSource" AS ENUM ('WEB', 'ONSITE', 'IMPORT', 'RENEWAL');

-- CreateEnum
CREATE TYPE "EntitlementStatus" AS ENUM ('ACTIVE', 'EXHAUSTED', 'SUSPENDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "EntitlementSource" AS ENUM ('PLAN', 'ADDON', 'AUTHORIZATION', 'COURTESY', 'EVENT');

-- CreateEnum
CREATE TYPE "AuthorizationStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'APPLIED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AssignmentScope" AS ENUM ('CLIENT', 'MEMBERSHIP', 'SLOT', 'PLAN', 'EVENT', 'TEMPORARY');

-- CreateEnum
CREATE TYPE "AssignmentRole" AS ENUM ('PRIMARY', 'SUPPORT', 'SUBSTITUTE');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'SCHEDULED', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OccurrenceStatus" AS ENUM ('SCHEDULED', 'CANCELLED', 'BLOCKED', 'MODIFIED');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'RESERVED', 'MOVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "kind" "ServiceKind" NOT NULL,
    "unit" "ServiceUnit" NOT NULL,
    "requires_trainer" BOOLEAN NOT NULL DEFAULT false,
    "standalone_price" BIGINT,
    "icon" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "duration_value" INTEGER,
    "duration_unit" "DurationUnit",
    "session_limit" INTEGER,
    "weekly_visit_limit" INTEGER,
    "monthly_visit_limit" INTEGER,
    "daily_visit_limit" INTEGER NOT NULL DEFAULT 1,
    "modality" "PlanModality" NOT NULL DEFAULT 'OPEN',
    "requires_schedule" BOOLEAN NOT NULL DEFAULT false,
    "max_capacity" INTEGER,
    "grace_days" INTEGER NOT NULL DEFAULT 0,
    "allows_discount" BOOLEAN NOT NULL DEFAULT true,
    "max_discount_percent" INTEGER,
    "promo_price" BIGINT,
    "promo_starts_at" DATE,
    "promo_ends_at" DATE,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "is_recommended" BOOLEAN NOT NULL DEFAULT false,
    "allows_online_registration" BOOLEAN NOT NULL DEFAULT false,
    "allows_online_payment" BOOLEAN NOT NULL DEFAULT false,
    "auto_renew" BOOLEAN NOT NULL DEFAULT false,
    "status" "PlanStatus" NOT NULL DEFAULT 'DRAFT',
    "benefits" JSONB NOT NULL DEFAULT '[]',
    "rules" JSONB NOT NULL DEFAULT '{}',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_entitlements" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "quantity" INTEGER,
    "period" "EntitlementPeriod" NOT NULL DEFAULT 'TOTAL',
    "rollover" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "plan_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "plan_snapshot" JSONB NOT NULL,
    "list_price" BIGINT NOT NULL,
    "discount_amount" BIGINT NOT NULL DEFAULT 0,
    "discount_reason" TEXT,
    "discount_approved_by" UUID,
    "final_price" BIGINT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "sessions_included" INTEGER,
    "sessions_used" INTEGER NOT NULL DEFAULT 0,
    "status" "MembershipStatus" NOT NULL DEFAULT 'PENDING',
    "paused_at" TIMESTAMPTZ(3),
    "paused_days_total" INTEGER NOT NULL DEFAULT 0,
    "courtesy_days" INTEGER NOT NULL DEFAULT 0,
    "trainer_id" UUID,
    "schedule_slot_id" UUID,
    "previous_membership_id" UUID,
    "source" "MembershipSource" NOT NULL DEFAULT 'ONSITE',
    "cancelled_at" TIMESTAMPTZ(3),
    "cancel_reason" TEXT,
    "notes" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_entitlements" (
    "id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "snapshot" JSONB NOT NULL,
    "quantity_total" INTEGER,
    "quantity_used" INTEGER NOT NULL DEFAULT 0,
    "quantity_reserved" INTEGER NOT NULL DEFAULT 0,
    "period" "EntitlementPeriod" NOT NULL DEFAULT 'TOTAL',
    "period_start" DATE,
    "period_end" DATE,
    "rollover" BOOLEAN NOT NULL DEFAULT false,
    "status" "EntitlementStatus" NOT NULL DEFAULT 'ACTIVE',
    "source" "EntitlementSource" NOT NULL DEFAULT 'PLAN',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "membership_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_changes" (
    "id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "reason" TEXT,
    "performed_by" UUID,
    "performed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_usages" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "membership_id" UUID,
    "membership_entitlement_id" UUID,
    "service_id" UUID NOT NULL,
    "trainer_id" UUID,
    "schedule_slot_id" UUID,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "business_date" DATE NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "was_within_entitlement" BOOLEAN NOT NULL DEFAULT true,
    "authorization_id" UUID,
    "registered_by" UUID,
    "notes" TEXT,

    CONSTRAINT "service_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_authorizations" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "membership_id" UUID,
    "service_id" UUID NOT NULL,
    "requested_by" UUID NOT NULL,
    "requested_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,
    "status" "AuthorizationStatus" NOT NULL DEFAULT 'REQUESTED',
    "decided_by" UUID,
    "decided_at" TIMESTAMPTZ(3),
    "decision_notes" TEXT,
    "effect_charge" BOOLEAN NOT NULL DEFAULT false,
    "charge_amount" BIGINT,
    "effect_consume_session" BOOLEAN NOT NULL DEFAULT false,
    "effect_grant_entitlement" BOOLEAN NOT NULL DEFAULT false,
    "valid_until" TIMESTAMPTZ(3),
    "applied_at" TIMESTAMPTZ(3),

    CONSTRAINT "service_authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trainers" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "full_name" TEXT NOT NULL,
    "document_number" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "specialties" JSONB NOT NULL DEFAULT '[]',
    "bio" TEXT,
    "photo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "trainers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trainer_assignments" (
    "id" UUID NOT NULL,
    "trainer_id" UUID NOT NULL,
    "scope" "AssignmentScope" NOT NULL,
    "client_id" UUID,
    "membership_id" UUID,
    "schedule_slot_id" UUID,
    "plan_id" UUID,
    "event_id" UUID,
    "role" "AssignmentRole" NOT NULL DEFAULT 'PRIMARY',
    "service_id" UUID,
    "starts_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMPTZ(3),
    "sessions_total" INTEGER,
    "sessions_delivered" INTEGER NOT NULL DEFAULT 0,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "replaces_assignment_id" UUID,
    "notes" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trainer_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_slots" (
    "id" UUID NOT NULL,
    "schedule_id" UUID NOT NULL,
    "name" TEXT,
    "weekday" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "trainer_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "valid_from" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_until" DATE,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "schedule_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slot_occurrences" (
    "id" UUID NOT NULL,
    "schedule_slot_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "status" "OccurrenceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "capacity_override" INTEGER,
    "trainer_override" UUID,
    "reason" TEXT,
    "created_by" UUID,

    CONSTRAINT "slot_occurrences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slot_enrollments" (
    "id" UUID NOT NULL,
    "schedule_slot_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "membership_id" UUID,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "reserved_until" TIMESTAMPTZ(3),
    "moved_to_slot_id" UUID,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slot_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "services_code_key" ON "services"("code");

-- CreateIndex
CREATE UNIQUE INDEX "plans_slug_key" ON "plans"("slug");

-- CreateIndex
CREATE INDEX "plans_status_is_public_idx" ON "plans"("status", "is_public");

-- CreateIndex
CREATE UNIQUE INDEX "plan_entitlements_plan_id_service_id_key" ON "plan_entitlements"("plan_id", "service_id");

-- CreateIndex
CREATE INDEX "memberships_client_id_status_idx" ON "memberships"("client_id", "status");

-- CreateIndex
CREATE INDEX "memberships_status_end_date_idx" ON "memberships"("status", "end_date");

-- CreateIndex
CREATE INDEX "membership_entitlements_membership_id_status_idx" ON "membership_entitlements"("membership_id", "status");

-- CreateIndex
CREATE INDEX "membership_changes_membership_id_performed_at_idx" ON "membership_changes"("membership_id", "performed_at");

-- CreateIndex
CREATE INDEX "service_usages_client_id_business_date_idx" ON "service_usages"("client_id", "business_date");

-- CreateIndex
CREATE INDEX "service_usages_trainer_id_business_date_idx" ON "service_usages"("trainer_id", "business_date");

-- CreateIndex
CREATE INDEX "service_authorizations_status_requested_at_idx" ON "service_authorizations"("status", "requested_at");

-- CreateIndex
CREATE INDEX "service_authorizations_client_id_idx" ON "service_authorizations"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "trainers_user_id_key" ON "trainers"("user_id");

-- CreateIndex
CREATE INDEX "trainer_assignments_trainer_id_status_idx" ON "trainer_assignments"("trainer_id", "status");

-- CreateIndex
CREATE INDEX "trainer_assignments_client_id_status_idx" ON "trainer_assignments"("client_id", "status");

-- CreateIndex
CREATE INDEX "trainer_assignments_schedule_slot_id_status_idx" ON "trainer_assignments"("schedule_slot_id", "status");

-- CreateIndex
CREATE INDEX "schedule_slots_weekday_is_active_idx" ON "schedule_slots"("weekday", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "slot_occurrences_schedule_slot_id_date_key" ON "slot_occurrences"("schedule_slot_id", "date");

-- CreateIndex
CREATE INDEX "slot_enrollments_schedule_slot_id_status_idx" ON "slot_enrollments"("schedule_slot_id", "status");

-- CreateIndex
CREATE INDEX "slot_enrollments_client_id_status_idx" ON "slot_enrollments"("client_id", "status");

-- AddForeignKey
ALTER TABLE "plan_entitlements" ADD CONSTRAINT "plan_entitlements_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_entitlements" ADD CONSTRAINT "plan_entitlements_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_entitlements" ADD CONSTRAINT "membership_entitlements_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_entitlements" ADD CONSTRAINT "membership_entitlements_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_changes" ADD CONSTRAINT "membership_changes_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_usages" ADD CONSTRAINT "service_usages_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_usages" ADD CONSTRAINT "service_usages_membership_entitlement_id_fkey" FOREIGN KEY ("membership_entitlement_id") REFERENCES "membership_entitlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_usages" ADD CONSTRAINT "service_usages_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_usages" ADD CONSTRAINT "service_usages_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "trainers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_authorizations" ADD CONSTRAINT "service_authorizations_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_assignments" ADD CONSTRAINT "trainer_assignments_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "trainers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_slots" ADD CONSTRAINT "schedule_slots_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_slots" ADD CONSTRAINT "schedule_slots_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "trainers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_occurrences" ADD CONSTRAINT "slot_occurrences_schedule_slot_id_fkey" FOREIGN KEY ("schedule_slot_id") REFERENCES "schedule_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_enrollments" ADD CONSTRAINT "slot_enrollments_schedule_slot_id_fkey" FOREIGN KEY ("schedule_slot_id") REFERENCES "schedule_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
