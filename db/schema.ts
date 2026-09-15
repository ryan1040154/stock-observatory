// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const portfolios=sqliteTable('portfolios',{userId:text('user_id').primaryKey(),payload:text('payload').notNull(),revision:integer('revision').notNull().default(0)});
export const cache=sqliteTable('market_cache',{key:text('key').primaryKey(),payload:text('payload').notNull(),updated:integer('updated').notNull()});
