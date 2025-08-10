-- CreateTable
CREATE TABLE "WhoopEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "resourceId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "traceId" TEXT,
    "raw" TEXT NOT NULL,

    CONSTRAINT "WhoopEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhoopResource" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,
    "resourceId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,

    CONSTRAINT "WhoopResource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhoopResource_userId_resourceId_domain_key" ON "WhoopResource"("userId", "resourceId", "domain");
