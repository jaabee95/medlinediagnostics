import * as XLSX from "xlsx";
import { z } from "zod";

export type TestRow = {
  code: string;
  name: string;
  main_group: string;
  sub_group: string;
  description?: string | null;
  sample_required?: string | null;
  tat?: string | null;
  reference_range?: string | null;
  price?: number | null;
  sort_order?: number | null;
  is_active?: boolean | null;
};

export const TEST_COLUMNS = [
  "code", "name", "main_group", "sub_group", "description",
  "sample_required", "tat", "reference_range", "price", "sort_order", "is_active",
];

const rowSchema = z.object({
  code: z.string().trim().min(1, "code is required").max(50),
  name: z.string().trim().min(1, "name is required").max(255),
  main_group: z.string().trim().min(1, "main_group is required"),
  sub_group: z.string().trim().min(1, "sub_group is required"),
  description: z.string().max(2000).optional().nullable(),
  sample_required: z.string().max(255).optional().nullable(),
  tat: z.string().max(100).optional().nullable(),
  reference_range: z.string().max(500).optional().nullable(),
  price: z.number().nonnegative().nullable().optional(),
  sort_order: z.number().int().nullable().optional(),
  is_active: z.boolean().nullable().optional(),
});

export function buildTemplateWorkbook(opts: {
  tests: any[]; mains: any[]; subs: any[];
}) {
  const wb = XLSX.utils.book_new();

  const mainById = new Map(opts.mains.map((m) => [m.id, m.name]));
  const subById = new Map(opts.subs.map((s) => [s.id, s]));

  const dataRows = opts.tests.map((t) => {
    const sub = subById.get(t.sub_group_id);
    return {
      code: t.code ?? "",
      name: t.name,
      main_group: sub ? mainById.get(sub.main_group_id) ?? "" : "",
      sub_group: sub?.name ?? "",
      description: t.description ?? "",
      sample_required: t.sample_required ?? "",
      tat: t.tat ?? "",
      reference_range: t.reference_range ?? "",
      price: t.price ?? "",
      sort_order: t.sort_order ?? 10,
      is_active: t.is_active ? "TRUE" : "FALSE",
    };
  });

  const ws = XLSX.utils.json_to_sheet(dataRows, { header: TEST_COLUMNS });
  XLSX.utils.book_append_sheet(wb, ws, "Tests");

  // Reference sheet
  const refRows: any[] = [];
  refRows.push({ main_group: "— Main Groups —", sub_group: "" });
  for (const m of opts.mains) refRows.push({ main_group: m.name, sub_group: "" });
  refRows.push({ main_group: "", sub_group: "" });
  refRows.push({ main_group: "— Sub Groups (parent → child) —", sub_group: "" });
  for (const s of opts.subs) {
    refRows.push({ main_group: mainById.get(s.main_group_id) ?? "?", sub_group: s.name });
  }
  const refWs = XLSX.utils.json_to_sheet(refRows, { header: ["main_group", "sub_group"] });
  XLSX.utils.book_append_sheet(wb, refWs, "Reference");

  return wb;
}

export function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename);
}

export type ValidatedRow = {
  index: number;
  raw: any;
  status: "new" | "update" | "error";
  errors: string[];
  parsed?: {
    code: string;
    name: string;
    sub_group_id: string;
    description: string | null;
    sample_required: string | null;
    tat: string | null;
    reference_range: string | null;
    price: number | null;
    sort_order: number;
    is_active: boolean;
    id?: string; // for updates
  };
};

export async function parseImportFile(file: File): Promise<any[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

export function validateRows(
  rawRows: any[],
  ctx: {
    mains: { id: string; name: string }[];
    subs: { id: string; name: string; main_group_id: string }[];
    existingTests: { id: string; code: string | null }[];
  }
): ValidatedRow[] {
  const norm = (s: string) => s.trim().toLowerCase();
  const mainByName = new Map(ctx.mains.map((m) => [norm(m.name), m]));
  const subKey = (mainId: string, subName: string) => `${mainId}::${norm(subName)}`;
  const subByKey = new Map(
    ctx.subs.map((s) => [subKey(s.main_group_id, s.name), s])
  );
  const existingByCode = new Map(
    ctx.existingTests
      .filter((t) => t.code)
      .map((t) => [norm(t.code as string), t])
  );

  return rawRows.map((raw, i) => {
    const errors: string[] = [];

    const cleaned = {
      code: String(raw.code ?? "").trim(),
      name: String(raw.name ?? "").trim(),
      main_group: String(raw.main_group ?? "").trim(),
      sub_group: String(raw.sub_group ?? "").trim(),
      description: raw.description ? String(raw.description).trim() : null,
      sample_required: raw.sample_required ? String(raw.sample_required).trim() : null,
      tat: raw.tat ? String(raw.tat).trim() : null,
      reference_range: raw.reference_range ? String(raw.reference_range).trim() : null,
      price: raw.price === "" || raw.price == null ? null : Number(raw.price),
      sort_order: raw.sort_order === "" || raw.sort_order == null ? 10 : Number(raw.sort_order),
      is_active: typeof raw.is_active === "string"
        ? !["false", "no", "0", "n", ""].includes(raw.is_active.toLowerCase())
        : raw.is_active !== false,
    };

    const result = rowSchema.safeParse(cleaned);
    if (!result.success) {
      for (const issue of result.error.issues) errors.push(`${issue.path.join(".")}: ${issue.message}`);
    }
    if (cleaned.price != null && Number.isNaN(cleaned.price)) errors.push("price must be a number");

    const main = mainByName.get(norm(cleaned.main_group));
    if (!main && cleaned.main_group) errors.push(`Unknown main_group "${cleaned.main_group}"`);
    let sub: { id: string } | undefined;
    if (main && cleaned.sub_group) {
      sub = subByKey.get(subKey(main.id, cleaned.sub_group));
      if (!sub) errors.push(`Sub group "${cleaned.sub_group}" doesn't belong to "${cleaned.main_group}"`);
    }

    if (errors.length) return { index: i, raw, status: "error", errors };

    const existing = existingByCode.get(norm(cleaned.code));
    return {
      index: i,
      raw,
      status: existing ? "update" : "new",
      errors: [],
      parsed: {
        code: cleaned.code,
        name: cleaned.name,
        sub_group_id: sub!.id,
        description: cleaned.description,
        sample_required: cleaned.sample_required,
        tat: cleaned.tat,
        reference_range: cleaned.reference_range,
        price: cleaned.price,
        sort_order: cleaned.sort_order,
        is_active: cleaned.is_active,
        id: existing?.id,
      },
    };
  });
}
