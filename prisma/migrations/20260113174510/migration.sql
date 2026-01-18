-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Province" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,

    CONSTRAINT "Province_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "District" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provinceId" TEXT NOT NULL,

    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingZone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "baseCost" DECIMAL(10,2) NOT NULL,
    "freeShippingMin" DECIMAL(10,2),
    "estimatedDays" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingZoneDistrict" (
    "id" TEXT NOT NULL,
    "shippingZoneId" TEXT NOT NULL,
    "districtCode" TEXT NOT NULL,

    CONSTRAINT "ShippingZoneDistrict_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE INDEX "Department_code_idx" ON "Department"("code");

-- CreateIndex
CREATE INDEX "Department_name_idx" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Province_code_key" ON "Province"("code");

-- CreateIndex
CREATE INDEX "Province_departmentId_idx" ON "Province"("departmentId");

-- CreateIndex
CREATE INDEX "Province_code_idx" ON "Province"("code");

-- CreateIndex
CREATE INDEX "Province_name_idx" ON "Province"("name");

-- CreateIndex
CREATE UNIQUE INDEX "District_code_key" ON "District"("code");

-- CreateIndex
CREATE INDEX "District_provinceId_idx" ON "District"("provinceId");

-- CreateIndex
CREATE INDEX "District_code_idx" ON "District"("code");

-- CreateIndex
CREATE INDEX "District_name_idx" ON "District"("name");

-- CreateIndex
CREATE INDEX "ShippingZone_active_idx" ON "ShippingZone"("active");

-- CreateIndex
CREATE INDEX "ShippingZoneDistrict_shippingZoneId_idx" ON "ShippingZoneDistrict"("shippingZoneId");

-- CreateIndex
CREATE INDEX "ShippingZoneDistrict_districtCode_idx" ON "ShippingZoneDistrict"("districtCode");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingZoneDistrict_shippingZoneId_districtCode_key" ON "ShippingZoneDistrict"("shippingZoneId", "districtCode");

-- AddForeignKey
ALTER TABLE "Province" ADD CONSTRAINT "Province_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "District" ADD CONSTRAINT "District_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingZoneDistrict" ADD CONSTRAINT "ShippingZoneDistrict_shippingZoneId_fkey" FOREIGN KEY ("shippingZoneId") REFERENCES "ShippingZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
