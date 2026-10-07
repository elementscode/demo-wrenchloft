import config from "#config";
import { todayIn } from "#app/shared/services/format";

/**
 * Today on the plant floor, which is not the database's GMT day after 5pm.
 * @server
 */
export function plantToday(): string {
  return todayIn(config.plant.timeZone);
}
