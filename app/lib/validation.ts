import { z } from 'zod';

export const createReservationSchema = z.object({
  productId: z.coerce.number().int().positive(),
  warehouseId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive().max(100),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
