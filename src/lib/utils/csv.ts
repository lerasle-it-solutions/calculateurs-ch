/**
 * Sérialisation CSV minimale (RFC 4180) : virgule, guillemets doublés,
 * fin de ligne CRLF. Aucune dépendance externe pour un besoin aussi simple.
 */
const escapeField = (value: unknown): string => {
	const text = value === undefined || value === null ? "" : String(value);
	return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const toCsv = (columns: string[], rows: unknown[][]): string => {
	const lines = [columns, ...rows].map((row) => row.map(escapeField).join(","));
	return `${lines.join("\r\n")}\r\n`;
};
