import type { Column, GetColumnData, SQL } from 'drizzle-orm';
import { eq, sql } from 'drizzle-orm';
import { type AnyPgColumn, index, uniqueIndex } from 'drizzle-orm/pg-core';

export type TSQLObject<T = unknown> = Column | SQL<T> | SQL.Aliased<T>;

export type InferSQLType<TObj extends TSQLObject | TSQLObject[]> =
	TObj extends Column
		? GetColumnData<TObj>
		: TObj extends SQL.Aliased<infer InferredAliasedT>
			? InferredAliasedT
			: TObj extends SQL<infer InferredT>
				? InferredT
				: never;

export const sqlRegex = (rgx: RegExp) => sql.raw(`'${rgx.source}'`);

export const matchRegex = (v: TSQLObject, rgx: RegExp, isNullable = false) =>
	isNullable
		? sql<boolean>`${v} IS NULL OR ${v} ~ ${sqlRegex(rgx)}`
		: sql<boolean>`${v} ~ ${sqlRegex(rgx)}`;

export const lower = (col: AnyPgColumn) => sql`lower(${col})`;

export function lowerIndex(col: AnyPgColumn, unique = true) {
	const query: SQL = lower(col);
	const name = unique
		? `${col.uniqueName}_lower`
		: col.uniqueName?.replace('unique', 'lower');
	return unique ? uniqueIndex(name).on(query) : index(name).on(query);
}

export function lowerEq(col: AnyPgColumn, str: string) {
	return eq(lower(col), str.toLowerCase());
}

export const sqlArray = <T extends unknown[]>(x: T, parseTo?: string) => {
	const chunks = x.map((v) => sql`${v}`);
	const q = sql<T>`ARRAY[${sql.join(chunks, sql.raw(','))}]`;
	if (parseTo) q.append(sql`::${sql.raw(parseTo)}[]`);
	return q;
};
