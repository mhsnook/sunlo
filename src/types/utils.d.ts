export type NonNullableFields<T> = {
	[K in keyof T]: Exclude<T[K], null>
}
