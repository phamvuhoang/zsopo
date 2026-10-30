/** Occupancy % with one decimal; null when nothing was sellable (never show a fake 0%). */
export const occupancyPct = (occupiedNights: number, sellableNights: number): number | null =>
  sellableNights > 0 ? Math.round((occupiedNights / sellableNights) * 1000) / 10 : null;

/** Average daily rate in integer VND (room revenue only, no services/shipping). */
export const adr = (roomRevenue: bigint, soldNightsServed: number): bigint | null => (soldNightsServed > 0 ? roomRevenue / BigInt(soldNightsServed) : null);
