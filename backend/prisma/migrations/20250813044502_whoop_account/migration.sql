-- CreateTable
CREATE TABLE "WhoopAccount" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "whoopUserId" INTEGER NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),

    CONSTRAINT "WhoopAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhoopAccount_whoopUserId_key" ON "WhoopAccount"("whoopUserId");

-- CreateIndex
CREATE UNIQUE INDEX "WhoopAccount_walletAddress_key" ON "WhoopAccount"("walletAddress");
