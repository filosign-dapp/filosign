DROP INDEX "idx_foc_objects_transition_due";--> statement-breakpoint
CREATE INDEX "idx_foc_objects_transition_due" ON "foc_objects" USING btree ("replicate_status","r2_evicted_at");--> statement-breakpoint
ALTER TABLE "foc_objects" DROP COLUMN "r2_evict_after";