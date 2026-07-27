-- Caducidad de la reserva de inventario de una orden de pasarela.
-- Nullable a propósito: los pedidos existentes quedan en NULL ("no caduca"),
-- de modo que el barrido no cancela retroactivamente pedidos históricos que
-- un admin ya gestionó a mano.
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "reservationExpiresAt" TIMESTAMP(3);

-- El barrido filtra por esta columna y la inmensa mayoría de las filas son
-- NULL, así que el índice mantiene la pasada barata.
-- CreateIndex
CREATE INDEX "Order_reservationExpiresAt_idx" ON "Order"("reservationExpiresAt");
