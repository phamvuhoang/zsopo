export type Fulfillment = "new" | "confirmed" | "packing" | "ritual_hold" | "ready_to_ship" | "shipped" | "completed" | "cancelled" | "returned";

const NEXT: Record<Fulfillment, Fulfillment[]> = {
  new: ["confirmed", "cancelled"],
  confirmed: ["packing", "cancelled"],
  packing: ["ritual_hold", "ready_to_ship", "cancelled"],
  ritual_hold: ["ready_to_ship", "cancelled"],
  ready_to_ship: ["shipped", "cancelled"],
  shipped: ["completed", "returned"],
  completed: ["returned"],
  cancelled: [],
  returned: [],
};

export const canTransitionFulfillment = (from: Fulfillment, to: Fulfillment) => NEXT[from].includes(to);
export const readyToShipAt = (ritualStartedAt: string, hours: number) => new Date(Date.parse(ritualStartedAt) + hours * 3600_000);
