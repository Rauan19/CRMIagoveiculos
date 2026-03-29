const { normalizePlate } = require('./revendamaisXml')

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {Promise<{ id: number, plate: string | null } | null>}
 */
async function findVehicleByPlateLoose(prisma, plateRaw) {
  const n = normalizePlate(plateRaw)
  if (!n || n.length < 5) return null
  const vehicles = await prisma.vehicle.findMany({
    where: { plate: { not: null } },
    select: { id: true, plate: true },
    take: 25000,
  })
  return vehicles.find((v) => normalizePlate(v.plate) === n) || null
}

module.exports = { findVehicleByPlateLoose }
