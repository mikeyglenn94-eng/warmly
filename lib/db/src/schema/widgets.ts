import { pgTable, text, integer, jsonb, boolean, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import type { Question } from "@warmly/api-spec";
import { usersTable } from "./users";

// `id` is an internal stable PK (uuid). `slug` is the public URL identifier
// shown in the share link (firstsetweb.com/warmly/<slug>); operator-editable,
// globally unique. `questions` shape is validated against api-spec
// QuestionSchema at the API boundary; the type is shared here so reads come
// back fully typed.
export const widgetsTable = pgTable(
  "widgets",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    whatsappNumber: text("whatsapp_number").notNull(),
    questions: jsonb("questions").$type<Question[]>().notNull(),
    messageTemplate: text("message_template").notNull(),
    buttonColour: text("button_colour").notNull().default("#25D366"),
    buttonPosition: text("button_position").notNull().default("bottom-right"),
    brandingEnabled: boolean("branding_enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("widgets_user_idx").on(t.userId),
    slugIdx: uniqueIndex("widgets_slug_idx").on(t.slug),
  }),
);

export type Widget = typeof widgetsTable.$inferSelect;
export type NewWidget = typeof widgetsTable.$inferInsert;
