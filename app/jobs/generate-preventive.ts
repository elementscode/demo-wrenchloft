import { Job } from "@elements/app";
import { generateDueWork } from "#app/shared/services/preventive";

/**
 * Creates the work orders for preventive schedules coming due. Safe to run
 * any number of times: a schedule with an open order is skipped.
 */
export class GeneratePreventiveJob extends Job {
  static maxAttempts = 3;

  run() {
    let created = generateDueWork();
    if (created > 0) {
      console.log(`created ${created} preventive work orders`);
    }
  }
}
