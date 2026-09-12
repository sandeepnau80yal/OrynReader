import "dotenv/config";
import pkg from "@prisma/client";
const { PrismaClient } = pkg;
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL?.replace(
	/([?&])sslmode=require(?=&|$)/i,
	"$1sslmode=verify-full"
);
const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter });